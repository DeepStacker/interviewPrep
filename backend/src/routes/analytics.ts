import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, adminMiddleware } from '../middleware/auth';
import { generatePersonalizedCoaching } from '../services/aiService';

const router = Router();

// User dashboard stats
router.get('/analytics/user', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Total sessions
    const sessionsResult = await pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1',
      [req.userId]
    );

    const completedResult = await pool.query(
      "SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND status = 'completed'",
      [req.userId]
    );

    // Average score
    const avgResult = await pool.query(
      'SELECT AVG(CAST(total_score AS FLOAT)) as avg_score FROM sessions WHERE user_id = $1 AND total_score IS NOT NULL',
      [req.userId]
    );

    // Recent sessions
    const recentResult = await pool.query(
      'SELECT id, job_role, difficulty, interview_type, total_score, started_at FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 5',
      [req.userId]
    );

    // Stats by role
    const roleStatsResult = await pool.query(
      `SELECT job_role, COUNT(*) as sessions, AVG(CAST(total_score AS FLOAT)) as avg_score
       FROM sessions WHERE user_id = $1
       GROUP BY job_role`,
      [req.userId]
    );

    const trackStatsResult = await pool.query(
      `SELECT COALESCE(interview_type, 'mixed') as interview_type, COUNT(*)::int as sessions
       FROM sessions
       WHERE user_id = $1
       GROUP BY COALESCE(interview_type, 'mixed')
       ORDER BY sessions DESC`,
      [req.userId]
    );

    const monitoringCoverageResult = await pool.query(
      `SELECT
         COUNT(a.id)::int as total_answers,
         COUNT(bm.id)::int as monitored_answers
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       JOIN sessions s ON s.id = q.session_id
       LEFT JOIN behavior_metrics bm ON bm.answer_id = a.id
       WHERE s.user_id = $1`,
      [req.userId]
    );

    const integrityRiskResult = await pool.query(
      `SELECT
         COUNT(*)::int as total_answers,
         COUNT(*) FILTER (WHERE validation_summary ILIKE '%flags=%')::int as risk_answers
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       JOIN sessions s ON s.id = q.session_id
       WHERE s.user_id = $1`,
      [req.userId]
    );

    const completedSessions = parseInt(completedResult.rows[0]?.count || '0', 10);
    const totalSessions = parseInt(sessionsResult.rows[0]?.count || '0', 10);
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const totalAnswers = parseInt(monitoringCoverageResult.rows[0]?.total_answers || '0', 10);
    const monitoredAnswers = parseInt(monitoringCoverageResult.rows[0]?.monitored_answers || '0', 10);
    const monitoringCoverage = totalAnswers > 0 ? (monitoredAnswers / totalAnswers) * 100 : 0;

    const integrityTotalAnswers = parseInt(integrityRiskResult.rows[0]?.total_answers || '0', 10);
    const integrityRiskAnswers = parseInt(integrityRiskResult.rows[0]?.risk_answers || '0', 10);
    const integrityRiskRate = integrityTotalAnswers > 0
      ? (integrityRiskAnswers / integrityTotalAnswers) * 100
      : 0;

    res.json({
      totalSessions,
      completedSessions,
      completionRate: completionRate.toFixed(1),
      averageScore: parseFloat(avgResult.rows[0]?.avg_score || '0').toFixed(2),
      monitoringCoverage: monitoringCoverage.toFixed(1),
      integrityRiskRate: integrityRiskRate.toFixed(1),
      recentSessions: recentResult.rows.map((row) => ({
        id: row.id,
        jobRole: row.job_role,
        difficulty: row.difficulty,
        interviewType: row.interview_type,
        totalScore: row.total_score,
        startedAt: row.started_at,
      })),
      roleStats: roleStatsResult.rows.map((row) => ({
        jobRole: row.job_role,
        sessions: row.sessions,
        averageScore: parseFloat(row.avg_score || '0').toFixed(2),
      })),
      trackStats: trackStatsResult.rows.map((row) => ({
        interviewType: row.interview_type,
        sessions: row.sessions,
      })),
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

router.get('/analytics/user/coach', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [
      sessionsResult,
      roleStatsResult,
      interviewTypeResult,
      recentScoreResult,
      monitoringResult,
      integrityResult,
      codingResult,
      weakSignalsResult,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int as total_sessions,
                COUNT(*) FILTER (WHERE status = 'completed')::int as completed_sessions
         FROM sessions
         WHERE user_id = $1`,
        [req.userId]
      ),
      pool.query(
        `SELECT job_role, COUNT(*)::int as sessions, COALESCE(AVG(CAST(total_score AS FLOAT)), 0) as avg_score
         FROM sessions
         WHERE user_id = $1
         GROUP BY job_role
         ORDER BY avg_score ASC
         LIMIT 6`,
        [req.userId]
      ),
      pool.query(
        `SELECT COALESCE(interview_type, 'mixed') as interview_type, COUNT(*)::int as sessions
         FROM sessions
         WHERE user_id = $1
         GROUP BY COALESCE(interview_type, 'mixed')
         ORDER BY sessions DESC`,
        [req.userId]
      ),
      pool.query(
        `SELECT COALESCE(AVG(CAST(total_score AS FLOAT)), 0) as avg_score
         FROM (
           SELECT total_score
           FROM sessions
           WHERE user_id = $1 AND total_score IS NOT NULL
           ORDER BY started_at DESC
           LIMIT 10
         ) recent_scores`,
        [req.userId]
      ),
      pool.query(
        `SELECT COUNT(a.id)::int as total_answers,
                COUNT(bm.id)::int as monitored_answers
         FROM answers a
         JOIN questions q ON q.id = a.question_id
         JOIN sessions s ON s.id = q.session_id
         LEFT JOIN behavior_metrics bm ON bm.answer_id = a.id
         WHERE s.user_id = $1`,
        [req.userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int as total_answers,
                COUNT(*) FILTER (WHERE validation_summary ILIKE '%flags=%')::int as risk_answers
         FROM answers a
         JOIN questions q ON q.id = a.question_id
         JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = $1`,
        [req.userId]
      ),
      pool.query(
        `SELECT
           COUNT(*)::int as coding_submissions,
           COALESCE(AVG(CAST(score AS FLOAT)), 0) as coding_avg_score,
           COALESCE(AVG(CASE WHEN is_accepted THEN 1 ELSE 0 END) * 100, 0) as coding_acceptance_rate
         FROM code_submissions
         WHERE user_id = $1`,
        [req.userId]
      ),
      pool.query(
        `SELECT validation_summary
         FROM answers a
         JOIN questions q ON q.id = a.question_id
         JOIN sessions s ON s.id = q.session_id
         WHERE s.user_id = $1
           AND a.validation_summary ILIKE '%flags=%'
         ORDER BY a.created_at DESC
         LIMIT 5`,
        [req.userId]
      ),
    ]);

    const totalSessions = Number(sessionsResult.rows[0]?.total_sessions || 0);
    const completedSessions = Number(sessionsResult.rows[0]?.completed_sessions || 0);
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const totalAnswers = Number(monitoringResult.rows[0]?.total_answers || 0);
    const monitoredAnswers = Number(monitoringResult.rows[0]?.monitored_answers || 0);
    const monitoringCoverage = totalAnswers > 0 ? (monitoredAnswers / totalAnswers) * 100 : 0;

    const integrityTotal = Number(integrityResult.rows[0]?.total_answers || 0);
    const integrityRisk = Number(integrityResult.rows[0]?.risk_answers || 0);
    const integrityRiskRate = integrityTotal > 0 ? (integrityRisk / integrityTotal) * 100 : 0;

    const coachingPlan = await generatePersonalizedCoaching({
      jobRoles: roleStatsResult.rows.map((row) => ({
        role: row.job_role,
        averageScore: Number(row.avg_score || 0),
        sessions: Number(row.sessions || 0),
      })),
      interviewTypeStats: interviewTypeResult.rows.map((row) => ({
        interviewType: row.interview_type,
        sessions: Number(row.sessions || 0),
      })),
      recentAverageScore: Number(recentScoreResult.rows[0]?.avg_score || 0),
      completionRate,
      monitoringCoverage,
      integrityRiskRate,
      codingAcceptanceRate: Number(codingResult.rows[0]?.coding_acceptance_rate || 0),
      codingAverageScore: Number(codingResult.rows[0]?.coding_avg_score || 0),
      recentWeakSignals: weakSignalsResult.rows
        .map((row) => String(row.validation_summary || ''))
        .filter((value) => value.length > 0),
    });

    res.json({
      generatedAt: new Date().toISOString(),
      evidence: {
        totalSessions,
        completionRate: completionRate.toFixed(1),
        recentAverageScore: Number(recentScoreResult.rows[0]?.avg_score || 0).toFixed(2),
        monitoringCoverage: monitoringCoverage.toFixed(1),
        integrityRiskRate: integrityRiskRate.toFixed(1),
        codingAverageScore: Number(codingResult.rows[0]?.coding_avg_score || 0).toFixed(2),
        codingAcceptanceRate: Number(codingResult.rows[0]?.coding_acceptance_rate || 0).toFixed(1),
      },
      plan: coachingPlan,
    });
  } catch (error) {
    console.error('User coaching analytics error:', error);
    res.status(500).json({ error: 'Failed to generate coaching plan' });
  }
});

