/**
 * INIT_PROJECT handler
 * 初始化项目,创建config.yaml和目录结构
 */

import type { AppContext } from '../effectRunner.js';
import { runEffects } from '../effectRunner.js';
import type { Effect } from '../../core/effects.js';
import { AppError } from '../../core/errors.js';
import path from 'path';

export interface InitProjectInput {
  dir: string;
  force: boolean;
}

export interface InitProjectOutput {
  configPath: string;
  message: string;
}

/**
 * 默认配置模板
 */
const DEFAULT_CONFIG_TEMPLATE = `# NovelAgent配置文件

# AI模型配置
ai:
  mainModel:
    provider: openai-compatible
    baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: \${DASHSCOPE_API_KEY}  # 支持环境变量
    model: qwen-plus
    temperature: 0.7
    maxTokens: 32768
  
  jsonModel:
    provider: openai-compatible
    baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
    apiKey: \${DASHSCOPE_API_KEY}
    model: qwen-plus
    temperature: 0.3
    maxTokens: 8192

# 生成配置
generation:
  volumes: 3
  chaptersPerVolume: 10
  wordsPerChapter: 3000
  maxFixRounds: 3

# 日志配置
logging:
  logLevel: info  # debug | info | error
  logDir: logs

# 摘要配置
summary:
  summaryLengthRatio: 0.15  # 15%
`;

export async function initProjectHandler(
  ctx: AppContext,
  input: InitProjectInput
): Promise<InitProjectOutput> {
  const configPath = path.join(input.dir, 'config.yaml');

  // 检查配置文件是否已存在
  const configExists = await ctx.storage.fileExists(configPath);
  if (configExists && !input.force) {
    throw new AppError(
      'CONFIG_EXISTS',
      '配置文件已存在',
      {
        path: configPath,
        suggestion: '使用 --force 选项覆盖已存在的配置文件',
      }
    );
  }

  // 构建Effects
  const effects: Effect[] = [
    // 确保工作目录存在
    {
      type: 'ENSURE_DIR',
      payload: { path: input.dir },
    },
    // 创建子目录
    {
      type: 'ENSURE_DIR',
      payload: { path: path.join(input.dir, 'logs') },
    },
    {
      type: 'ENSURE_DIR',
      payload: { path: path.join(input.dir, 'logs', 'ai-conversations') },
    },
    {
      type: 'ENSURE_DIR',
      payload: { path: path.join(input.dir, 'logs', 'validation-reports') },
    },
    // 保存配置文件
    {
      type: 'SAVE_FILE',
      payload: {
        path: configPath,
        content: DEFAULT_CONFIG_TEMPLATE,
      },
    },
    // 显示成功消息
    {
      type: 'SHOW_MESSAGE',
      payload: {
        type: 'success',
        message: '项目初始化成功',
      },
    },
    // 记录日志
    {
      type: 'LOG_INFO',
      payload: {
        message: '项目初始化完成',
        context: { dir: input.dir, configPath },
      },
    },
  ];

  // 执行Effects
  await runEffects(ctx, effects);

  return {
    configPath,
    message: `配置文件已创建: ${configPath}\n下一步: 编辑配置文件,设置API Key`,
  };
}

