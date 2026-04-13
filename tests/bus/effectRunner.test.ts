/**
 * Effect Runner集成测试
 * 测试Effect执行逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEffect, runEffects } from '../../src/bus/effectRunner';
import type { AppContext } from '../../src/bus/effectRunner';
import type { Effect } from '../../src/core/effects';

describe('Effect Runner', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    mockContext = {
      ai: {
        chat: vi.fn().mockResolvedValue({
          content: 'AI response',
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        }),
      },
      storage: {
        saveFile: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockResolvedValue('file content'),
        fileExists: vi.fn().mockResolvedValue(true),
        ensureDir: vi.fn().mockResolvedValue(undefined),
        listDir: vi.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
      },
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        saveAIConversation: vi.fn().mockResolvedValue(undefined),
      },
      ui: {
        showProgress: vi.fn(),
        showMessage: vi.fn(),
      },
    };
  });

  describe('runEffect', () => {
    it('应该执行AI_CHAT effect', async () => {
      const effect: Effect = {
        type: 'AI_CHAT',
        payload: {
          model: 'main',
          messages: [{ role: 'user', content: 'Hello' }],
        },
      };

      const result = await runEffect(mockContext, effect);

      expect(mockContext.ai.chat).toHaveBeenCalledWith({
        model: 'main',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: undefined,
        maxTokens: undefined,
      });
      expect(result).toEqual({
        content: 'AI response',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      });
      expect(mockContext.logger.saveAIConversation).toHaveBeenCalled();
    });

    it('应该执行SAVE_FILE effect', async () => {
      const effect: Effect = {
        type: 'SAVE_FILE',
        payload: {
          path: '/test/file.txt',
          content: 'test content',
        },
      };

      await runEffect(mockContext, effect);

      expect(mockContext.storage.saveFile).toHaveBeenCalledWith(
        '/test/file.txt',
        'test content'
      );
      expect(mockContext.logger.debug).toHaveBeenCalled();
    });

    it('应该执行READ_FILE effect', async () => {
      const effect: Effect = {
        type: 'READ_FILE',
        payload: {
          path: '/test/file.txt',
        },
      };

      const result = await runEffect(mockContext, effect);

      expect(mockContext.storage.readFile).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe('file content');
    });

    it('应该执行ENSURE_DIR effect', async () => {
      const effect: Effect = {
        type: 'ENSURE_DIR',
        payload: {
          path: '/test/dir',
        },
      };

      await runEffect(mockContext, effect);

      expect(mockContext.storage.ensureDir).toHaveBeenCalledWith('/test/dir');
    });

    it('应该执行LOG_INFO effect', async () => {
      const effect: Effect = {
        type: 'LOG_INFO',
        payload: {
          message: 'Test message',
          context: { key: 'value' },
        },
      };

      await runEffect(mockContext, effect);

      expect(mockContext.logger.info).toHaveBeenCalledWith('Test message', { key: 'value' });
    });

    it('应该执行LOG_DEBUG effect', async () => {
      const effect: Effect = {
        type: 'LOG_DEBUG',
        payload: {
          message: 'Debug message',
        },
      };

      await runEffect(mockContext, effect);

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Debug message', undefined);
    });

    it('应该执行LOG_ERROR effect', async () => {
      const error = new Error('Test error');
      const effect: Effect = {
        type: 'LOG_ERROR',
        payload: {
          message: 'Error occurred',
          error,
        },
      };

      await runEffect(mockContext, effect);

      expect(mockContext.logger.error).toHaveBeenCalledWith('Error occurred', error);
    });

    it('应该执行SHOW_PROGRESS effect', async () => {
      const effect: Effect = {
        type: 'SHOW_PROGRESS',
        payload: {
          current: 5,
          total: 10,
          message: 'Processing...',
        },
      };

      await runEffect(mockContext, effect);

      expect(mockContext.ui.showProgress).toHaveBeenCalledWith(5, 10, 'Processing...');
    });

    it('应该执行SHOW_MESSAGE effect', async () => {
      const effect: Effect = {
        type: 'SHOW_MESSAGE',
        payload: {
          type: 'success',
          message: 'Operation completed',
        },
      };

      await runEffect(mockContext, effect);

      expect(mockContext.ui.showMessage).toHaveBeenCalledWith('success', 'Operation completed');
    });

    it('应该在执行失败时记录错误', async () => {
      mockContext.storage.saveFile = vi.fn().mockRejectedValue(new Error('Write failed'));

      const effect: Effect = {
        type: 'SAVE_FILE',
        payload: {
          path: '/test/file.txt',
          content: 'test',
        },
      };

      await expect(runEffect(mockContext, effect)).rejects.toThrow('Write failed');
      expect(mockContext.logger.error).toHaveBeenCalled();
    });
  });

  describe('runEffects', () => {
    it('应该顺序执行多个effects', async () => {
      const effects: Effect[] = [
        {
          type: 'LOG_INFO',
          payload: { message: 'Start' },
        },
        {
          type: 'SAVE_FILE',
          payload: { path: '/test/file.txt', content: 'test' },
        },
        {
          type: 'LOG_INFO',
          payload: { message: 'End' },
        },
      ];

      await runEffects(mockContext, effects);

      expect(mockContext.logger.info).toHaveBeenCalledTimes(2);
      expect(mockContext.storage.saveFile).toHaveBeenCalledTimes(1);
    });

    it('应该返回所有effect的结果', async () => {
      const effects: Effect[] = [
        {
          type: 'READ_FILE',
          payload: { path: '/test/file1.txt' },
        },
        {
          type: 'READ_FILE',
          payload: { path: '/test/file2.txt' },
        },
      ];

      const results = await runEffects(mockContext, effects);

      expect(results).toHaveLength(2);
      expect(results[0]).toBe('file content');
      expect(results[1]).toBe('file content');
    });

    it('应该在某个effect失败时停止执行', async () => {
      mockContext.storage.saveFile = vi.fn().mockRejectedValue(new Error('Write failed'));

      const effects: Effect[] = [
        {
          type: 'LOG_INFO',
          payload: { message: 'Start' },
        },
        {
          type: 'SAVE_FILE',
          payload: { path: '/test/file.txt', content: 'test' },
        },
        {
          type: 'LOG_INFO',
          payload: { message: 'End' },
        },
      ];

      await expect(runEffects(mockContext, effects)).rejects.toThrow('Write failed');
      expect(mockContext.logger.info).toHaveBeenCalledTimes(1); // 只执行了第一个
    });
  });
});

