import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Navigation from '../components/Navigation';
import {
  Code2,
  Layout,
  FileText,
  MapPin,
  Users,
  Trophy,
  Zap,
  ChevronRight,
} from 'lucide-react';
import styles from './FAANGDashboard.module.css';

interface PreparationTrack {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  action: string;
  color: string;
}

const FAANGDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('Google');

  const tracks: PreparationTrack[] = [
    {
      id: 'coding',
      title: 'Coding Rounds',
      icon: <Code2 size={32} />,
      description: 'Master DSA, problem-solving, and coding interviews',
      progress: 45,
      status: 'in_progress',
      action: 'Start Coding Challenge',
      color: '#667eea',
    },
    {
      id: 'system-design',
      title: 'System Design',
      icon: <Layout size={32} />,
      description:
        'Learn scalability, architecture, and design patterns for FAANG',
      progress: 30,
      status: 'in_progress',
      action: 'Start System Design',
      color: '#764ba2',
    },
    {
      id: 'resume',
      title: 'Resume Builder',
      icon: <FileText size={32} />,
      description: 'Optimize your resume with AI-powered suggestions',
      progress: 80,
      status: 'in_progress',
      action: 'Build Resume',
      color: '#ec4899',
    },
    {
      id: 'roadmap',
      title: 'Preparation Roadmap',
      icon: <MapPin size={32} />,
      description:
        'Personalized 12-week plan tailored to your target company',
      progress: 35,
      status: 'in_progress',
      action: 'View Roadmap',
      color: '#f59e0b',
    },
    {
      id: 'mock-interview',
      title: 'Mock Interviews',
      icon: <Users size={32} />,
      description: 'Practice with real interviewers and get instant feedback',
      progress: 10,
      status: 'not_started',
      action: 'Schedule Mock',
      color: '#10b981',
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard & Badges',
      icon: <Trophy size={32} />,
      description: 'Track your progress and earn achievement badges',
      progress: 60,
      status: 'in_progress',
      action: 'View Profile',
      color: '#06b6d4',
    },
  ];

  const companies = [
    'Google',
    'Amazon',
    'Meta',
    'Apple',
    'Microsoft',
    'Tesla',
    'Netflix',
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTrackClick = (trackId: string) => {
    switch (trackId) {
      case 'coding':
        navigate('/coding');
        break;
      case 'system-design':
        navigate('/system-design');
        break;
      case 'resume':
        navigate('/achievements');
        break;
      case 'roadmap':
        navigate('/roadmap');
        break;
      case 'mock-interview':
        navigate('/leaderboard');
        break;
      case 'leaderboard':
        navigate('/leaderboard');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  return (
    <div className={styles.container}>
      <Navigation onLogout={handleLogout} />

      <main className={styles.content}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>FAANG Placement Cracker</h1>
            <p>Your comprehensive guide to acing FAANG interviews</p>
          </div>
          <div className={styles.badge}>
            <Zap size={20} />
            <span>Level: Intermediate</span>
          </div>
        </div>

        {/* Company Selection */}
        <div className={styles.companySection}>
          <h2>Target Company</h2>
          <div className={styles.companyGrid}>
            {companies.map((company) => (
              <button
                key={company}
                className={`${styles.companyBtn} ${
                  selectedCompany === company ? styles.companyBtnActive : ''
                }`}
                onClick={() => setSelectedCompany(company)}
              >
                {company}
              </button>
            ))}
          </div>
        </div>

        {/* Main Tracks Grid */}
        <div className={styles.tracksSection}>
          <h2>Preparation Tracks</h2>
          <div className={styles.tracksGrid}>
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`${styles.trackCard} ${
                  isLoading ? styles.skeleton : ''
                }`}
                style={{
                  borderLeftColor: track.color,
                }}
              >
                <div
                  className={styles.trackIcon}
                  style={{ backgroundColor: `${track.color}20` }}
                >
                  <div style={{ color: track.color }}>{track.icon}</div>
                </div>

                <h3 className={styles.trackTitle}>{track.title}</h3>
                <p className={styles.trackDescription}>{track.description}</p>

                {/* Progress Bar */}
                <div className={styles.progressSection}>
                  <div className={styles.progressLabel}>
                    <span>{track.progress}%</span>
                    <span className={styles.status}>{track.status}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${track.progress}%`,
                        backgroundColor: track.color,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className={styles.actionBtn}
                  onClick={() => handleTrackClick(track.id)}
                  style={{
                    backgroundColor: track.color,
                  }}
                >
                  {track.action}
                  <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className={styles.statsSection}>
          <h2>Your Progress</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💻</div>
              <p className={styles.statLabel}>Challenges Solved</p>
              <h3 className={styles.statValue}>24/150</h3>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏰</div>
              <p className={styles.statLabel}>Hours Invested</p>
              <h3 className={styles.statValue}>45/120</h3>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <p className={styles.statLabel}>Completion</p>
              <h3 className={styles.statValue}>35%</h3>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏆</div>
              <p className={styles.statLabel}>Badge Earned</p>
              <h3 className={styles.statValue}>7/25</h3>
            </div>
          </div>
        </div>

        {/* Roadmap Preview */}
        <div className={styles.roadmapSection}>
          <h2>Your Preparation Timeline</h2>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={`${styles.timelineBullet} ${styles.completed}`}></div>
              <div className={styles.timelineContent}>
                <h4>Week 1-2: Fundamentals</h4>
                <p>Data structures and basic algorithms</p>
              </div>
              <span className={styles.timelineDate}>Completed</span>
            </div>

            <div className={styles.timelineItem}>
              <div className={`${styles.timelineBullet} ${styles.active}`}></div>
              <div className={styles.timelineContent}>
                <h4>Week 3-4: Medium Problems</h4>
                <p>LeetCode medium level challenges</p>
              </div>
              <span className={styles.timelineDate}>In Progress</span>
            </div>

            <div className={styles.timelineItem}>
              <div className={`${styles.timelineBullet} ${styles.pending}`}></div>
              <div className={styles.timelineContent}>
                <h4>Week 5-6: System Design</h4>
                <p>Scalability and architecture patterns</p>
              </div>
              <span className={styles.timelineDate}>Upcoming</span>
            </div>

            <div className={styles.timelineItem}>
              <div className={`${styles.timelineBullet} ${styles.pending}`}></div>
              <div className={styles.timelineContent}>
                <h4>Week 7-8: Mock Interviews</h4>
                <p>Practice with real interviewers</p>
              </div>
              <span className={styles.timelineDate}>Upcoming</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAANGDashboard;
