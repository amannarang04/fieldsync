import type { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository.js';
import { tokenRepository } from '../repositories/token.repository.js';
import { checkPassword, hashPassword, hashToken, issueAccessToken, issueRefreshToken, verifyRefreshToken } from '../services/security.service.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function register(req: Request, res: Response) {
  try {
    const email = String(req.body.email).toLowerCase();
    const user = await userRepository.create({ email, name: req.body.name, passwordHash: await hashPassword(req.body.password), role: 'WORKER' });
    return res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error: any) { return res.status(409).json({ error: { message: error.code === 'P2002' ? 'Email already registered' : 'Registration failed' } }); }
}

export async function login(req: Request, res: Response) {
  const email = String(req.body.email).toLowerCase();
  const user = await userRepository.findByEmail(email);
  if (!user || !await checkPassword(req.body.password, user.passwordHash)) return res.status(401).json({ error: { message: 'Invalid email or password' } });
  const principal = { id: user.id, role: user.role };
  const refreshToken = issueRefreshToken(principal);
  await tokenRepository.create(hashToken(refreshToken), user.id);
  return res.json({ accessToken: issueAccessToken(principal), refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = String(req.body.refreshToken);
    const principal = verifyRefreshToken(refreshToken);
    const stored = await tokenRepository.find(hashToken(refreshToken));
    if (!stored || stored.expiresAt < new Date()) return res.status(401).json({ error: { message: 'Refresh token expired' } });
    await tokenRepository.deleteById(stored.id);
    const next = issueRefreshToken(principal);
    await tokenRepository.create(hashToken(next), principal.id);
    return res.json({ accessToken: issueAccessToken(principal), refreshToken: next });
  } catch { return res.status(401).json({ error: { message: 'Invalid refresh token' } }); }
}

export async function logout(req: AuthRequest, res: Response) {
  const refreshToken = String(req.body.refreshToken ?? '');
  if (refreshToken) await tokenRepository.delete(hashToken(refreshToken));
  return res.json({ ok: true });
}

export async function me(req: AuthRequest, res: Response) { return res.json(await userRepository.findPublicById(req.user!.id)); }

export async function createWorker(req: Request, res: Response) {
  try {
    const user = await userRepository.create({ email: String(req.body.email).toLowerCase(), name: req.body.name, passwordHash: await hashPassword(req.body.password), role: 'WORKER' });
    return res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch { return res.status(409).json({ error: { message: 'Email already registered' } }); }
}

export async function listWorkers(_req: Request, res: Response) { return res.json(await userRepository.listWorkers()); }
