import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }

  if (err.name === 'MongoError' && (err as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
    code = 'DUPLICATE_RESOURCE';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Handle PostgreSQL errors
  if (err.code && err.code.startsWith('23')) {
    statusCode = 400;
    if (err.code === '23505') {
      message = 'Duplicate resource';
      code = 'DUPLICATE_RESOURCE';
    } else if (err.code === '23503') {
      message = 'Foreign key constraint violation';
      code = 'FOREIGN_KEY_VIOLATION';
    } else if (err.code === '23502') {
      message = 'Not null constraint violation';
      code = 'NOT_NULL_VIOLATION';
    }
  }

  // Handle Supabase errors
  if (err.message && err.message.includes('duplicate key value')) {
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  }

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Send error response
  const errorResponse: any = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Include details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = details;
  }

  // Include request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'];
  }

  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(
    `Route ${req.originalUrl} not found`,
    404,
    true,
    'NOT_FOUND'
  );
  next(error);
};

// Validation error handler
export const validationErrorHandler = (
  errors: ValidationError[],
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errorMessages = errors.map(error => ({
    field: error.param || error.type,
    message: error.msg,
    value: error.value,
  }));

  res.status(400).json({
    success: false,
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: errorMessages,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
};

// Database connection error handler
export const dbErrorHandler = (error: any): CustomError => {
  if (error.code === 'ECONNREFUSED') {
    return new CustomError(
      'Database connection failed',
      503,
      true,
      'DATABASE_CONNECTION_ERROR'
    );
  }

  if (error.code === 'ENOTFOUND') {
    return new CustomError(
      'Database host not found',
      503,
      true,
      'DATABASE_HOST_ERROR'
    );
  }

  return new CustomError(
    'Database error',
    500,
    true,
    'DATABASE_ERROR',
    error.message
  );
};