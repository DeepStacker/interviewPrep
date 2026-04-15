import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Schedule mock interview
router.post('/mock-interview/schedule', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { companyId, interviewType, scheduledAt } = req.body;

    if (!companyId || !interviewType || !scheduledAt) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO mock_interviews (
        interviewee_id, company_id, interview_type, scheduled_at, status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *`,
      [req.userId, companyId, interviewType, new Date(scheduledAt)]
    );

    res.status(201).json(mapMockInterviewRow(result.rows[0]));
  } catch (error) {
    console.error('Schedule mock interview error:', error);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// Get user mock interviews
router.get('/mock-interview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await pool.query(
      `SELECT mi.* FROM mock_interviews mi
       WHERE mi.interviewee_id = $1
       ORDER BY mi.scheduled_at DESC`,
      [req.userId]
    );

    res.json(result.rows.map(mapMockInterviewRow));
  } catch (error) {
    console.error('Get mock interviews error:', error);
    res.status(500).json({ error: 'Failed to get interviews' });
  }
});

// Update mock interview
router.patch('/mock-interview/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { status, rating, feedback, recordingUrl } = req.body;

    const result = await pool.query(
      `UPDATE mock_interviews SET
        status = COALESCE($1, status),
        rating = COALESCE($2, rating),
        feedback = COALESCE($3, feedback),
        recording_url = COALESCE($4, recording_url),
        completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $5 AND (interviewee_id = $6 OR interviewer_id = $6)
      RETURNING *`,
      [status, rating, feedback, recordingUrl, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Interview not found' });
      return;
    }

    res.json(mapMockInterviewRow(result.rows[0]));
  } catch (error) {
    console.error('Update mock interview error:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// Get available interviewers
router.get('/mock-interview/interviewers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.picture_url, COUNT(DISTINCT mi.id) as interviews_conducted
       FROM users u
       LEFT JOIN mock_interviews mi ON u.id = mi.interviewer_id
       WHERE u.is_admin = true OR (SELECT COUNT(*) FROM mock_interviews WHERE interviewer_id = u.id) > 5
       GROUP BY u.id
       ORDER BY interviews_conducted DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get interviewers error:', error);
    res.status(500).json({ error: 'Failed to get interviewers' });
  }
});

const mapMockInterviewRow = (row: any) => ({
  id: row.id,
  interviewerId: row.interviewer_id,
  intervieweeId: row.interviewee_id,
  companyId: row.company_id,
  interviewType: row.interview_type,
  scheduledAt: row.scheduled_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  durationMinutes: row.duration_minutes,
  recordingUrl: row.recording_url,
  rating: row.rating,
  feedback: row.feedback,
  status: row.status,
});

export default router;
