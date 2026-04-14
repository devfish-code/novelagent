/**
 * Project Store
 * 项目状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectSummary, ProjectDetail } from '../types';

interface ProjectState {
  // 项目列表
  projects: ProjectSummary[];
  
  // 当前选中的项目
  currentProject: ProjectDetail | null;
  
  // 加载状态
  loading: boolean;
  error: string | null;
  
  // Actions
  setProjects: (projects: ProjectSummary[]) => void;
  setCurrentProject: (project: ProjectDetail | null) => void;
  updateProject: (name: string, updates: Partial<ProjectSummary>) => void;
  removeProject: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initialState,

      setProjects: (projects) => set({ projects }),

      setCurrentProject: (project) => set({ currentProject: project }),

      updateProject: (name, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.name === name ? { ...p, ...updates } : p
          ),
          currentProject:
            state.currentProject?.name === name
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        })),

      removeProject: (name) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.name !== name),
          currentProject:
            state.currentProject?.name === name ? null : state.currentProject,
        })),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        // 只持久化项目列表，不持久化加载状态和错误
        projects: state.projects,
      }),
    }
  )
);
