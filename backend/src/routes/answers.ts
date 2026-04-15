import { Router, Response } from 'express';
import pool from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { evaluateAnswer } from '../services/aiService';

const router = Router();

// Submit and evaluate an answer
router.post('/answers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { questionId, userAnswer } = req.body;

    if (!questionId || !userAnswer) {
      res.status(400).json({ error: 'questionId and userAnswer are required' });
      return;
    }

    // Get question and validate ownership
    const questionResult = await pool.query(
      `SELECT q.*, s.job_role, s.difficulty FROM questions q
       JOIN sessions s ON q.session_id = s.id
       WHERE q.id = $1 AND s.user_id = $2`,
      [questionId, req.userId]
    );

    if (questionResult.rows.length === 0) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const question = questionResult.rows[0];

    // Evaluate answer using AI
    const evaluation = await evaluateAnswer(
      question.job_role,
      question.question_text,
      userAnswer,
      question.difficulty
    );

    // Save answer to database
    const result = await pool.query(
      'INSERT INTO answers (question_id, user_answer, score, strengths, missing_points, ideal_answer, evaluation_time) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *',
      [
        questionId,
        userAnswer,
        evaluation.score,
        evaluation.strengths,
        evaluation.missingPoints,
        evaluation.idealAnswer,
      ]
    );

    res.status(201).json(mapAnswerRow(result.rows[0]));
  } catch (error) {
    console.error('Answer evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Get answer for a question
router.get('/questions/:questionId/answer', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify question ownership
    const questionResult = await pool.query(
      `SELECT q.* FROM questions q
       JOIN sessions s ON q.session_id = s.id
       WHERE q.id = $1 AND s.user_id = $2`,
      [req.params.questionId, req.userId]
    );

    if (questionResult.rows.length === 0) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Get answer
    const result = await pool.query(
      'SELECT * FROM answers WHERE question_id = $1 LIMIT 1',
      [req.params.questionId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Answer not found' });
      return;
    }

    res.json(mapAnswerRow(result.rows[0]));
  } catch (error) {
    console.error('Get answer error:', error);
    res.status(500).json({ error: 'Failed to get answer' });
  }
});

// Get all answers for a session
router.get('/sessions/:sessionId/answers', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    // Get answers
    const result = await pool.query(
      `SELECT a.* FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE q.session_id = $1
       ORDER BY a.created_at ASC`,
      [req.params.sessionId]
    );

    res.json(result.rows.map(mapAnswerRow));
  } catch (error) {
    console.error('Get session answers error:', error);
    res.status(500).json({ error: 'Failed to get answers' });
  }
});

const mapAnswerRow = (row: any) => ({
  id: row.id,
  questionId: row.question_id,
  userAnswer: row.user_answer,
  score: row.score,
  strengths: row.strengths,
  missingPoints: row.missing_points,
  idealAnswer: row.ideal_answer,
  evaluationTime: row.evaluation_time,
  createdAt: row.created_at,
});

export default router;
