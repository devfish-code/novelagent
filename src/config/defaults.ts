/**
 * 默认配置
 * 
 * 定义系统的默认配置值
 * 
 * **Validates: Requirements 14.6**
 */

import type { Config } from './schema.js';

/**
 * 默认配置常量
 */
export const defaultConfig: Config = {
  ai: {
    mainModel: {
      provider: 'openai-compatible',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 4000,
    },
    jsonModel: {
      provider: 'openai-compatible',
      baseURL: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
    },
  },
  generation: {
    volumes: 3,
    chaptersPerVolume: 10,
    wordsPerChapter: 3000,
    maxFixRounds: 3,
  },
  logging: {
    logLevel: 'info',
    logDir: 'logs',
  },
  summary: {
    summaryLengthRatio: 0.15,
  },
};
