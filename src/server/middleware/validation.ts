import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCodes } from './errorHandler.js';

/**
 * Validation target - where to validate data from
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Create validation middleware using Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Where to get data from (body, query, or params)
 * @returns Express middleware function
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Get data from the specified target
      const data = req[target];
      
      // Validate data against schema
      const validated = schema.parse(data);
      
      // Replace request data with validated data
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const details = {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        };
        
        next(
          new AppError(
            ErrorCodes.VALIDATION_ERROR,
            'Request validation failed',
            details
          )
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate multiple targets at once
 * 
 * @param schemas - Object mapping targets to schemas
 * @returns Express middleware function
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Validate each target if schema is provided
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = {
          issues: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        };
        
        next(
          new AppError(
            ErrorCodes.VALIDATION_ERROR,
            'Request validation failed',
            details
          )
        );
      } else {
        next(error);
      }
    }
  };
}