// Admin dashboard - all users stats
router.get('/analytics/admin/users', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Get all users with session counts
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.created_at,
              COUNT(s.id) as total_sessions,
              AVG(CAST(s.total_score AS FLOAT)) as avg_score
       FROM users u
       LEFT JOIN sessions s ON u.id = s.user_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        totalSessions: row.total_sessions,
        averageScore: parseFloat(row.avg_score || '0').toFixed(2),
        createdAt: row.created_at,
      }))
    );
  } catch (error) {
    console.error('Admin users analytics error:', error);
    res.status(500).json({ error: 'Failed to get admin analytics' });
  }
});

// Admin dashboard - popular roles and trends
router.get('/analytics/admin/trends', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Popular roles
    const rolesResult = await pool.query(
      `SELECT job_role, COUNT(*) as count, AVG(CAST(total_score AS FLOAT)) as avg_score
       FROM sessions
       GROUP BY job_role
       ORDER BY count DESC`
    );

    // Difficulty distribution
    const difficultyResult = await pool.query(
      `SELECT difficulty, COUNT(*) as count
       FROM sessions
       GROUP BY difficulty`
    );

    // Sessions by date (last 30 days)
    const dateResult = await pool.query(
      `SELECT DATE(started_at) as date, COUNT(*) as count
       FROM sessions
       WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(started_at)
       ORDER BY date ASC`
    );

    res.json({
      popularRoles: rolesResult.rows.map((row) => ({
        jobRole: row.job_role,
        count: row.count,
        averageScore: parseFloat(row.avg_score || '0').toFixed(2),
      })),
      difficultyDistribution: difficultyResult.rows.map((row) => ({
        difficulty: row.difficulty,
        count: row.count,
      })),
      sessionsTrend: dateResult.rows.map((row) => ({
        date: row.date,
        count: row.count,
      })),
    });
  } catch (error) {
    console.error('Admin trends analytics error:', error);
    res.status(500).json({ error: 'Failed to get trends' });
  }
});

export default router;
