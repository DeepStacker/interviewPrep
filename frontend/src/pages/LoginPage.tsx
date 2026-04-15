import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import { authAPI, initializeAPI, setAuthToken } from '../services/api';
import { Brain, Zap } from 'lucide-react';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, setLoading, setError } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      const response = await authAPI.loginWithGoogle(credentialResponse.credential);

      const { user, token } = response.data;

      // Store auth token and user
      initializeAPI(token);
      setAuthToken(token);
      login(user, token);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed');
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGradient}></div>

      <div className={styles.content}>
        {/* Logo and Title */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Brain size={40} className={styles.logo} />
            <Zap size={40} className={styles.logoSecondary} />
          </div>
          <h1>Interview Prep Coach</h1>
          <p>Master your next interview with AI-powered coaching</p>
        </div>

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>✨</div>
            <h3>AI-Generated Questions</h3>
            <p>Get tailored interview questions for any role</p>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Instant Feedback</h3>
            <p>Receive detailed scoring and improvement tips</p>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>📈</div>
            <h3>Track Progress</h3>
            <p>Monitor your improvement over multiple sessions</p>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>🎯</div>
            <h3>Multiple Roles</h3>
            <p>Practice for any job role at any difficulty level</p>
          </div>
        </div>

        {/* Login Section */}
        <div className={styles.loginSection}>
          <h2>Get Started Now</h2>
          <p>Sign in with your Google account</p>

          <div className={styles.googleLoginContainer}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Signing in...</p>
              </div>
            ) : (
              <>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </>
            )}
          </div>

          <p className={styles.disclaimer}>
            We respect your privacy. We only access your email and profile picture.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
