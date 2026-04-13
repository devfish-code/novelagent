/**
 * AppContext构建器
 * 
 * 负责实例化所有Adapter并构建完整的AppContext对象
 * 
 * **Validates: Requirements 8.8**
 */

import type { AppContext } from '../bus/effectRunner.js';
import { OpenAICompatibleAdapter } from '../adapters/aiAdapter.js';
import { FileSystemStorageAdapter } from '../adapters/storageAdapter.js';
import { FileLoggerAdapter } from '../adapters/loggerAdapter.js';
import { ConsoleUIAdapter } from '../adapters/uiAdapter.js';
import { loadConfig } from '../config/loader.js';
import type { Config } from '../config/schema.js';

/**
 * 构建AppContext
 * 
 * @param configPath - 配置文件路径
 * @returns 完整的AppContext对象,包含所有Adapter实例
 * @throws 如果配置文件加载失败或Adapter实例化失败
 */
export function buildAppContext(configPath: string): AppContext {
  // 1. 加载配置文件
  const config: Config = loadConfig(configPath);

  // 2. 实例化Logger Adapter (优先实例化,以便其他Adapter可以使用日志)
  const logger = new FileLoggerAdapter(config.logging);

  // 3. 实例化AI Adapter
  const ai = new OpenAICompatibleAdapter(config.ai);

  // 4. 实例化Storage Adapter
  const storage = new FileSystemStorageAdapter();

  // 5. 实例化UI Adapter
  const ui = new ConsoleUIAdapter();

  // 6. 返回完整的AppContext
  return {
    ai,
    storage,
    logger,
    ui,
  };
}
