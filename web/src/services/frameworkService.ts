/**
 * Framework Service
 * 框架生成相关的 API 调用
 */

import { api } from './api';
import type {
  GenerateFrameworkRequest,
  GenerateFrameworkResponse,
} from '../types';

export const frameworkService = {
  /**
   * 生成项目框架
   */
  generateFramework: (projectName: string, data?: GenerateFrameworkRequest) =>
    api.post<GenerateFrameworkResponse>(`/projects/${projectName}/framework`, data || {}),
};
