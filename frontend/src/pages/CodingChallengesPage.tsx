import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCodingStore } from '../stores/codingStore';
import { codingAPI } from '../services/api';
import styles from './CodingChallengesPage.module.css';

export default function CodingChallengesPage() {
  const navigate = useNavigate();
  const store = useCodingStore();
  const [challenges, setChallenges] = useState(store.challenges);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        const response = await codingAPI.searchChallenges({
          difficulty: store.filterDifficulty === 'all' ? undefined : store.filterDifficulty,
          category: store.selectedCategory === 'all' ? undefined : store.selectedCategory,
          limit: 50,
          offset: 0,
        });
        const payload = response.data?.data ?? response.data ?? [];
        setChallenges(payload);
        store.setChallenges(payload);
      } catch (error) {
        console.error('Error fetching challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [store.filterDifficulty, store.selectedCategory]);

  const handleChallengeClick = (challenge: any) => {
    store.setCurrentChallenge(challenge);
    navigate(`/coding/${challenge.id}`);
  };

  const categories = ['Arrays', 'Strings', 'Trees', 'Graphs', 'DP', 'Greedy', 'Hash', 'Heap'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Coding Challenges</h1>
        <p>{challenges.length} problems available</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Difficulty</label>
          <select
            value={store.filterDifficulty}
            onChange={(e) => store.setFilterDifficulty(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Category</label>
          <select
            value={store.selectedCategory}
            onChange={(e) => store.setSelectedCategory(e.target.value)}
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading challenges...</div>
      ) : (
        <div className={styles.grid}>
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className={styles.card}
              onClick={() => handleChallengeClick(challenge)}
            >
              <div className={styles.cardHeader}>
                <h3>{challenge.title}</h3>
                <span className={`${styles.difficulty} ${styles[challenge.difficulty]}`}>
                  {challenge.difficulty.toUpperCase()}
                </span>
              </div>
              <p className={styles.category}>{challenge.category}</p>
              <div className={styles.stats}>
                <span>{(challenge.acceptance_rate ?? challenge.acceptanceRate ?? 0).toFixed(1)}% Accept</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
