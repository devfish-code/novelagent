/**
 * NovelAgent主入口文件
 * 
 * 导出所有公共API供程序化使用
 */

// Core层导出
export * from './core/effects.js';
export * from './core/errors.js';
export type { AIPort, StoragePort, LoggerPort, UIPort } from './core/ports.js';
export * from './core/models/index.js';
export * from './core/rules/index.js';
export * from './core/usecases/index.js';
export type { 
  ContextAssemblerInput, 
  AssembledContext, 
  ContextComponent 
} from './core/rag/types.js';
export { assembleContext } from './core/rag/contextAssembler.js';
export { generateSummary } from './core/rag/summaryManager.js';

// Bus层导出
export * from './bus/commands.js';
export * from './bus/dispatcher.js';
export * from './bus/effectRunner.js';

// Adapter层导出
export * from './adapters/index.js';

// Config层导出
export * from './config/index.js';

// Shell层导出
export * from './shells/index.js';

// Utils导出
export * from './utils/pathSanitizer.js';
export * from './utils/retry.js';
export * from './utils/tokenEstimator.js';
