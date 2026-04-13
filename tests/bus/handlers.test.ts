/**
 * Handlers集成测试
 * 测试每个handler的命令处理逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initProjectHandler } from '../../src/bus/handlers/initProject';
import { testAIConnectionHandler } from '../../src/bus/handlers/testAIConnection';
import type { AppContext } from '../../src/bus/effectRunner';

describe('Handlers', () => {
  let mockContext: AppContext;

  beforeEach(() => {
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

  describe('initProjectHandler', () => {
    it('应该成功创建项目', async () => {
      const result = await initProjectHandler(mockContext, {
        dir: '/test',
        force: false,
      });

      expect(result.configPath).toContain('config.yaml');
      expect(mockContext.storage.ensureDir).toHaveBeenCalled();
      expect(mockContext.storage.saveFile).toHaveBeenCalled();
    });

    it('应该创建必要的子目录', async () => {
      await initProjectHandler(mockContext, {
        dir: '/test',
        force: false,
      });

      expect(mockContext.storage.ensureDir).toHaveBeenCalledWith('/test');
      expect(mockContext.storage.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('logs')
      );
      expect(mockContext.storage.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('ai-conversations')
      );
    });

    it('应该保存配置文件模板', async () => {
      await initProjectHandler(mockContext, {
        dir: '/test',
        force: false,
      });

      expect(mockContext.storage.saveFile).toHaveBeenCalledWith(
        expect.stringContaining('config.yaml'),
        expect.stringContaining('ai:')
      );
    });

    it('应该在配置文件已存在时抛出错误', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(true);

      await expect(
        initProjectHandler(mockContext, {
          dir: '/test',
          force: false,
        })
      ).rejects.toThrow('配置文件已存在');
    });

    it('应该在使用--force时覆盖配置', async () => {
      mockContext.storage.fileExists = vi.fn().mockResolvedValue(true);

      const result = await initProjectHandler(mockContext, {
        dir: '/test',
        force: true,
      });

      expect(result.configPath).toBeDefined();
      expect(mockContext.storage.saveFile).toHaveBeenCalled();
    });
  });

  describe('testAIConnectionHandler', () => {
    it('应该测试单个模型', async () => {
      const result = await testAIConnectionHandler(mockContext, {
        model: 'main',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].model).toBe('main');
      expect(result.results[0].success).toBe(true);
      expect(mockContext.ai.chat).toHaveBeenCalledTimes(1);
    });

    it('应该测试所有模型', async () => {
      const result = await testAIConnectionHandler(mockContext, {
        model: 'all',
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].model).toBe('main');
      expect(result.results[1].model).toBe('json');
      expect(mockContext.ai.chat).toHaveBeenCalledTimes(2);
    });

    it('应该记录响应时间', async () => {
      const result = await testAIConnectionHandler(mockContext, {
        model: 'main',
      });

      expect(result.results[0].responseTime).toBeGreaterThanOrEqual(0);
    });

    it('应该处理连接失败', async () => {
      mockContext.ai.chat = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await testAIConnectionHandler(mockContext, {
        model: 'main',
      });

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Connection failed');
    });

    it('应该显示成功消息', async () => {
      await testAIConnectionHandler(mockContext, {
        model: 'main',
      });

      expect(mockContext.ui.showMessage).toHaveBeenCalledWith(
        'success',
        expect.stringContaining('连接成功')
      );
    });

    it('应该显示失败消息', async () => {
      mockContext.ai.chat = vi.fn().mockRejectedValue(new Error('Connection failed'));

      await testAIConnectionHandler(mockContext, {
        model: 'main',
      });

      expect(mockContext.ui.showMessage).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('连接失败')
      );
    });
  });

  describe('generateFrameworkHandler', () => {
    it('应该导出generateFrameworkHandler函数', async () => {
      const { generateFrameworkHandler } = await import('../../src/bus/handlers/generateFramework.js');
      expect(typeof generateFrameworkHandler).toBe('function');
    });
  });

  describe('generateChaptersHandler', () => {
    it('应该导出generateChaptersHandler函数', async () => {
      const { generateChaptersHandler } = await import('../../src/bus/handlers/generateChapters.js');
      expect(typeof generateChaptersHandler).toBe('function');
    });
  });

  describe('exportProjectHandler', () => {
    it('应该导出exportProjectHandler函数', async () => {
      const { exportProjectHandler } = await import('../../src/bus/handlers/exportProject.js');
      expect(typeof exportProjectHandler).toBe('function');
    });
  });
});

