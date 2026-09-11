import { Request, Response, NextFunction } from 'express';

interface HttpError extends Error {
  statusCode?: number;
  errors?: any[];
}

export const errorHandler = (
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;

  const responseBody: any = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  if (err.errors && err.errors.length > 0) {
    responseBody.errors = err.errors;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};
