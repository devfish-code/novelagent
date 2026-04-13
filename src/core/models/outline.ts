/**
 * 大纲模型
 */

import { z } from 'zod';

/**
 * 状态变化Schema
 */
export const StateChangeSchema = z.object({
  entityType: z.enum(['character', 'location', 'world']),
  entityId: z.string(),
  property: z.string(),
  newValue: z.unknown(),
  reason: z.string(),
});

/**
 * 场景Schema
 */
export const SceneSchema = z.object({
  location: z.string(),
  characters: z.array(z.string()),
  events: z.string(),
  reveals: z.array(z.string()),
});

/**
 * 章节大纲Schema
 */
export const ChapterOutlineSchema = z.object({
  volume: z.number(),
  chapter: z.number(),
  title: z.string(),
  function: z.string(),
  scenes: z.array(SceneSchema),
  emotionalTone: z.object({
    start: z.string(),
    end: z.string(),
  }),
  hooksToPlant: z.array(z.string()),
  hooksToResolve: z.array(z.string()),
  stateChanges: z.array(StateChangeSchema),
});

/**
 * 卷大纲Schema
 */
export const VolumeOutlineSchema = z.object({
  volume: z.number(),
  title: z.string(),
  coreTask: z.string(),
  endingState: z.string(),
  chapters: z.array(ChapterOutlineSchema),
});

/**
 * 全书大纲Schema
 */
export const NovelOutlineSchema = z.object({
  title: z.string(),
  theme: z.string(),
  coreQuestion: z.string(),
  emotionalArc: z.string(),
});

export type StateChange = z.infer<typeof StateChangeSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type ChapterOutline = z.infer<typeof ChapterOutlineSchema>;
export type VolumeOutline = z.infer<typeof VolumeOutlineSchema>;
export type NovelOutline = z.infer<typeof NovelOutlineSchema>;
