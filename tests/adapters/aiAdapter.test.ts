/**
 * AI Adapter集成测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAICompatibleAdapter } from '../../src/adapters/aiAdapter.js';
import { AIConfig } from '../../src/core/models/config.js';
import { ErrorCodes } from '../../src/core/errors.js';

describe('OpenAICompatibleAdapter', () => {
  const mockConfig: AIConfig = {
    mainModel: {
      provider: 'openai-compatible',
      baseURL: 'https://api.example.com',
      apiKey: 'test-key',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    },
    jsonModel: {
      provider: 'openai-compatible',
      baseURL: 'https://api.example.com',
      apiKey: 'test-key',
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 1000,
    },
  };

  let adapter: OpenAICompatibleAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    adapter = new OpenAICompatibleAdapter(mockConfig);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('chat', () => {
    it('应该成功调用AI API', async () => {
      // Mock成功响应
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Hello, world!',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
      });

      const response = await adapter.chat({
        model: 'main',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.content).toBe('Hello, world!');
      expect(response.usage.totalTokens).toBe(15);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });

    it('应该使用正确的模型配置', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      });

      await adapter.chat({
        model: 'json',
        messages: [{ role: 'user', content: 'test' }],
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe('gpt-4');
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(1000);
    });

    it('应该在网络错误时重试', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new TypeError('fetch failed'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'success after retry' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        });
      });

      const response = await adapter.chat({
        model: 'main',
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(response.content).toBe('success after retry');
      expect(callCount).toBe(3);
    });

    it.skip('应该在超时后抛出错误', async () => {
      // Mock一个永远不resolve的fetch
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(() => {}) // 永远pending
      );

      await expect(
        adapter.chat({
          model: 'main',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.AI_TIMEOUT,
      });
    }, 40000); // 测试超时设置为40秒(30秒超时 + 重试延迟)

    it('应该处理401错误(API Key无效)', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: { message: 'Invalid API key' } }),
          headers: new Headers(),
        });
      });

      await expect(
        adapter.chat({
          model: 'main',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.AI_CONNECTION_FAILED,
        message: expect.stringContaining('API Key'),
      });

      // 应该重试3次
      expect(callCount).toBe(4); // 初始调用 + 3次重试
    }, 20000); // 增加超时时间

    it('应该处理429错误(限流)', async () => {
      const headers = new Headers();
      headers.set('Retry-After', '60');

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: { message: 'Rate limit exceeded' } }),
          headers,
        });
      });

      await expect(
        adapter.chat({
          model: 'main',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.AI_RATE_LIMITED,
        details: expect.objectContaining({
          retryAfter: 60,
        }),
      });

      // 应该重试3次
      expect(callCount).toBe(4);
    }, 20000); // 增加超时时间

    it('应该处理500错误(服务器错误)', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: { message: 'Server error' } }),
          headers: new Headers(),
        });
      });

      await expect(
        adapter.chat({
          model: 'main',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.AI_CONNECTION_FAILED,
        message: expect.stringContaining('服务暂时不可用'),
      });

      // 应该重试3次
      expect(callCount).toBe(4);
    }, 20000); // 增加超时时间

    it('应该处理无效的响应格式', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            // 缺少choices字段
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        });
      });

      await expect(
        adapter.chat({
          model: 'main',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        code: ErrorCodes.AI_RESPONSE_INVALID,
      });

      // 应该重试3次
      expect(callCount).toBe(4);
    }, 20000); // 增加超时时间
  });
});
