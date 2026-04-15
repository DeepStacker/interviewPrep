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
  examples?: Array<{
    input: string;
    output: string;
    explanation: string;
  }>;
  totalTestCases?: number;
  sampleTestCases?: number;
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
  feedback?: string;
  testResults?: CodeExecutionCaseResult[];
}

export interface CodeExecutionCaseResult {
  caseNumber: number;
  isSample: boolean;
  passed: boolean;
  status: string;
  stdout?: string;
  stderr?: string;
  timeTakenMs: number;
  memoryUsedMb: number;
  input?: string;
  expectedOutput?: string;
}

export interface CodeRunResult {
  mode: 'sample' | 'custom';
  status: string;
  passedTests: number;
  totalTests: number;
  score: number;
  averageTimeMs: number;
  averageMemoryMb: number;
  output?: string;
  stderr?: string;
  compileOutput?: string;
  testResults: CodeExecutionCaseResult[];
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
    let query = `
      SELECT * FROM coding_challenges
      WHERE EXISTS (
        SELECT 1 FROM test_cases tc WHERE tc.challenge_id = coding_challenges.id
      )`;
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

    const testsSummaryResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total_count,
        COALESCE(SUM(CASE WHEN is_sample THEN 1 ELSE 0 END), 0)::int AS sample_count
      FROM test_cases
      WHERE challenge_id = $1`,
      [challengeId]
    );

    const testsResult = await pool.query(
      `SELECT * FROM test_cases
       WHERE challenge_id = $1 AND is_sample = true
       ORDER BY id ASC
       LIMIT 5`,
      [challengeId]
    );

    challenge.examples = testsResult.rows.map((row) => ({
      input: row.input_data,
      output: row.expected_output,
      explanation: row.explanation || '',
    }));

    challenge.totalTestCases = testsSummaryResult.rows[0]?.total_count || 0;
    challenge.sampleTestCases = testsSummaryResult.rows[0]?.sample_count || 0;

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
    const violationReason = getSafetyViolationReason(code, language);
    if (violationReason) {
      throw new Error(`Code blocked by safety policy: ${violationReason}`);
    }

    // Get test cases
    const testsResult = await pool.query(
      'SELECT * FROM test_cases WHERE challenge_id = $1 ORDER BY is_sample DESC, id ASC',
      [challengeId]
    );

    const testCases = testsResult.rows;
    if (testCases.length === 0) {
      throw new Error('No test cases configured for this challenge');
    }

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

    return {
      ...mapSubmissionRow(result.rows[0]),
      feedback: executionResult.feedback,
      testResults: executionResult.testResults,
    };
  } catch (error) {
    console.error('Error submitting code:', error);
    throw error;
  }
};

export const runCodeAgainstChallenge = async (
  challengeId: number,
  code: string,
  language: string,
  customInput?: string
): Promise<CodeRunResult> => {
  const violationReason = getSafetyViolationReason(code, language);
  if (violationReason) {
    return {
      mode: customInput && customInput.trim() ? 'custom' : 'sample',
      status: 'Skipped',
      passedTests: 0,
      totalTests: 0,
      score: 0,
      averageTimeMs: 0,
      averageMemoryMb: 0,
      stderr: `Execution skipped by safety policy: ${violationReason}`,
      testResults: [],
    };
  }

  const languageId = getJudge0LanguageId(language);

  if (customInput && customInput.trim()) {
    const customResult = await executeJudge0Submission(
      code,
      languageId,
      customInput,
      undefined
    );

    return {
      mode: 'custom',
      status: customResult.status,
      passedTests: 0,
      totalTests: 0,
      score: 0,
      averageTimeMs: customResult.timeTakenMs,
      averageMemoryMb: customResult.memoryUsedMb,
      output: customResult.stdout,
      stderr: customResult.stderr,
      compileOutput: customResult.compileOutput,
      testResults: [],
    };
  }

  const testsResult = await pool.query(
    `SELECT * FROM test_cases
     WHERE challenge_id = $1 AND is_sample = true
     ORDER BY id ASC`,
    [challengeId]
  );

  const sampleCases = testsResult.rows;
  if (sampleCases.length === 0) {
    throw new Error('No sample test cases configured for this challenge');
  }

  let passedTests = 0;
  let totalTime = 0;
  let totalMemory = 0;
  const testResults: CodeExecutionCaseResult[] = [];

  for (let index = 0; index < sampleCases.length; index += 1) {
    const testCase = sampleCases[index];
    const execution = await executeJudge0Submission(
      code,
      languageId,
      testCase.input_data,
      testCase.expected_output
    );

    const passed = execution.statusId === 3;
    if (passed) {
      passedTests += 1;
    }

    totalTime += execution.timeTakenMs;
    totalMemory += execution.memoryUsedMb;

    testResults.push({
      caseNumber: index + 1,
      isSample: true,
      passed,
      status: execution.status,
      stdout: execution.stdout,
      stderr: execution.stderr,
      timeTakenMs: execution.timeTakenMs,
      memoryUsedMb: execution.memoryUsedMb,
      input: testCase.input_data,
      expectedOutput: testCase.expected_output,
    });
  }

  const totalTests = sampleCases.length;
  const score = (passedTests / Math.max(totalTests, 1)) * 100;

  return {
    mode: 'sample',
    status: passedTests === totalTests ? 'Accepted' : 'Failed',
    passedTests,
    totalTests,
    score: Math.round(score * 10) / 10,
    averageTimeMs: Math.round(totalTime / Math.max(totalTests, 1)),
    averageMemoryMb: Math.round((totalMemory / Math.max(totalTests, 1)) * 100) / 100,
    testResults,
  };
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
      WHERE c.name = $1
      AND EXISTS (
        SELECT 1 FROM test_cases tc WHERE tc.challenge_id = cc.id
      )`;
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
  feedback: string;
  testResults: CodeExecutionCaseResult[];
}> => {
  const languageId = getJudge0LanguageId(language);

  let passedTests = 0;
  let totalTime = 0;
  let totalMemory = 0;
  const testResults: CodeExecutionCaseResult[] = [];
  let firstFailure: CodeExecutionCaseResult | null = null;

  for (let index = 0; index < testCases.length; index += 1) {
    const testCase = testCases[index];
    const execution = await executeJudge0Submission(
      code,
      languageId,
      testCase.input_data,
      testCase.expected_output
    );

    const passed = execution.statusId === 3;
    if (passed) {
      passedTests += 1;
    }

    totalTime += execution.timeTakenMs;
    totalMemory += execution.memoryUsedMb;

    const caseResult: CodeExecutionCaseResult = {
      caseNumber: index + 1,
      isSample: Boolean(testCase.is_sample),
      passed,
      status: execution.status,
      stdout: execution.stdout,
      stderr: execution.stderr,
      timeTakenMs: execution.timeTakenMs,
      memoryUsedMb: execution.memoryUsedMb,
      input: testCase.is_sample ? testCase.input_data : undefined,
      expectedOutput: testCase.is_sample ? testCase.expected_output : undefined,
    };

    if (!passed && !firstFailure) {
      firstFailure = caseResult;
    }

    testResults.push(caseResult);
  }

  const allPassed = passedTests === testCases.length;
  const score = (passedTests / Math.max(testCases.length, 1)) * 100;
  const feedback = allPassed
    ? 'All test cases passed.'
    : buildFailureFeedback(firstFailure);

  return {
    status: allPassed ? 'Accepted' : 'Rejected',
    passedTests,
    timeTaken: Math.round(totalTime),
    memoryUsed: Math.round(totalMemory * 100) / 100,
    score: Math.round(score * 10) / 10,
    allPassed,
    feedback,
    testResults,
  };
};

