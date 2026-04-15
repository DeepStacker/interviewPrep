import { create } from 'zustand';

export interface SystemDesignProblem {
  id: number;
  title: string;
  description: string;
  difficulty: 'medium' | 'hard';
  estimatedTime: number; // minutes
  topics: string[];
  evaluationCriteria: {
    architecture: number;
    scalability: number;
    reliability: number;
    tradeoffs: number;
  };
}

export interface SystemDesignSubmission {
  id: number;
  problemId: number;
  solution: string;
  score: number;
  feedback: string;
  submittedAt: string;
  architecture: number;
  scalability: number;
  reliability: number;
  tradeoffs: number;
}

interface SystemDesignStore {
  problems: SystemDesignProblem[];
  setProblems: (problems: SystemDesignProblem[]) => void;
  currentProblem: SystemDesignProblem | null;
  setCurrentProblem: (problem: SystemDesignProblem | null) => void;
  submissions: SystemDesignSubmission[];
  addSubmission: (submission: SystemDesignSubmission) => void;
  selectedDifficulty: 'all' | 'medium' | 'hard';
  setSelectedDifficulty: (difficulty: 'all' | 'medium' | 'hard') => void;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  completedCount: number;
  setCompletedCount: (count: number) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useSystemDesignStore = create<SystemDesignStore>((set) => ({
  problems: [],
  setProblems: (problems) => set({ problems }),
  currentProblem: null,
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  submissions: [],
  addSubmission: (submission) => set((state) => ({
    submissions: [submission, ...state.submissions],
  })),
  selectedDifficulty: 'all',
  setSelectedDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
  selectedTopic: 'all',
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
  completedCount: 0,
  setCompletedCount: (count) => set({ completedCount: count }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
