import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../services/authService';
import pool from '../config/database';

export interface AuthRequest extends Request {
  userId?: number;
  email?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const payload = verifyJWT(token);
    req.userId = payload.userId;
    req.email = payload.email;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const payload = verifyJWT(token);
    req.userId = payload.userId;
    req.email = payload.email;

    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [
      payload.userId,
    ]);

    if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
