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
      | 'rapid_fire'
      | 'math_reasoning'
      | 'game_challenge',
    practiceTrack: 'interview' as
      | 'interview'
      | 'coding'
      | 'system_design'
      | 'math_reasoning'
      | 'game_challenge',
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
    { value: 'math_reasoning', label: 'Math & Reasoning', description: 'Analytical estimation and numerical reasoning' },
    { value: 'game_challenge', label: 'Game Challenge', description: 'Gamified scenario and strategy questions' },
  ] as const;

  const practiceTracks = [
    { value: 'interview', label: 'Interview Drill', description: 'Structured Q&A with behavior analysis' },
    { value: 'coding', label: 'Coding Practice', description: 'Algorithmic and implementation challenges' },
    { value: 'system_design', label: 'System Design', description: 'Architecture and trade-off exercises' },
    { value: 'math_reasoning', label: 'Math & Reasoning', description: 'Analytical and numerical reasoning tasks' },
    { value: 'game_challenge', label: 'Game Challenge', description: 'Gamified strategy and decision scenarios' },
  ] as const;

  const isInterviewFlow =
    formData.practiceTrack === 'interview' ||
    formData.practiceTrack === 'math_reasoning' ||
    formData.practiceTrack === 'game_challenge';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      if (formData.practiceTrack === 'coding') {
        navigate('/coding');
        return;
      }

      if (formData.practiceTrack === 'system_design') {
        navigate('/system-design');
        return;
      }

      const derivedInterviewType =
        formData.practiceTrack === 'math_reasoning' ||
        formData.practiceTrack === 'game_challenge'
          ? formData.practiceTrack
          : formData.interviewType;

      // Create session
      const response = await sessionsAPI.create({
        jobRole: formData.jobRole,
        companyType: formData.companyType,
        difficulty: formData.difficulty,
        interviewType: derivedInterviewType,
      });
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
            <div className={styles.formGroup}>
              <label>Practice Track *</label>
              <div className={styles.trackGrid}>
                {practiceTracks.map((track) => (
                  <label
                    key={track.value}
                    className={`${styles.trackCard} ${
                      formData.practiceTrack === track.value ? styles.trackCardActive : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="practiceTrack"
                      value={track.value}
                      checked={formData.practiceTrack === track.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          practiceTrack: e.target.value as
                            | 'interview'
                            | 'coding'
                            | 'system_design'
                            | 'math_reasoning'
                            | 'game_challenge',
                        })
                      }
                    />
                    <div className={styles.trackContent}>
                      <span className={styles.trackTitle}>{track.label}</span>
                      <span className={styles.trackDesc}>{track.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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

            {isInterviewFlow ? (
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
                              | 'rapid_fire'
                              | 'math_reasoning'
                              | 'game_challenge',
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
            ) : (
              <div className={styles.formGroup}>
                <label>Track Configuration</label>
                <p className={styles.hintText}>
                  This track has a dedicated flow and bypasses interview question-mode configuration.
                </p>
              </div>
            )}

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
                  {formData.practiceTrack === 'coding'
                    ? 'Start Coding Practice'
                    : formData.practiceTrack === 'system_design'
                    ? 'Start Design Practice'
                    : 'Start Interview'}{' '}
                  <ArrowRight size={20} />
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
