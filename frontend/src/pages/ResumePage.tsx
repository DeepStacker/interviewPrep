import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from '../services/api';
import styles from './ResumePage.module.css';

type ResumeApiPayload = {
  title: string;
  summary: string;
  skills: string[];
  experience: any[];
  education: any[];
  projects: any[];
  certifications: any[];
};

export default function ResumePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  const [score, setScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string>('');
  const [tips, setTips] = useState<any[]>([]);

  const parsedSkills = useMemo(
    () =>
      skillsInput
        .split(',')
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
    [skillsInput]
  );

  const fetchResumeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resumeRes, tipsRes, scoreRes] = await Promise.allSettled([
        resumeAPI.get(),
        resumeAPI.getTips(),
        resumeAPI.getScore(),
      ]);

      if (resumeRes.status === 'fulfilled') {
        const resume = resumeRes.value.data?.data ?? resumeRes.value.data;
        setTitle(resume?.title ?? '');
        setSummary(resume?.summary ?? '');
        setSkillsInput(Array.isArray(resume?.skills) ? resume.skills.join(', ') : '');
      }

      if (tipsRes.status === 'fulfilled') {
        const tipsPayload = tipsRes.value.data?.data ?? tipsRes.value.data ?? [];
        setTips(Array.isArray(tipsPayload) ? tipsPayload : []);
      }

      if (scoreRes.status === 'fulfilled') {
        const scorePayload = scoreRes.value.data?.data ?? scoreRes.value.data;
        const numericScore = Number(scorePayload?.score);
        setScore(Number.isFinite(numericScore) ? numericScore : null);
        setSuggestions(String(scorePayload?.suggestions ?? ''));
      }
    } catch (err) {
      console.error('Error fetching resume data:', err);
      setError('Failed to load resume data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumeData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const payload: ResumeApiPayload = {
        title: title.trim(),
        summary: summary.trim(),
        skills: parsedSkills,
        experience: [],
        education: [],
        projects: [],
        certifications: [],
      };

      await resumeAPI.create(payload);
      setMessage('Resume saved successfully.');
      await fetchResumeData();
    } catch (err: any) {
      console.error('Error saving resume:', err);
      setError(err?.response?.data?.error || 'Failed to save resume.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <button type="button" onClick={() => navigate(-1)} className={styles.backBtn}>
        ← Back
      </button>

      <header className={styles.header}>
        <h1>Resume Builder</h1>
        <p>Maintain an interview-ready resume and track quality improvements.</p>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading resume workspace...</div>
      ) : (
        <div className={styles.layout}>
          <section className={styles.editorCard}>
            <h2>Profile Content</h2>
            <label htmlFor="resume-title">Resume Title</label>
            <input
              id="resume-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Senior Backend Engineer Resume"
            />

            <label htmlFor="resume-summary">Professional Summary</label>
            <textarea
              id="resume-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={8}
              placeholder="Describe your impact, stack, and leadership in 4-6 lines."
            />

            <label htmlFor="resume-skills">Skills (comma separated)</label>
            <input
              id="resume-skills"
              value={skillsInput}
              onChange={(event) => setSkillsInput(event.target.value)}
              placeholder="TypeScript, Node.js, PostgreSQL, AWS"
            />

            <div className={styles.actions}>
              <button type="button" onClick={handleSave} disabled={saving} className={styles.primaryBtn}>
                {saving ? 'Saving...' : 'Save Resume'}
              </button>
              <button type="button" onClick={fetchResumeData} className={styles.secondaryBtn}>
                Refresh Analysis
              </button>
            </div>

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>{error}</p>}
          </section>

          <aside className={styles.insightsCard}>
            <h2>Resume Insights</h2>
            <div className={styles.metricRow}>
              <span>Current Score</span>
              <strong>{score !== null ? score.toFixed(1) : 'N/A'}</strong>
            </div>

            {suggestions && (
              <div className={styles.suggestionBox}>
                <h3>AI Suggestions</h3>
                <p>{suggestions}</p>
              </div>
            )}

            <div className={styles.tipsSection}>
              <h3>Improvement Tips</h3>
              {tips.length === 0 ? (
                <p className={styles.muted}>No tips yet. Save your resume to generate suggestions.</p>
              ) : (
                <ul className={styles.tipList}>
                  {tips.map((tip, index) => (
                    <li key={`${tip.title || 'tip'}-${index}`}>
                      <strong>{tip.title || 'Recommendation'}</strong>
                      <p>{tip.description || tip.suggestion || String(tip)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.skillPreview}>
              <h3>Parsed Skills</h3>
              {parsedSkills.length === 0 ? (
                <p className={styles.muted}>No skills entered yet.</p>
              ) : (
                <div className={styles.skillPills}>
                  {parsedSkills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
