import pool from '../config/database';
import axios from 'axios';
import { config } from '../config/env';

export interface CodingChallenge {
  id: number;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  problemStatement: string;
  timeLimitMinutes: number;
  constraints: string;
  companyId?: number;
  acceptanceRate?: number;
  examples?: any[];
}

export interface CodeSubmission {
  id: number;
  userId: number;
  challengeId: number;
  codeContent: string;
  programmingLanguage: string;
  executionStatus: string;
  passedTestCases: number;
  totalTestCases: number;
  timeTakenMs: number;
  memoryUsedMb: number;
  score: number;
  isAccepted: boolean;
}

export const searchCodingChallenges = async (
  filters: {
    difficulty?: string;
    category?: string;
    company?: string;
    searchTerm?: string;
  },
  limit = 20,
  offset = 0
): Promise<CodingChallenge[]> => {
  try {
    let query = 'SELECT * FROM coding_challenges WHERE 1=1';
    const params: any[] = [];

    if (filters.difficulty) {
      query += ` AND difficulty = $${params.length + 1}`;
      params.push(filters.difficulty);
    }

    if (filters.category) {
      query += ` AND category ILIKE $${params.length + 1}`;
      params.push(`%${filters.category}%`);
    }

    if (filters.company) {
      query += ` AND company_id = (SELECT id FROM companies WHERE name ILIKE $${params.length + 1})`;
      params.push(`%${filters.company}%`);
    }

    if (filters.searchTerm) {
      query += ` AND (title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
      params.push(`%${filters.searchTerm}%`);
    }

    query += ` ORDER BY difficulty ASC, title ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows.map(mapChallengeRow);
  } catch (error) {
    console.error('Error searching coding challenges:', error);
    throw error;
  }
};

export const getChallengeById = async (
  challengeId: number
): Promise<CodingChallenge> => {
  try {
    const result = await pool.query(
      'SELECT * FROM coding_challenges WHERE id = $1',
      [challengeId]
    );

    if (result.rows.length === 0) {
      throw new Error('Challenge not found');
    }

    const challenge = mapChallengeRow(result.rows[0]);

    // Get test cases
    const testsResult = await pool.query(
      'SELECT * FROM test_cases WHERE challenge_id = $1 ORDER BY is_sample DESC',
      [challengeId]
    );

    challenge.examples = testsResult.rows.map((row) => ({
      input: row.input_data,
      output: row.expected_output,
      explanation: row.explanation,
    }));

    return challenge;
  } catch (error) {
    console.error('Error fetching challenge:', error);
    throw error;
  }
};

export const submitCodeSolution = async (
  userId: number,
  challengeId: number,
  code: string,
  language: string
): Promise<CodeSubmission> => {
  try {
    // Get test cases
    const testsResult = await pool.query(
      'SELECT * FROM test_cases WHERE challenge_id = $1',
      [challengeId]
    );

    const testCases = testsResult.rows;

    const executionResult = await executeWithJudge0(
      code,
      language,
      testCases
    );

    // Save submission
    const result = await pool.query(
      `INSERT INTO code_submissions (
        user_id, challenge_id, code_content, programming_language,
        execution_status, passed_test_cases, total_test_cases,
        time_taken_ms, memory_used_mb, score, is_accepted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        challengeId,
        code,
        language,
        executionResult.status,
        executionResult.passedTests,
        testCases.length,
        executionResult.timeTaken,
        executionResult.memoryUsed,
        executionResult.score,
        executionResult.allPassed,
      ]
    );

    return mapSubmissionRow(result.rows[0]);
  } catch (error) {
    console.error('Error submitting code:', error);
    throw error;
  }
};

export const getUserChallengeStats = async (userId: number): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT challenge_id) as total_attempted,
        SUM(CASE WHEN is_accepted THEN 1 ELSE 0 END) as total_solved,
        AVG(score) as average_score,
        MAX(score) as best_score,
        COUNT(*) as total_submissions,
        SUM(CASE WHEN programming_language = 'python' THEN 1 ELSE 0 END) as python_submissions,
        SUM(CASE WHEN programming_language = 'javascript' THEN 1 ELSE 0 END) as js_submissions,
        SUM(CASE WHEN programming_language = 'cpp' THEN 1 ELSE 0 END) as cpp_submissions,
        SUM(CASE WHEN programming_language = 'java' THEN 1 ELSE 0 END) as java_submissions
      FROM code_submissions WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching user challenge stats:', error);
    throw error;
  }
};

export const getUserSubmissions = async (
  userId: number,
  limit = 20,
  offset = 0
): Promise<CodeSubmission[]> => {
  try {
    const result = await pool.query(
      `SELECT * FROM code_submissions
       WHERE user_id = $1
       ORDER BY submitted_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(mapSubmissionRow);
  } catch (error) {
    console.error('Error fetching user submissions:', error);
    throw error;
  }
};

export const getChallengesByCompany = async (
  companyName: string,
  difficulty?: string
): Promise<CodingChallenge[]> => {
  try {
    let query = `SELECT cc.* FROM coding_challenges cc
      JOIN companies c ON cc.company_id = c.id
      WHERE c.name = $1`;
    const params: any[] = [companyName];

    if (difficulty) {
      query += ` AND cc.difficulty = $2`;
      params.push(difficulty);
    }

    query += ' ORDER BY cc.difficulty ASC';

    const result = await pool.query(query, params);
    return result.rows.map(mapChallengeRow);
  } catch (error) {
    console.error('Error fetching challenges by company:', error);
    throw error;
  }
};

const executeWithJudge0 = async (
  code: string,
  language: string,
  testCases: any[]
): Promise<{
  status: string;
  passedTests: number;
  timeTaken: number;
  memoryUsed: number;
  score: number;
  allPassed: boolean;
}> => {
  const judge0Url = config.coding.judge0Url;
  if (!judge0Url) {
    throw new Error('JUDGE0_URL is not configured');
  }

  const languageMap: Record<string, number> = {
    javascript: 63,
    python: 71,
    java: 62,
    cpp: 54,
  };

  const languageId = languageMap[language.toLowerCase()];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  let passedTests = 0;
  let totalTime = 0;
  let totalMemory = 0;

  for (const testCase of testCases) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.coding.judge0ApiKey) {
      headers['X-Auth-Token'] = config.coding.judge0ApiKey;
    }

    const response = await axios.post(
      `${judge0Url}/submissions?base64_encoded=false&wait=true`,
      {
        source_code: code,
        language_id: languageId,
        stdin: testCase.input_data,
        expected_output: testCase.expected_output,
      },
      { headers, timeout: 30000 }
    );

    const result = response.data;
    const statusId = result?.status?.id;

    totalTime += Number(result?.time || 0) * 1000;
    totalMemory += Number(result?.memory || 0) / 1024;

    // 3 means Accepted in Judge0
    if (statusId === 3) {
      passedTests += 1;
    }
  }

  const allPassed = passedTests === testCases.length;
  const score = (passedTests / Math.max(testCases.length, 1)) * 100;

  return {
    status: allPassed ? 'Accepted' : 'Rejected',
    passedTests,
    timeTaken: Math.round(totalTime),
    memoryUsed: Math.round(totalMemory * 100) / 100,
    score: Math.round(score * 10) / 10,
    allPassed,
  };
};

const mapChallengeRow = (row: any): CodingChallenge => ({
  id: row.id,
  title: row.title,
  difficulty: row.difficulty,
  category: row.category,
  description: row.description,
  problemStatement: row.problem_statement,
  timeLimitMinutes: row.time_limit_minutes,
  constraints: row.constraints,
  companyId: row.company_id,
  acceptanceRate: row.acceptance_rate,
});

const mapSubmissionRow = (row: any): CodeSubmission => ({
  id: row.id,
  userId: row.user_id,
  challengeId: row.challenge_id,
  codeContent: row.code_content,
  programmingLanguage: row.programming_language,
  executionStatus: row.execution_status,
  passedTestCases: row.passed_test_cases,
  totalTestCases: row.total_test_cases,
  timeTakenMs: row.time_taken_ms,
  memoryUsedMb: row.memory_used_mb,
  score: row.score,
  isAccepted: row.is_accepted,
});
