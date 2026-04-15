import pool from '../config/database';
import Groq from 'groq-sdk';
import { config } from '../config/env';

const groq = new Groq({ apiKey: config.ai.groqApiKey });

export interface SystemDesignProblem {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  requirements: string;
  constraints: string;
  estimatedTimeMinutes: number;
  companyId?: number;
}

export interface SystemDesignSubmission {
  id: number;
  userId: number;
  problemId: number;
  designDocument: string;
  architectureScore: number;
  scalabilityScore: number;
  reliabilityScore: number;
  tradeOffAnalysisScore: number;
  overallScore: number;
  expertFeedback: string;
}

export const getSystemDesignProblemById = async (
  problemId: number
): Promise<SystemDesignProblem> => {
  try {
    const result = await pool.query('SELECT * FROM system_design_problems WHERE id = $1', [
      problemId,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Problem not found');
    }

    return mapProblemRow(result.rows[0]);
  } catch (error) {
    console.error('Error fetching system design problem:', error);
    throw error;
  }
};

export const getSystemDesignProblems = async (
  filters: {
    difficulty?: string;
    company?: string;
  },
  limit = 20,
  offset = 0
): Promise<SystemDesignProblem[]> => {
  try {
    let query = 'SELECT * FROM system_design_problems WHERE 1=1';
    const params: any[] = [];

    if (filters.difficulty) {
      query += ` AND difficulty = $${params.length + 1}`;
      params.push(filters.difficulty);
    }

    if (filters.company) {
      query += ` AND company_id = (SELECT id FROM companies WHERE name ILIKE $${params.length + 1})`;
      params.push(`%${filters.company}%`);
    }

    query += ` ORDER BY difficulty ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(mapProblemRow);
  } catch (error) {
    console.error('Error fetching system design problems:', error);
    throw error;
  }
};

export const submitSystemDesignSolution = async (
  userId: number,
  problemId: number,
  designDocument: string,
  whiteBoardImageUrl?: string
): Promise<SystemDesignSubmission> => {
  try {
    // Get problem details
    const problemResult = await pool.query(
      'SELECT * FROM system_design_problems WHERE id = $1',
      [problemId]
    );

    if (problemResult.rows.length === 0) {
      throw new Error('Problem not found');
    }

    // Evaluate design using AI
    const evaluation = await evaluateSystemDesign(designDocument);

    // Save submission
    const result = await pool.query(
      `INSERT INTO system_design_submissions (
        user_id, problem_id, design_document, whiteboard_image_url,
        architecture_score, scalability_score, reliability_score,
        trade_off_analysis_score, overall_score, expert_feedback
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        problemId,
        designDocument,
        whiteBoardImageUrl,
        evaluation.architectureScore,
        evaluation.scalabilityScore,
        evaluation.reliabilityScore,
        evaluation.tradeOffScore,
        evaluation.overallScore,
        evaluation.feedback,
      ]
    );

    return mapSubmissionRow(result.rows[0]);
  } catch (error) {
    console.error('Error submitting system design:', error);
    throw error;
  }
};

export const getUserSystemDesignStats = async (
  userId: number
): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT problem_id) as total_attempted,
        AVG(overall_score) as average_score,
        MAX(overall_score) as best_score,
        AVG(architecture_score) as avg_architecture_score,
        AVG(scalability_score) as avg_scalability_score,
        AVG(reliability_score) as avg_reliability_score,
        COUNT(*) as total_submissions
      FROM system_design_submissions WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching user system design stats:', error);
    throw error;
  }
};

export const getUserSystemDesignSubmissions = async (
  userId: number,
  limit = 20,
  offset = 0
): Promise<SystemDesignSubmission[]> => {
  try {
    const result = await pool.query(
      `SELECT * FROM system_design_submissions
       WHERE user_id = $1
       ORDER BY submitted_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(mapSubmissionRow);
  } catch (error) {
    console.error('Error fetching system design submissions:', error);
    throw error;
  }
};

const evaluateSystemDesign = async (
  designDocument: string
): Promise<{
  architectureScore: number;
  scalabilityScore: number;
  reliabilityScore: number;
  tradeOffScore: number;
  overallScore: number;
  feedback: string;
}> => {
  if (!config.ai.groqApiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content:
          'You are a strict senior system design interviewer. Evaluate the candidate response and return ONLY JSON with keys: architectureScore, scalabilityScore, reliabilityScore, tradeOffScore, feedback. Scores must be numbers from 1 to 10.',
      },
      {
        role: 'user',
        content: designDocument,
      },
    ],
  });

  const content = response.choices[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid system design evaluation response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const architectureScore = Math.max(1, Math.min(10, Number(parsed.architectureScore) || 5));
  const scalabilityScore = Math.max(1, Math.min(10, Number(parsed.scalabilityScore) || 5));
  const reliabilityScore = Math.max(1, Math.min(10, Number(parsed.reliabilityScore) || 5));
  const tradeOffScore = Math.max(1, Math.min(10, Number(parsed.tradeOffScore) || 5));

  const overallScore =
    (architectureScore * 0.3 +
      scalabilityScore * 0.25 +
      reliabilityScore * 0.25 +
      tradeOffScore * 0.2) /
    10;

  const feedback =
    parsed.feedback ||
    generateSystemDesignFeedback(
      architectureScore,
      scalabilityScore,
      reliabilityScore,
      tradeOffScore
    );

  return {
    architectureScore: Math.round(architectureScore * 10) / 10,
    scalabilityScore: Math.round(scalabilityScore * 10) / 10,
    reliabilityScore: Math.round(reliabilityScore * 10) / 10,
    tradeOffScore: Math.round(tradeOffScore * 10) / 10,
    overallScore: Math.round(overallScore * 10) / 10,
    feedback,
  };
};

const generateSystemDesignFeedback = (
  arch: number,
  scalability: number,
  reliability: number,
  tradeOff: number
): string => {
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (arch > 7) strengths.push('Well-structured architecture');
  else improvements.push('Improve overall architecture design');

  if (scalability > 7) strengths.push('Good scalability considerations');
  else improvements.push('Consider more scalable approaches');

  if (reliability > 7) strengths.push('Strong reliability measures');
  else improvements.push('Add more fault tolerance mechanisms');

  if (tradeOff > 7) strengths.push('Good trade-off analysis');
  else improvements.push('Provide deeper trade-off discussions');

  let feedback = 'Strengths: ' + strengths.join(', ') + '. ';
  feedback += 'Improvements: ' + improvements.join(', ') + '.';

  return feedback;
};

const mapProblemRow = (row: any): SystemDesignProblem => ({
  id: row.id,
  title: row.title,
  difficulty: row.difficulty,
  description: row.description,
  requirements: row.requirements,
  constraints: row.constraints,
  estimatedTimeMinutes: row.estimated_time_minutes,
  companyId: row.company_id,
});

const mapSubmissionRow = (row: any): SystemDesignSubmission => ({
  id: row.id,
  userId: row.user_id,
  problemId: row.problem_id,
  designDocument: row.design_document,
  architectureScore: row.architecture_score,
  scalabilityScore: row.scalability_score,
  reliabilityScore: row.reliability_score,
  tradeOffAnalysisScore: row.trade_off_analysis_score,
  overallScore: row.overall_score,
  expertFeedback: row.expert_feedback,
});
