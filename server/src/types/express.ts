import { Request, Response, NextFunction } from 'express';

export interface AuthData {
  uid: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthData;
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
