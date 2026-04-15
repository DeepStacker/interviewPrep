import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { systemDesignAPI } from '../services/api';
import styles from './SystemDesignWorkspacePage.module.css';

type WorkspaceTab = 'brief' | 'requirements' | 'constraints' | 'history';
type WorkspaceMode = 'write' | 'draw' | 'split';
type CanvasTool = 'select' | 'service' | 'database' | 'queue' | 'connect';

interface SystemDesignProblem {
  id: number;
  title: string;
  difficulty: 'medium' | 'hard' | string;
  description: string;
  requirements?: string;
  constraints?: string;
  estimatedTimeMinutes?: number;
}

interface SystemDesignSubmission {
  id: number;
  problemId: number;
  designDocument: string;
  architectureScore: number;
  scalabilityScore: number;
  reliabilityScore: number;
  tradeOffAnalysisScore: number;
  overallScore: number;
  expertFeedback: string;
}

interface InteractionStats {
  keyStrokes: number;
  mouseClicks: number;
  tabSwitches: number;
  focusLosses: number;
  pasteCount: number;
}

interface PendingResult {
  architectureScore: number;
  scalabilityScore: number;
  reliabilityScore: number;
  tradeOffAnalysisScore: number;
  overallScore: number;
  expertFeedback: string;
}

interface DiagramNode {
  id: string;
  type: 'service' | 'database' | 'queue';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiagramEdge {
  id: string;
  from: string;
  to: string;
}

interface DiagramState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const unwrapData = <T,>(raw: unknown): T => {
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in (raw as Record<string, unknown>) &&
    (raw as Record<string, unknown>).data !== undefined
  ) {
    return (raw as Record<string, unknown>).data as T;
  }

  return raw as T;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOverallScore = (score: unknown): number => {
  const normalizedScore = toNumber(score, 0);

  if (!Number.isFinite(normalizedScore)) {
    return 0;
  }

  if (normalizedScore <= 1) {
    return Number((normalizedScore * 10).toFixed(1));
  }

  return Number(normalizedScore.toFixed(1));
};

const toDisplayTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const defaultDiagramState: DiagramState = {
  nodes: [],
  edges: [],
};

const buildDiagramSummary = (diagram: DiagramState): string => {
  if (diagram.nodes.length === 0) {
    return '';
  }

  const nodes = diagram.nodes
    .map((node, index) => `${index + 1}. ${node.label} [${node.type}]`)
    .join('\n');

  const edges = diagram.edges
    .map((edge, index) => {
      const from = diagram.nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
      const to = diagram.nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
      return `${index + 1}. ${from} -> ${to}`;
    })
    .join('\n');

  return [
    'Diagram Summary',
    'Components:',
    nodes,
    '',
    'Connections:',
    edges || 'No explicit connections yet.',
  ].join('\n');
};

const composeSubmissionDocument = (draft: string, diagram: DiagramState): string => {
  const text = draft.trim();
  const diagramSummary = buildDiagramSummary(diagram);

  if (!diagramSummary) {
    return text;
  }

  if (!text) {
    return `Candidate submitted a diagram-first architecture.\n\n${diagramSummary}`;
  }

  return `${text}\n\n${diagramSummary}`;
};

export default function SystemDesignWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const problemId = Number(id);
  const draftKey = `system-design:draft:${problemId}`;
  const diagramKey = `system-design:diagram:${problemId}`;

