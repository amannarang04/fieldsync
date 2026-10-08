import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/auth.controller.js';
import { asyncHandler } from './asyncHandler.js';

const router = Router();
router.use(requireAuth, requireAdmin);
router.post('/workers', asyncHandler(controller.createWorker));
router.get('/workers', asyncHandler(controller.listWorkers));
export default router;
