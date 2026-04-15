import express, { Router, Request, Response } from 'express';
import pool from '../config/database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Badge definitions
const BADGE_DEFINITIONS = [
  {
    slug: 'first_challenge',
    name: 'First Challenge',
    description: 'Solved your first coding problem',
    icon: '🎯',
    rarity: 'common',
  },
  {
    slug: 'hard_core_10',
    name: 'Hard Core',
    description: 'Solved 10 coding problems',
    icon: '💪',
    rarity: 'uncommon',
  },
  {
    slug: 'hard_core_50',
    name: 'Legend',
    description: 'Solved 50 coding problems',
    icon: '⭐',
    rarity: 'rare',
  },
  {
    slug: 'system_designer',
    name: 'System Designer',
    description: 'Achieved 8+ score on system design',
    icon: '🏗️',
    rarity: 'rare',
  },
  {
    slug: 'points_100',
    name: 'Rising Star',
    description: 'Earned 100 platform points',
    icon: '🌟',
    rarity: 'uncommon',
  },
  {
    slug: 'points_500',
    name: 'Elite Performer',
    description: 'Earned 500 platform points',
    icon: '👑',
    rarity: 'rare',
  },
  {
    slug: 'streak_7',
    name: '7-Day Streak',
    description: 'Practiced for 7 consecutive days',
    icon: '🔥',
    rarity: 'uncommon',
  },
  {
    slug: 'interview_ace',
    name: 'Interview Ace',
    description: 'Achieved 5-star rating on mock interview',
    icon: '🎬',
    rarity: 'epic',
  },
  {
    slug: 'resume_perfect',
    name: 'Resume Perfect',
    description: 'Achieved 10/10 score on resume',
    icon: '📄',
    rarity: 'epic',
  },
  {
    slug: 'speed_demon',
    name: 'Speed Demon',
    description: 'Solved 5 problems in under 15 minutes each',
    icon: '⚡',
    rarity: 'rare',
  },
];

/**
 * GET /api/badges
 * Get all available badges
 */
router.get('/badges', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'success',
      data: BADGE_DEFINITIONS,
      total: BADGE_DEFINITIONS.length,
    });
  } catch (error: any) {
    console.error('Error fetching badges:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch badges',
      error: error.message,
    });
  }
});

/**
 * GET /api/badges/user
 * Get user's earned badges (requires auth)
 */
router.get('/badges/user', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const result = await pool.query(
      `SELECT badge_type as badge_slug, badge_name, earned_at, earned_at::date as earned_date
       FROM achievement_badges
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    const earnedBadges = result.rows;
    const earnedSlugs = new Set(earnedBadges.map((b) => b.badge_slug));

    // Combine with definitions
    const badgesWithStatus = BADGE_DEFINITIONS.map((badge) => ({
      ...badge,
      earned: earnedSlugs.has(badge.slug),
      earnedAt: earnedBadges.find((b) => b.badge_slug === badge.slug)?.earned_at,
    }));

    res.json({
      status: 'success',
      data: {
        earned: earnedBadges,
        all: badgesWithStatus,
        earnedCount: earnedBadges.length,
        totalAvailable: BADGE_DEFINITIONS.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user badges',
      error: error.message,
    });
  }
});

/**
 * GET /api/badges/user/:userId
 * Get specific user's badges (public)
 */
router.get('/badges/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId as string);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID',
      });
    }

    const result = await pool.query(
      `SELECT badge_type as badge_slug, badge_name, earned_at
       FROM achievement_badges
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    res.json({
      status: 'success',
      data: result.rows,
      totalBadges: result.rows.length,
    });
  } catch (error: any) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user badges',
      error: error.message,
    });
  }
});

/**
 * POST /api/badges/award
 * Award a specific badge to a user (admin only)
 */
router.post('/badges/award', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { badgeSlug } = req.body;

    // Verify user is admin (simplified check - in production, check user.is_admin)
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]?.is_admin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only admins can award badges',
      });
    }

    const { targetUserId } = req.body;
    const badge = BADGE_DEFINITIONS.find((b) => b.slug === badgeSlug);

    if (!badge) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid badge slug',
      });
    }

    // Check if user already has this badge
    const existing = await pool.query(
      'SELECT id FROM achievement_badges WHERE user_id = $1 AND badge_type = $2',
      [targetUserId, badgeSlug]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User already has this badge',
      });
    }

    // Award badge
    await pool.query(
      'INSERT INTO achievement_badges (user_id, badge_type, badge_name, description, earned_at) VALUES ($1, $2, $3, $4, NOW())',
      [targetUserId, badgeSlug, badge.name, badge.description]
    );

    res.json({
      status: 'success',
      message: `Badge "${badge.name}" awarded to user`,
      data: badge,
    });
  } catch (error: any) {
    console.error('Error awarding badge:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to award badge',
      error: error.message,
    });
  }
});

/**
 * GET /api/badges/stats
 * Get badge statistics (how many users have each badge)
 */
router.get('/badges/stats', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT badge_type as badge_slug, badge_name, COUNT(*) as user_count
       FROM achievement_badges
       GROUP BY badge_type, badge_name
       ORDER BY user_count DESC`
    );

    const stats = result.rows;
    const statsWithPercentage = stats.map((stat) => ({
      ...stat,
      distribution: `${stat.user_count} users`,
    }));

    res.json({
      status: 'success',
      data: statsWithPercentage,
    });
  } catch (error: any) {
    console.error('Error fetching badge stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch badge statistics',
      error: error.message,
    });
  }
});

export default router;
