/**
 * Project Service
 * 项目管理相关的 API 调用
 */

import { api } from './api';
import type {
  InitProjectRequest,
  InitProjectResponse,
  ListProjectsResponse,
  GetProjectResponse,
  DeleteProjectResponse,
  TestConnectionRequest,
  TestConnectionResponse,
} from '../types';

export const projectService = {
  /**
   * 初始化新项目
   */
  initProject: (data: InitProjectRequest) =>
    api.post<InitProjectResponse>('/projects/init', data),

  /**
   * 获取所有项目列表
   */
  listProjects: () =>
    api.get<ListProjectsResponse>('/projects'),

  /**
   * 获取单个项目详情
   */
  getProject: (name: string) =>
    api.get<GetProjectResponse>(`/projects/${name}`),

  /**
   * 删除项目
   */
  deleteProject: (name: string) =>
    api.delete<DeleteProjectResponse>(`/projects/${name}`),

  /**
   * 测试 AI 连接
   */
  testConnection: (data: TestConnectionRequest) =>
    api.post<TestConnectionResponse>('/projects/test-connection', data),
};
