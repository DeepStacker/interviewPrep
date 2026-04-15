import React, { useMemo, useRef, useState } from 'react';
import { Copy, Play, Download } from 'lucide-react';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  language?: string;
  languageOptions?: Array<{ value: string; label: string }>;
  onLanguageChange?: (language: string) => void;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onRun?: () => void;
  isRunning?: boolean;
  runLabel?: string;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  code?: string;
  setCode?: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language = 'python',
  languageOptions = [
    { value: 'python', label: 'Python 3' },
    { value: 'javascript', label: 'JavaScript (Node.js)' },
    { value: 'java', label: 'Java 17' },
    { value: 'cpp', label: 'C++17' },
  ],
  onLanguageChange,
  initialCode = '',
  onCodeChange,
  onRun,
  isRunning = false,
  runLabel = 'Run',
  readOnly = false,
  height = '500px',
  theme = 'dark',
  code: externalCode,
  setCode: externalSetCode,
}) => {
  const [internalCode, setInternalCode] = useState(initialCode);
  const code = externalCode ?? internalCode;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lineCount = useMemo(() => Math.max(code.split('\n').length, 1), [code]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    if (externalSetCode) {
      externalSetCode(newCode);
    } else {
      setInternalCode(newCode);
    }
    onCodeChange?.(newCode);
  };

  const handleRun = () => {
    if (!readOnly) {
      onRun?.();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `solution.${getFileExtension(language)}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();

      const target = event.currentTarget;
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      const updatedCode = `${code.substring(0, selectionStart)}  ${code.substring(selectionEnd)}`;

      if (externalSetCode) {
        externalSetCode(updatedCode);
      } else {
        setInternalCode(updatedCode);
      }
      onCodeChange?.(updatedCode);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const nextCaret = selectionStart + 2;
          textareaRef.current.selectionStart = nextCaret;
          textareaRef.current.selectionEnd = nextCaret;
        }
      });
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleRun();
    }
  };

  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, idx) => idx + 1).join('\n'),
    [lineCount]
  );

  return (
    <div className={`${styles.container} ${styles[theme]}`} style={{ height }}>
      <div className={styles.header}>
        <div className={styles.languageSelect}>
          <select
            value={language}
            disabled={readOnly}
            className={styles.select}
            onChange={(event) => onLanguageChange?.(event.target.value)}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleCopy}
            title="Copy code"
            className={styles.actionBtn}
          >
            <Copy size={18} />
          </button>
          <button
            onClick={handleDownload}
            title="Download code"
            className={styles.actionBtn}
          >
            <Download size={18} />
          </button>
          {!readOnly && (
            <button
              onClick={handleRun}
              disabled={isRunning || !onRun}
              className={`${styles.actionBtn} ${styles.runBtn}`}
            >
              <Play size={18} />
              {isRunning ? 'Running...' : runLabel}
            </button>
          )}
        </div>
      </div>

      <div className={styles.editorContainer}>
        <pre className={styles.gutter} aria-hidden>
          {lineNumbers}
        </pre>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          className={styles.editor}
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      <div className={styles.footer}>
        <span>{lineCount} lines</span>
        <span>Ctrl/Cmd + Enter to run</span>
      </div>
    </div>
  );
};

const getFileExtension = (language: string): string => {
  const extensions: { [key: string]: string } = {
    python: 'py',
    javascript: 'js',
    java: 'java',
    cpp: 'cpp',
  };
  return extensions[language] || 'txt';
};

export default CodeEditor;
