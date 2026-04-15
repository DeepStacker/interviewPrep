import { create } from 'zustand';

export interface CodingChallenge {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  company_id: number;
  description: string;
  constraints: string;
  acceptance_rate: number;
  acceptanceRate?: number;
}

export interface CodingSubmission {
  id: number;
  challengeId: number;
  code: string;
  language: string;
  status: 'pending' | 'accepted' | 'rejected';
  testsPassed: number;
  totalTests: number;
  score: number;
  submittedAt: string;
}

interface CodingStore {
  challenges: CodingChallenge[];
  setChallenges: (challenges: CodingChallenge[]) => void;
  currentChallenge: CodingChallenge | null;
  setCurrentChallenge: (challenge: CodingChallenge | null) => void;
  submissions: CodingSubmission[];
  addSubmission: (submission: CodingSubmission) => void;
  filterDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  setFilterDifficulty: (difficulty: 'all' | 'easy' | 'medium' | 'hard') => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  solvedCount: number;
  setSolvedCount: (count: number) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useCodingStore = create<CodingStore>((set) => ({
  challenges: [],
  setChallenges: (challenges) => set({ challenges }),
  currentChallenge: null,
  setCurrentChallenge: (challenge) => set({ currentChallenge: challenge }),
  submissions: [],
  addSubmission: (submission) => set((state) => ({
    submissions: [submission, ...state.submissions],
  })),
  filterDifficulty: 'all',
  setFilterDifficulty: (difficulty) => set({ filterDifficulty: difficulty }),
  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  solvedCount: 0,
  setSolvedCount: (count) => set({ solvedCount: count }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
