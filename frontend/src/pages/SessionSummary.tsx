import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { answersAPI, sessionsAPI } from '../services/api';
import Navigation from '../components/Navigation';
import { useAuthStore } from '../stores/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Share2, Home } from 'lucide-react';
import styles from './SessionSummary.module.css';

interface SessionData {
  id: number;
  jobRole: string;
  difficulty: string;
  totalScore?: number;
}

interface Answer {
  id: number;
  score: number;
  strengths: string;
  missingPoints: string;
  idealAnswer: string;
  userAnswer: string;
}

const SessionSummary: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [session, setSession] = useState<SessionData | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!sessionId) return;

        const sessionResponse = await sessionsAPI.getById(parseInt(sessionId));
        setSession(sessionResponse.data);

        const answersResponse = await answersAPI.getBySession(parseInt(sessionId));
        setAnswers(answersResponse.data);

        // Calculate and update total score
        if (answersResponse.data.length > 0) {
          const avgScore =
            answersResponse.data.reduce((sum: number, a: Answer) => sum + a.score, 0) /
            answersResponse.data.length;

          await sessionsAPI.update(parseInt(sessionId), {
            totalScore: avgScore,
            status: 'completed',
          });
        }
      } catch (err) {
        console.error('Error loading session:', err);
        setError('Failed to load session data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Navigation onLogout={handleLogout} />
        <div className={styles.loadingScreen}>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  if (!session || answers.length === 0) {
    return (
      <div className={styles.container}>
        <Navigation onLogout={handleLogout} />
        <div className={styles.errorScreen}>
          <p>{error || 'No session data available'}</p>
        </div>
      </div>
    );
  }

  const avgScore =
    answers.reduce((sum, a) => sum + a.score, 0) / answers.length;
  const chartData = answers.map((a, i) => ({
    name: `Q${i + 1}`,
    score: a.score,
  }));

  const strengths = answers
    .flatMap((a) => a.strengths.split(','))
    .slice(0, 5);
  const improvements = answers
    .flatMap((a) => a.missingPoints.split(','))
    .slice(0, 5);

  return (
    <div className={styles.container}>
      <Navigation onLogout={handleLogout} />

      <main className={styles.content}>
        {/* Overall Score Card */}
        <div className={styles.scoreCard}>
          <div className={styles.scoreCircle}>
            <div className={styles.scoreNumber}>{avgScore.toFixed(1)}</div>
            <div className={styles.scoreLabel}>/10</div>
          </div>
          <div className={styles.scoreInfo}>
            <h1>Session Complete! 🎉</h1>
            <p>{session.jobRole} • {session.difficulty} level</p>
            <p className={styles.scoreDetail}>
              {answers.length} questions answered
            </p>
          </div>
        </div>

        {/* Score Chart */}
        <div className={styles.chartContainer}>
          <h2>Score Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar dataKey="score" fill="#667eea" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feedback Section */}
        <div className={styles.feedbackGrid}>
          <div className={styles.feedbackCard}>
            <h3>✨ What You Did Well</h3>
            <ul className={styles.feedbackList}>
              {strengths.map((s, i) => (
                <li key={i}>{s.trim()}</li>
              ))}
            </ul>
          </div>

          <div className={styles.feedbackCard}>
            <h3>🎯 Areas to Improve</h3>
            <ul className={styles.feedbackList}>
              {improvements.map((i) => (
                <li key={i}>{i.trim()}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Answers */}
        <div className={styles.detailedAnswers}>
          <h2>Detailed Feedback</h2>
          {answers.map((answer, idx) => (
            <div key={answer.id} className={styles.answerReview}>
              <div className={styles.answerHeader}>
                <span className={styles.questionNum}>Question {idx + 1}</span>
                <span className={styles.answerScore}>{answer.score}/10</span>
              </div>

              <div className={styles.answerContent}>
                <div className={styles.yourAnswer}>
                  <p className={styles.sectionTitle}>Your Answer:</p>
                  <p className={styles.sectionText}>{answer.userAnswer}</p>
                </div>

                <div className={styles.feedback}>
                  <p className={styles.sectionTitle}>Feedback:</p>
                  <div className={styles.feedbackItem}>
                    <p className={styles.label}>Strengths:</p>
                    <p className={styles.text}>{answer.strengths}</p>
                  </div>
                  <div className={styles.feedbackItem}>
                    <p className={styles.label}>Areas to Improve:</p>
                    <p className={styles.text}>{answer.missingPoints}</p>
                  </div>
                  <div className={styles.feedbackItem}>
                    <p className={styles.label}>Sample Ideal Answer:</p>
                    <p className={styles.text}>{answer.idealAnswer}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            className={styles.btn}
            onClick={() => navigate('/dashboard')}
          >
            <Home size={20} />
            Back to Dashboard
          </button>
          <button
            className={styles.btn + ' ' + styles.btnSecondary}
            onClick={() => navigate('/setup')}
          >
            Practice Again
          </button>
        </div>
      </main>
    </div>
  );
};

export default SessionSummary;
