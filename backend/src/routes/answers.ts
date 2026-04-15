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

    const { questionId, userAnswer, integritySignals } = req.body;

    if (!questionId || !userAnswer) {
      res.status(400).json({ error: 'questionId and userAnswer are required' });
      return;
    }

    if (typeof userAnswer !== 'string') {
      res.status(400).json({ error: 'userAnswer must be a string' });
      return;
    }

    const normalizedAnswer = userAnswer.trim();
    const wordCount = normalizedAnswer.split(/\s+/).filter(Boolean).length;
    if (normalizedAnswer.length < 40 || wordCount < 8) {
      res.status(400).json({
        error: 'Answer is too short. Provide at least 8 words and 40 characters.',
      });
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
      normalizedAnswer,
      question.difficulty
    );

    const normalizedSignals = normalizeIntegritySignals(integritySignals);
    const integrityFlags = getIntegrityFlags(normalizedSignals);
    const penalty = Math.min(2, integrityFlags.length);
    const adjustedScore = Math.max(1, Math.min(10, evaluation.score - penalty));

    const missingPoints =
      integrityFlags.length > 0
        ? `${evaluation.missingPoints} | Integrity flags: ${integrityFlags.join(', ')}`
        : evaluation.missingPoints;

    // Save answer to database
    const result = await pool.query(
      'INSERT INTO answers (question_id, user_answer, score, strengths, missing_points, ideal_answer, integrity_flags, validation_summary, evaluation_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *',
      [
        questionId,
        normalizedAnswer,
        adjustedScore,
        evaluation.strengths,
        missingPoints,
        evaluation.idealAnswer,
        JSON.stringify(normalizedSignals),
        buildValidationSummary(wordCount, normalizedAnswer.length, integrityFlags),
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
  integrityFlags: row.integrity_flags,
  validationSummary: row.validation_summary,
  evaluationTime: row.evaluation_time,
  createdAt: row.created_at,
});

const normalizeIntegritySignals = (signals: any) => {
  const safeNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
  };

  return {
    tabSwitches: safeNumber(signals?.tabSwitches),
    windowBlurCount: safeNumber(signals?.windowBlurCount),
    pasteCount: safeNumber(signals?.pasteCount),
    elapsedSeconds: safeNumber(signals?.elapsedSeconds),
    keystrokes: safeNumber(signals?.keystrokes),
  };
};

const getIntegrityFlags = (signals: {
  tabSwitches: number;
  windowBlurCount: number;
  pasteCount: number;
  elapsedSeconds: number;
  keystrokes: number;
}) => {
  const flags: string[] = [];

  if (signals.pasteCount >= 3) {
    flags.push('heavy_paste_activity');
  }
  if (signals.tabSwitches >= 3 || signals.windowBlurCount >= 3) {
    flags.push('multiple_focus_switches');
  }
  if (signals.elapsedSeconds > 0 && signals.keystrokes <= 2 && signals.pasteCount > 0) {
    flags.push('low_typing_high_paste_pattern');
  }

  return flags;
};

const buildValidationSummary = (
  wordCount: number,
  charCount: number,
  flags: string[]
) => {
  const parts = [`words=${wordCount}`, `chars=${charCount}`];
  if (flags.length > 0) {
    parts.push(`flags=${flags.join('|')}`);
  }
  return parts.join(';');
};

export default router;
