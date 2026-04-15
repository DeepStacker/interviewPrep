import { create } from 'zustand';

export interface RoadmapWeek {
  week: number;
  title: string;
  topics: string[];
  tasks: Array<{
    id: string;
    description: string;
    completed: boolean;
    hoursRequired: number;
  }>;
  resources: Array<{
    title: string;
    url: string;
    type: 'video' | 'article' | 'problem' | 'course';
  }>;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number; // 0-100
}

export interface Roadmap {
  id: number;
  userId: number;
  type: 'new_grad' | 'experienced';
  duration: number; // 8 or 12 weeks
  targetCompanies: string[];
  weeks: RoadmapWeek[];
  createdAt: string;
  startDate: string;
  endDate: string;
}

interface RoadmapStore {
  roadmap: Roadmap | null;
  setRoadmap: (roadmap: Roadmap) => void;
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
  weekProgress: Record<number, number>;
  updateWeekProgress: (week: number, progress: number) => void;
  markTaskComplete: (week: number, taskId: string) => void;
  completedTasks: Set<string>;
  overallProgress: number;
  setOverallProgress: (progress: number) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useRoadmapStore = create<RoadmapStore>((set) => ({
  roadmap: null,
  setRoadmap: (roadmap) => set({ roadmap }),
  currentWeek: 1,
  setCurrentWeek: (week) => set({ currentWeek: week }),
  weekProgress: {},
  updateWeekProgress: (week, progress) =>
    set((state) => ({
      weekProgress: { ...state.weekProgress, [week]: progress },
    })),
  markTaskComplete: (week, taskId) =>
    set((state) => ({
      completedTasks: new Set([...state.completedTasks, `${week}-${taskId}`]),
    })),
  completedTasks: new Set(),
  overallProgress: 0,
  setOverallProgress: (progress) => set({ overallProgress: progress }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
