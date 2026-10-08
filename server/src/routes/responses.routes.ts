import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/response.controller.js';
import { asyncHandler } from './asyncHandler.js';

const router = Router();
router.get('/', requireAuth, asyncHandler(controller.list));
router.get('/export.csv', requireAuth, requireAdmin, asyncHandler(controller.exportCsv));
router.get('/:id', requireAuth, asyncHandler(controller.byId));
export default router;
