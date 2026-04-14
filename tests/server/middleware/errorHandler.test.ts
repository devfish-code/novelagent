import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { errorHandler, AppError, ErrorCodes } from '../../../src/server/middleware/errorHandler.js';

describe('errorHandler middleware', () => {
  it('should handle AppError with correct status code and format', () => {
    const error = new AppError(
      ErrorCodes.PROJECT_NOT_FOUND,
      'Project not found',
      { projectName: 'test-project' }
    );

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCodes.PROJECT_NOT_FOUND,
        message: 'Project not found',
        details: { projectName: 'test-project' },
        timestamp: expect.any(String),
      },
    });
  });

  it('should handle validation errors with 400 status', () => {
    const error = new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed'
    );

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should handle unexpected errors with 500 status', () => {
    const error = new Error('Unexpected error');

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();

    // Mock console.error to avoid test output pollution
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        timestamp: expect.any(String),
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should map error codes to correct HTTP status codes', () => {
    const testCases = [
      { code: ErrorCodes.PROJECT_NOT_FOUND, expectedStatus: 404 },
      { code: ErrorCodes.PROJECT_ALREADY_EXISTS, expectedStatus: 409 },
      { code: ErrorCodes.VALIDATION_ERROR, expectedStatus: 400 },
      { code: ErrorCodes.AI_CONNECTION_FAILED, expectedStatus: 503 },
      { code: ErrorCodes.AI_RATE_LIMITED, expectedStatus: 429 },
      { code: ErrorCodes.FILE_ACCESS_DENIED, expectedStatus: 403 },
    ];

    testCases.forEach(({ code, expectedStatus }) => {
      const error = new AppError(code, 'Test error');
      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(expectedStatus);
    });
  });
});
