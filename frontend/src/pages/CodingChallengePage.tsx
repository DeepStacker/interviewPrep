import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  codingAPI,
  type CodingExecutionCaseResult,
  type CodingRunResult,
  type CodingSubmissionResult,
} from '../services/api';
import CodeEditor from '../components/CodeEditor';
import styles from './CodingChallengePage.module.css';

const toNumberOrZero = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type ExampleCase = {
  input: string;
  output: string;
  explanation?: string;
};

type Challenge = {
  id: number;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  problemStatement?: string;
  constraints?: string;
  acceptance_rate?: number | string;
  acceptanceRate?: number | string;
  examples?: ExampleCase[];
  totalTestCases?: number;
  sampleTestCases?: number;
};

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python 3' },
  { value: 'javascript', label: 'JavaScript (Node.js)' },
  { value: 'java', label: 'Java 17' },
  { value: 'cpp', label: 'C++17' },
];

const buildStarterCode = (title: string, language: string): string => {
  const normalizedTitle = title.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();

  if (language === 'javascript') {
    return `function solve(input) {
  // Parse input and compute answer for ${title}
  return '';
}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');
const output = solve(input.trimEnd());
process.stdout.write(String(output) + '\\n');`;
  }

  if (language === 'java') {
    return `import java.io.*;

public class Main {
  private static String solve(String input) {
    // Parse input and compute answer for ${title}
    return "";
  }

  public static void main(String[] args) throws Exception {
    BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
    StringBuilder sb = new StringBuilder();
    String line;
    while ((line = reader.readLine()) != null) {
      sb.append(line).append("\\n");
    }
    String output = solve(sb.toString().trim());
    System.out.println(output);
  }
}`;
  }

  if (language === 'cpp') {
    return `#include <bits/stdc++.h>
using namespace std;

string solve(const string& input) {
  // Parse input and compute answer for ${title}
  return "";
}

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
  string output = solve(input);
  cout << output << "\\n";
  return 0;
}`;
  }

  return `import sys


def solve(raw_input: str) -> str:
    # Parse input and compute answer for ${title}
    return ""


if __name__ == "__main__":
    data = sys.stdin.read().rstrip("\\n")
    result = solve(data)
    sys.stdout.write(str(result) + "\\n")`;
};

const mapSubmissionToRunResult = (submission: CodingSubmissionResult): CodingRunResult => ({
  mode: 'sample',
  status: submission.isAccepted ? 'Accepted' : 'Rejected',
  passedTests: submission.passedTestCases,
  totalTests: submission.totalTestCases,
  score: toNumberOrZero(submission.score),
  averageTimeMs: submission.timeTakenMs ?? 0,
  averageMemoryMb: toNumberOrZero(submission.memoryUsedMb),
  stderr: submission.feedback,
  testResults: submission.testResults ?? [],
});

