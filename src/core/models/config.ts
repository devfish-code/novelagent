/**
 * 配置模型
 */

import { z } from 'zod';

/**
 * AI模型配置Schema
 */
export const AIModelConfigSchema = z.object({
  provider: z.literal('openai-compatible'),
  baseURL: z.string(),
  apiKey: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1),
});

/**
 * AI配置Schema
 */
export const AIConfigSchema = z.object({
  mainModel: AIModelConfigSchema,
  jsonModel: AIModelConfigSchema,
});

/**
 * 生成配置Schema
 */
export const GenerationConfigSchema = z.object({
  volumes: z.number().int().min(1),
  chaptersPerVolume: z.number().int().min(1),
  wordsPerChapter: z.number().int().min(100),
  maxFixRounds: z.number().int().min(0),
});

/**
 * 日志配置Schema
 */
export const LoggingConfigSchema = z.object({
  logLevel: z.enum(['debug', 'info', 'error']),
  logDir: z.string(),
});

/**
 * 摘要配置Schema
 */
export const SummaryConfigSchema = z.object({
  summaryLengthRatio: z.number().min(0.05).max(0.5),
});

/**
 * 配置Schema
 */
export const ConfigSchema = z.object({
  ai: AIConfigSchema,
  generation: GenerationConfigSchema,
  logging: LoggingConfigSchema,
  summary: SummaryConfigSchema,
});

export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;
export type AIConfig = z.infer<typeof AIConfigSchema>;
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type SummaryConfig = z.infer<typeof SummaryConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
