import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../services/api';
import { useSessionStore } from '../stores/sessionStore';
import Navigation from '../components/Navigation';
import { useAuthStore } from '../stores/authStore';
import { Zap, ArrowRight } from 'lucide-react';
import styles from './QuestionSetupPage.module.css';

const QuestionSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { setCurrentSession } = useSessionStore();
  const [formData, setFormData] = useState({
    jobRole: 'Frontend Developer',
    companyType: 'startup',
    difficulty: 'medium',
    interviewType: 'mixed' as
      | 'mixed'
      | 'technical'
      | 'behavioral'
      | 'system_design'
      | 'rapid_fire',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobRoles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Analyst',
    'Data Scientist',
    'Product Manager',
    'DevOps Engineer',
    'QA Engineer',
    'UX/UI Designer',
    'Solutions Architect',
  ];

  const companyTypes = [
    { value: 'startup', label: 'Startup' },
    { value: 'scaleup', label: 'Scale-up' },
    { value: 'mnc', label: 'Large MNC' },
  ];

  const difficulties = [
    { value: 'easy', label: 'Easy', description: 'Beginner-friendly' },
    { value: 'medium', label: 'Medium', description: 'Intermediate level' },
    { value: 'hard', label: 'Hard', description: 'Expert level' },
  ];

  const interviewTypes = [
    { value: 'mixed', label: 'Mixed', description: 'Balanced technical + behavioral + design' },
    { value: 'technical', label: 'Technical', description: 'Problem solving and implementation depth' },
    { value: 'behavioral', label: 'Behavioral', description: 'Communication, ownership, leadership' },
    { value: 'system_design', label: 'System Design', description: 'Architecture and scalability focus' },
    { value: 'rapid_fire', label: 'Rapid Fire', description: 'Fast short questions under time pressure' },
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      // Create session
      const response = await sessionsAPI.create(formData);
      const session = response.data;

      setCurrentSession(session);
      navigate(`/interview/${session.id}`);
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <Navigation onLogout={handleLogout} />

      <main className={styles.content}>
        <div className={styles.setupCard}>
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Zap size={40} />
            </div>
            <h1>Customize Your Interview</h1>
            <p>Select your role, company size, and difficulty level</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Job Role Selection */}
            <div className={styles.formGroup}>
              <label>Job Role *</label>
              <select
                value={formData.jobRole}
                onChange={(e) =>
                  setFormData({ ...formData, jobRole: e.target.value })
                }
                className={styles.select}
              >
                {jobRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Type Selection */}
            <div className={styles.formGroup}>
              <label>Company Type</label>
              <div className={styles.radioGroup}>
                {companyTypes.map((type) => (
                  <label key={type.value} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="companyType"
                      value={type.value}
                      checked={formData.companyType === type.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyType: e.target.value,
                        })
                      }
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div className={styles.formGroup}>
              <label>Difficulty Level *</label>
              <div className={styles.difficultyGrid}>
                {difficulties.map((diff) => (
                  <label
                    key={diff.value}
                    className={`${styles.difficultyCard} ${
                      formData.difficulty === diff.value
                        ? styles.difficultyCardActive
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={diff.value}
                      checked={formData.difficulty === diff.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          difficulty: e.target.value,
                        })
                      }
                    />
                    <div className={styles.difficultyContent}>
                      <span className={styles.difficultyTitle}>
                        {diff.label}
                      </span>
                      <span className={styles.difficultyDesc}>
                        {diff.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Interview Type *</label>
              <div className={styles.difficultyGrid}>
                {interviewTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`${styles.difficultyCard} ${
                      formData.interviewType === type.value
                        ? styles.difficultyCardActive
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="interviewType"
                      value={type.value}
                      checked={formData.interviewType === type.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interviewType: e.target.value as
                            | 'mixed'
                            | 'technical'
                            | 'behavioral'
                            | 'system_design'
                            | 'rapid_fire',
                        })
                      }
                    />
                    <div className={styles.difficultyContent}>
                      <span className={styles.difficultyTitle}>{type.label}</span>
                      <span className={styles.difficultyDesc}>{type.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitBtn}
            >
              {isLoading ? (
                <div className={styles.spinner}></div>
              ) : (
                <>
                  Start Interview <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className={styles.info}>
            <p>💡 You will get a mode-specific interview set with validation, keyboard shortcuts, and integrity checks.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuestionSetupPage;
