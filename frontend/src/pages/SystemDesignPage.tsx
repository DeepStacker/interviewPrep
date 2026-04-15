import { useState, useEffect } from 'react';
import { systemDesignAPI } from '../services/api';
import styles from './SystemDesignPage.module.css';

export default function SystemDesignPage() {
  const [problems, setProblems] = useState<any[]>([]);
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
        setProblems(response.data?.data ?? response.data ?? []);
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
              <button className={styles.startBtn}>Start Design</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
