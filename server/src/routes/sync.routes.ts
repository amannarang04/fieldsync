import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sync } from '../controllers/sync.controller.js';
import { asyncHandler } from './asyncHandler.js';

const router = Router();
router.post('/', requireAuth, asyncHandler(sync));
export default router;
