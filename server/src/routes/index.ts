import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import formRoutes from './forms.routes.js';
import syncRoutes from './sync.routes.js';
import responseRoutes from './responses.routes.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/forms', formRoutes);
router.use('/sync', syncRoutes);
router.use('/responses', responseRoutes);
router.use((_req, res) => res.status(404).json({ error: { message: 'Not found' } }));
export default router;
