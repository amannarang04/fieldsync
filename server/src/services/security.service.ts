import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import type { Role } from '@prisma/client';

export type Principal = { id: string; role: Role };
function secret(name: string) { const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return value; }
export const issueAccessToken = (principal: Principal) => jwt.sign(principal, secret('JWT_ACCESS_SECRET'), { expiresIn: '15m' });
export const issueRefreshToken = (principal: Principal) => jwt.sign(principal, secret('JWT_REFRESH_SECRET'), { expiresIn: '30d', jwtid: randomUUID() });
export const verifyRefreshToken = (token: string): Principal => {
  const claims = jwt.verify(token, secret('JWT_REFRESH_SECRET')) as Principal;
  return { id: claims.id, role: claims.role };
};
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const checkPassword = (password: string, passwordHash: string) => bcrypt.compare(password, passwordHash);
