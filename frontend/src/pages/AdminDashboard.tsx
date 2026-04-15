import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import Navigation from '../components/Navigation';
import { useAuthStore } from '../stores/authStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import styles from './AdminDashboard.module.css';

interface UserStats {
  id: number;
  email: string;
  name: string;
  totalSessions: number;
  averageScore: string;
  createdAt: string;
}

interface Trends {
  popularRoles: any[];
  difficultyDistribution: any[];
  sessionsTrend: any[];
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [users, setUsers] = useState<UserStats[]>([]);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const usersResponse = await analyticsAPI.getAdminUsers();
        const trendsResponse = await analyticsAPI.getAdminTrends();

        setUsers(usersResponse.data);
        setTrends(trendsResponse.data);
      } catch (err) {
        console.error('Error loading admin data:', err);
        setError('Failed to load admin data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const COLORS = ['#667eea', '#764ba2', '#ec4899', '#f59e0b', '#10b981'];

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Navigation onLogout={handleLogout} />
        <div className={styles.loadingScreen}>Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation onLogout={handleLogout} />

      <main className={styles.content}>
        <div className={styles.header}>
          <h1>Admin Dashboard</h1>
          <p>Platform analytics and user management</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Overview Cards */}
        <div className={styles.cardsGrid}>
          <div className={styles.card}>
            <Users size={24} className={styles.cardIcon} />
            <div>
              <p className={styles.cardLabel}>Total Users</p>
              <h2 className={styles.cardValue}>{users.length}</h2>
            </div>
          </div>

          <div className={styles.card}>
            <TrendingUp size={24} className={styles.cardIcon} />
            <div>
              <p className={styles.cardLabel}>Total Sessions</p>
              <h2 className={styles.cardValue}>
                {users.reduce((sum, u) => sum + u.totalSessions, 0)}
              </h2>
            </div>
          </div>

          <div className={styles.card}>
            <TrendingUp size={24} className={styles.cardIcon} />
            <div>
              <p className={styles.cardLabel}>Avg Score</p>
              <h2 className={styles.cardValue}>
                {(
                  users.reduce((sum, u) => sum + parseFloat(u.averageScore), 0) /
                  users.length
                ).toFixed(1)}
              </h2>
            </div>
          </div>
        </div>

        {/* Charts */}
        {trends && (
          <div className={styles.chartsGrid}>
            {/* Popular Roles */}
            <div className={styles.chartCard}>
              <h2>Popular Roles</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends.popularRoles}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="jobRole" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Difficulty Distribution */}
            <div className={styles.chartCard}>
              <h2>Difficulty Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trends.difficultyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.difficulty}: ${props.count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {trends.difficultyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sessions Trend */}
            {trends.sessionsTrend.length > 0 && (
              <div className={styles.chartCardFull}>
                <h2>Sessions Trend (Last 30 Days)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.sessionsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#667eea"
                      strokeWidth={2}
                      dot={{ fill: '#667eea' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Users Table */}
        <div className={styles.usersSection}>
          <h2>User Analytics</h2>
          <div className={styles.usersTable}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Sessions</th>
                  <th>Avg Score</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.totalSessions}</td>
                    <td>{user.averageScore}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
