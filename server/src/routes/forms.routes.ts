import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/form.controller.js';
import { asyncHandler } from './asyncHandler.js';

const router = Router();
router.post('/', requireAuth, requireAdmin, asyncHandler(controller.createForm));
router.get('/', requireAuth, asyncHandler(controller.listForms));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(controller.updateForm));
router.post('/:id/assign', requireAuth, requireAdmin, asyncHandler(controller.addAssignments));
router.put('/:id/assignments', requireAuth, requireAdmin, asyncHandler(controller.updateAssignments));
router.get('/assigned', requireAuth, asyncHandler(controller.assignedForms));
export default router;
