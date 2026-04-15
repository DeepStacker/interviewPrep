import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest, adminMiddleware } from '../middleware/auth';

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

    // Average score
    const avgResult = await pool.query(
      'SELECT AVG(CAST(total_score AS FLOAT)) as avg_score FROM sessions WHERE user_id = $1 AND total_score IS NOT NULL',
      [req.userId]
    );

    // Recent sessions
    const recentResult = await pool.query(
      'SELECT id, job_role, difficulty, total_score, started_at FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 5',
      [req.userId]
    );

    // Stats by role
    const roleStatsResult = await pool.query(
      `SELECT job_role, COUNT(*) as sessions, AVG(CAST(total_score AS FLOAT)) as avg_score
       FROM sessions WHERE user_id = $1
       GROUP BY job_role`,
      [req.userId]
    );

    res.json({
      totalSessions: parseInt(sessionsResult.rows[0]?.count || '0', 10),
      averageScore: parseFloat(avgResult.rows[0]?.avg_score || '0').toFixed(2),
      recentSessions: recentResult.rows.map((row) => ({
        id: row.id,
        jobRole: row.job_role,
        difficulty: row.difficulty,
        totalScore: row.total_score,
        startedAt: row.started_at,
      })),
      roleStats: roleStatsResult.rows.map((row) => ({
        jobRole: row.job_role,
        sessions: row.sessions,
        averageScore: parseFloat(row.avg_score || '0').toFixed(2),
      })),
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
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
