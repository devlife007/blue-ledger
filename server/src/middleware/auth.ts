import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase.js';
import { AuthenticatedRequest } from '../types/express.js';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error: any = new Error('No token provided');
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.split(' ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      (req as AuthenticatedRequest).user = decodedToken;
      next();
    } catch (error) {
      const err: any = new Error('Invalid or expired token');
      err.statusCode = 401;
      next(err);
    }
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        (req as AuthenticatedRequest).user = decodedToken;
      } catch {
        // Invalid token but optional auth, just continue without user
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
