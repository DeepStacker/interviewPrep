import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Navigation from '../components/Navigation';
import {
  badgesAPI,
  companiesAPI,
  codingAPI,
  leaderboardAPI,
  mockInterviewAPI,
  roadmapAPI,
  systemDesignAPI,
} from '../services/api';
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

interface DashboardMetrics {
  codingAttempted: number;
  codingSolved: number;
  codingSubmissions: number;
  systemDesignAttempts: number;
  systemDesignSubmissions: number;
  badgesEarned: number;
  badgesAvailable: number;
  completedMocks: number;
  totalMocks: number;
  roadmapProgress: number;
  hoursInvested: number;
  userLevel: string;
  timeline: Array<{
    title: string;
    description: string;
    status: 'completed' | 'active' | 'pending';
    dateLabel: string;
  }>;
}

const INITIAL_METRICS: DashboardMetrics = {
  codingAttempted: 0,
  codingSolved: 0,
  codingSubmissions: 0,
  systemDesignAttempts: 0,
  systemDesignSubmissions: 0,
  badgesEarned: 0,
  badgesAvailable: 0,
  completedMocks: 0,
  totalMocks: 0,
  roadmapProgress: 0,
  hoursInvested: 0,
  userLevel: 'Beginner',
  timeline: [],
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getOverallCompletion = (metrics: DashboardMetrics): number => {
  const codingProgress = metrics.codingAttempted
    ? Math.min(100, Math.round((metrics.codingSolved / Math.max(metrics.codingAttempted, 1)) * 100))
    : 0;
  const systemDesignProgress = metrics.systemDesignAttempts
    ? Math.min(100, Math.round((metrics.systemDesignAttempts / 20) * 100))
    : 0;
  const mocksProgress = metrics.totalMocks
    ? Math.min(100, Math.round((metrics.completedMocks / Math.max(metrics.totalMocks, 1)) * 100))
    : 0;
  const badgesProgress = metrics.badgesAvailable
    ? Math.min(100, Math.round((metrics.badgesEarned / Math.max(metrics.badgesAvailable, 1)) * 100))
    : 0;

  return Math.round(
    (codingProgress + systemDesignProgress + mocksProgress + badgesProgress + metrics.roadmapProgress) /
      5
  );
};

const FAANGDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('Google');
  const [companies, setCompanies] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>(INITIAL_METRICS);

  const codingProgress = metrics.codingAttempted
    ? Math.min(100, Math.round((metrics.codingSolved / Math.max(metrics.codingAttempted, 1)) * 100))
    : 0;
  const systemDesignProgress = metrics.systemDesignAttempts
    ? Math.min(100, Math.round((metrics.systemDesignAttempts / 20) * 100))
    : 0;
  const mockProgress = metrics.totalMocks
    ? Math.min(100, Math.round((metrics.completedMocks / Math.max(metrics.totalMocks, 1)) * 100))
    : 0;
  const badgesProgress = metrics.badgesAvailable
    ? Math.min(100, Math.round((metrics.badgesEarned / Math.max(metrics.badgesAvailable, 1)) * 100))
    : 0;

  const tracks: PreparationTrack[] = [
    {
      id: 'coding',
      title: 'Coding Rounds',
      icon: <Code2 size={32} />,
      description: 'Master DSA, problem-solving, and coding interviews',
      progress: codingProgress,
      status: codingProgress === 0 ? 'not_started' : codingProgress >= 100 ? 'completed' : 'in_progress',
      action: 'Start Coding Challenge',
      color: '#667eea',
    },
    {
      id: 'system-design',
      title: 'System Design',
      icon: <Layout size={32} />,
      description:
        'Learn scalability, architecture, and design patterns for FAANG',
      progress: systemDesignProgress,
      status:
        systemDesignProgress === 0
          ? 'not_started'
          : systemDesignProgress >= 100
            ? 'completed'
            : 'in_progress',
      action: 'Start System Design',
      color: '#764ba2',
    },
    {
      id: 'resume',
      title: 'Resume Builder',
      icon: <FileText size={32} />,
      description: 'Optimize your resume with AI-powered suggestions',
      progress: metrics.badgesEarned > 0 ? 100 : 0,
      status: metrics.badgesEarned > 0 ? 'completed' : 'not_started',
      action: 'Build Resume',
      color: '#ec4899',
    },
    {
      id: 'roadmap',
      title: 'Preparation Roadmap',
      icon: <MapPin size={32} />,
      description:
        'Personalized 12-week plan tailored to your target company',
      progress: metrics.roadmapProgress,
      status:
        metrics.roadmapProgress === 0
          ? 'not_started'
          : metrics.roadmapProgress >= 100
            ? 'completed'
            : 'in_progress',
      action: 'View Roadmap',
      color: '#f59e0b',
    },
    {
      id: 'mock-interview',
      title: 'Mock Interviews',
      icon: <Users size={32} />,
      description: 'Practice with real interviewers and get instant feedback',
      progress: mockProgress,
      status: mockProgress === 0 ? 'not_started' : mockProgress >= 100 ? 'completed' : 'in_progress',
      action: 'Schedule Mock',
      color: '#10b981',
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard & Badges',
      icon: <Trophy size={32} />,
      description: 'Track your progress and earn achievement badges',
      progress: badgesProgress,
      status: badgesProgress === 0 ? 'not_started' : badgesProgress >= 100 ? 'completed' : 'in_progress',
      action: 'View Profile',
      color: '#06b6d4',
    },
  ];

  const companyNames = companies.length > 0
    ? companies
    : ['Google', 'Amazon', 'Meta', 'Apple', 'Microsoft', 'Tesla', 'Netflix'];

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
        navigate('/resume');
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
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [codingRes, designRes, badgesRes, roadmapRes, mockRes, rankRes] = await Promise.all([
          codingAPI.getStats(),
          systemDesignAPI.getStats(),
          badgesAPI.getUserBadges(),
          roadmapAPI.getRoadmap(),
          mockInterviewAPI.getScheduled(100, 0),
          leaderboardAPI.getMyRank(),
        ]);

        const companiesRes = await companiesAPI.getAll();

        const coding = codingRes.data?.data ?? codingRes.data ?? {};
        const design = designRes.data?.data ?? designRes.data ?? {};
        const badgesPayload = badgesRes.data?.data ?? badgesRes.data ?? {};
        const roadmaps = roadmapRes.data?.data ?? roadmapRes.data ?? [];
        const interviews = mockRes.data?.data ?? mockRes.data ?? [];
        const rank = rankRes.data?.data ?? rankRes.data ?? {};
        const companiesPayload = companiesRes.data?.data ?? companiesRes.data ?? [];
        const fetchedNames = Array.isArray(companiesPayload)
          ? companiesPayload
              .map((company: any) => company?.name)
              .filter((name: unknown) => typeof name === 'string' && name.length > 0)
          : [];
        if (fetchedNames.length > 0) {
          setCompanies(fetchedNames);
          if (!fetchedNames.includes(selectedCompany)) {
            setSelectedCompany(fetchedNames[0]);
          }
        }

        const earnedBadges =
          toNumber(badgesPayload.earnedCount) ||
          (Array.isArray(badgesPayload.earned) ? badgesPayload.earned.length : 0);
        const totalBadges =
          toNumber(badgesPayload.totalAvailable) ||
          (Array.isArray(badgesPayload.all) ? badgesPayload.all.length : 0);

        const firstRoadmap = Array.isArray(roadmaps) ? roadmaps[0] : roadmaps;
        const roadmapProgress = toNumber(firstRoadmap?.progressPercentage);

        const roadmapWeeks = firstRoadmap?.roadmapContent || [];
        const timeline = Array.isArray(roadmapWeeks)
          ? roadmapWeeks.slice(0, 4).map((week: any, index: number) => {
              const tasks = Array.isArray(week.tasks) ? week.tasks : [];
              const completedTasks = tasks.filter((task: any) => task.completed).length;
              const weekStatus: 'completed' | 'active' | 'pending' =
                completedTasks === tasks.length && tasks.length > 0
                  ? 'completed'
                  : completedTasks > 0 || index === 0
                    ? 'active'
                    : 'pending';

              return {
                title: `Week ${week.week}: ${week.focus}`,
                description: (Array.isArray(week.topics) && week.topics.slice(0, 2).join(', ')) || 'Interview preparation focus',
                status: weekStatus,
                dateLabel:
                  weekStatus === 'completed'
                    ? 'Completed'
                    : weekStatus === 'active'
                      ? 'In Progress'
                      : 'Upcoming',
              };
            })
          : [];

        const totalMocks = Array.isArray(interviews) ? interviews.length : 0;
        const completedMocks = Array.isArray(interviews)
          ? interviews.filter((item: any) => item.status === 'completed').length
          : 0;

        setMetrics({
          codingAttempted: toNumber(coding.total_attempted),
          codingSolved: toNumber(coding.total_solved),
          codingSubmissions: toNumber(coding.total_submissions),
          systemDesignAttempts: toNumber(design.total_attempted),
          systemDesignSubmissions: toNumber(design.total_submissions),
          badgesEarned: earnedBadges,
          badgesAvailable: totalBadges,
          completedMocks,
          totalMocks,
          roadmapProgress,
          hoursInvested:
            toNumber(coding.total_submissions) * 1 +
            toNumber(design.total_submissions) * 2 +
            totalMocks * 1,
          userLevel: rank.level || 'Beginner',
          timeline,
        });
      } catch (loadError) {
        console.error('Failed to load FAANG dashboard metrics:', loadError);
        setError('Unable to load dashboard metrics right now. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const overallCompletion = getOverallCompletion(metrics);
  const timelineItems = metrics.timeline.length
    ? metrics.timeline
    : [
        {
          title: 'Start your roadmap',
          description: 'Generate a roadmap to unlock a weekly plan',
          status: 'pending' as const,
          dateLabel: 'Pending',
        },
      ];

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
            <span>Level: {metrics.userLevel}</span>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Company Selection */}
        <div className={styles.companySection}>
          <h2>Target Company</h2>
          <div className={styles.companyGrid}>
              {companyNames.map((company) => (
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
              <h3 className={styles.statValue}>
                {metrics.codingSolved}/{Math.max(metrics.codingAttempted, metrics.codingSolved)}
              </h3>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏰</div>
              <p className={styles.statLabel}>Hours Invested</p>
              <h3 className={styles.statValue}>{metrics.hoursInvested}/120</h3>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <p className={styles.statLabel}>Completion</p>
              <h3 className={styles.statValue}>{overallCompletion}%</h3>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏆</div>
              <p className={styles.statLabel}>Badge Earned</p>
              <h3 className={styles.statValue}>
                {metrics.badgesEarned}/{Math.max(metrics.badgesAvailable, metrics.badgesEarned)}
              </h3>
            </div>
          </div>
        </div>

        {/* Roadmap Preview */}
        <div className={styles.roadmapSection}>
          <h2>Your Preparation Timeline</h2>
          <div className={styles.timeline}>
            {timelineItems.map((item) => (
              <div key={item.title} className={styles.timelineItem}>
                <div className={`${styles.timelineBullet} ${styles[item.status]}`}></div>
                <div className={styles.timelineContent}>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
                <span className={styles.timelineDate}>{item.dateLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FAANGDashboard;
