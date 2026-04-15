import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../services/api';
import styles from './LeaderboardPage.module.css';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'myrank'>('global');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await leaderboardAPI.getGlobal(100, 0);
        setLeaderboard(response.data.data);

        const rankResponse = await leaderboardAPI.getMyRank();
        setUserRank(rankResponse.data.data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className={styles.container}>
      <button type="button" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <div className={styles.header}>
        <h1>Leaderboard</h1>
        <p>Global rankings by experience points</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'global' ? styles.active : ''}`}
          onClick={() => setActiveTab('global')}
        >
          Global Ranking
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'myrank' ? styles.active : ''}`}
          onClick={() => setActiveTab('myrank')}
        >
          My Rank
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading leaderboard...</div>
      ) : activeTab === 'global' ? (
        <div className={styles.leaderboardTable}>
          <div className={styles.tableHeader}>
            <div className={styles.rank}>Rank</div>
            <div className={styles.user}>User</div>
            <div className={styles.points}>Total Points</div>
            <div className={styles.breakdown}>Coding</div>
            <div className={styles.breakdown}>Design</div>
            <div className={styles.breakdown}>Badges</div>
            <div className={styles.level}>Level</div>
          </div>

          {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={`${styles.tableRow} ${userRank?.rank === entry.rank ? styles.highlight : ''}`}
            >
              <div className={styles.rank}>
                <span className={styles.medal}>{getMedalEmoji(entry.rank)}</span>
              </div>
              <div className={styles.user}>
                <img src={entry.userPicture} alt={entry.userName} className={styles.avatar} />
                <div>
                  <p className={styles.name}>{entry.userName}</p>
                  <p className={styles.email}>{entry.userEmail}</p>
                </div>
              </div>
              <div className={styles.points}>
                <strong>{entry.totalPoints}</strong>
              </div>
              <div className={styles.breakdown}>{entry.codingPoints}</div>
              <div className={styles.breakdown}>{entry.systemDesignPoints}</div>
              <div className={styles.breakdown}>{entry.badges} 🏆</div>
              <div className={styles.level}>
                <span className={styles.levelBadge}>{entry.level}</span>
              </div>
            </div>
          ))}
        </div>
      ) : userRank ? (
        <div className={styles.myRankCard}>
          <div className={styles.rankDisplay}>
            <div className={styles.rankNumber}>{userRank.rank}</div>
            <div className={styles.rankInfo}>
              <p>Your Global Rank</p>
              <p className={styles.percentile}>Top {userRank.percentile}%</p>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Points</p>
              <p className={styles.statValue}>{userRank.totalPoints}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Coding Points</p>
              <p className={styles.statValue}>{userRank.codingScore}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Design Points</p>
              <p className={styles.statValue}>{userRank.systemDesignScore}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Problems Solved</p>
              <p className={styles.statValue}>{userRank.totalProblemsolved}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Design Submissions</p>
              <p className={styles.statValue}>{userRank.totalDesignSubmissions}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Mock Interviews</p>
              <p className={styles.statValue}>{userRank.mockInterviewCount}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Badges</p>
              <p className={styles.statValue}>{userRank.badges} 🏆</p>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.noData}>No rank data available</div>
      )}
    </div>
  );
}
