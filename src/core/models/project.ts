/**
 * 项目模型
 */

import { z } from 'zod';
import { ChapterMetadataSchema } from './chapter.js';

/**
 * 项目配置Schema
 */
export const ProjectConfigSchema = z.object({
  volumes: z.number(),
  chaptersPerVolume: z.number(),
  wordsPerChapter: z.number(),
});

/**
 * 项目进度Schema
 */
export const ProjectProgressSchema = z.object({
  currentPhase: z.enum(['phase1', 'phase2', 'phase3', 'phase4', 'phase5', 'completed']),
  completedChapters: z.number(),
  totalChapters: z.number(),
});

/**
 * 项目统计Schema
 */
export const ProjectStatisticsSchema = z.object({
  totalWords: z.number(),
  totalAICalls: z.number(),
  totalTokens: z.number(),
  totalFixRounds: z.number(),
});

/**
 * 项目Schema
 */
export const ProjectSchema = z.object({
  projectName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.string(),
  config: ProjectConfigSchema,
  progress: ProjectProgressSchema,
  chapters: z.array(ChapterMetadataSchema),
  statistics: ProjectStatisticsSchema,
  status: z.enum(['draft', 'generating', 'completed', 'failed']),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type ProjectProgress = z.infer<typeof ProjectProgressSchema>;
export type ProjectStatistics = z.infer<typeof ProjectStatisticsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
