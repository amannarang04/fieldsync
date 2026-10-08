import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';

export type AuthRequest = Request & { user?: { id: string; role: Role } };
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: { message: 'Authentication required' } });
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET is required');
    req.user = jwt.verify(token, secret) as AuthRequest['user'];
    next();
  } catch { return res.status(401).json({ error: { message: 'Invalid or expired token' } }); }
}
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: { message: 'Admin access required' } });
  next();
}
