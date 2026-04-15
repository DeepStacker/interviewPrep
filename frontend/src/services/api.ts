import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = '/api';

let apiClient: AxiosInstance;

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
  }) => apiClient.post('/sessions', data),
  getAll: (limit = 20, offset = 0) =>
    apiClient.get('/sessions', { params: { limit, offset } }),
  getById: (id: number) => apiClient.get(`/sessions/${id}`),
  update: (id: number, data: { totalScore?: number; status?: string }) =>
    apiClient.patch(`/sessions/${id}`, data),
};

// Questions API
export const questionsAPI = {
  generate: (sessionId: number, numQuestions = 5) =>
    apiClient.post('/questions/generate', { sessionId, numQuestions }),
  getBySession: (sessionId: number) =>
    apiClient.get(`/sessions/${sessionId}/questions`),
};

// Answers API
export const answersAPI = {
  submit: (questionId: number, userAnswer: string) =>
    apiClient.post('/answers', { questionId, userAnswer }),
  getByQuestion: (questionId: number) =>
    apiClient.get(`/questions/${questionId}/answer`),
  getBySession: (sessionId: number) =>
    apiClient.get(`/sessions/${sessionId}/answers`),
};

// Coding API
export const codingAPI = {
  searchChallenges: (filters?: { difficulty?: string; category?: string; company?: number; limit?: number; offset?: number }) =>
    apiClient.get('/coding/challenges', { params: filters }),
  getChallenge: (id: number) => apiClient.get(`/coding/challenges/${id}`),
  submitSolution: (challengeId: number, code: string, language: string) =>
    apiClient.post('/coding/submit', { challengeId, code, language }),
  getStats: () => apiClient.get('/coding/stats'),
  getUserSubmissions: (limit = 20, offset = 0) =>
    apiClient.get('/coding/submissions', { params: { limit, offset } }),
};

// System Design API
export const systemDesignAPI = {
  getProblems: (filters?: { difficulty?: string; topic?: string; limit?: number; offset?: number }) =>
    apiClient.get('/system-design/problems', { params: filters }),
  getProblem: (id: number) => apiClient.get(`/system-design/problems/${id}`),
  submitSolution: (problemId: number, solution: string, diagramUrl?: string) =>
    apiClient.post('/system-design/submit', { problemId, solution, diagramUrl }),
  getStats: () => apiClient.get('/system-design/stats'),
  getUserSubmissions: (limit = 20, offset = 0) =>
    apiClient.get('/system-design/submissions', { params: { limit, offset } }),
};

// Resume API
export const resumeAPI = {
  create: (resumeData: any) => apiClient.post('/resume', resumeData),
  get: () => apiClient.get('/resume'),
  update: (resumeData: any) => apiClient.patch('/resume', resumeData),
  delete: () => apiClient.delete('/resume'),
  getTips: () => apiClient.get('/resume/tips'),
  getScore: () => apiClient.get('/resume/score'),
};

// Roadmap API
export const roadmapAPI = {
  generate: (data: {
    companyId: number;
    targetRole: string;
    experienceLevel: 'new_grad' | 'experienced';
    difficulty?: 'easy' | 'medium' | 'hard';
  }) => apiClient.post('/roadmap/generate', data),
  getRoadmap: () => apiClient.get('/roadmap'),
  updateProgress: (roadmapId: number, progressPercentage: number) =>
    apiClient.patch(`/roadmap/${roadmapId}/progress`, { progressPercentage }),
};

// Mock Interview API
export const mockInterviewAPI = {
  schedule: (data: { interviewerUserId?: number; type: string; scheduledDate: string }) =>
    apiClient.post('/mock-interview/schedule', data),
  getScheduled: (limit = 20, offset = 0) =>
    apiClient.get('/mock-interview', { params: { limit, offset } }),
  getById: (id: number) => apiClient.get(`/mock-interview/${id}`),
  updateWithRating: (id: number, rating: number, feedback: string) =>
    apiClient.patch(`/mock-interview/${id}`, { rating, feedback }),
  getAvailableInterviewers: () => apiClient.get('/mock-interview/interviewers'),
};

// Leaderboard API
export const leaderboardAPI = {
  getGlobal: (limit = 100, offset = 0) =>
    apiClient.get('/leaderboard', { params: { limit, offset } }),
  getUserRank: (userId: number) => apiClient.get(`/leaderboard/user/${userId}`),
  getMyRank: () => apiClient.get('/leaderboard/my-rank'),
  getCompanyLeaderboard: (companyId: number, limit = 50) =>
    apiClient.get(`/leaderboard/company/${companyId}`, { params: { limit } }),
  checkBadges: () => apiClient.post('/leaderboard/check-badges', {}),
};

// Badges API
export const badgesAPI = {
  getAll: () => apiClient.get('/badges'),
  getUserBadges: () => apiClient.get('/badges/user'),
  getUserBadgesPublic: (userId: number) => apiClient.get(`/badges/user/${userId}`),
  getStats: () => apiClient.get('/badges/stats'),
};

// Companies API
export const companiesAPI = {
  getAll: () => apiClient.get('/companies'),
  getById: (id: number) => apiClient.get(`/companies/${id}`),
  getProblems: (id: number, limit = 50, offset = 0) =>
    apiClient.get(`/companies/${id}/problems`, { params: { limit, offset } }),
  getStats: (id: number) => apiClient.get(`/companies/${id}/stats`),
};

// Analytics API
export const analyticsAPI = {
  getUserStats: () => apiClient.get('/analytics/user'),
  getAdminUsers: () => apiClient.get('/analytics/admin/users'),
  getAdminTrends: () => apiClient.get('/analytics/admin/trends'),
};

// Initialize with stored token
const storedToken = localStorage.getItem('token');
if (storedToken) {
  initializeAPI(storedToken);
} else {
  initializeAPI();
}
