/**
 * Dispatcher
 * 负责路由Command到对应的handler,执行Use Case并运行Effects
 */

import type { Command } from './commands.js';
import type { AppContext } from './effectRunner.js';
import { initProjectHandler } from './handlers/initProject.js';
import { testAIConnectionHandler } from './handlers/testAIConnection.js';
import { generateFrameworkHandler } from './handlers/generateFramework.js';
import { generateChaptersHandler } from './handlers/generateChapters.js';
import { exportProjectHandler } from './handlers/exportProject.js';
import { AppError } from '../core/errors.js';


/**
 * Command执行结果
 */
export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * 分发Command到对应的handler
 */
export async function dispatch(
  ctx: AppContext,
  command: Command
): Promise<CommandResult> {
  try {
    ctx.logger.info(`开始执行命令: ${command.type}`, { payload: command.payload });

    let result: unknown;

    switch (command.type) {
      case 'INIT_PROJECT':
        result = await initProjectHandler(ctx, command.payload);
        break;

      case 'TEST_AI_CONNECTION':
        result = await testAIConnectionHandler(ctx, command.payload);
        break;

      case 'GENERATE_FRAMEWORK':
        result = await generateFrameworkHandler(ctx, command.payload);
        break;

      case 'GENERATE_CHAPTERS':
        result = await generateChaptersHandler(ctx, command.payload);
        break;

      case 'EXPORT_PROJECT':
        result = await exportProjectHandler(ctx, command.payload);
        break;

      default: {
        // TypeScript会确保这里永远不会到达
        const exhaustiveCheck: never = command;
        throw new AppError(
          'UNKNOWN_COMMAND',
          `未知的命令类型: ${(exhaustiveCheck as Command).type}`
        );
      }
    }

    ctx.logger.info(`命令执行成功: ${command.type}`);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    ctx.logger.error(`命令执行失败: ${command.type}`, error as Error);

    if (error instanceof AppError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    // 未知错误
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: error instanceof Error ? error.message : '未知错误',
      },
    };
  }
}

