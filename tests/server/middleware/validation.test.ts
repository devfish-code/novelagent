import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { z } from 'zod';
import { validate, validateMultiple } from '../../../src/server/middleware/validation.js';
import { AppError, ErrorCodes } from '../../../src/server/middleware/errorHandler.js';

describe('validate middleware', () => {
  it('should validate request body successfully', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const middleware = validate(schema, 'body');

    const req = {
      body: { name: 'John', age: 30 },
    } as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'John', age: 30 });
  });

  it('should fail validation with invalid data', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const middleware = validate(schema, 'body');

    const req = {
      body: { name: 'John', age: 'invalid' },
    } as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0] as AppError;
    expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(error.message).toBe('Request validation failed');
  });

  it('should validate query parameters', () => {
    const schema = z.object({
      page: z.string(),
      limit: z.string(),
    });

    const middleware = validate(schema, 'query');

    const req = {
      query: { page: '1', limit: '10' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: '1', limit: '10' });
  });

  it('should validate route params', () => {
    const schema = z.object({
      id: z.string(),
    });

    const middleware = validate(schema, 'params');

    const req = {
      params: { id: '123' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ id: '123' });
  });
});

describe('validateMultiple middleware', () => {
  it('should validate multiple targets successfully', () => {
    const schemas = {
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.string() }),
      params: z.object({ id: z.string() }),
    };

    const middleware = validateMultiple(schemas);

    const req = {
      body: { name: 'John' },
      query: { page: '1' },
      params: { id: '123' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'John' });
    expect(req.query).toEqual({ page: '1' });
    expect(req.params).toEqual({ id: '123' });
  });

  it('should fail if any target validation fails', () => {
    const schemas = {
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.number() }),
    };

    const middleware = validateMultiple(schemas);

    const req = {
      body: { name: 'John' },
      query: { page: 'invalid' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0] as AppError;
    expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  it('should only validate provided schemas', () => {
    const schemas = {
      body: z.object({ name: z.string() }),
    };

    const middleware = validateMultiple(schemas);

    const req = {
      body: { name: 'John' },
      query: { invalid: 'data' },
      params: { invalid: 'data' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'John' });
  });
});
