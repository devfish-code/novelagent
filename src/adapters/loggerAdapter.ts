/**
 * Logger Adapter实现
 * 实现文件日志记录,支持日志级别过滤、敏感信息脱敏、结构化JSON格式
 */

import * as fs from 'fs-extra';
import * as path from 'node:path';
import { LoggerPort, AIConversation } from '../core/ports.js';
import { LoggingConfig } from '../core/models/config.js';

/**
 * 日志级别枚举
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  ERROR = 2,
}

/**
 * 日志条目接口
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * 文件日志适配器
 */
export class FileLoggerAdapter implements LoggerPort {
  private logLevel: LogLevel;
  private logDir: string;
  private logFilePath: string;

  constructor(config: LoggingConfig) {
    this.logLevel = this.parseLogLevel(config.logLevel);
    this.logDir = config.logDir;
    this.logFilePath = path.join(this.logDir, 'novel-generation.log');
    
    // 确保日志目录存在
    fs.ensureDirSync(this.logDir);
  }

  /**
   * 记录info级别日志
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.writeLog('INFO', message, context);
    }
  }

  /**
   * 记录debug级别日志
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.writeLog('DEBUG', message, context);
    }
  }

  /**
   * 记录error级别日志
   */
  error(message: string, error?: Error): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const context = error ? {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      } : undefined;
      this.writeLog('ERROR', message, context);
    }
  }

  /**
   * 保存AI对话记录
   */
  async saveAIConversation(logPath: string, conversation: AIConversation): Promise<void> {
    try {
      // 确保目录存在
      const fullPath = path.join(this.logDir, logPath);
      const dir = path.dirname(fullPath);
      await fs.ensureDir(dir);

      // 脱敏处理
      const sanitizedConversation = this.sanitizeConversation(conversation);

      // 保存为JSON格式
      await fs.writeFile(
        fullPath,
        JSON.stringify(sanitizedConversation, null, 2),
        { encoding: 'utf-8' }
      );
    } catch (error) {
      // 日志保存失败不应该影响主流程,只记录错误
      console.error(`Failed to save AI conversation: ${error}`);
    }
  }

  /**
   * 写入日志
   */
  private writeLog(level: string, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.sanitizeContext(context) : undefined,
    };

    const logLine = JSON.stringify(entry) + '\n';

    try {
      fs.appendFileSync(this.logFilePath, logLine, { encoding: 'utf-8' });
    } catch (error) {
      // 日志写入失败时输出到控制台
      console.error(`Failed to write log: ${error}`);
    }
  }

  /**
   * 解析日志级别
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * 脱敏上下文数据
   */
  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      sanitized[key] = this.sanitizeValue(key, value);
    }

    return sanitized;
  }

  /**
   * 脱敏单个值
   */
  private sanitizeValue(key: string, value: unknown): unknown {
    // 检查是否是敏感字段
    const sensitiveKeys = ['apikey', 'api_key', 'token', 'password', 'secret'];
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      if (typeof value === 'string' && value.length > 0) {
        // 只显示前4个字符
        return value.substring(0, 4) + '****';
      }
      return '****';
    }

    // 递归处理对象
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return this.sanitizeContext(value as Record<string, unknown>);
    }

    // 递归处理数组
    if (Array.isArray(value)) {
      return value.map((item, index) => 
        this.sanitizeValue(`${key}[${index}]`, item)
      );
    }

    return value;
  }

  /**
   * 脱敏AI对话记录
   */
  private sanitizeConversation(conversation: AIConversation): AIConversation {
    return {
      ...conversation,
      messages: conversation.messages.map(msg => ({
        ...msg,
        // 不脱敏消息内容,因为需要用于调试
        content: msg.content,
      })),
    };
  }
}
