import { Request, Response, NextFunction } from 'express';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

/**
 * Application error class with error code
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes used throughout the application
 */
export const ErrorCodes = {
  // Project errors
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PROJECT_ALREADY_EXISTS: 'PROJECT_ALREADY_EXISTS',
  PROJECT_INVALID_NAME: 'PROJECT_INVALID_NAME',
  
  // Task errors
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  TASK_ALREADY_RUNNING: 'TASK_ALREADY_RUNNING',
  TASK_CANNOT_PAUSE: 'TASK_CANNOT_PAUSE',
  TASK_CANNOT_CANCEL: 'TASK_CANNOT_CANCEL',
  
  // AI errors
  AI_CONNECTION_FAILED: 'AI_CONNECTION_FAILED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  
  // Config errors
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  
  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

/**
 * Map error codes to HTTP status codes
 */
function getStatusCode(errorCode: string): number {
  const statusMap: Record<string, number> = {
    [ErrorCodes.PROJECT_NOT_FOUND]: 404,
    [ErrorCodes.TASK_NOT_FOUND]: 404,
    [ErrorCodes.FILE_NOT_FOUND]: 404,
    [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
    [ErrorCodes.PROJECT_ALREADY_EXISTS]: 409,
    [ErrorCodes.TASK_ALREADY_RUNNING]: 409,
    [ErrorCodes.VALIDATION_ERROR]: 400,
    [ErrorCodes.CONFIG_INVALID]: 400,
    [ErrorCodes.PROJECT_INVALID_NAME]: 400,
    [ErrorCodes.AI_CONNECTION_FAILED]: 503,
    [ErrorCodes.AI_RATE_LIMITED]: 429,
    [ErrorCodes.FILE_ACCESS_DENIED]: 403,
    [ErrorCodes.TASK_CANNOT_PAUSE]: 400,
    [ErrorCodes.TASK_CANNOT_CANCEL]: 400,
    [ErrorCodes.AI_RESPONSE_INVALID]: 502,
    [ErrorCodes.CONFIG_NOT_FOUND]: 404,
  };
  return statusMap[errorCode] || 500;
}

/**
 * Error handling middleware
 * Converts errors to standardized error response format
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle AppError with error code
  if (err instanceof AppError) {
    const statusCode = getStatusCode(err.code);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      },
    };
    res.status(statusCode).json(errorResponse);
    return;
  }

  // Handle unexpected errors
  console.error('Unexpected error:', err);
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
  };
  res.status(500).json(errorResponse);
}
