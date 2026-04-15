import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  generatePersonalizedRoadmap,
  getUserRoadmaps,
  updateRoadmapProgress,
  getRoadmapResources,
} from '../services/roadmapService';

const router = Router();

// Generate personalized roadmap
router.post('/roadmap/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { companyId, targetRole, experienceLevel, difficulty } = req.body;

    if (!companyId || !targetRole || !experienceLevel) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const roadmap = await generatePersonalizedRoadmap(
      req.userId,
      companyId,
      targetRole,
      experienceLevel,
      difficulty || 'medium'
    );

    res.status(201).json(roadmap);
  } catch (error) {
    console.error('Generate roadmap error:', error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

// Get user roadmaps
router.get('/roadmap', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roadmaps = await getUserRoadmaps(req.userId);
    res.json(roadmaps);
  } catch (error) {
    console.error('Get roadmaps error:', error);
    res.status(500).json({ error: 'Failed to get roadmaps' });
  }
});

// Update roadmap progress
router.patch('/roadmap/:id/progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { progressPercentage } = req.body;

    if (progressPercentage === undefined) {
      res.status(400).json({ error: 'Progress percentage required' });
      return;
    }

    await updateRoadmapProgress(parseInt(req.params.id as string), progressPercentage);
    res.json({ success: true });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get roadmap resources
router.get('/roadmap/resources/:topic', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const resources = getRoadmapResources(req.params.topic as string);
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

export default router;
