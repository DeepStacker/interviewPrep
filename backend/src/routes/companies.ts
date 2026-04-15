import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Company interface
interface Company {
  id: number;
  name: string;
  logo?: string;
  website?: string;
  description?: string;
  founded?: number;
  headquarters?: string;
  interviewTypes?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  focusAreas?: string[];
}

const deriveLogo = (name: string, logoUrl?: string | null): string => {
  if (logoUrl) {
    return logoUrl;
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return initials || 'CO';
};

const parseFocusAreas = (category?: string | null): string[] => {
  if (!category) {
    return ['Coding', 'System Design'];
  }

  return category
    .split(/[,/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const mapCompanyRow = (row: any): Company => ({
  id: row.id,
  name: row.name,
  logo: deriveLogo(row.name, row.logo_url),
  website: row.website_url || undefined,
  description: row.description || undefined,
  difficulty: (row.difficulty_level || 'medium') as 'easy' | 'medium' | 'hard',
  interviewTypes: ['Coding', 'System Design', 'Behavioral'],
  focusAreas: parseFocusAreas(row.category),
});

/**
 * GET /api/companies
 * List all FAANG companies
 */
router.get('/companies', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category, description, difficulty_level, logo_url, website_url
       FROM companies
       ORDER BY name ASC`
    );

    const companies = result.rows.map(mapCompanyRow);

    res.json({
      status: 'success',
      data: companies,
      total: companies.length,
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

    if (!companyId || Number.isNaN(companyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid company id',
      });
    }

    const companyResult = await pool.query(
      `SELECT id, name, category, description, difficulty_level, logo_url, website_url
       FROM companies
       WHERE id = $1
       LIMIT 1`,
      [companyId]
    );

    const company = companyResult.rows[0] ? mapCompanyRow(companyResult.rows[0]) : null;

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
    if (!companyId || Number.isNaN(companyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid company id',
      });
    }

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
    if (!companyId || Number.isNaN(companyId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid company id',
      });
    }

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
