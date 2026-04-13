/**
 * 需求文档模型
 */

import { z } from 'zod';

/**
 * 目标读者Schema
 */
export const TargetAudienceSchema = z.object({
  ageRange: z.string(),
  readingPreferences: z.array(z.string()),
});

/**
 * 核心冲突Schema
 */
export const CoreConflictSchema = z.object({
  mainContradiction: z.string(),
  opposingSides: z.array(z.string()),
});

/**
 * 故事背景Schema
 */
export const StoryBackgroundSchema = z.object({
  era: z.string(),
  region: z.string(),
  socialEnvironment: z.string(),
});

/**
 * 预期篇幅Schema
 */
export const ExpectedLengthSchema = z.object({
  totalWords: z.number(),
  chapters: z.number(),
});

/**
 * 元数据Schema
 */
export const RequirementsMetadataSchema = z.object({
  generatedAt: z.string(),
  novelAgentVersion: z.string(),
});

/**
 * 需求文档Schema
 */
export const RequirementsSchema = z.object({
  novelType: z.string(),
  targetAudience: TargetAudienceSchema,
  coreConflict: CoreConflictSchema,
  theme: z.string(),
  emotionalTone: z.string(),
  storyBackground: StoryBackgroundSchema,
  narrativePerspective: z.string(),
  expectedLength: ExpectedLengthSchema,
  uniqueSellingPoints: z.array(z.string()),
  metadata: RequirementsMetadataSchema,
});

export type TargetAudience = z.infer<typeof TargetAudienceSchema>;
export type CoreConflict = z.infer<typeof CoreConflictSchema>;
export type StoryBackground = z.infer<typeof StoryBackgroundSchema>;
export type ExpectedLength = z.infer<typeof ExpectedLengthSchema>;
export type RequirementsMetadata = z.infer<typeof RequirementsMetadataSchema>;
export type Requirements = z.infer<typeof RequirementsSchema>;
