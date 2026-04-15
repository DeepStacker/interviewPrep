import { create } from 'zustand';

export interface Session {
  id: number;
  jobRole: string;
  companyType?: string;
  difficulty: string;
  totalScore?: number;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt?: string;
}

export interface Question {
  id: number;
  sessionId: number;
  text: string;
  questionNumber: number;
}

export interface Answer {
  id: number;
  questionId: number;
  userAnswer: string;
  score: number;
  strengths: string;
  missingPoints: string;
  idealAnswer: string;
}

interface SessionState {
  currentSession: Session | null;
  questions: Question[];
  answers: Answer[];
  setCurrentSession: (session: Session | null) => void;
  setQuestions: (questions: Question[]) => void;
  setAnswers: (answers: Answer[]) => void;
  addAnswer: (answer: Answer) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  questions: [],
  answers: [],
  setCurrentSession: (session) => set({ currentSession: session }),
  setQuestions: (questions) => set({ questions }),
  setAnswers: (answers) => set({ answers }),
  addAnswer: (answer) =>
    set((state) => ({
      answers: [...state.answers, answer],
    })),
  reset: () =>
    set({ currentSession: null, questions: [], answers: [] }),
}));
