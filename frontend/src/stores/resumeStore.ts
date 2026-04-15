import { create } from 'zustand';

export interface ResumeData {
  id?: number;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Array<{
    id?: string;
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    id?: string;
    degree: string;
    institution: string;
    graduationDate: string;
    gpa?: string;
  }>;
  skills: string[];
  projects: Array<{
    id?: string;
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
  certifications: Array<{
    id?: string;
    name: string;
    issuer: string;
    issueDate: string;
  }>;
}

export interface ResumeTip {
  id: string;
  category: 'content' | 'structure' | 'keywords';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  suggestion: string;
}

interface ResumeStore {
  resume: ResumeData | null;
  setResume: (resume: ResumeData) => void;
  score: number;
  setScore: (score: number) => void;
  tips: ResumeTip[];
  setTips: (tips: ResumeTip[]) => void;
  savedVersions: Array<ResumeData & { savedAt: string }>;
  addSavedVersion: (resume: ResumeData) => void;
  currentTab: 'build' | 'preview' | 'tips';
  setCurrentTab: (tab: 'build' | 'preview' | 'tips') => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useResumeStore = create<ResumeStore>((set) => ({
  resume: null,
  setResume: (resume) => set({ resume }),
  score: 0,
  setScore: (score) => set({ score }),
  tips: [],
  setTips: (tips) => set({ tips }),
  savedVersions: [],
  addSavedVersion: (resume) => set((state) => ({
    savedVersions: [
      { ...resume, savedAt: new Date().toISOString() },
      ...state.savedVersions,
    ].slice(0, 10), // Keep last 10 versions
  })),
  currentTab: 'build',
  setCurrentTab: (tab) => set({ currentTab: tab }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
