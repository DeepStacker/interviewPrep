import express, { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Company interface
interface Company {
  id: number;
  name: string;
  logo: string;
  website: string;
  description: string;
  founded: number;
  headquarters: string;
  interviewTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  focusAreas: string[];
}

const COMPANIES: Company[] = [
  {
    id: 1,
    name: 'Google',
    logo: '🔍',
    website: 'https://www.google.com',
    description: 'Search giant and tech innovator. Known for algorithm-heavy interviews.',
    founded: 1998,
    headquarters: 'Mountain View, California',
    interviewTypes: ['Coding', 'System Design', 'Behavioral'],
    difficulty: 'hard',
    focusAreas: ['Algorithms', 'Data Structures', 'Distributed Systems', 'Machine Learning'],
  },
  {
    id: 2,
    name: 'Amazon',
    logo: '🚀',
    website: 'https://www.amazon.com',
    description: 'E-commerce and cloud leader. Focuses on scalability and leadership principles.',
    founded: 1994,
    headquarters: 'Seattle, Washington',
    interviewTypes: ['Coding', 'System Design', 'Behavioral'],
    difficulty: 'hard',
    focusAreas: ['System Design', 'Database Design', 'Leadership', 'AWS'],
  },
  {
    id: 3,
    name: 'Meta',
    logo: '📱',
    website: 'https://www.meta.com',
    description: 'Social media platform. Emphasizes speed to market and product thinking.',
    founded: 2004,
    headquarters: 'Menlo Park, California',
    interviewTypes: ['Coding', 'System Design', 'Product Sense'],
    difficulty: 'hard',
    focusAreas: ['System Scale', 'Distributed Systems', 'Product Design', 'Machine Learning'],
  },
  {
    id: 4,
    name: 'Apple',
    logo: '🍎',
    website: 'https://www.apple.com',
    description: 'Hardware and software innovator. Values user experience and detail.',
    founded: 1976,
    headquarters: 'Cupertino, California',
    interviewTypes: ['Coding', 'System Design', 'Behavioral'],
    difficulty: 'hard',
    focusAreas: ['Hardware/Software Integration', 'Performance', 'User Privacy', 'Mobile'],
  },
  {
    id: 5,
    name: 'Microsoft',
    logo: '💻',
    website: 'https://www.microsoft.com',
    description: 'Software and cloud leader. Known for cloud and enterprise solutions.',
    founded: 1975,
    headquarters: 'Redmond, Washington',
    interviewTypes: ['Coding', 'System Design', 'Behavioral'],
    difficulty: 'hard',
    focusAreas: ['Cloud Computing', 'Azure', 'Enterprise Scale', 'AI'],
  },
  {
    id: 6,
    name: 'Tesla',
    logo: '⚡',
    website: 'https://www.tesla.com',
    description: 'Electric vehicles and energy. Emphasizes innovation and performance.',
    founded: 2003,
    headquarters: 'Palo Alto, California',
    interviewTypes: ['Coding', 'System Design', 'Technical'],
    difficulty: 'hard',
    focusAreas: ['Embedded Systems', 'Real-time Systems', 'Battery Tech', 'Autonomy'],
  },
  {
    id: 7,
    name: 'Netflix',
    logo: '📺',
    website: 'https://www.netflix.com',
    description: 'Streaming entertainment. Known for data-driven decisions and scale.',
    founded: 1997,
    headquarters: 'Los Gatos, California',
    interviewTypes: ['Coding', 'System Design', 'Data Science'],
    difficulty: 'hard',
    focusAreas: ['Streaming at Scale', 'Recommendation Systems', 'Data Pipeline', 'Video Tech'],
  },
  {
    id: 8,
    name: 'LinkedIn',
    logo: '💼',
    website: 'https://www.linkedin.com',
    description: 'Professional networking platform. Focuses on data and recommendations.',
    founded: 2002,
    headquarters: 'Sunnyvale, California',
    interviewTypes: ['Coding', 'System Design', 'Behavioral'],
    difficulty: 'medium',
    focusAreas: ['Search', 'Recommendations', 'Networking', 'Data Systems'],
  },
];

/**
 * GET /api/companies
 * List all FAANG companies
 */
router.get('/companies', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'success',
      data: COMPANIES,
      total: COMPANIES.length,
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch companies',
      error: error.message,
    });
  }
});

