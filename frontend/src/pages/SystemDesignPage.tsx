import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { systemDesignAPI } from '../services/api';
import styles from './SystemDesignPage.module.css';

interface SystemDesignProblemListItem {
  id: number;
  title: string;
  description: string;
  difficulty: 'medium' | 'hard' | string;
  estimatedTimeMinutes?: number;
  estimated_time_minutes?: number;
  estimated_time?: number;
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

export default function SystemDesignPage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<SystemDesignProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const response = await systemDesignAPI.getProblems({
          difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
          limit: 50,
        });
        setProblems(unwrapData<SystemDesignProblemListItem[]>(response.data));
      } catch (error) {
        console.error('Error fetching problems:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [selectedDifficulty]);

  return (
    <div className={styles.container}>
      <button type="button" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <div className={styles.header}>
        <h1>System Design Problems</h1>
        <p>Practice designing large-scale systems</p>
      </div>

      <div className={styles.filters}>
        <label>Difficulty</label>
        <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
          <option value="all">All</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading problems...</div>
      ) : (
        <div className={styles.grid}>
          {problems.map((problem) => (
            <div key={problem.id} className={styles.card}>
              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
              <div className={styles.meta}>
                <span className={`${styles.difficulty} ${styles[problem.difficulty]}`}>
                  {problem.difficulty.toUpperCase()}
                </span>
                <span className={styles.time}>{problem.estimatedTimeMinutes ?? problem.estimated_time_minutes ?? problem.estimated_time ?? 45} min</span>
              </div>
              <button className={styles.startBtn} onClick={() => navigate(`/system-design/${problem.id}`)}>
                Start Design
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
