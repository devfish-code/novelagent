/**
 * Progress Store
 * 进度状态管理
 */

import { create } from 'zustand';
import type { ProgressMessage, StatusMessage } from '../types';

interface ProjectProgress {
  projectName: string;
  phase: number;
  percentage: number;
  current: number;
  total: number;
  message?: string;
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed';
  lastUpdate: string;
}

interface ProgressState {
  // 进度信息（按项目分组）
  progress: Record<string, ProjectProgress>;
  
  // Actions
  updateProgress: (progress: ProgressMessage) => void;
  updateStatus: (status: StatusMessage) => void;
  clearProgress: (projectName?: string) => void;
  getProgress: (projectName: string) => ProjectProgress | null;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progress: {},

  updateProgress: (progressMsg) =>
    set((state) => {
      const existing = state.progress[progressMsg.projectName];
      
      return {
        progress: {
          ...state.progress,
          [progressMsg.projectName]: {
            projectName: progressMsg.projectName,
            phase: progressMsg.phase,
            percentage: progressMsg.percentage,
            current: progressMsg.current,
            total: progressMsg.total,
            message: progressMsg.message,
            status: existing?.status || 'generating',
            lastUpdate: progressMsg.timestamp,
          },
        },
      };
    }),

  updateStatus: (statusMsg) =>
    set((state) => {
      const existing = state.progress[statusMsg.projectName];
      
      return {
        progress: {
          ...state.progress,
          [statusMsg.projectName]: {
            projectName: statusMsg.projectName,
            phase: statusMsg.phase || existing?.phase || 0,
            percentage: existing?.percentage || 0,
            current: existing?.current || 0,
            total: existing?.total || 0,
            message: existing?.message,
            status: statusMsg.status,
            lastUpdate: statusMsg.timestamp,
          },
        },
      };
    }),

  clearProgress: (projectName) =>
    set((state) => {
      if (projectName) {
        const { [projectName]: _, ...rest } = state.progress;
        return { progress: rest };
      }
      return { progress: {} };
    }),

  getProgress: (projectName) => {
    const state = get();
    return state.progress[projectName] || null;
  },
}));
