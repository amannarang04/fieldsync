import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/auth.controller.js';
import { asyncHandler } from './asyncHandler.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
router.post('/register', authLimiter, asyncHandler(controller.register));
router.post('/login', authLimiter, asyncHandler(controller.login));
router.post('/refresh', authLimiter, asyncHandler(controller.refresh));
router.post('/logout', authLimiter, requireAuth, asyncHandler(controller.logout));
router.get('/me', authLimiter, requireAuth, asyncHandler(controller.me));
export default router;
