/**
 * 世界状态模型
 */

import { z } from 'zod';
import { CharacterStateSchema } from './character.js';
import { LocationStateSchema } from './location.js';

/**
 * 时间线事件Schema
 */
export const TimelineEventSchema = z.object({
  timestamp: z.string(),
  event: z.string(),
  involvedCharacters: z.array(z.string()),
  location: z.string(),
});

/**
 * 伏笔Schema
 */
export const HookSchema = z.object({
  id: z.string(),
  description: z.string(),
  plantedAt: z.string(),
  status: z.enum(['planted', 'resolved', 'abandoned']),
  resolvedAt: z.string().optional(),
});

/**
 * 世界规则Schema
 */
export const WorldRuleSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  constraints: z.array(z.string()),
});

/**
 * 世界状态Schema
 */
export const WorldStateSchema = z.object({
  characters: z.record(z.string(), CharacterStateSchema),
  locations: z.record(z.string(), LocationStateSchema),
  timeline: z.array(TimelineEventSchema),
  hooks: z.record(z.string(), HookSchema),
  worldRules: z.array(WorldRuleSchema),
  lastUpdatedChapter: z.string(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type Hook = z.infer<typeof HookSchema>;
export type WorldRule = z.infer<typeof WorldRuleSchema>;
export type WorldState = z.infer<typeof WorldStateSchema>;
