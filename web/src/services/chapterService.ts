/**
 * Chapter Service
 * 章节生成相关的 API 调用
 */

import { api } from './api';
import type {
  GenerateChaptersRequest,
  GenerateChaptersResponse,
  PauseChaptersResponse,
  ResumeChaptersResponse,
} from '../types';

export const chapterService = {
  /**
   * 生成章节
   */
  generateChapters: (projectName: string, data?: GenerateChaptersRequest) =>
    api.post<GenerateChaptersResponse>(`/projects/${projectName}/chapters`, data || {}),

  /**
   * 暂停章节生成
   */
  pauseChapters: (projectName: string) =>
    api.post<PauseChaptersResponse>(`/projects/${projectName}/chapters/pause`),

  /**
   * 恢复章节生成
   */
  resumeChapters: (projectName: string) =>
    api.post<ResumeChaptersResponse>(`/projects/${projectName}/chapters/resume`),
};
