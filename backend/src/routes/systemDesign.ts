import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getSystemDesignProblems,
  getSystemDesignProblemById,
  submitSystemDesignSolution,
  getUserSystemDesignStats,
  getUserSystemDesignSubmissions,
} from '../services/systemDesignService';

const router = Router();

// Get system design problems
router.get('/system-design/problems', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { difficulty, company, limit, offset } = req.query;

    const problems = await getSystemDesignProblems(
      {
        difficulty: difficulty as string,
        company: company as string,
      },
      parseInt(limit as string) || 20,
      parseInt(offset as string) || 0
    );

    res.json(problems);
  } catch (error) {
    console.error('Get system design problems error:', error);
    res.status(500).json({ error: 'Failed to get problems' });
  }
});

// Get one system design problem
router.get('/system-design/problems/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const problem = await getSystemDesignProblemById(parseInt(req.params.id as string, 10));
    res.json(problem);
  } catch (error) {
    console.error('Get system design problem error:', error);
    res.status(404).json({ error: 'Problem not found' });
  }
});

// Submit system design solution
router.post('/system-design/submit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { problemId, designDocument, whiteBoardImageUrl, solution, diagramUrl } = req.body;
    const normalizedDesignDocument = designDocument || solution;
    const normalizedWhiteBoardImageUrl = whiteBoardImageUrl || diagramUrl;

    if (!problemId || !normalizedDesignDocument) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const submission = await submitSystemDesignSolution(
      req.userId,
      problemId,
      normalizedDesignDocument,
      normalizedWhiteBoardImageUrl
    );

    res.status(201).json(submission);
  } catch (error) {
    console.error('Submit system design error:', error);
    res.status(500).json({ error: 'Failed to submit design' });
  }
});

// Get user system design submission history
router.get('/system-design/submissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const submissions = await getUserSystemDesignSubmissions(req.userId, limit, offset);
    res.json(submissions);
  } catch (error) {
    console.error('Get system design submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Get user system design stats
router.get('/system-design/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await getUserSystemDesignStats(req.userId);
    res.json(stats);
  } catch (error) {
    console.error('Get design stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
