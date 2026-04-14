/**
 * API Request and Response Types
 */

// ============================================================================
// Project Management Types
// ============================================================================

/**
 * POST /api/projects/init
 */
export interface InitProjectRequest {
  name: string;
  force?: boolean;
}

export interface InitProjectResponse {
  success: boolean;
  project: {
    name: string;
    dir: string;
    createdAt: string;
  };
}

/**
 * GET /api/projects
 */
export interface ProjectSummary {
  name: string;
  status: 'idle' | 'generating' | 'completed' | 'failed';
  progress: {
    phase: 1 | 2 | 3 | 4 | 5;
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

export interface ListProjectsResponse {
  success: boolean;
  projects: ProjectSummary[];
}

/**
 * GET /api/projects/:name
 */
export interface ProjectDetail extends ProjectSummary {
  requirements?: string;
  chapters: ChapterSummary[];
}

export interface ChapterSummary {
  volume: number;
  chapter: number;
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  wordCount?: number;
}

export interface GetProjectResponse {
  success: boolean;
  project: ProjectDetail;
}

/**
 * DELETE /api/projects/:name
 */
export interface DeleteProjectResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/projects/test-connection
 */
export interface TestConnectionRequest {
  model: 'main' | 'json' | 'all';
}

export interface TestConnectionResponse {
  success: boolean;
  results: {
    model: 'main' | 'json';
    success: boolean;
    responseTime: number;
    error?: string;
  }[];
}

// ============================================================================
// Framework Generation Types
// ============================================================================

/**
 * POST /api/projects/:name/framework
 */
export interface GenerateFrameworkRequest {
  creativeDescription: string;
  volumes?: number;
  chaptersPerVolume?: number;
  wordsPerChapter?: number;
}

export interface GenerateFrameworkResponse {
  success: boolean;
  taskId: string;
  message: string;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * POST /api/projects/:name/export
 */
export interface ExportRequest {
  format: 'markdown' | 'json';
  files: ('novel' | 'world' | 'characters' | 'outline' | 'timeline' | 'report')[];
}

export interface ExportResponse {
  success: boolean;
  files: {
    name: string;
    url: string;
    size: number;
  }[];
  zipUrl?: string;
}
