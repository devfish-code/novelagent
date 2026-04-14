/**
 * Export Service
 * 导出相关的 API 调用
 */

import { api } from './api';
import type {
  ExportProjectRequest,
  ExportProjectResponse,
} from '../types';

export const exportService = {
  /**
   * 导出项目文件
   */
  exportProject: (projectName: string, data: ExportProjectRequest) =>
    api.post<ExportProjectResponse>(`/projects/${projectName}/export`, data),

  /**
   * 下载导出的文件
   */
  downloadFile: (projectName: string, filename: string) => {
    const url = `/api/projects/${projectName}/exports/${filename}`;
    window.open(url, '_blank');
  },
};
