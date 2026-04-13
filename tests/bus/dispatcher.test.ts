/**
 * Dispatcher集成测试
 * 使用mock adapter测试命令分发逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatch } from '../../src/bus/dispatcher';
import type { AppContext } from '../../src/bus/effectRunner';
import type { Command } from '../../src/bus/commands';

describe('Dispatcher', () => {
  let mockContext: AppContext;

  beforeEach(() => {
    // 创建mock adapters
    mockContext = {
      ai: {
        chat: vi.fn().mockResolvedValue({
          content: 'test response',
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        }),
      },
      storage: {
        saveFile: vi.fn().mockResolvedValue(undefined),
        readFile: vi.fn().mockResolvedValue('test content'),
        fileExists: vi.fn().mockResolvedValue(false),
        ensureDir: vi.fn().mockResolvedValue(undefined),
        listDir: vi.fn().mockResolvedValue([]),
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

  describe('INIT_PROJECT command', () => {
    it('应该成功初始化项目', async () => {
      const command: Command = {
        type: 'INIT_PROJECT',
        payload: {
          dir: '/test',
          force: false,
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(true);
      expect(mockContext.storage.ensureDir).toHaveBeenCalled();
      expect(mockContext.storage.saveFile).toHaveBeenCalled();
    });

    it('应该在配置文件已存在时抛出错误', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(true);

      const command: Command = {
        type: 'INIT_PROJECT',
        payload: {
          dir: '/test',
          force: false,
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONFIG_EXISTS');
    });

    it('应该在使用--force时覆盖已存在的配置', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(true);

      const command: Command = {
        type: 'INIT_PROJECT',
        payload: {
          dir: '/test',
          force: true,
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(true);
      expect(mockContext.storage.saveFile).toHaveBeenCalled();
    });
  });

  describe('TEST_AI_CONNECTION command', () => {
    it('应该成功测试AI连接', async () => {
      const command: Command = {
        type: 'TEST_AI_CONNECTION',
        payload: {
          model: 'main',
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(true);
      expect(mockContext.ai.chat).toHaveBeenCalled();
    });

    it('应该测试所有模型', async () => {
      const command: Command = {
        type: 'TEST_AI_CONNECTION',
        payload: {
          model: 'all',
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(true);
      expect(mockContext.ai.chat).toHaveBeenCalledTimes(2); // main + json
    });

    it('应该处理AI连接失败', async () => {
      mockContext.ai.chat = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const command: Command = {
        type: 'TEST_AI_CONNECTION',
        payload: {
          model: 'main',
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(true); // handler不抛出错误,只返回结果
      const data = result.data as { results: { success: boolean }[] };
      expect(data.results[0].success).toBe(false);
    });
  });

  describe('GENERATE_FRAMEWORK command', () => {
    it('应该在项目已存在时抛出错误', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(true);

      const command: Command = {
        type: 'GENERATE_FRAMEWORK',
        payload: {
          creativeDescription: '一个关于魔法学院的故事',
          projectName: 'magic-school',
          dir: '/test',
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROJECT_EXISTS');
    });

    it('应该在创意描述过短时显示警告', async () => {
      const command: Command = {
        type: 'GENERATE_FRAMEWORK',
        payload: {
          creativeDescription: '短描述',
          projectName: 'test-novel',
          dir: '/test',
        },
      };

      await dispatch(mockContext, command);

      expect(mockContext.ui.showMessage).toHaveBeenCalledWith(
        'warning',
        expect.stringContaining('创意描述较短')
      );
    });
  });

  describe('GENERATE_CHAPTERS command', () => {
    it('应该在项目不存在时抛出错误', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(false);

      const command: Command = {
        type: 'GENERATE_CHAPTERS',
        payload: {
          projectName: 'non-existent',
          dir: '/test',
          force: false,
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('EXPORT_PROJECT command', () => {
    it('应该在项目不存在时抛出错误', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(false);

      const command: Command = {
        type: 'EXPORT_PROJECT',
        payload: {
          projectName: 'non-existent',
          dir: '/test',
          format: 'markdown',
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROJECT_NOT_FOUND');
    });
  });

  describe('错误处理', () => {
    it('应该捕获并返回AppError', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(true);

      const command: Command = {
        type: 'INIT_PROJECT',
        payload: {
          dir: '/test',
          force: false,
        },
      };

      const result = await dispatch(mockContext, command);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('CONFIG_EXISTS');
      expect(result.error?.message).toBeDefined();
    });

    it('应该记录错误日志', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(true);

      const command: Command = {
        type: 'INIT_PROJECT',
        payload: {
          dir: '/test',
          force: false,
        },
      };

      await dispatch(mockContext, command);

      expect(mockContext.logger.error).toHaveBeenCalled();
    });
  });
});

