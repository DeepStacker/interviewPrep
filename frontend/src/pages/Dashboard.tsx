import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { analyticsAPI, sessionsAPI } from '../services/api';
import { LogOut, Plus, TrendingUp, Award, Clock } from 'lucide-react';
import Navigation from '../components/Navigation';
import styles from './Dashboard.module.css';

interface DashboardStats {
  totalSessions: number;
  averageScore: string;
  recentSessions: any[];
  roleStats: any[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        const response = await analyticsAPI.getUserStats();
        setStats(response.data);
      } catch (err) {
        console.error('Error loading stats:', err);
        setError('Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleStartInterview = () => {
    navigate('/setup');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <Navigation onLogout={handleLogout} />

      <main className={styles.content}>
        {/* Welcome Section */}
        <div className={styles.welcome}>
          <div className={styles.welcomeText}>
            <h1>Welcome, {user?.name}! 👋</h1>
            <p>Ready to ace your next interview?</p>
          </div>
          <button className={styles.startBtn} onClick={handleStartInterview}>
            <Plus size={20} />
            Start Interview
          </button>
        </div>

        {isLoading ? (
          <div className={styles.skeleton}>
            <div className={styles.skeletonCard}></div>
            <div className={styles.skeletonCard}></div>
            <div className={styles.skeletonCard}></div>
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>{<Award />}</div>
                <div>
                  <p className={styles.statLabel}>Average Score</p>
                  <h2 className={styles.statValue}>{stats.averageScore}</h2>
                  <p className={styles.statSubtext}>out of 10</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>{<Clock />}</div>
                <div>
                  <p className={styles.statLabel}>Total Sessions</p>
                  <h2 className={styles.statValue}>{stats.totalSessions}</h2>
                  <p className={styles.statSubtext}>completed</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>{<TrendingUp />}</div>
                <div>
                  <p className={styles.statLabel}>Roles Practiced</p>
                  <h2 className={styles.statValue}>{stats.roleStats.length}</h2>
                  <p className={styles.statSubtext}>different roles</p>
                </div>
              </div>
            </div>

            {/* Role Statistics */}
            {stats.roleStats.length > 0 && (
              <div className={styles.roleStats}>
                <h2>Role Performance</h2>
                <div className={styles.roleList}>
                  {stats.roleStats.map((role) => (
                    <div key={role.jobRole} className={styles.roleItem}>
                      <div className={styles.roleInfo}>
                        <p className={styles.roleName}>{role.jobRole}</p>
                        <p className={styles.roleSubtext}>
                          {role.sessions} sessions
                        </p>
                      </div>
                      <div className={styles.roleScore}>
                        <p className={styles.roleScoreText}>{role.averageScore}</p>
                        <div className={styles.scoreBar}>
                          <div
                            className={styles.scoreBarFill}
                            style={{
                              width: `${Math.min((parseFloat(role.averageScore) / 10) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            {stats.recentSessions.length > 0 && (
              <div className={styles.recentSessions}>
                <h2>Recent Sessions</h2>
                <div className={styles.sessionsList}>
                  {stats.recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className={styles.sessionItem}
                      onClick={() => navigate(`/summary/${session.id}`)}
                    >
                      <div className={styles.sessionInfo}>
                        <p className={styles.sessionRole}>{session.jobRole}</p>
                        <p className={styles.sessionDate}>
                          {new Date(session.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles.sessionScore}>
                        <span className={styles.badge}>
                          {session.difficulty}
                        </span>
                        {session.totalScore && (
                          <p className={styles.score}>{session.totalScore.toFixed(1)}/10</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.totalSessions === 0 && (
              <div className={styles.emptyState}>
                <p>No interview sessions yet</p>
                <p>Start your first interview to track your progress!</p>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default Dashboard;
