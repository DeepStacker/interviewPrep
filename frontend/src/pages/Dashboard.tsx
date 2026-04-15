import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { analyticsAPI, type UserCoachingResponse } from '../services/api';
import { Plus, Award, Clock, ShieldCheck, Video, Brain } from 'lucide-react';
import Navigation from '../components/Navigation';
import styles from './Dashboard.module.css';

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  completionRate: string;
  averageScore: string;
  monitoringCoverage: string;
  integrityRiskRate: string;
  recentSessions: any[];
  roleStats: any[];
  trackStats: { interviewType: string; sessions: number }[];
}

const toFiniteNumber = (value: unknown): number | null => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [coach, setCoach] = useState<UserCoachingResponse | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        const [statsResponse, coachResponse] = await Promise.all([
          analyticsAPI.getUserStats(),
          analyticsAPI.getUserCoach(),
        ]);
        setStats(statsResponse.data);
        setCoach(coachResponse.data);
      } catch (err) {
        console.error('Error loading stats:', err);
        setError('Failed to load dashboard');
      } finally {
        setIsLoading(false);
        setCoachLoading(false);
      }
    };

    loadStats();
  }, []);

  const practiceTracks = [
    { title: 'Interview Drill', subtitle: 'Behavior + technical interview', route: '/setup', action: 'Start Interview' },
    { title: 'Coding Practice', subtitle: 'Algorithm and implementation tasks', route: '/coding', action: 'Open Coding' },
    { title: 'System Design', subtitle: 'Architecture and scalability rounds', route: '/system-design', action: 'Open Design' },
    { title: 'Leaderboard', subtitle: 'Competitive progression and rank', route: '/leaderboard', action: 'View Board' },
  ];

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
            <p>Run focused practice tracks, monitor integrity, and review growth analytics.</p>
          </div>
          <button className={styles.startBtn} onClick={() => navigate('/setup')}>
            <Plus size={20} />
            New Session
          </button>
        </div>

        <div className={styles.trackGrid}>
          {practiceTracks.map((track) => (
            <button
              key={track.title}
              className={styles.trackCard}
              onClick={() => navigate(track.route)}
            >
              <h3>{track.title}</h3>
              <p>{track.subtitle}</p>
              <span>{track.action}</span>
            </button>
          ))}
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
                  <p className={styles.statLabel}>Completion Rate</p>
                  <h2 className={styles.statValue}>{stats.completionRate}%</h2>
                  <p className={styles.statSubtext}>{stats.completedSessions} of {stats.totalSessions} completed</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>{<Video />}</div>
                <div>
                  <p className={styles.statLabel}>Monitoring Coverage</p>
                  <h2 className={styles.statValue}>{stats.monitoringCoverage}%</h2>
                  <p className={styles.statSubtext}>answers with behavior capture</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>{<ShieldCheck />}</div>
                <div>
                  <p className={styles.statLabel}>Integrity Risk Rate</p>
                  <h2 className={styles.statValue}>{stats.integrityRiskRate}%</h2>
                  <p className={styles.statSubtext}>answers flagged for review</p>
                </div>
              </div>
            </div>

            {stats.trackStats.length > 0 && (
              <div className={styles.roleStats}>
                <h2>Practice Track Distribution</h2>
                <div className={styles.roleList}>
                  {stats.trackStats.map((track) => (
                    <div key={track.interviewType} className={styles.roleItem}>
                      <div className={styles.roleInfo}>
                        <p className={styles.roleName}>{track.interviewType.replace(/_/g, ' ')}</p>
                        <p className={styles.roleSubtext}>Sessions in this track</p>
                      </div>
                      <div className={styles.roleScore}>
                        <p className={styles.roleScoreText}>{track.sessions}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            <div className={styles.coachCard}>
              <div className={styles.coachHeader}>
                <div className={styles.coachIcon}>
                  <Brain size={20} />
                </div>
                <div>
                  <h2>AI Performance Coach</h2>
                  <p>
                    Personalized using your latest sessions, coding outcomes, and behavior monitoring signals.
                  </p>
                </div>
              </div>

              {coachLoading ? (
                <p className={styles.coachMuted}>Generating plan...</p>
              ) : !coach ? (
                <p className={styles.coachMuted}>Coach plan unavailable right now.</p>
              ) : (
                <>
                  <p className={styles.coachSummary}>{coach.plan.summary}</p>

                  <div className={styles.focusGrid}>
                    {coach.plan.focusAreas.map((area) => (
                      <article key={area.title} className={styles.focusCard}>
                        <h3>{area.title}</h3>
                        <p>{area.whyItMatters}</p>
                        <p className={styles.focusAction}>{area.action}</p>
                      </article>
                    ))}
                  </div>

                  <div className={styles.planSection}>
                    <h3>Weekly Plan</h3>
                    <ol>
                      {coach.plan.weeklyPlan.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className={styles.planSection}>
                    <h3>Next Session Prompt</h3>
                    <p className={styles.nextPrompt}>{coach.plan.nextSessionPrompt}</p>
                    <button className={styles.startBtn} onClick={() => navigate('/setup')}>
                      <Plus size={18} />
                      Start Guided Session
                    </button>
                  </div>
                </>
              )}
            </div>

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
                          {session.interviewType || session.difficulty}
                        </span>
                        {(() => {
                          const totalScore = toFiniteNumber(session.totalScore);
                          return totalScore !== null ? (
                            <p className={styles.score}>{totalScore.toFixed(1)}/10</p>
                          ) : null;
                        })()}
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
