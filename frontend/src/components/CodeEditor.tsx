import React, { useState } from 'react';
import { Copy, Play, Download } from 'lucide-react';
import styles from './CodeEditor.module.css';

interface CodeEditorProps {
  language?: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  code?: string;
  setCode?: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language = 'python',
  initialCode = '',
  onCodeChange,
  readOnly = false,
  height = '500px',
  theme = 'dark',
  code: externalCode,
  setCode: externalSetCode,
}) => {
  const [internalCode, setInternalCode] = useState(initialCode);
  const code = externalCode ?? internalCode;
  const setCode = externalSetCode ?? setInternalCode;
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    if (externalSetCode) {
      externalSetCode(newCode);
    } else {
      setInternalCode(newCode);
    }
    onCodeChange?.(newCode);
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      setOutput('Local execution is disabled. Use "Submit Solution" to run against real test cases.');
    } catch (error) {
      setOutput(`Error: ${(error as Error).message}`);
    } finally {
      setIsRunning(false);
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

  return (
    <div className={`${styles.container} ${styles[theme]}`} style={{ height }}>
      <div className={styles.header}>
        <div className={styles.languageSelect}>
          <select value={language} disabled className={styles.select}>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
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
              disabled={isRunning}
              className={`${styles.actionBtn} ${styles.runBtn}`}
            >
              <Play size={18} />
              {isRunning ? 'Running...' : 'Run'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.editorContainer}>
        <textarea
          value={code}
          onChange={handleCodeChange}
          readOnly={readOnly}
          className={styles.editor}
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {output && (
        <div className={styles.output}>
          <div className={styles.outputHeader}>Output</div>
          <pre className={styles.outputContent}>{output}</pre>
        </div>
      )}
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
