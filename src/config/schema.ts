/**
 * 配置Schema定义
 * 
 * 使用Zod定义配置类型和验证规则
 * 
 * **Validates: Requirements 14.1-14.8**
 */

export {
  AIModelConfigSchema,
  AIConfigSchema,
  GenerationConfigSchema,
  LoggingConfigSchema,
  SummaryConfigSchema,
  ConfigSchema,
  type AIModelConfig,
  type AIConfig,
  type GenerationConfig,
  type LoggingConfig,
  type SummaryConfig,
  type Config,
} from '../core/models/config.js';
