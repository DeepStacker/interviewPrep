import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { codingAPI } from '../services/api';
import CodeEditor from '../components/CodeEditor';
import styles from './CodingChallengePage.module.css';

export default function CodingChallengePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const response = await codingAPI.getChallenge(parseInt(id!));
        setChallenge(response.data?.data ?? response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching challenge:', error);
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [id]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write some code first');
      return;
    }

    try {
      setSubmitting(true);
      const response = await codingAPI.submitSolution(parseInt(id!), code, language);
      setResult(response.data?.data ?? response.data);
    } catch (error) {
      console.error('Error submitting code:', error);
      alert('Error submitting code');
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
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate('/coding')}>
        ← Back
      </button>

      <div className={styles.layout}>
        {/* Problem Description */}
        <div className={styles.problemPanel}>
          <h1>{challenge.title}</h1>

          <div className={styles.meta}>
            <span className={`${styles.difficulty} ${styles[challenge.difficulty]}`}>
              {challenge.difficulty.toUpperCase()}
            </span>
            <span className={styles.category}>{challenge.category}</span>
          </div>

          <div className={styles.description}>
            <h3>Description</h3>
            <p>{challenge.description}</p>
          </div>

          <div className={styles.constraints}>
            <h4>Constraints</h4>
            <p>{challenge.constraints}</p>
          </div>

          <div className={styles.acceptance}>
            <p>
              <strong>Acceptance Rate:</strong> {(challenge.acceptance_rate ?? challenge.acceptanceRate ?? 0).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Code Editor */}
        <div className={styles.editorPanel}>
          <div className={styles.editorHeader}>
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <CodeEditor code={code} setCode={setCode} language={language} />

          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Solution'}
          </button>

          {result && (
            <div className={styles.result}>
              <h4>Result</h4>
              <div className={`${styles.status} ${(result.accepted ?? result.isAccepted) ? styles.accepted : styles.rejected}`}>
                {(result.accepted ?? result.isAccepted) ? '✓ Accepted' : '✗ Rejected'}
              </div>
              <p>
                <strong>Tests Passed:</strong> {(result.testsPassed ?? result.passedTestCases ?? 0)}/{(result.totalTests ?? result.totalTestCases ?? 0)}
              </p>
              <p>
                <strong>Score:</strong> {result.score}/100
              </p>
              {result.feedback && (
                <div className={styles.feedback}>
                  <strong>Feedback:</strong>
                  <p>{result.feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
