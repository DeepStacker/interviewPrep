import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

let apiClient: AxiosInstance;
const clientMemoryCache = new Map<string, { data: any; expiresAt: number }>();
const inflightCache = new Map<string, Promise<any>>();
const CACHE_PREFIX = 'ip-cache:';

const getSessionStorageSafe = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    return null;
  }
  return null;
};

const stableStringify = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${key}:${stableStringify(value[key])}`).join(',')}}`;
};

const buildCacheKey = (namespace: string, path: string, params?: any) =>
  `${namespace}|${path}|${stableStringify(params)}`;

const readCachedData = <T>(key: string): T | null => {
  const memory = clientMemoryCache.get(key);
  if (memory && memory.expiresAt > Date.now()) {
    return memory.data as T;
  }

  const storage = getSessionStorageSafe();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(`${CACHE_PREFIX}${key}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { data: T; expiresAt: number };
    if (parsed.expiresAt > Date.now()) {
      clientMemoryCache.set(key, parsed);
      return parsed.data;
    }
  } catch {
    return null;
  }

  storage.removeItem(`${CACHE_PREFIX}${key}`);
  return null;
};

const writeCachedData = <T>(key: string, data: T, ttlMs: number) => {
  const entry = { data, expiresAt: Date.now() + ttlMs };
  clientMemoryCache.set(key, entry);

  const storage = getSessionStorageSafe();
  if (storage) {
    storage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  }
};

export const invalidateClientCache = (namespacePrefixes?: string[]) => {
  if (!namespacePrefixes || namespacePrefixes.length === 0) {
    clientMemoryCache.clear();
    inflightCache.clear();
    const storage = getSessionStorageSafe();
    if (storage) {
      const removeKeys: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          removeKeys.push(key);
        }
      }
      removeKeys.forEach((key) => storage.removeItem(key));
    }
    return;
  }

  const storage = getSessionStorageSafe();
  const shouldDelete = (key: string) =>
    namespacePrefixes.some((prefix) => key.startsWith(prefix));

  for (const key of clientMemoryCache.keys()) {
    if (shouldDelete(key)) {
      clientMemoryCache.delete(key);
      inflightCache.delete(key);
    }
  }

  if (storage) {
    const removeKeys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const rawKey = storage.key(i);
      if (!rawKey || !rawKey.startsWith(CACHE_PREFIX)) {
        continue;
      }
      const cacheKey = rawKey.replace(CACHE_PREFIX, '');
      if (shouldDelete(cacheKey)) {
        removeKeys.push(rawKey);
      }
    }
    removeKeys.forEach((key) => storage.removeItem(key));
  }
};

const cachedGet = async <T>(
  namespace: string,
  path: string,
  params: any,
  fetcher: () => Promise<any>,
  ttlMs = 1000 * 60 * 2
) => {
  const key = buildCacheKey(namespace, path, params);
  const cached = readCachedData<T>(key);
  if (cached !== null) {
    return { data: cached } as any;
  }

  if (inflightCache.has(key)) {
    const inflight = await inflightCache.get(key);
    return { data: inflight } as any;
  }

  const pending = fetcher()
    .then((response) => {
      writeCachedData(key, response.data, ttlMs);
      return response.data;
    })
    .finally(() => inflightCache.delete(key));

  inflightCache.set(key, pending);
  const data = await pending;
  return { data } as any;
};

export interface CodingExecutionCaseResult {
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

export interface CodingRunResult {
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
  testResults: CodingExecutionCaseResult[];
}

export interface CodingSubmissionResult {
  id: number;
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
  testResults?: CodingExecutionCaseResult[];
}

export interface UserCoachingPlan {
  summary: string;
  focusAreas: Array<{
    title: string;
    whyItMatters: string;
    action: string;
  }>;
  weeklyPlan: string[];
  nextSessionPrompt: string;
}

export interface UserCoachingResponse {
  generatedAt: string;
  evidence: {
    totalSessions: number;
    completionRate: string;
    recentAverageScore: string;
    monitoringCoverage: string;
    integrityRiskRate: string;
    codingAverageScore: string;
    codingAcceptanceRate: string;
  };
  plan: UserCoachingPlan;
}

export const initializeAPI = (token?: string) => {
  apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  return apiClient;
};

export const setAuthToken = (token: string) => {
  if (apiClient) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const clearAuthToken = () => {
  if (apiClient) {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Auth API
export const authAPI = {
  loginWithGoogle: (googleToken: string) =>
    apiClient.post('/auth/google', { token: googleToken }),
  getProfile: () => apiClient.get('/auth/profile'),
};

// Sessions API
export const sessionsAPI = {
  create: (data: {
    jobRole: string;
    companyType?: string;
    difficulty: string;
    interviewType?:
      | 'mixed'
      | 'technical'
      | 'behavioral'
      | 'system_design'
      | 'rapid_fire'
      | 'math_reasoning'
      | 'game_challenge';
  }) =>
    apiClient.post('/sessions', data).then((response) => {
      invalidateClientCache(['sessions', 'analytics', 'questions', 'answers']);
      return response;
    }),
  getAll: (limit = 20, offset = 0) =>
    cachedGet('sessions', '/sessions', { limit, offset }, () =>
      apiClient.get('/sessions', { params: { limit, offset } })
    ),
  getById: (id: number) =>
    cachedGet('sessions', `/sessions/${id}`, null, () => apiClient.get(`/sessions/${id}`)),
  update: (id: number, data: { totalScore?: number; status?: string }) =>
    apiClient.patch(`/sessions/${id}`, data).then((response) => {
      invalidateClientCache(['sessions', 'analytics', 'answers']);
      return response;
    }),
};

// Questions API
export const questionsAPI = {
  generate: (sessionId: number, numQuestions = 5) =>
    apiClient.post('/questions/generate', { sessionId, numQuestions }).then((response) => {
      invalidateClientCache(['questions', 'sessions', 'analytics']);
      return response;
    }),
  getBySession: (sessionId: number) =>
    cachedGet('questions', `/sessions/${sessionId}/questions`, null, () =>
      apiClient.get(`/sessions/${sessionId}/questions`)
    ),
};

// Answers API
export const answersAPI = {
  submit: (
    questionId: number,
    userAnswer: string,
    integritySignals?: {
      tabSwitches?: number;
      windowBlurCount?: number;
      pasteCount?: number;
      copyCutCount?: number;
      fullscreenExits?: number;
      elapsedSeconds?: number;
      keystrokes?: number;
    }
  ) => apiClient.post('/answers', { questionId, userAnswer, integritySignals }),
  // invalidation handled in submit wrapper below
  getByQuestion: (questionId: number) =>
    cachedGet('answers', `/questions/${questionId}/answer`, null, () =>
      apiClient.get(`/questions/${questionId}/answer`)
    ),
  getBySession: (sessionId: number) =>
    cachedGet('answers', `/sessions/${sessionId}/answers`, null, () =>
      apiClient.get(`/sessions/${sessionId}/answers`)
    ),
};

const originalAnswerSubmit = answersAPI.submit;
answersAPI.submit = (questionId, userAnswer, integritySignals) =>
  originalAnswerSubmit(questionId, userAnswer, integritySignals).then((response) => {
    invalidateClientCache(['answers', 'analytics', 'sessions', 'questions']);
    return response;
  });

// Coding API
export const codingAPI = {
  searchChallenges: (filters?: { difficulty?: string; category?: string; company?: number; limit?: number; offset?: number }) =>
    cachedGet('coding', '/coding/challenges', filters, () =>
      apiClient.get('/coding/challenges', { params: filters })
    ),
  getChallenge: (id: number) =>
    cachedGet('coding', `/coding/challenges/${id}`, null, () =>
      apiClient.get(`/coding/challenges/${id}`)
    ),
  runCode: (challengeId: number, code: string, language: string, input?: string) =>
    apiClient.post<CodingRunResult>('/coding/run', { challengeId, code, language, input }),
  submitSolution: (challengeId: number, code: string, language: string) =>
    apiClient.post<CodingSubmissionResult>('/coding/submit', { challengeId, code, language }).then((response) => {
      invalidateClientCache(['coding', 'leaderboard', 'analytics']);
      return response;
    }),
  getStats: () => cachedGet('coding', '/coding/stats', null, () => apiClient.get('/coding/stats')),
  getUserSubmissions: (limit = 20, offset = 0) =>
    cachedGet('coding', '/coding/submissions', { limit, offset }, () =>
      apiClient.get('/coding/submissions', { params: { limit, offset } })
    ),
};

// System Design API
export const systemDesignAPI = {
  getProblems: (filters?: { difficulty?: string; topic?: string; limit?: number; offset?: number }) =>
    cachedGet('system-design', '/system-design/problems', filters, () =>
      apiClient.get('/system-design/problems', { params: filters })
    ),
  getProblem: (id: number) =>
    cachedGet('system-design', `/system-design/problems/${id}`, null, () =>
      apiClient.get(`/system-design/problems/${id}`)
    ),
  submitSolution: (problemId: number, solution: string, diagramUrl?: string) =>
    apiClient.post('/system-design/submit', { problemId, solution, diagramUrl }).then((response) => {
      invalidateClientCache(['system-design', 'leaderboard', 'analytics']);
      return response;
    }),
  getStats: () =>
    cachedGet('system-design', '/system-design/stats', null, () =>
      apiClient.get('/system-design/stats')
    ),
  getUserSubmissions: (limit = 20, offset = 0) =>
    cachedGet('system-design', '/system-design/submissions', { limit, offset }, () =>
      apiClient.get('/system-design/submissions', { params: { limit, offset } })
    ),
};

// Resume API
export const resumeAPI = {
  create: (resumeData: any) => apiClient.post('/resume', resumeData).then((response) => {
    invalidateClientCache(['resume', 'analytics']);
    return response;
  }),
  get: () => cachedGet('resume', '/resume', null, () => apiClient.get('/resume')),
  update: (resumeData: any) => apiClient.patch('/resume', resumeData).then((response) => {
    invalidateClientCache(['resume', 'analytics']);
    return response;
  }),
  delete: () => apiClient.delete('/resume').then((response) => {
    invalidateClientCache(['resume', 'analytics']);
    return response;
  }),
  getTips: () => cachedGet('resume', '/resume/tips', null, () => apiClient.get('/resume/tips')),
  getScore: () => cachedGet('resume', '/resume/score', null, () => apiClient.get('/resume/score')),
};

// Roadmap API
export const roadmapAPI = {
  generate: (data: {
    companyId: number;
    targetRole: string;
    experienceLevel: 'new_grad' | 'experienced';
    difficulty?: 'easy' | 'medium' | 'hard';
  }) => apiClient.post('/roadmap/generate', data).then((response) => {
    invalidateClientCache(['roadmap', 'analytics']);
    return response;
  }),
  getRoadmap: () => cachedGet('roadmap', '/roadmap', null, () => apiClient.get('/roadmap')),
  updateProgress: (roadmapId: number, progressPercentage: number) =>
    apiClient.patch(`/roadmap/${roadmapId}/progress`, { progressPercentage }).then((response) => {
      invalidateClientCache(['roadmap', 'analytics']);
      return response;
    }),
};

// Mock Interview API
export const mockInterviewAPI = {
  schedule: (data: {
    companyId: number;
    interviewerUserId?: number;
    interviewType: string;
    scheduledAt: string;
  }) =>
    apiClient.post('/mock-interview/schedule', data).then((response) => {
      invalidateClientCache(['mock-interview', 'leaderboard', 'analytics']);
      return response;
    }),
  getScheduled: (limit = 20, offset = 0) =>
    cachedGet('mock-interview', '/mock-interview', { limit, offset }, () =>
      apiClient.get('/mock-interview', { params: { limit, offset } })
    ),
  getById: (id: number) =>
    cachedGet('mock-interview', `/mock-interview/${id}`, null, () =>
      apiClient.get(`/mock-interview/${id}`)
    ),
  updateWithRating: (id: number, rating: number, feedback: string) =>
    apiClient.patch(`/mock-interview/${id}`, { rating, feedback }).then((response) => {
      invalidateClientCache(['mock-interview', 'leaderboard', 'analytics']);
      return response;
    }),
  getAvailableInterviewers: () =>
    cachedGet('mock-interview', '/mock-interview/interviewers', null, () =>
      apiClient.get('/mock-interview/interviewers')
    ),
};

// Leaderboard API
export const leaderboardAPI = {
  getGlobal: (limit = 100, offset = 0) =>
    cachedGet('leaderboard', '/leaderboard', { limit, offset }, () =>
      apiClient.get('/leaderboard', { params: { limit, offset } })
    ),
  getUserRank: (userId: number) =>
    cachedGet('leaderboard', `/leaderboard/user/${userId}`, null, () =>
      apiClient.get(`/leaderboard/user/${userId}`)
    ),
  getMyRank: () => cachedGet('leaderboard', '/leaderboard/my-rank', null, () => apiClient.get('/leaderboard/my-rank')),
  getCompanyLeaderboard: (companyId: number, limit = 50) =>
    cachedGet('leaderboard', `/leaderboard/company/${companyId}`, { limit }, () =>
      apiClient.get(`/leaderboard/company/${companyId}`, { params: { limit } })
    ),
  checkBadges: () => apiClient.post('/leaderboard/check-badges', {}).then((response) => {
    invalidateClientCache(['badges', 'leaderboard', 'analytics']);
    return response;
  }),
};

// Badges API
export const badgesAPI = {
  getAll: () => cachedGet('badges', '/badges', null, () => apiClient.get('/badges')),
  getUserBadges: () => cachedGet('badges', '/badges/user', null, () => apiClient.get('/badges/user')),
  getUserBadgesPublic: (userId: number) =>
    cachedGet('badges', `/badges/user/${userId}`, null, () => apiClient.get(`/badges/user/${userId}`)),
  getStats: () => cachedGet('badges', '/badges/stats', null, () => apiClient.get('/badges/stats')),
};

// Companies API
export const companiesAPI = {
  getAll: () => cachedGet('companies', '/companies', null, () => apiClient.get('/companies')),
  getById: (id: number) =>
    cachedGet('companies', `/companies/${id}`, null, () => apiClient.get(`/companies/${id}`)),
  getProblems: (id: number, limit = 50, offset = 0) =>
    cachedGet('companies', `/companies/${id}/problems`, { limit, offset }, () =>
      apiClient.get(`/companies/${id}/problems`, { params: { limit, offset } })
    ),
  getStats: (id: number) =>
    cachedGet('companies', `/companies/${id}/stats`, null, () => apiClient.get(`/companies/${id}/stats`)),
};

// Analytics API
export const analyticsAPI = {
  getUserStats: () => cachedGet('analytics', '/analytics/user', null, () => apiClient.get('/analytics/user'), 1000 * 60),
  getUserCoach: () =>
    cachedGet('analytics', '/analytics/user/coach', null, () => apiClient.get<UserCoachingResponse>('/analytics/user/coach'), 1000 * 60),
  getAdminUsers: () =>
    cachedGet('analytics', '/analytics/admin/users', null, () => apiClient.get('/analytics/admin/users'), 1000 * 60),
  getAdminTrends: () =>
    cachedGet('analytics', '/analytics/admin/trends', null, () => apiClient.get('/analytics/admin/trends'), 1000 * 60),
};

export const behaviorAPI = {
  submit: (data: {
    answerId: number;
    userAnswer: string;
    videoData?: string;
    screenData?: string;
    audioData?: string;
    questionShownAt?: string;
  }) => apiClient.post('/behavior/submit', data).then((response) => {
    invalidateClientCache(['behavior', 'analytics']);
    return response;
  }),
  getSessionSummary: (sessionId: number) =>
    cachedGet('behavior', `/behavior/session/${sessionId}`, null, () =>
      apiClient.get(`/behavior/session/${sessionId}`)
    ),
  getSessionAll: (sessionId: number) =>
    cachedGet('behavior', `/behavior/session/${sessionId}/all`, null, () =>
      apiClient.get(`/behavior/session/${sessionId}/all`)
    ),
  getSessionInsights: (sessionId: number) =>
    cachedGet('behavior', `/behavior/insights/${sessionId}`, null, () =>
      apiClient.get(`/behavior/insights/${sessionId}`)
    ),
};

// Initialize with stored token
const storedToken = localStorage.getItem('token');
if (storedToken) {
  initializeAPI(storedToken);
} else {
  initializeAPI();
}
