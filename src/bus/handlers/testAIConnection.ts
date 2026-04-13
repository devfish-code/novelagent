/**
 * TEST_AI_CONNECTION handler
 * 测试AI模型连接
 */

import type { AppContext } from '../effectRunner.js';
import { runEffect } from '../effectRunner.js';
import type { Effect } from '../../core/effects.js';
import type { ChatResponse } from '../../core/ports.js';

export interface TestAIConnectionInput {
  model: 'main' | 'json' | 'all';
}

export interface TestAIConnectionOutput {
  results: {
    model: 'main' | 'json';
    success: boolean;
    responseTime: number;
    error?: string;
  }[];
}

export async function testAIConnectionHandler(
  ctx: AppContext,
  input: TestAIConnectionInput
): Promise<TestAIConnectionOutput> {
  const results: TestAIConnectionOutput['results'] = [];

  // 确定要测试的模型
  const modelsToTest: ('main' | 'json')[] =
    input.model === 'all' ? ['main', 'json'] : [input.model];

  for (const model of modelsToTest) {
    ctx.logger.info(`测试${model}模型连接...`);

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // 构建测试Effect
      const effect: Effect = {
        type: 'AI_CHAT',
        payload: {
          model,
          messages: [
            {
              role: 'user',
              content: '你好,请回复"连接成功"',
            },
          ],
          temperature: 0.3,
          maxTokens: 100,
        },
      };

      // 执行Effect
      const response = (await runEffect(ctx, effect)) as ChatResponse;

      // 检查响应
      if (response && response.content) {
        success = true;
        ctx.logger.info(`${model}模型连接成功`, {
          responseTime: Date.now() - startTime,
          usage: response.usage,
        });
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : '未知错误';
      ctx.logger.error(`${model}模型连接失败`, err as Error);
    }

    const responseTime = Date.now() - startTime;

    results.push({
      model,
      success,
      responseTime,
      error,
    });

    // 显示结果
    await runEffect(ctx, {
      type: 'SHOW_MESSAGE',
      payload: {
        type: success ? 'success' : 'error',
        message: success
          ? `${model}模型连接成功 (${responseTime}ms)`
          : `${model}模型连接失败: ${error}`,
      },
    });
  }

  return { results };
}

