/**
 * Logger Adapter WebSocket 集成测试
 * 测试 LoggerAdapter 的 WebSocket 推送功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileLoggerAdapter } from '../../src/adapters/loggerAdapter.js';
import { LoggingConfig } from '../../src/core/models/config.js';
import type { EventBroadcaster } from '../../src/server/websocket/broadcaster.js';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as os from 'node:os';

describe('FileLoggerAdapter - WebSocket Broadcasting', () => {
  let testDir: string;
  let mockBroadcaster: EventBroadcaster;

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `novelagent-log-ws-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // 创建 mock broadcaster
    mockBroadcaster = {
      broadcastLog: vi.fn(),
      broadcastProgress: vi.fn(),
      broadcastStatus: vi.fn(),
      broadcastError: vi.fn(),
      broadcastComplete: vi.fn(),
      getSubscriberCount: vi.fn(),
      getClientCount: vi.fn(),
    } as unknown as EventBroadcaster;
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir);
    vi.clearAllMocks();
  });

  describe('构造函数参数', () => {
    it('应该接受可选的 wsBroadcaster 和 projectName 参数', () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };

      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');
      expect(logger).toBeDefined();
    });

    it('应该在没有 wsBroadcaster 时正常工作（向后兼容）', () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };

      const logger = new FileLoggerAdapter(config);
      logger.info('test message');

      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });

  describe('info 方法 WebSocket 推送', () => {
    it('应该在提供 wsBroadcaster 和 projectName 时推送日志', () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.info('test message', { key: 'value' });

      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledTimes(1);
      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          projectName: 'test-project',
          level: 'info',
          message: 'test message',
          context: { key: 'value' },
        })
      );
    });

    it('应该在没有 wsBroadcaster 时不推送日志', () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.info('test message');

      // mockBroadcaster 未被传入，所以不应该被调用
      expect(true).toBe(true);
    });

    it('应该在没有 projectName 时不推送日志', () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster);

      logger.info('test message');

      expect(mockBroadcaster.broadcastLog).not.toHaveBeenCalled();
    });

    it('应该推送脱敏后的上下文', () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.info('test message', { apiKey: 'sk-1234567890abcdef' });

      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          context: { apiKey: 'sk-1****' },
        })
      );
    });

    it('应该包含时间戳', () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.info('test message');

      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );

      const call = vi.mocked(mockBroadcaster.broadcastLog).mock.calls[0];
      const timestamp = call[1].timestamp;
      expect(new Date(timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('debug 方法 WebSocket 推送', () => {
    it('应该推送 debug 级别的日志', () => {
      const config: LoggingConfig = {
        logLevel: 'debug',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.debug('debug message', { detail: 'info' });

      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          level: 'debug',
          message: 'debug message',
          context: { detail: 'info' },
        })
      );
    });

    it('应该在日志级别过滤时不推送', () => {
      const config: LoggingConfig = {
        logLevel: 'info', // info 级别不记录 debug
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.debug('debug message');

      expect(mockBroadcaster.broadcastLog).not.toHaveBeenCalled();
    });
  });

  describe('error 方法 WebSocket 推送', () => {
    it('应该推送 error 级别的日志', () => {
      const config: LoggingConfig = {
        logLevel: 'error',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      const error = new Error('test error');
      logger.error('error occurred', error);

      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          level: 'error',
          message: 'error occurred',
          context: expect.objectContaining({
            errorName: 'Error',
            errorMessage: 'test error',
            errorStack: expect.any(String),
          }),
        })
      );
    });

    it('应该在没有 error 对象时推送空上下文', () => {
      const config: LoggingConfig = {
        logLevel: 'error',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.error('error occurred');

      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          level: 'error',
          message: 'error occurred',
          context: undefined,
        })
      );
    });
  });

  describe('WebSocket 推送错误处理', () => {
    it('应该在 WebSocket 推送失败时不影响文件日志', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };

      // 创建会抛出错误的 broadcaster
      const failingBroadcaster = {
        broadcastLog: vi.fn(() => {
          throw new Error('WebSocket error');
        }),
      } as unknown as EventBroadcaster;

      const logger = new FileLoggerAdapter(config, failingBroadcaster, 'test-project');

      // 应该不抛出错误
      expect(() => {
        logger.info('test message');
      }).not.toThrow();

      // 文件日志应该仍然被写入
      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      expect(content).toContain('test message');
    });
  });

  describe('同时写入文件和推送 WebSocket', () => {
    it('应该同时写入文件日志和推送 WebSocket', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.info('test message', { key: 'value' });

      // 验证 WebSocket 推送
      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledTimes(1);

      // 验证文件写入
      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const logEntry = JSON.parse(content.trim());

      expect(logEntry).toMatchObject({
        level: 'INFO',
        message: 'test message',
        context: { key: 'value' },
      });
    });

    it('应该对多条日志都进行推送', () => {
      const config: LoggingConfig = {
        logLevel: 'debug',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config, mockBroadcaster, 'test-project');

      logger.debug('debug message');
      logger.info('info message');
      logger.error('error message');

      expect(mockBroadcaster.broadcastLog).toHaveBeenCalledTimes(3);
      expect(mockBroadcaster.broadcastLog).toHaveBeenNthCalledWith(
        1,
        'test-project',
        expect.objectContaining({ level: 'debug' })
      );
      expect(mockBroadcaster.broadcastLog).toHaveBeenNthCalledWith(
        2,
        'test-project',
        expect.objectContaining({ level: 'info' })
      );
      expect(mockBroadcaster.broadcastLog).toHaveBeenNthCalledWith(
        3,
        'test-project',
        expect.objectContaining({ level: 'error' })
      );
    });
  });
});