const executeJudge0Submission = async (
  code: string,
  languageId: number,
  input: string,
  expectedOutput?: string
): Promise<{
  statusId: number;
  status: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeTakenMs: number;
  memoryUsedMb: number;
}> => {
  const judge0Url = config.coding.judge0Url;
  if (!judge0Url) {
    throw new Error('JUDGE0_URL is not configured');
  }

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
      stdin: input,
      expected_output: expectedOutput,
      cpu_time_limit: 2,
      cpu_extra_time: 0.5,
      wall_time_limit: 6,
      memory_limit: 256000,
      stack_limit: 65536,
      max_processes_and_or_threads: 20,
      enable_per_process_and_thread_time_limit: true,
      enable_per_process_and_thread_memory_limit: true,
      max_file_size: 2048,
    },
    { headers, timeout: 30000 }
  );

  const result = response.data || {};
  return {
    statusId: Number(result?.status?.id || 0),
    status: String(result?.status?.description || 'Unknown'),
    stdout: String(result?.stdout || ''),
    stderr: String(result?.stderr || result?.message || ''),
    compileOutput: String(result?.compile_output || ''),
    timeTakenMs: Math.round(Number(result?.time || 0) * 1000),
    memoryUsedMb: Math.round((Number(result?.memory || 0) / 1024) * 100) / 100,
  };
};

