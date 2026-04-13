/**
 * 角色模型
 */

import { z } from 'zod';

/**
 * 角色外貌Schema
 */
export const AppearanceSchema = z.object({
  height: z.string(),
  build: z.string(),
  distinctiveFeatures: z.array(z.string()),
  typicalClothing: z.string(),
});

/**
 * 角色性格Schema
 */
export const PersonalitySchema = z.object({
  coreTraits: z.array(z.string()),
  weaknesses: z.array(z.string()),
  catchphrases: z.array(z.string()),
  speechStyle: z.string(),
});

/**
 * 角色背景Schema
 */
export const BackgroundSchema = z.object({
  origin: z.string(),
  keyExperiences: z.array(z.string()),
});

/**
 * 角色能力Schema
 */
export const AbilitiesSchema = z.object({
  current: z.array(z.string()),
  potential: z.array(z.string()),
  limits: z.string(),
});

/**
 * 角色状态Schema
 */
export const CharacterStateSchema = z.object({
  location: z.string(),
  health: z.string(),
  inventory: z.array(z.string()),
  knownInfo: z.array(z.string()),
  unknownInfo: z.array(z.string()),
  emotion: z.string(),
  emotionSource: z.string(),
});

/**
 * 角色Schema
 */
export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  gender: z.enum(['男', '女', '其他']),
  age: z.union([z.number(), z.string()]),
  appearance: AppearanceSchema,
  personality: PersonalitySchema,
  background: BackgroundSchema,
  motivation: z.string(),
  abilities: AbilitiesSchema,
  state: CharacterStateSchema,
});

export type Character = z.infer<typeof CharacterSchema>;
export type Appearance = z.infer<typeof AppearanceSchema>;
export type Personality = z.infer<typeof PersonalitySchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type Abilities = z.infer<typeof AbilitiesSchema>;
export type CharacterState = z.infer<typeof CharacterStateSchema>;
