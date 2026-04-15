import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  searchCodingChallenges,
  getChallengeById,
  submitCodeSolution,
  getUserChallengeStats,
  getChallengesByCompany,
  getUserSubmissions,
} from '../services/codingService';

const router = Router();

// Search coding challenges
router.get('/coding/challenges', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { difficulty, category, company, search, limit, offset } = req.query;

    const challenges = await searchCodingChallenges(
      {
        difficulty: difficulty as string,
        category: category as string,
        company: company as string,
        searchTerm: search as string,
      },
      parseInt(limit as string) || 20,
      parseInt(offset as string) || 0
    );

    res.json(challenges);
  } catch (error) {
    console.error('Search challenges error:', error);
    res.status(500).json({ error: 'Failed to search challenges' });
  }
});

// Get specific challenge
router.get('/coding/challenges/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await getChallengeById(parseInt(req.params.id as string));
    res.json(challenge);
  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(404).json({ error: 'Challenge not found' });
  }
});

// Submit code solution
router.post('/coding/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { challengeId, code, language } = req.body;

    if (!challengeId || !code || !language) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const submission = await submitCodeSolution(
      req.userId,
      challengeId,
      code,
      language
    );

    res.status(201).json(submission);
  } catch (error) {
    console.error('Submit code error:', error);
    res.status(500).json({ error: 'Failed to submit code' });
  }
});

// Get user coding stats
router.get('/coding/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await getUserChallengeStats(req.userId);
    res.json(stats);
  } catch (error) {
    console.error('Get coding stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get user coding submissions history
router.get('/coding/submissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const submissions = await getUserSubmissions(req.userId, limit, offset);
    res.json(submissions);
  } catch (error) {
    console.error('Get coding submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Get challenges by company
router.get('/coding/company/:company', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { difficulty } = req.query;
    const challenges = await getChallengesByCompany(
      req.params.company as string,
      difficulty as string
    );
    res.json(challenges);
  } catch (error) {
    console.error('Get company challenges error:', error);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
});

export default router;
