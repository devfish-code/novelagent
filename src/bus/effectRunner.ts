/**
 * Effect Runner
 * 负责执行Effect声明,调用对应的Adapter方法
 */

import type { Effect } from '../core/effects.js';
import type { AIPort, StoragePort, LoggerPort, UIPort } from '../core/ports.js';

/**
 * AppContext包含所有Adapter实例
 */
export interface AppContext {
  ai: AIPort;
  storage: StoragePort;
  logger: LoggerPort;
  ui: UIPort;
}

/**
 * 执行单个Effect
 */
export async function runEffect(ctx: AppContext, effect: Effect): Promise<unknown> {
  try {
    switch (effect.type) {
      case 'AI_CHAT': {
        const response = await ctx.ai.chat({
          model: effect.payload.model,
          messages: effect.payload.messages,
          temperature: effect.payload.temperature,
          maxTokens: effect.payload.maxTokens,
        });
        
        // 记录AI对话到日志
        await ctx.logger.saveAIConversation('ai-conversations/latest.json', {
          timestamp: new Date().toISOString(),
          model: effect.payload.model,
          messages: effect.payload.messages,
          response: response.content,
          usage: response.usage,
        });
        
        return response;
      }

      case 'SAVE_FILE': {
        await ctx.storage.saveFile(effect.payload.path, effect.payload.content);
        ctx.logger.debug('文件已保存', { path: effect.payload.path });
        return undefined;
      }

      case 'READ_FILE': {
        const content = await ctx.storage.readFile(effect.payload.path);
        ctx.logger.debug('文件已读取', { path: effect.payload.path });
        return content;
      }

      case 'ENSURE_DIR': {
        await ctx.storage.ensureDir(effect.payload.path);
        ctx.logger.debug('目录已创建', { path: effect.payload.path });
        return undefined;
      }

      case 'LOG_INFO': {
        ctx.logger.info(effect.payload.message, effect.payload.context);
        return undefined;
      }

      case 'LOG_DEBUG': {
        ctx.logger.debug(effect.payload.message, effect.payload.context);
        return undefined;
      }

      case 'LOG_ERROR': {
        ctx.logger.error(effect.payload.message, effect.payload.error);
        return undefined;
      }

      case 'SHOW_PROGRESS': {
        ctx.ui.showProgress(
          effect.payload.current,
          effect.payload.total,
          effect.payload.message
        );
        return undefined;
      }

      case 'SHOW_MESSAGE': {
        ctx.ui.showMessage(effect.payload.type, effect.payload.message);
        return undefined;
      }

      default: {
        // TypeScript会确保这里永远不会到达
        const exhaustiveCheck: never = effect;
        throw new Error(`未知的Effect类型: ${(exhaustiveCheck as Effect).type}`);
      }
    }
  } catch (error) {
    ctx.logger.error(`执行Effect失败: ${effect.type}`, error as Error);
    throw error;
  }
}

/**
 * 顺序执行多个Effects
 */
export async function runEffects(ctx: AppContext, effects: Effect[]): Promise<unknown[]> {
  const results: unknown[] = [];
  
  for (const effect of effects) {
    const result = await runEffect(ctx, effect);
    results.push(result);
  }
  
  return results;
}

