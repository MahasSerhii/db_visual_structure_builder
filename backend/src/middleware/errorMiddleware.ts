import { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/AppError';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error caught by middleware:', err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err.name === 'ValidationError') {
      // Mongoose Validation Error
      statusCode = 400;
      message = err.message;
      code = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
      // Mongoose Cast Error
      statusCode = 400;
      message = 'Invalid ID format';
      code = 'INVALID_ID';
  } else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
      code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
      code = 'TOKEN_EXPIRED';
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    code,
    message
  });
};

export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
