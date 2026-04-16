import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './stores/authStore';
import { setAuthToken } from './services/api';
import './styles/global.css';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FAANGDashboard = lazy(() => import('./pages/FAANGDashboard'));
const QuestionSetupPage = lazy(() => import('./pages/QuestionSetupPage'));
const QuestionPage = lazy(() => import('./pages/QuestionPage'));
const SessionSummary = lazy(() => import('./pages/SessionSummary'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CodingChallengesPage = lazy(() => import('./pages/CodingChallengesPage'));
const CodingChallengePage = lazy(() => import('./pages/CodingChallengePage'));
const SystemDesignPage = lazy(() => import('./pages/SystemDesignPage'));
const SystemDesignWorkspacePage = lazy(() => import('./pages/SystemDesignWorkspacePage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const ResumePage = lazy(() => import('./pages/ResumePage'));

const RouteLoadingFallback = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      fontSize: '1rem',
      color: '#334155',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    }}
  >
    Loading page...
  </div>
);

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
  const oauthConfigured = googleClientId.trim().length > 0;

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  if (!oauthConfigured) {
    return (
      <Router>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <Suspense fallback={<RouteLoadingFallback />}>
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
              path="/system-design/:id"
              element={
                <ProtectedRoute>
                  <SystemDesignWorkspacePage />
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
              path="/resume"
              element={
                <ProtectedRoute>
                  <ResumePage />
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
        </Suspense>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
