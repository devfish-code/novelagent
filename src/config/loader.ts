/**
 * 配置加载器
 * 
 * 负责从YAML文件加载配置,支持环境变量替换和验证
 * 
 * **Validates: Requirements 14.1-14.8**
 */

import * as fs from 'node:fs';
import * as yaml from 'yaml';
import { ConfigSchema, type Config } from './schema.js';
import { defaultConfig } from './defaults.js';

/**
 * 加载配置文件
 * 
 * @param configPath - 配置文件路径
 * @returns 验证后的配置对象
 * @throws 如果配置文件不存在、格式无效或验证失败
 */
export function loadConfig(configPath: string): Config {
  // 检查文件是否存在
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  // 读取文件内容
  const fileContent = fs.readFileSync(configPath, 'utf-8');

  // 替换环境变量
  const processedContent = replaceEnvVariables(fileContent);

  // 解析YAML
  let rawConfig: unknown;
  try {
    rawConfig = yaml.parse(processedContent);
  } catch (error) {
    throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 合并默认配置
  const configWithDefaults = mergeWithDefaults(rawConfig);

  // 验证配置
  const result = ConfigSchema.safeParse(configWithDefaults);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Config validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * 替换配置内容中的环境变量
 * 
 * 支持 ${VAR_NAME} 格式的环境变量引用
 * 
 * @param content - 原始配置内容
 * @returns 替换后的配置内容
 */
function replaceEnvVariables(content: string): string {
  return content.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`Warning: Environment variable ${varName} is not defined, keeping placeholder`);
      return match;
    }
    return value;
  });
}

/**
 * 合并用户配置和默认配置
 * 
 * @param userConfig - 用户配置对象
 * @returns 合并后的配置对象
 */
function mergeWithDefaults(userConfig: unknown): unknown {
  if (typeof userConfig !== 'object' || userConfig === null) {
    return defaultConfig;
  }

  const merged = { ...defaultConfig };
  const user = userConfig as Record<string, unknown>;

  // 合并 ai 配置
  if (typeof user.ai === 'object' && user.ai !== null) {
    merged.ai = {
      mainModel: mergeObject(defaultConfig.ai.mainModel, (user.ai as any).mainModel) as typeof defaultConfig.ai.mainModel,
      jsonModel: mergeObject(defaultConfig.ai.jsonModel, (user.ai as any).jsonModel) as typeof defaultConfig.ai.jsonModel,
    };
  }

  // 合并 generation 配置
  if (typeof user.generation === 'object' && user.generation !== null) {
    merged.generation = mergeObject(defaultConfig.generation, user.generation) as typeof defaultConfig.generation;
  }

  // 合并 logging 配置
  if (typeof user.logging === 'object' && user.logging !== null) {
    merged.logging = mergeObject(defaultConfig.logging, user.logging) as typeof defaultConfig.logging;
  }

  // 合并 summary 配置
  if (typeof user.summary === 'object' && user.summary !== null) {
    merged.summary = mergeObject(defaultConfig.summary, user.summary) as typeof defaultConfig.summary;
  }

  return merged;
}

/**
 * 合并两个对象
 * 
 * @param defaults - 默认值对象
 * @param user - 用户提供的值对象
 * @returns 合并后的对象
 */
function mergeObject(defaults: Record<string, unknown>, user: unknown): Record<string, unknown> {
  if (typeof user !== 'object' || user === null) {
    return defaults;
  }

  const result = { ...defaults };
  const userObj = user as Record<string, unknown>;

  for (const key in userObj) {
    if (userObj[key] !== undefined) {
      result[key] = userObj[key];
    }
  }

  return result;
}
