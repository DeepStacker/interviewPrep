import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './stores/authStore';
import { setAuthToken } from './services/api';
import './styles/global.css';

// Import pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import FAANGDashboard from './pages/FAANGDashboard';
import QuestionSetupPage from './pages/QuestionSetupPage';
import QuestionPage from './pages/QuestionPage';
import SessionSummary from './pages/SessionSummary';
import AdminDashboard from './pages/AdminDashboard';
import CodingChallengesPage from './pages/CodingChallengesPage';
import CodingChallengePage from './pages/CodingChallengePage';
import SystemDesignPage from './pages/SystemDesignPage';
import LeaderboardPage from './pages/LeaderboardPage';
import RoadmapPage from './pages/RoadmapPage';
import AchievementsPage from './pages/AchievementsPage';

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  return token && user?.isAdmin ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

function App() {
  const token = useAuthStore((state) => state.token);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faang"
            element={
              <ProtectedRoute>
                <FAANGDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coding"
            element={
              <ProtectedRoute>
                <CodingChallengesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coding/:id"
            element={
              <ProtectedRoute>
                <CodingChallengePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-design"
            element={
              <ProtectedRoute>
                <SystemDesignPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roadmap"
            element={
              <ProtectedRoute>
                <RoadmapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <QuestionSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:sessionId"
            element={
              <ProtectedRoute>
                <QuestionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary/:sessionId"
            element={
              <ProtectedRoute>
                <SessionSummary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/" element={<Navigate to="/faang" replace />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