  const [problem, setProblem] = useState<SystemDesignProblem | null>(null);
  const [submissions, setSubmissions] = useState<SystemDesignSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('brief');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('split');
  const [designText, setDesignText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<PendingResult | null>(null);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>('select');
  const [diagram, setDiagram] = useState<DiagramState>(defaultDiagramState);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingConnectFrom, setPendingConnectFrom] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);

  const [interactionStats, setInteractionStats] = useState<InteractionStats>({
    keyStrokes: 0,
    mouseClicks: 0,
    tabSwitches: 0,
    focusLosses: 0,
    pasteCount: 0,
  });

  useEffect(() => {
    if (!Number.isFinite(problemId) || problemId <= 0) {
      setError('Invalid problem id.');
      setLoading(false);
      return;
    }

    const fetchWorkspaceData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [problemResponse, submissionResponse] = await Promise.all([
          systemDesignAPI.getProblem(problemId),
          systemDesignAPI.getUserSubmissions(50, 0),
        ]);

        const fetchedProblem = unwrapData<SystemDesignProblem>(problemResponse.data);
        const allSubmissions = unwrapData<SystemDesignSubmission[]>(submissionResponse.data);
        const problemSubmissions = allSubmissions.filter((item) => item.problemId === problemId);

        setProblem(fetchedProblem);
        setSubmissions(
          problemSubmissions.map((submission) => ({
            ...submission,
            architectureScore: toNumber(submission.architectureScore),
            scalabilityScore: toNumber(submission.scalabilityScore),
            reliabilityScore: toNumber(submission.reliabilityScore),
            tradeOffAnalysisScore: toNumber(submission.tradeOffAnalysisScore),
            overallScore: toNumber(submission.overallScore),
          }))
        );
        if (problemSubmissions.length > 0) {
          const latest = problemSubmissions[0];
          setResult({
            architectureScore: toNumber(latest.architectureScore),
            scalabilityScore: toNumber(latest.scalabilityScore),
            reliabilityScore: toNumber(latest.reliabilityScore),
            tradeOffAnalysisScore: toNumber(latest.tradeOffAnalysisScore),
            overallScore: toNumber(latest.overallScore),
            expertFeedback: latest.expertFeedback,
          });
        }
      } catch (fetchError) {
        setError('Failed to load workspace. Please try again.');
        console.error(fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaceData();
  }, [problemId]);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftKey);
    if (savedDraft) {
      setDesignText(savedDraft);
    }

    const savedDiagram = window.localStorage.getItem(diagramKey);
    if (savedDiagram) {
      try {
        const parsed = JSON.parse(savedDiagram) as DiagramState;
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setDiagram(parsed);
        }
      } catch {
        setDiagram(defaultDiagramState);
      }
    }
  }, [draftKey, diagramKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onWindowBlur = () => {
      setInteractionStats((prev) => ({ ...prev, focusLosses: prev.focusLosses + 1 }));
    };

    const onWindowClick = () => {
      setInteractionStats((prev) => ({ ...prev, mouseClicks: prev.mouseClicks + 1 }));
    };

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('click', onWindowClick);

    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('click', onWindowClick);
    };
  }, []);

  const switchTab = useCallback((tab: WorkspaceTab) => {
    setActiveTab(tab);
    setInteractionStats((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
  }, []);

  const handleSaveDraft = useCallback(() => {
    window.localStorage.setItem(draftKey, designText);
    window.localStorage.setItem(diagramKey, JSON.stringify(diagram));
  }, [designText, draftKey, diagramKey, diagram]);

  const createNode = useCallback(
    (x: number, y: number, type: Exclude<CanvasTool, 'select' | 'connect'>) => {
      const width = 158;
      const height = 72;
      const sameTypeCount = diagram.nodes.filter((node) => node.type === type).length;
      const idValue = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const labelPrefix =
        type === 'service' ? 'Service' : type === 'database' ? 'Database' : 'Queue';

      const nextNode: DiagramNode = {
        id: idValue,
        type,
        label: `${labelPrefix} ${sameTypeCount + 1}`,
        x,
        y,
        width,
        height,
      };

      setDiagram((prev) => ({ ...prev, nodes: [...prev.nodes, nextNode] }));
      setSelectedNodeId(nextNode.id);
    },
    [diagram.nodes]
  );

  const handleBoardClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!boardRef.current) {
        return;
      }

      if (event.target !== boardRef.current) {
        return;
      }

      if (canvasTool === 'select') {
        setSelectedNodeId(null);
        setPendingConnectFrom(null);
        return;
      }

      if (canvasTool === 'connect') {
        return;
      }

      const rect = boardRef.current.getBoundingClientRect();
      const baseX = event.clientX - rect.left - 80;
      const baseY = event.clientY - rect.top - 36;
      createNode(Math.max(12, baseX), Math.max(12, baseY), canvasTool);
      setInteractionStats((prev) => ({ ...prev, mouseClicks: prev.mouseClicks + 1 }));
    },
    [canvasTool, createNode]
  );

  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    setDiagram((prev) => ({
      nodes: prev.nodes.filter((node) => node.id !== selectedNodeId),
      edges: prev.edges.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId),
    }));
    setSelectedNodeId(null);
    setPendingConnectFrom(null);
  }, [selectedNodeId]);

  const handleClearDiagram = useCallback(() => {
    setDiagram(defaultDiagramState);
    setSelectedNodeId(null);
    setPendingConnectFrom(null);
  }, []);

  const beginNodeDrag = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      event.stopPropagation();
      const node = diagram.nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      if (canvasTool === 'connect') {
        setSelectedNodeId(nodeId);
        if (!pendingConnectFrom) {
          setPendingConnectFrom(nodeId);
          return;
        }

        if (pendingConnectFrom !== nodeId) {
          setDiagram((prev) => {
            const exists = prev.edges.some(
              (edge) =>
                (edge.from === pendingConnectFrom && edge.to === nodeId) ||
                (edge.from === nodeId && edge.to === pendingConnectFrom)
            );
            if (exists) {
              return prev;
            }

            return {
              ...prev,
              edges: [
                ...prev.edges,
                {
                  id: `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  from: pendingConnectFrom,
                  to: nodeId,
                },
              ],
            };
          });
        }

        setPendingConnectFrom(null);
        return;
      }

      setSelectedNodeId(nodeId);
      if (canvasTool !== 'select') {
        return;
      }

      dragStateRef.current = {
        nodeId,
        offsetX: event.clientX - node.x,
        offsetY: event.clientY - node.y,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!boardRef.current || !dragStateRef.current) {
          return;
        }

        const rect = boardRef.current.getBoundingClientRect();
        const nextX = moveEvent.clientX - rect.left - dragStateRef.current.offsetX;
        const nextY = moveEvent.clientY - rect.top - dragStateRef.current.offsetY;

        setDiagram((prev) => ({
          ...prev,
          nodes: prev.nodes.map((item) =>
            item.id === dragStateRef.current?.nodeId
              ? {
                  ...item,
                  x: Math.min(Math.max(8, nextX), Math.max(8, rect.width - item.width - 8)),
                  y: Math.min(Math.max(8, nextY), Math.max(8, rect.height - item.height - 8)),
                }
              : item
          ),
        }));
      };

      const handleMouseUp = () => {
        dragStateRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [canvasTool, diagram.nodes, pendingConnectFrom]
  );

  const handleNodeLabelEdit = useCallback((nodeId: string, value: string) => {
    setDiagram((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === nodeId ? { ...node, label: value.slice(0, 42) } : node
      ),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!problem) {
      return;
    }

    const finalDocument = composeSubmissionDocument(designText, diagram);
    if (!finalDocument) {
      setError('Provide either written design notes or a diagram before evaluation.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await systemDesignAPI.submitSolution(problem.id, finalDocument);
      const submission = unwrapData<SystemDesignSubmission>(response.data);

      const mappedResult: PendingResult = {
        architectureScore: toNumber(submission.architectureScore),
        scalabilityScore: toNumber(submission.scalabilityScore),
        reliabilityScore: toNumber(submission.reliabilityScore),
        tradeOffAnalysisScore: toNumber(submission.tradeOffAnalysisScore),
        overallScore: toNumber(submission.overallScore),
        expertFeedback: submission.expertFeedback,
      };

      setResult(mappedResult);
      setSubmissions((prev) => [
        {
          ...submission,
          architectureScore: toNumber(submission.architectureScore),
          scalabilityScore: toNumber(submission.scalabilityScore),
          reliabilityScore: toNumber(submission.reliabilityScore),
          tradeOffAnalysisScore: toNumber(submission.tradeOffAnalysisScore),
          overallScore: toNumber(submission.overallScore),
        },
        ...prev,
      ]);
      window.localStorage.setItem(draftKey, designText);
      window.localStorage.setItem(diagramKey, JSON.stringify(diagram));
    } catch (submitError) {
      setError('Could not evaluate this design right now. Please retry in a moment.');
      console.error(submitError);
    } finally {
      setSubmitting(false);
    }
  }, [designText, diagram, diagramKey, draftKey, problem]);

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === 's') {
          event.preventDefault();
          handleSaveDraft();
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          await handleSubmit();
          return;
        }
      }

      if (event.altKey) {
        if (event.key === '1') {
          event.preventDefault();
          switchTab('brief');
        } else if (event.key === '2') {
          event.preventDefault();
          switchTab('requirements');
        } else if (event.key === '3') {
          event.preventDefault();
          switchTab('constraints');
        } else if (event.key === '4') {
          event.preventDefault();
          switchTab('history');
        } else if (event.key.toLowerCase() === 'w') {
          event.preventDefault();
          setWorkspaceMode('write');
        } else if (event.key.toLowerCase() === 'd') {
          event.preventDefault();
          setWorkspaceMode('draw');
        } else if (event.key.toLowerCase() === 'x') {
          event.preventDefault();
          setWorkspaceMode('split');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveDraft, handleSubmit, switchTab]);

  const wordCount = useMemo(() => {
    return designText.trim().length === 0 ? 0 : designText.trim().split(/\s+/).length;
  }, [designText]);

  const diagramNodeCount = diagram.nodes.length;
  const diagramEdgeCount = diagram.edges.length;

  const nodeCenterMap = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    diagram.nodes.forEach((node) => {
      map[node.id] = {
        x: node.x + node.width / 2,
        y: node.y + node.height / 2,
      };
    });
    return map;
  }, [diagram.nodes]);

  const wordsPerMinute = useMemo(() => {
    const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
    return Math.round(wordCount / minutes);
  }, [elapsedSeconds, wordCount]);

  const completionPct = useMemo(() => {
    if (!problem?.estimatedTimeMinutes) {
      return 0;
    }
    const targetSeconds = problem.estimatedTimeMinutes * 60;
    return Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));
  }, [elapsedSeconds, problem?.estimatedTimeMinutes]);

  if (loading) {
    return (
      <div className={styles.pageState}>
        <p>Loading system design workspace...</p>
      </div>
    );
  }

  if (!problem || error === 'Invalid problem id.') {
    return (
      <div className={styles.pageState}>
        <p>{error ?? 'Problem not found.'}</p>
        <button className={styles.secondaryBtn} onClick={() => navigate('/system-design')}>
          Back to problems
        </button>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/system-design')}>
          ← Back to Problems
        </button>
        <div className={styles.headerInfo}>
          <h1>{problem.title}</h1>
          <p>{problem.description}</p>
          <div className={styles.metaRow}>
            <span className={`${styles.difficulty} ${styles[problem.difficulty] ?? ''}`}>
              {problem.difficulty.toUpperCase()}
            </span>
            <span className={styles.metaPill}>Target {problem.estimatedTimeMinutes ?? 45} min</span>
            <span className={styles.metaPill}>Elapsed {toDisplayTime(elapsedSeconds)}</span>
            <span className={styles.metaPill}>{completionPct}% of target window</span>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <section className={styles.leftPanel}>
          <div className={styles.tabBar}>
            <button className={activeTab === 'brief' ? styles.activeTab : ''} onClick={() => switchTab('brief')}>
              Brief (Alt+1)
            </button>
            <button className={activeTab === 'requirements' ? styles.activeTab : ''} onClick={() => switchTab('requirements')}>
              Requirements (Alt+2)
            </button>
            <button className={activeTab === 'constraints' ? styles.activeTab : ''} onClick={() => switchTab('constraints')}>
              Constraints (Alt+3)
            </button>
            <button className={activeTab === 'history' ? styles.activeTab : ''} onClick={() => switchTab('history')}>
              Submissions (Alt+4)
            </button>
          </div>

          <div className={styles.tabBody}>
            {activeTab === 'brief' && (
              <div className={styles.readPane}>
                <h2>Problem Brief</h2>
                <p>{problem.description}</p>
              </div>
            )}

            {activeTab === 'requirements' && (
              <div className={styles.readPane}>
                <h2>Functional Requirements</h2>
                <pre>{problem.requirements || 'No explicit requirements available for this prompt.'}</pre>
              </div>
            )}

            {activeTab === 'constraints' && (
              <div className={styles.readPane}>
                <h2>Constraints & Scale</h2>
                <pre>{problem.constraints || 'No explicit constraints provided.'}</pre>
              </div>
            )}

            {activeTab === 'history' && (
              <div className={styles.historyPane}>
                <h2>Your Recent Submissions</h2>
                {submissions.length === 0 && <p>No past submissions for this problem yet.</p>}
                {submissions.map((submission) => (
                  <article key={submission.id} className={styles.historyCard}>
                    <div className={styles.historyHeader}>
                      <span>#{submission.id}</span>
                      <span>Overall {normalizeOverallScore(submission.overallScore)}/10</span>
                    </div>
                    <p>{submission.expertFeedback}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={styles.rightPanel}>
          <div className={styles.editorToolbar}>
            <div className={styles.shortcutHint}>
              Save: Ctrl/Cmd+S • Evaluate: Ctrl/Cmd+Enter • Modes: Alt+W / Alt+D / Alt+X
            </div>
            <div className={styles.actionGroup}>
              <button className={styles.secondaryBtn} onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button className={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Evaluating...' : 'Evaluate Design'}
              </button>
            </div>
          </div>

          <div className={styles.modeSwitch}>
            <button
              className={workspaceMode === 'write' ? styles.modeActive : ''}
              onClick={() => setWorkspaceMode('write')}
            >
              Writing View
            </button>
            <button
              className={workspaceMode === 'draw' ? styles.modeActive : ''}
              onClick={() => setWorkspaceMode('draw')}
            >
              Drawing View
            </button>
            <button
              className={workspaceMode === 'split' ? styles.modeActive : ''}
              onClick={() => setWorkspaceMode('split')}
            >
              Split View
            </button>
          </div>

          <div
            className={`${styles.designWorkspace} ${
              workspaceMode === 'split' ? styles.splitWorkspace : ''
            }`}
          >
            {workspaceMode !== 'draw' && (
              <div className={styles.writePane}>
                <textarea
                  className={styles.designEditor}
                  value={designText}
                  onChange={(event) => {
                    setDesignText(event.target.value);
                    setInteractionStats((prev) => ({ ...prev, keyStrokes: prev.keyStrokes + 1 }));
                  }}
                  onPaste={() =>
                    setInteractionStats((prev) => ({ ...prev, pasteCount: prev.pasteCount + 1 }))
                  }
                  placeholder="Document APIs, data model, traffic patterns, bottlenecks, and trade-offs..."
                />
              </div>
            )}

            {workspaceMode !== 'write' && (
              <div className={styles.drawPane}>
                <div className={styles.canvasToolbar}>
                  <button
                    className={canvasTool === 'select' ? styles.toolActive : ''}
                    onClick={() => {
                      setCanvasTool('select');
                      setPendingConnectFrom(null);
                    }}
                  >
                    Select
                  </button>
                  <button
                    className={canvasTool === 'service' ? styles.toolActive : ''}
                    onClick={() => setCanvasTool('service')}
                  >
                    Service
                  </button>
                  <button
                    className={canvasTool === 'database' ? styles.toolActive : ''}
                    onClick={() => setCanvasTool('database')}
                  >
                    Database
                  </button>
                  <button
                    className={canvasTool === 'queue' ? styles.toolActive : ''}
                    onClick={() => setCanvasTool('queue')}
                  >
                    Queue
                  </button>
                  <button
                    className={canvasTool === 'connect' ? styles.toolActive : ''}
                    onClick={() => setCanvasTool('connect')}
                  >
                    Connect
                  </button>

                  <button
                    className={styles.canvasActionBtn}
                    onClick={handleDeleteSelectedNode}
                    disabled={!selectedNodeId}
                  >
                    Delete Selected
                  </button>
                  <button className={styles.canvasActionBtn} onClick={handleClearDiagram}>
                    Clear Canvas
                  </button>
                </div>

                <div className={styles.canvasHintRow}>
                  <span>
                    Tip: choose a node tool, click canvas to place, switch to Connect tool and click two
                    nodes to link.
                  </span>
                  {pendingConnectFrom && <span className={styles.connectHint}>Select target node...</span>}
                </div>

                <div className={styles.canvasBoard} ref={boardRef} onClick={handleBoardClick}>
                  <svg className={styles.canvasEdges}>
                    {diagram.edges.map((edge) => {
                      const fromCenter = nodeCenterMap[edge.from];
                      const toCenter = nodeCenterMap[edge.to];
                      if (!fromCenter || !toCenter) {
                        return null;
                      }
                      return (
                        <g key={edge.id}>
                          <line
                            x1={fromCenter.x}
                            y1={fromCenter.y}
                            x2={toCenter.x}
                            y2={toCenter.y}
                            className={styles.edgeLine}
                          />
                          <circle cx={toCenter.x} cy={toCenter.y} r="3.3" className={styles.edgeEnd} />
                        </g>
                      );
                    })}
                  </svg>

                  {diagram.nodes.map((node) => (
                    <div
                      key={node.id}
                      className={`${styles.canvasNode} ${styles[node.type]} ${
                        selectedNodeId === node.id ? styles.nodeSelected : ''
                      } ${pendingConnectFrom === node.id ? styles.pendingNode : ''}`}
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${node.width}px`,
                        height: `${node.height}px`,
                      }}
                      onMouseDown={(event) => beginNodeDrag(event, node.id)}
                    >
                      <input
                        value={node.label}
                        onChange={(event) => handleNodeLabelEdit(node.id, event.target.value)}
                        onMouseDown={(event) => event.stopPropagation()}
                      />
                      <span>{node.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.metricsGrid}>
            <Metric label="Words" value={wordCount} />
            <Metric label="WPM" value={wordsPerMinute} />
            <Metric label="Diagram Nodes" value={diagramNodeCount} />
            <Metric label="Diagram Links" value={diagramEdgeCount} />
            <Metric label="Clicks" value={interactionStats.mouseClicks} />
            <Metric label="Keystrokes" value={interactionStats.keyStrokes} />
            <Metric label="Tab Switches" value={interactionStats.tabSwitches} />
            <Metric label="Focus Loss" value={interactionStats.focusLosses} />
            <Metric label="Paste Count" value={interactionStats.pasteCount} />
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          {result && (
            <div className={styles.evaluationPanel}>
              <div className={styles.evaluationHeader}>
                <h3>AI Evaluation</h3>
                <span className={styles.overallBadge}>Overall {normalizeOverallScore(result.overallScore)}/10</span>
              </div>

              <ScoreRow label="Architecture" value={result.architectureScore} />
              <ScoreRow label="Scalability" value={result.scalabilityScore} />
              <ScoreRow label="Reliability" value={result.reliabilityScore} />
              <ScoreRow label="Trade-offs" value={result.tradeOffAnalysisScore} />

              <div className={styles.feedbackBox}>
                <strong>Feedback</strong>
                <p>{result.expertFeedback}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: unknown }) {
  const safeValue = toNumber(value, 0);
  const width = Math.min(100, Math.max(0, safeValue * 10));

  return (
    <div className={styles.scoreRow}>
      <div className={styles.scoreMeta}>
        <span>{label}</span>
        <span>{safeValue.toFixed(1)}/10</span>
      </div>
      <div className={styles.scoreTrack}>
        <div className={styles.scoreFill} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
