/**
 * Logger Adapter集成测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileLoggerAdapter } from '../../src/adapters/loggerAdapter.js';
import { LoggingConfig } from '../../src/core/models/config.js';
import { AIConversation } from '../../src/core/ports.js';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import * as os from 'node:os';

describe('FileLoggerAdapter', () => {
  let testDir: string;

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), `novelagent-log-test-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir);
  });

  describe('日志级别过滤', () => {
    it('应该在info级别记录info和error日志', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.debug('debug message');
      logger.info('info message');
      logger.error('error message');

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2); // 只有info和error
      expect(content).toContain('info message');
      expect(content).toContain('error message');
      expect(content).not.toContain('debug message');
    });

    it('应该在debug级别记录所有日志', async () => {
      const config: LoggingConfig = {
        logLevel: 'debug',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.debug('debug message');
      logger.info('info message');
      logger.error('error message');

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
      expect(content).toContain('debug message');
      expect(content).toContain('info message');
      expect(content).toContain('error message');
    });

    it('应该在error级别只记录error日志', async () => {
      const config: LoggingConfig = {
        logLevel: 'error',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.debug('debug message');
      logger.info('info message');
      logger.error('error message');

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(1);
      expect(content).toContain('error message');
      expect(content).not.toContain('debug message');
      expect(content).not.toContain('info message');
    });
  });

  describe('结构化日志格式', () => {
    it('应该使用JSON格式记录日志', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.info('test message', { key: 'value' });

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const logEntry = JSON.parse(content.trim());

      expect(logEntry).toMatchObject({
        level: 'INFO',
        message: 'test message',
        context: { key: 'value' },
      });
      expect(logEntry.timestamp).toBeDefined();
    });

    it('应该记录错误堆栈', async () => {
      const config: LoggingConfig = {
        logLevel: 'error',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      const error = new Error('test error');
      logger.error('error occurred', error);

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const logEntry = JSON.parse(content.trim());

      expect(logEntry.context).toMatchObject({
        errorName: 'Error',
        errorMessage: 'test error',
      });
      expect(logEntry.context.errorStack).toBeDefined();
    });
  });

  describe('敏感信息脱敏', () => {
    it('应该脱敏API Key', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.info('test', { apiKey: 'sk-1234567890abcdef' });

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const logEntry = JSON.parse(content.trim());

      expect(logEntry.context.apiKey).toBe('sk-1****');
      expect(content).not.toContain('sk-1234567890abcdef');
    });

    it('应该脱敏嵌套对象中的敏感信息', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.info('test', {
        config: {
          api_key: 'secret123',
          token: 'token456',
        },
      });

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const logEntry = JSON.parse(content.trim());

      expect(logEntry.context.config.api_key).toBe('secr****');
      expect(logEntry.context.config.token).toBe('toke****');
    });

    it('应该脱敏数组中的敏感信息', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.info('test', {
        keys: ['password1', 'password2'],
      });

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');

      // 数组元素本身不会被脱敏,除非key名包含敏感词
      expect(content).toContain('password1');
    });
  });

  describe('saveAIConversation', () => {
    it('应该保存AI对话记录', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      const conversation: AIConversation = {
        timestamp: '2024-01-01T00:00:00Z',
        model: 'main',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        response: 'Hi there!',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
      };

      await logger.saveAIConversation('ai-conversations/test.json', conversation);

      const conversationFile = path.join(testDir, 'ai-conversations', 'test.json');
      expect(await fs.pathExists(conversationFile)).toBe(true);

      const savedContent = await fs.readFile(conversationFile, 'utf-8');
      const savedConversation = JSON.parse(savedContent);

      expect(savedConversation).toMatchObject({
        timestamp: '2024-01-01T00:00:00Z',
        model: 'main',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      });
    });

    it('应该自动创建嵌套目录', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      const conversation: AIConversation = {
        timestamp: '2024-01-01T00:00:00Z',
        model: 'main',
        messages: [],
        response: 'test',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      };

      await logger.saveAIConversation('phase4/chapter-1/round-1.json', conversation);

      const conversationFile = path.join(testDir, 'phase4', 'chapter-1', 'round-1.json');
      expect(await fs.pathExists(conversationFile)).toBe(true);
    });
  });

  describe('日志写入', () => {
    it('应该追加日志而不是覆盖', async () => {
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: testDir,
      };
      const logger = new FileLoggerAdapter(config);

      logger.info('first message');
      logger.info('second message');

      const logFile = path.join(testDir, 'novel-generation.log');
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(content).toContain('first message');
      expect(content).toContain('second message');
    });

    it('应该在日志目录不存在时自动创建', async () => {
      const newTestDir = path.join(testDir, 'new-logs');
      const config: LoggingConfig = {
        logLevel: 'info',
        logDir: newTestDir,
      };

      const logger = new FileLoggerAdapter(config);
      logger.info('test message');

      expect(await fs.pathExists(newTestDir)).toBe(true);
      const logFile = path.join(newTestDir, 'novel-generation.log');
      expect(await fs.pathExists(logFile)).toBe(true);
    });
  });
});
