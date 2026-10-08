import type { AuthRequest } from '../middleware/auth.js';
import type { Response } from 'express';
import { syncSubmissions } from '../services/sync.service.js';

export async function sync(req: AuthRequest, res: Response) { return res.json({ results: await syncSubmissions(req.user!, req.body.submissions) }); }
