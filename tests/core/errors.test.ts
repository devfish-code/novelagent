/**
 * Errors测试
 */

import { describe, it, expect } from 'vitest';
import { AppError, ErrorCodes } from '../../src/core/errors.js';

describe('Errors', () => {
  describe('AppError', () => {
    it('应该创建带有错误码和消息的错误', () => {
      const error = new AppError(
        ErrorCodes.CONFIG_NOT_FOUND,
        '配置文件不存在'
      );

      expect(error.code).toBe(ErrorCodes.CONFIG_NOT_FOUND);
      expect(error.message).toBe('配置文件不存在');
      expect(error.name).toBe('AppError');
    });

    it('应该支持details参数', () => {
      const error = new AppError(
        ErrorCodes.FILE_NOT_FOUND,
        '文件不存在',
        { path: '/test/file.txt' }
      );

      expect(error.details).toEqual({ path: '/test/file.txt' });
    });

    it('应该是Error的实例', () => {
      const error = new AppError(ErrorCodes.UNKNOWN, '未知错误');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ErrorCodes', () => {
    it('应该定义所有错误码', () => {
      expect(ErrorCodes.CONFIG_NOT_FOUND).toBe('CONFIG_NOT_FOUND');
      expect(ErrorCodes.CONFIG_INVALID).toBe('CONFIG_INVALID');
      expect(ErrorCodes.AI_CONNECTION_FAILED).toBe('AI_CONNECTION_FAILED');
      expect(ErrorCodes.AI_RESPONSE_INVALID).toBe('AI_RESPONSE_INVALID');
      expect(ErrorCodes.AI_RATE_LIMITED).toBe('AI_RATE_LIMITED');
      expect(ErrorCodes.AI_TIMEOUT).toBe('AI_TIMEOUT');
      expect(ErrorCodes.PROJECT_EXISTS).toBe('PROJECT_EXISTS');
      expect(ErrorCodes.PROJECT_NOT_FOUND).toBe('PROJECT_NOT_FOUND');
      expect(ErrorCodes.GENERATION_FAILED).toBe('GENERATION_FAILED');
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCodes.FIX_FAILED).toBe('FIX_FAILED');
      expect(ErrorCodes.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
      expect(ErrorCodes.FILE_ACCESS_DENIED).toBe('FILE_ACCESS_DENIED');
      expect(ErrorCodes.FILE_WRITE_FAILED).toBe('FILE_WRITE_FAILED');
      expect(ErrorCodes.UNKNOWN).toBe('UNKNOWN');
    });

    it('应该包含所有必需的错误码', () => {
      const errorCodes = Object.values(ErrorCodes);
      expect(errorCodes.length).toBeGreaterThan(10);
      expect(errorCodes).toContain('CONFIG_NOT_FOUND');
      expect(errorCodes).toContain('AI_CONNECTION_FAILED');
      expect(errorCodes).toContain('PROJECT_NOT_FOUND');
      expect(errorCodes).toContain('FILE_NOT_FOUND');
      expect(errorCodes).toContain('UNKNOWN');
    });
  });
});
