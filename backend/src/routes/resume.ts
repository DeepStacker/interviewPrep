import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  createOrUpdateResume,
  getUserResume,
  getResumeImprovementTips,
} from '../services/resumeService';
import pool from '../config/database';

const router = Router();

// Create or update resume
router.post('/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const resumeData = req.body;

    const resume = await createOrUpdateResume(req.userId, resumeData);
    res.status(201).json(resume);
  } catch (error) {
    console.error('Save resume error:', error);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Patch resume
router.patch('/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const existing = await getUserResume(req.userId);
    const merged = {
      title: req.body.title ?? existing?.title ?? '',
      summary: req.body.summary ?? existing?.summary ?? '',
      experience: req.body.experience ?? existing?.experience ?? [],
      education: req.body.education ?? existing?.education ?? [],
      skills: req.body.skills ?? existing?.skills ?? [],
      projects: req.body.projects ?? existing?.projects ?? [],
      certifications: req.body.certifications ?? existing?.certifications ?? [],
    };

    const resume = await createOrUpdateResume(req.userId, merged);
    res.json(resume);
  } catch (error) {
    console.error('Patch resume error:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Get user resume
router.get('/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const resume = await getUserResume(req.userId);

    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    res.json(resume);
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to get resume' });
  }
});

// Get resume improvement tips
router.get('/resume/tips', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tips = await getResumeImprovementTips(req.userId);
    res.json(tips);
  } catch (error) {
    console.error('Get resume tips error:', error);
    res.status(500).json({ error: 'Failed to get tips' });
  }
});

// Get resume score summary
router.get('/resume/score', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const resume = await getUserResume(req.userId);
    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    res.json({ score: resume.resumeScore, suggestions: resume.aiSuggestions });
  } catch (error) {
    console.error('Get resume score error:', error);
    res.status(500).json({ error: 'Failed to get resume score' });
  }
});

// Delete resume
router.delete('/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await pool.query('DELETE FROM resumes WHERE user_id = $1', [req.userId]);
    res.status(204).send();
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

export default router;
