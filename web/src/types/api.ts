/**
 * API Types
 * 与后端 API 对应的类型定义
 */

import type { WorldState } from './project';

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Project Types
// ============================================================================

export interface InitProjectRequest {
  name: string;
  force?: boolean;
}

export interface InitProjectResponse {
  success: true;
  project: {
    name: string;
    dir: string;
    createdAt: string;
  };
}

export interface ProjectSummary {
  name: string;
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'failed';
  progress: {
    phase: number;
    percentage: number;
    currentTask: string;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    volumes: number;
    chaptersPerVolume: number;
    totalChapters: number;
    completedChapters: number;
  };
}

export interface ProjectDetail extends ProjectSummary {
  requirements?: string;
  chapters: ChapterInfo[];
  world?: WorldState;
}

export interface ChapterInfo {
  volume: number;
  chapter: number;
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  wordCount?: number;
}

export interface ListProjectsResponse {
  success: true;
  projects: ProjectSummary[];
}

export interface GetProjectResponse {
  success: true;
  project: ProjectDetail;
}

export interface DeleteProjectResponse {
  success: true;
  message: string;
}

export interface TestConnectionRequest {
  model: 'main' | 'json' | 'all';
}

export interface TestConnectionResponse {
  success: true;
  results: {
    main?: {
      success: boolean;
      latency?: number;
      error?: string;
    };
    json?: {
      success: boolean;
      latency?: number;
      error?: string;
    };
  };
}

// ============================================================================
// Framework Generation Types
// ============================================================================

export interface GenerateFrameworkRequest {
  requirements?: string;
}

export interface GenerateFrameworkResponse {
  success: true;
  taskId: string;
  message: string;
}

// ============================================================================
// Chapter Generation Types
// ============================================================================

export interface GenerateChaptersRequest {
  volume?: number;
  startChapter?: number;
  endChapter?: number;
  specificChapter?: number;
  force?: boolean;
}

export interface GenerateChaptersResponse {
  success: true;
  taskId: string;
  message: string;
}

export interface PauseChaptersResponse {
  success: true;
  message: string;
}

export interface ResumeChaptersResponse {
  success: true;
  taskId: string;
  message: string;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'markdown' | 'json';

export type ExportFile = 
  | 'novel'
  | 'world'
  | 'characters'
  | 'outline'
  | 'timeline'
  | 'report';

export interface ExportProjectRequest {
  format: ExportFormat;
  files: ExportFile[];
}

export interface ExportProjectResponse {
  success: true;
  files: {
    filename: string;
    downloadUrl: string;
    size: number;
  }[];
}