/**
 * GET /api/companies/:id
 * Get company details
 */
router.get('/companies/:id', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id as string);

    const company = COMPANIES.find((c) => c.id === companyId);

    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found',
      });
    }

    // Get company-specific stats from database
    const statsResult = await pool.query(
      `
      SELECT
        COUNT(DISTINCT CASE WHEN cc.company_id = $1 THEN cc.id END) as total_problems,
        COUNT(DISTINCT CASE WHEN cc.company_id = $1 THEN cs.id END) as total_submissions,
        ROUND(
          COUNT(DISTINCT CASE WHEN cc.company_id = $1 AND cs.is_accepted = true THEN cs.id END)::numeric /
          NULLIF(COUNT(DISTINCT CASE WHEN cc.company_id = $1 THEN cs.id END), 0) * 100,
          2
        ) as acceptance_rate
      FROM coding_challenges cc
      LEFT JOIN code_submissions cs ON cc.id = cs.challenge_id
      WHERE cc.company_id = $1
    `,
      [companyId]
    );

    const stats = statsResult.rows[0] || {};

    res.json({
      status: 'success',
      data: {
        ...company,
        stats: {
          totalProblems: parseInt(stats.total_problems) || 0,
          totalSubmissions: parseInt(stats.total_submissions) || 0,
          acceptanceRate: parseFloat(stats.acceptance_rate) || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company details',
      error: error.message,
    });
  }
});

/**
 * GET /api/companies/:id/problems
 * Get coding problems for a specific company
 */
router.get('/companies/:id/problems', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id as string);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `
      SELECT * FROM coding_challenges
      WHERE company_id = $1
      ORDER BY difficulty DESC, created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [companyId, limit, offset]
    );

    res.json({
      status: 'success',
      data: result.rows,
      pagination: {
        limit,
        offset,
        count: result.rows.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company problems:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company problems',
      error: error.message,
    });
  }
});

/**
 * GET /api/companies/:id/stats
 * Get company-specific leaderboard stats
 */
router.get('/companies/:id/stats', async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.id as string);

    const result = await pool.query(
      `
      SELECT
        COUNT(DISTINCT cc.id) as total_problems,
        COUNT(DISTINCT CASE WHEN cc.difficulty = 'easy' THEN cc.id END) as easy_problems,
        COUNT(DISTINCT CASE WHEN cc.difficulty = 'medium' THEN cc.id END) as medium_problems,
        COUNT(DISTINCT CASE WHEN cc.difficulty = 'hard' THEN cc.id END) as hard_problems,
        ROUND(AVG(cc.acceptance_rate), 2) as avg_acceptance_rate,
        COUNT(DISTINCT u.id) as total_users_attempted
      FROM coding_challenges cc
      LEFT JOIN code_submissions cs ON cc.id = cs.challenge_id
      LEFT JOIN users u ON cs.user_id = u.id
      WHERE cc.company_id = $1
    `,
      [companyId]
    );

    const stats = result.rows[0] || {};

    res.json({
      status: 'success',
      data: {
        totalProblems: parseInt(stats.total_problems) || 0,
        byDifficulty: {
          easy: parseInt(stats.easy_problems) || 0,
          medium: parseInt(stats.medium_problems) || 0,
          hard: parseInt(stats.hard_problems) || 0,
        },
        avgAcceptanceRate: parseFloat(stats.avg_acceptance_rate) || 0,
        totalUsersAttempted: parseInt(stats.total_users_attempted) || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company statistics',
      error: error.message,
    });
  }
});

export default router;
