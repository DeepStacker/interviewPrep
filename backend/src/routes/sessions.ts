import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Create new session
router.post('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { jobRole, companyType, difficulty, interviewType } = req.body;

    if (!jobRole || !difficulty) {
      res.status(400).json({ error: 'jobRole and difficulty are required' });
      return;
    }

    const normalizedInterviewType =
      typeof interviewType === 'string' && interviewType.trim().length > 0
        ? interviewType.trim().toLowerCase()
        : 'mixed';

    const allowedInterviewTypes = new Set([
      'mixed',
      'technical',
      'behavioral',
      'system_design',
      'rapid_fire',
    ]);

    if (!allowedInterviewTypes.has(normalizedInterviewType)) {
      res.status(400).json({ error: 'invalid interviewType' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO sessions (user_id, job_role, company_type, difficulty, interview_type, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, jobRole, companyType, difficulty, normalizedInterviewType, 'in_progress']
    );

    res.status(201).json(mapSessionRow(result.rows[0]));
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get user's sessions
router.get('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt((req.query.limit as string) || '20', 10);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const result = await pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3',
      [req.userId, limit, offset]
    );

    res.json(result.rows.map(mapSessionRow));
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get session details
router.get('/sessions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(mapSessionRow(result.rows[0]));
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Update session
router.patch('/sessions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { totalScore, status } = req.body;

    const result = await pool.query(
      'UPDATE sessions SET total_score = COALESCE($1, total_score), status = COALESCE($2, status), completed_at = CASE WHEN $2 = $3 THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = $4 AND user_id = $5 RETURNING *',
      [totalScore, status, 'completed', req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(mapSessionRow(result.rows[0]));
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

const mapSessionRow = (row: any) => ({
  id: row.id,
  userId: row.user_id,
  jobRole: row.job_role,
  companyType: row.company_type,
  difficulty: row.difficulty,
  interviewType: row.interview_type || 'mixed',
  totalScore: row.total_score,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  status: row.status,
});

export default router;
