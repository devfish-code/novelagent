/**
 * Log Store
 * 日志状态管理
 */

import { create } from 'zustand';
import type { LogMessage } from '../types';

interface LogEntry {
  id: string;
  projectName: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

interface LogState {
  // 日志列表（按项目分组）
  logs: Record<string, LogEntry[]>;
  
  // 日志过滤器
  filters: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    search?: string;
  };
  
  // 最大日志数量（每个项目）
  maxLogsPerProject: number;
  
  // Actions
  addLog: (log: LogMessage) => void;
  clearLogs: (projectName?: string) => void;
  setFilter: (filters: Partial<LogState['filters']>) => void;
  clearFilters: () => void;
  getFilteredLogs: (projectName: string) => LogEntry[];
}

const MAX_LOGS_PER_PROJECT = 1000;

export const useLogStore = create<LogState>((set, get) => ({
  logs: {},
  filters: {},
  maxLogsPerProject: MAX_LOGS_PER_PROJECT,

  addLog: (log) =>
    set((state) => {
      const projectLogs = state.logs[log.projectName] || [];
      const newLog: LogEntry = {
        id: `${log.projectName}-${log.timestamp}-${Math.random()}`,
        ...log,
      };

      // 限制日志数量
      const updatedLogs = [...projectLogs, newLog].slice(-state.maxLogsPerProject);

      return {
        logs: {
          ...state.logs,
          [log.projectName]: updatedLogs,
        },
      };
    }),

  clearLogs: (projectName) =>
    set((state) => {
      if (projectName) {
        const { [projectName]: _, ...rest } = state.logs;
        return { logs: rest };
      }
      return { logs: {} };
    }),

  setFilter: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: {} }),

  getFilteredLogs: (projectName) => {
    const state = get();
    const logs = state.logs[projectName] || [];
    const { level, search } = state.filters;

    return logs.filter((log) => {
      // 过滤日志级别
      if (level && log.level !== level) {
        return false;
      }

      // 过滤搜索关键词
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          log.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.context).toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  },
}));