export default function CodingChallengePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [activeTab, setActiveTab] = useState<'description' | 'testcases' | 'submissions'>('description');
  const [selectedTestIndex, setSelectedTestIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<CodingRunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<CodingSubmissionResult | null>(null);
  const [submissions, setSubmissions] = useState<CodingSubmissionResult[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoading(true);
        const challengeResponse = await codingAPI.getChallenge(parseInt(id!, 10));
        const fetchedChallenge = challengeResponse.data?.data ?? challengeResponse.data;

        setChallenge(fetchedChallenge);
        setCode(buildStarterCode(fetchedChallenge.title, language));

        const submissionsResponse = await codingAPI.getUserSubmissions(30, 0);
        const allSubmissions = submissionsResponse.data?.data ?? submissionsResponse.data ?? [];
        const challengeSubmissions = allSubmissions.filter(
          (submission: CodingSubmissionResult) => Number(submission.challengeId) === Number(id)
        );
        setSubmissions(challengeSubmissions);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching challenge:', error);
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [id]);

  const selectedExample = useMemo(() => {
    const examples = challenge?.examples ?? [];
    if (examples.length === 0) {
      return null;
    }
    return examples[Math.min(selectedTestIndex, examples.length - 1)];
  }, [challenge?.examples, selectedTestIndex]);

  const handleLanguageChange = (nextLanguage: string) => {
    setLanguage(nextLanguage);
    if (!challenge) {
      return;
    }

    const currentTemplate = buildStarterCode(challenge.title, language);
    if (!code.trim() || code === currentTemplate) {
      setCode(buildStarterCode(challenge.title, nextLanguage));
    }
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      setSubmitError('Write code before running test cases.');
      return;
    }

    try {
      setSubmitError(null);
      setRunning(true);
      const response = await codingAPI.runCode(
        parseInt(id!, 10),
        code,
        language,
        customInput.trim() ? customInput : undefined
      );
      setRunResult(response.data);
      setActiveTab('testcases');
    } catch (error: any) {
      console.error('Error running code:', error);

      const statusCode = Number(error?.response?.status || 0);
      const isRunEndpointMissing = statusCode === 404;

      if (isRunEndpointMissing) {
        if (customInput.trim()) {
          setSubmitError('Custom input run is unavailable until backend route /coding/run is enabled.');
          return;
        }

        try {
          const fallbackResponse = await codingAPI.submitSolution(parseInt(id!, 10), code, language);
          const submission = fallbackResponse.data;
          setRunResult(mapSubmissionToRunResult(submission));
          setSubmitError('Run endpoint unavailable; executed using full submission compatibility mode.');
          setActiveTab('testcases');
          return;
        } catch (fallbackError: any) {
          setSubmitError(
            fallbackError?.response?.data?.error ||
              'Run endpoint unavailable and fallback execution failed.'
          );
          return;
        }
      }

      setSubmitError(error?.response?.data?.error || 'Unable to run code.');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setSubmitError('Write code before submitting.');
      return;
    }

    try {
      setSubmitError(null);
      setSubmitting(true);
      const response = await codingAPI.submitSolution(parseInt(id!, 10), code, language);
      const submission = response.data;

      setSubmitResult(submission);
      setSubmissions((prev) => [submission, ...prev].slice(0, 30));
      setActiveTab('submissions');
    } catch (error: any) {
      console.error('Error submitting code:', error);
      setSubmitError(error?.response?.data?.error || 'Error submitting code.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading challenge...</div>;
  }

  if (!challenge) {
    return <div className={styles.container}>Challenge not found</div>;
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/coding')}>
          ← Back to Challenges
        </button>

        <div className={styles.challengeMetaCompact}>
          <h1>{challenge.title}</h1>
          <div className={styles.metaPills}>
            <span className={`${styles.difficulty} ${styles[challenge.difficulty]}`}>
              {challenge.difficulty.toUpperCase()}
            </span>
            <span className={styles.category}>{challenge.category}</span>
            <span className={styles.metricPill}>
              {toNumberOrZero(challenge.acceptance_rate ?? challenge.acceptanceRate).toFixed(1)}% acceptance
            </span>
            <span className={styles.metricPill}>
              {(challenge.totalTestCases ?? 0)} tests ({challenge.sampleTestCases ?? 0} samples)
            </span>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.leftPanel}>
          <div className={styles.leftTabs}>
            <button
              className={activeTab === 'description' ? styles.activeTab : ''}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button
              className={activeTab === 'testcases' ? styles.activeTab : ''}
              onClick={() => setActiveTab('testcases')}
            >
              Testcases
            </button>
            <button
              className={activeTab === 'submissions' ? styles.activeTab : ''}
              onClick={() => setActiveTab('submissions')}
            >
              Submissions
            </button>
          </div>

          {activeTab === 'description' && (
            <div className={styles.tabBody}>
              <h2>Problem</h2>
              <p className={styles.bodyText}>{challenge.description || challenge.problemStatement}</p>

              {challenge.constraints && (
                <>
                  <h3>Constraints</h3>
                  <p className={styles.bodyText}>{challenge.constraints}</p>
                </>
              )}

              <h3>Sample Cases</h3>
              <div className={styles.exampleList}>
                {(challenge.examples ?? []).map((example, index) => (
                  <article key={`${example.input}-${index}`} className={styles.exampleCard}>
                    <div className={styles.exampleHeader}>Example {index + 1}</div>
                    <div className={styles.exampleContent}>
                      <strong>Input</strong>
                      <pre>{example.input || '(empty)'}</pre>
                    </div>
                    <div className={styles.exampleContent}>
                      <strong>Expected output</strong>
                      <pre>{example.output || '(empty)'}</pre>
                    </div>
                    {example.explanation && <p className={styles.exampleExplain}>{example.explanation}</p>}
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'testcases' && (
            <div className={styles.tabBody}>
              <h2>Test Runner</h2>
              <p className={styles.bodyText}>Run on sample tests or provide custom input in stdin format.</p>

              <div className={styles.customInputSection}>
                <label htmlFor="custom-input">Custom Input (optional)</label>
                <textarea
                  id="custom-input"
                  value={customInput}
                  onChange={(event) => setCustomInput(event.target.value)}
                  placeholder="Leave empty to run sample testcases from database"
                />
              </div>

              {(challenge.examples?.length ?? 0) > 0 && (
                <div className={styles.sampleSelector}>
                  {(challenge.examples ?? []).map((_, index) => (
                    <button
                      key={`sample-${index}`}
                      className={selectedTestIndex === index ? styles.activeSample : ''}
                      onClick={() => setSelectedTestIndex(index)}
                    >
                      Sample {index + 1}
                    </button>
                  ))}
                </div>
              )}

              {selectedExample && !customInput.trim() && (
                <div className={styles.selectedSampleView}>
                  <div>
                    <strong>Input</strong>
                    <pre>{selectedExample.input}</pre>
                  </div>
                  <div>
                    <strong>Expected output</strong>
                    <pre>{selectedExample.output}</pre>
                  </div>
                </div>
              )}

              {runResult && (
                <div className={styles.resultCard}>
                  <div className={styles.resultSummary}>
                    <span className={runResult.status === 'Accepted' ? styles.accepted : styles.rejected}>
                      {runResult.status}
                    </span>
                    <span>{runResult.mode === 'custom' ? 'Custom run' : 'Sample run'}</span>
                    <span>{runResult.passedTests}/{runResult.totalTests} passed</span>
                    <span>{runResult.averageTimeMs} ms avg</span>
                    <span>{runResult.averageMemoryMb} MB avg</span>
                  </div>

                  {runResult.output && (
                    <div className={styles.outputPane}>
                      <strong>Output</strong>
                      <pre>{runResult.output}</pre>
                    </div>
                  )}

                  {runResult.stderr && (
                    <div className={styles.errorPane}>
                      <strong>Runtime Error</strong>
                      <pre>{runResult.stderr}</pre>
                    </div>
                  )}

                  {runResult.compileOutput && (
                    <div className={styles.errorPane}>
                      <strong>Compiler Output</strong>
                      <pre>{runResult.compileOutput}</pre>
                    </div>
                  )}

                  {runResult.testResults.length > 0 && (
                    <div className={styles.caseResultList}>
                      {runResult.testResults.map((test) => (
                        <CaseResultCard key={`run-case-${test.caseNumber}`} test={test} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className={styles.tabBody}>
              <h2>Submission History</h2>
              <p className={styles.bodyText}>Recent submissions for this problem from your account.</p>

              {submitResult && (
                <div className={styles.resultCard}>
                  <div className={styles.resultSummary}>
                    <span className={submitResult.isAccepted ? styles.accepted : styles.rejected}>
                      {submitResult.isAccepted ? 'Accepted' : 'Rejected'}
                    </span>
                    <span>{submitResult.passedTestCases}/{submitResult.totalTestCases} passed</span>
                    <span>{toNumberOrZero(submitResult.score).toFixed(1)} score</span>
                    <span>{submitResult.timeTakenMs ?? 0} ms</span>
                    <span>{submitResult.memoryUsedMb ?? 0} MB</span>
                  </div>

                  {submitResult.feedback && (
                    <div className={styles.feedbackPane}>
                      <strong>Feedback</strong>
                      <p>{submitResult.feedback}</p>
                    </div>
                  )}

                  {(submitResult.testResults ?? []).length > 0 && (
                    <div className={styles.caseResultList}>
                      {(submitResult.testResults ?? []).map((test) => (
                        <CaseResultCard key={`submit-case-${test.caseNumber}`} test={test} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.submissionTable}>
                {submissions.length === 0 && <p className={styles.bodyText}>No submissions yet for this challenge.</p>}
                {submissions.map((submission) => (
                  <div key={submission.id} className={styles.submissionRow}>
                    <span>{submission.programmingLanguage}</span>
                    <span className={submission.isAccepted ? styles.accepted : styles.rejected}>
                      {submission.isAccepted ? 'Accepted' : 'Rejected'}
                    </span>
                    <span>{submission.passedTestCases}/{submission.totalTestCases}</span>
                    <span>{toNumberOrZero(submission.score).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className={styles.rightPanel}>
          <div className={styles.editorActions}>
            <button
              className={styles.secondaryBtn}
              onClick={handleRunCode}
              disabled={running || submitting}
            >
              {running ? 'Running...' : 'Run Code'}
            </button>

            <button
              className={styles.primaryBtn}
              onClick={handleSubmit}
              disabled={submitting || running}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          <CodeEditor
            code={code}
            setCode={setCode}
            language={language}
            languageOptions={LANGUAGE_OPTIONS}
            onLanguageChange={handleLanguageChange}
            onRun={handleRunCode}
            isRunning={running}
            runLabel="Run Sample"
            height="calc(100vh - 280px)"
          />

          {submitError && <p className={styles.errorText}>{submitError}</p>}
        </section>
      </div>
    </div>
  );
}

function CaseResultCard({ test }: { test: CodingExecutionCaseResult }) {
  return (
    <article className={styles.caseResultCard}>
      <div className={styles.caseHeader}>
        <span>Case {test.caseNumber}</span>
        <span className={test.passed ? styles.accepted : styles.rejected}>
          {test.passed ? 'Passed' : 'Failed'}
        </span>
        <span>{test.status}</span>
        <span>{test.timeTakenMs} ms</span>
      </div>

      {test.input && (
        <div className={styles.caseBody}>
          <strong>Input</strong>
          <pre>{test.input}</pre>
        </div>
      )}

      {test.expectedOutput && (
        <div className={styles.caseBody}>
          <strong>Expected</strong>
          <pre>{test.expectedOutput}</pre>
        </div>
      )}

      {test.stdout && (
        <div className={styles.caseBody}>
          <strong>Output</strong>
          <pre>{test.stdout}</pre>
        </div>
      )}

      {test.stderr && (
        <div className={styles.caseBody}>
          <strong>Error</strong>
          <pre>{test.stderr}</pre>
        </div>
      )}
    </article>
  );
}
