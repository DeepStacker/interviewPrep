import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateQuestions } from '../services/aiService';
import { getOrSetCache, invalidateUserCaches } from '../utils/cacheManager';

const router = Router();

// Generate questions for a session
router.post('/questions/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { sessionId, numQuestions } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    // Get session details
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.userId]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const session = sessionResult.rows[0];

    const existingQuestions = await pool.query(
      'SELECT * FROM questions WHERE session_id = $1 ORDER BY question_number ASC',
      [sessionId]
    );
    if (existingQuestions.rows.length > 0) {
      res.json(existingQuestions.rows.map(mapQuestionRow));
      return;
    }

    // Generate questions using AI
    const questions = await generateQuestions(
      session.job_role,
      session.difficulty,
      numQuestions || 5,
      {
        interviewType: session.interview_type || 'mixed',
        companyType: session.company_type || 'startup',
      }
    );

    // Save questions to database
    const savedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const result = await pool.query(
        'INSERT INTO questions (session_id, question_text, question_number) VALUES ($1, $2, $3) RETURNING *',
        [sessionId, questions[i].text, i + 1]
      );
      savedQuestions.push(mapQuestionRow(result.rows[0]));
    }

    invalidateUserCaches(req.userId, ['db:questions', 'db:analytics', 'ai:coach']);

    res.status(201).json(savedQuestions);
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Get questions for a session
router.get('/sessions/:sessionId/questions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify session ownership
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [req.params.sessionId, req.userId]
    );

    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Get questions
    const result = await getOrSetCache(
      'db:questions',
      `session:${req.params.sessionId}`,
      1000 * 60 * 5,
      () =>
        pool.query(
          'SELECT * FROM questions WHERE session_id = $1 ORDER BY question_number ASC',
          [req.params.sessionId]
        ),
      req.userId
    );

    res.json(result.rows.map(mapQuestionRow));
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

const mapQuestionRow = (row: any) => ({
  id: row.id,
  sessionId: row.session_id,
  text: row.question_text,
  questionNumber: row.question_number,
  createdAt: row.created_at,
});

export default router;
