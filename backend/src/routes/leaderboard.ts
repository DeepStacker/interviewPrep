import express, { Router, Request, Response } from 'express';
import { leaderboardService } from '../services/leaderboardService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/leaderboard
 * Get global leaderboard rankings
 * Query params: limit (default 100), offset (default 0)
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const leaderboard = await leaderboardService.getGlobalLeaderboard(limit, offset);

    res.json({
      status: 'success',
      data: leaderboard,
      pagination: {
        limit,
        offset,
        count: leaderboard.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch leaderboard',
      error: error.message,
    });
  }
});

/**
 * GET /api/leaderboard/user/:userId
 * Get specific user's ranking and stats
 */
router.get('/leaderboard/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId as string);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
    }

    const ranking = await leaderboardService.getUserRanking(userId);

    res.json({
      status: 'success',
      data: ranking,
    });
  } catch (error: any) {
    console.error('Error fetching user ranking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user ranking',
      error: error.message,
    });
  }
});

/**
 * GET /api/leaderboard/company/:companyId
 * Get company-specific leaderboard
 */
router.get('/leaderboard/company/:companyId', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId as string);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);

    if (!companyId || isNaN(companyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid company ID',
      });
    }

    const leaderboard = await leaderboardService.getCompanyLeaderboard(companyId, limit);

    res.json({
      status: 'success',
      data: leaderboard,
      limit,
    });
  } catch (error: any) {
    console.error('Error fetching company leaderboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company leaderboard',
      error: error.message,
    });
  }
});

/**
 * POST /api/leaderboard/check-badges
 * Check and award new badges for the current user
 */
router.post('/leaderboard/check-badges', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const awardedBadges = await leaderboardService.checkAndAwardBadges(userId);

    res.json({
      status: 'success',
      message: `Checked badges. ${awardedBadges.length} new badge(s) awarded.`,
      data: {
        newBadges: awardedBadges,
        awardedCount: awardedBadges.length,
      },
    });
  } catch (error: any) {
    console.error('Error checking badges:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check badges',
      error: error.message,
    });
  }
});

/**
 * GET /api/leaderboard/my-rank
 * Get current user's rank (requires auth)
 */
router.get('/leaderboard/my-rank', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const ranking = await leaderboardService.getUserRanking(userId);

    res.json({
      status: 'success',
      data: ranking,
    });
  } catch (error: any) {
    console.error('Error fetching user ranking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch your ranking',
      error: error.message,
    });
  }
});

export default router;
