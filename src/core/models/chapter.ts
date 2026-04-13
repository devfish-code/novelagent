/**
 * 章节模型
 */

import { z } from 'zod';

/**
 * 章节Schema
 */
export const ChapterSchema = z.object({
  volume: z.number(),
  chapter: z.number(),
  title: z.string(),
  content: z.string(),
  wordCount: z.number(),
  generatedAt: z.string(),
});

/**
 * 章节元数据Schema
 */
export const ChapterMetadataSchema = z.object({
  volume: z.number(),
  chapter: z.number(),
  title: z.string(),
  wordCount: z.number(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  generatedAt: z.string().optional(),
  fixRounds: z.number().optional(),
});

/**
 * 章节摘要Schema
 */
export const ChapterSummarySchema = z.object({
  chapterId: z.string(),
  keyEvents: z.array(z.string()),
  characterActions: z.record(z.string(), z.array(z.string())),
  stateChanges: z.array(z.unknown()),
  wordCount: z.number(),
  summaryLength: z.number(),
});

export type Chapter = z.infer<typeof ChapterSchema>;
export type ChapterMetadata = z.infer<typeof ChapterMetadataSchema>;
export type ChapterSummary = z.infer<typeof ChapterSummarySchema>;
