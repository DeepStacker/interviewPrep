import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { badgesAPI } from '../services/api';
import styles from './AchievementsPage.module.css';

export default function AchievementsPage() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);
        const response = await badgesAPI.getUserBadges();
        setBadges(response.data.data);
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, []);

  if (loading) {
    return <div className={styles.container}>Loading achievements...</div>;
  }

  if (!badges) {
    return <div className={styles.container}>No badge data available</div>;
  }

  const earnedBadges = badges.earned || [];
  const allBadges = badges.all || [];

  return (
    <div className={styles.container}>
      <button type="button" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ← Back
      </button>
      <div className={styles.header}>
        <h1>Achievements & Badges</h1>
        <p>
          {earnedBadges.length} of {allBadges.length} badges earned
        </p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.label}>Badges Earned</span>
          <span className={styles.value}>{earnedBadges.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.label}>Completion</span>
          <span className={styles.value}>{Math.round((earnedBadges.length / allBadges.length) * 100)}%</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Earned Badges</h2>
        {earnedBadges.length > 0 ? (
          <div className={styles.badgesGrid}>
            {earnedBadges.map((badge: any) => (
              <div key={badge.badge_slug} className={`${styles.badge} ${styles.earned}`}>
                <div className={styles.badgeIcon}>{badge.badge_name.charAt(0)}</div>
                <h4>{badge.badge_name}</h4>
                <p className={styles.earnedDate}>
                  {new Date(badge.earned_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMsg}>No badges earned yet. Keep practicing!</p>
        )}
      </div>

      <div className={styles.section}>
        <h2>Available Badges</h2>
        <div className={styles.badgesGrid}>
          {allBadges.map((badge: any) => (
            <div
              key={badge.slug}
              className={`${styles.badge} ${badge.earned ? styles.earned : styles.locked}`}
            >
              <div className={`${styles.badgeIcon} ${!badge.earned ? styles.inactive : ''}`}>
                {badge.icon}
              </div>
              <h4>{badge.name}</h4>
              <p>{badge.description}</p>
              <span className={`${styles.rarity} ${styles[badge.rarity]}`}>
                {badge.rarity.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