const getJudge0LanguageId = (language: string): number => {
  const languageMap: Record<string, number> = {
    javascript: 63,
    python: 71,
    java: 62,
    cpp: 54,
  };

  const languageId = languageMap[String(language).toLowerCase()];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return languageId;
};

const buildFailureFeedback = (failure: CodeExecutionCaseResult | null): string => {
  if (!failure) {
    return 'Some test cases failed.';
  }

  if (failure.stderr && failure.stderr.trim()) {
    return `Failed on test case ${failure.caseNumber}: ${failure.stderr.trim()}`;
  }

  return `Failed on test case ${failure.caseNumber} with status ${failure.status}.`;
};

const getSafetyViolationReason = (code: string, language: string): string | null => {
  const normalizedCode = String(code || '');
  const normalizedLanguage = String(language || '').toLowerCase();

  const commonPatterns: Array<{ pattern: RegExp; reason: string }> = [
    {
      pattern: /:\(\)\s*\{\s*:\|:\s*&\s*\};:/,
      reason: 'fork-bomb pattern detected',
    },
    {
      pattern: /\b(rm\s+-rf\s+\/|mkfs\.|shutdown\s+-h|reboot\b|kill\s+-9)\b/i,
      reason: 'destructive shell command pattern detected',
    },
    {
      pattern: /\/(etc\/passwd|proc\/|sys\/)/i,
      reason: 'sensitive system path access pattern detected',
    },
  ];

  const languagePatterns: Record<string, Array<{ pattern: RegExp; reason: string }>> = {
    python: [
      { pattern: /\b(subprocess|os|shutil)\.(system|popen|run|Popen|call)\b/, reason: 'process execution API detected' },
      { pattern: /\b(import\s+socket|import\s+requests|urllib\.)\b/, reason: 'network access API detected' },
    ],
    javascript: [
      { pattern: /require\(['"]child_process['"]\)|process\.kill\(/, reason: 'process control API detected' },
      { pattern: /require\(['"]fs['"]\).*\b(rmSync|unlinkSync|rmdirSync)\b/s, reason: 'destructive filesystem API detected' },
      { pattern: /\b(fetch\(|XMLHttpRequest|axios\.)/, reason: 'network access API detected' },
    ],
    java: [
      { pattern: /Runtime\.getRuntime\(\)\.exec|new\s+ProcessBuilder\(/, reason: 'process execution API detected' },
      { pattern: /java\.net\.|URLConnection|Socket\(/, reason: 'network access API detected' },
    ],
    cpp: [
      { pattern: /\b(system|popen|fork|execv|execl)\s*\(/, reason: 'process execution API detected' },
      { pattern: /\b(AF_INET|sockaddr_in|connect\s*\()/, reason: 'network access API detected' },
    ],
  };

  const allPatterns = [...commonPatterns, ...(languagePatterns[normalizedLanguage] || [])];
  for (const entry of allPatterns) {
    if (entry.pattern.test(normalizedCode)) {
      return entry.reason;
    }
  }

  return null;
};

const mapChallengeRow = (row: any): CodingChallenge => ({
  id: row.id,
  title: row.title,
  difficulty: row.difficulty,
  category: row.category,
  description: row.description || row.problem_statement,
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
  feedback: row.feedback,
});
