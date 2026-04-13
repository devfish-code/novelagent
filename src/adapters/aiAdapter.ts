/**
 * AI Adapter实现
 * 实现OpenAI兼容API调用,支持重试、超时、错误分类
 */

import { AIPort, ChatOptions, ChatResponse } from '../core/ports.js';
import { AIConfig } from '../core/models/config.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { retryWithExponentialBackoff } from '../utils/retry.js';

/**
 * OpenAI兼容API适配器
 */
export class OpenAICompatibleAdapter implements AIPort {
  constructor(private config: AIConfig) {}

  /**
   * 调用AI聊天接口
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const modelConfig = options.model === 'main' 
      ? this.config.mainModel 
      : this.config.jsonModel;

    // 使用重试机制包装API调用
    return retryWithExponentialBackoff(
      () => this.callAPI(modelConfig, options),
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 8000,
      }
    );
  }

  /**
   * 实际的API调用逻辑
   */
  private async callAPI(
    modelConfig: { baseURL: string; apiKey: string; model: string; temperature: number; maxTokens: number },
    options: ChatOptions
  ): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    try {
      const response = await fetch(`${modelConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: options.messages,
          temperature: options.temperature ?? modelConfig.temperature,
          max_tokens: options.maxTokens ?? modelConfig.maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 处理HTTP错误
      if (!response.ok) {
        await this.handleHTTPError(response);
      }

      // 解析响应
      const data = await response.json() as any;

      // 验证响应格式
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new AppError(
          ErrorCodes.AI_RESPONSE_INVALID,
          'AI响应格式无效',
          { response: data }
        );
      }

      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // 超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError(
          ErrorCodes.AI_TIMEOUT,
          'AI请求超时(30秒)',
          { model: modelConfig.model }
        );
      }

      // 网络错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AppError(
          ErrorCodes.AI_CONNECTION_FAILED,
          'AI连接失败,请检查网络或baseURL配置',
          { baseURL: modelConfig.baseURL, originalError: error.message }
        );
      }

      // 重新抛出已分类的错误
      if (error instanceof AppError) {
        throw error;
      }

      // 未知错误
      throw new AppError(
        ErrorCodes.UNKNOWN,
        'AI调用失败',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * 处理HTTP错误响应
   */
  private async handleHTTPError(response: Response): Promise<never> {
    const status = response.status;
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: await response.text() };
    }

    // 401: API Key错误
    if (status === 401) {
      throw new AppError(
        ErrorCodes.AI_CONNECTION_FAILED,
        'API Key无效或已过期',
        { status, error: errorData }
      );
    }

    // 429: 限流错误
    if (status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new AppError(
        ErrorCodes.AI_RATE_LIMITED,
        'API请求频率超限',
        { 
          status, 
          retryAfter: retryAfter ? parseInt(retryAfter) : 60,
          error: errorData 
        }
      );
    }

    // 500+: 服务器错误
    if (status >= 500) {
      throw new AppError(
        ErrorCodes.AI_CONNECTION_FAILED,
        'AI服务暂时不可用',
        { status, error: errorData }
      );
    }

    // 其他错误
    throw new AppError(
      ErrorCodes.AI_CONNECTION_FAILED,
      `AI请求失败: ${errorData.message || response.statusText}`,
      { status, error: errorData }
    );
  }
}
