/**
 * 错误类型定义
 * 统一的错误处理机制
 */

/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 错误码常量
 */
export const ErrorCodes = {
  // 配置错误
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  
  // AI错误
  AI_CONNECTION_FAILED: 'AI_CONNECTION_FAILED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  
  // 项目错误
  PROJECT_EXISTS: 'PROJECT_EXISTS',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  
  // 生成错误
  GENERATION_FAILED: 'GENERATION_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FIX_FAILED: 'FIX_FAILED',
  
  // 文件错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
  
  // 未知错误
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * 错误响应类型
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * 成功响应类型
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * 统一响应类型
 */
export type Response<T> = SuccessResponse<T> | ErrorResponse;
