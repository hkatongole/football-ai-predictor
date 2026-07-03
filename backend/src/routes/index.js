import { Router } from 'express';
import authRoutes from './authRoutes.js';
import matchRoutes from './matchRoutes.js';
import predictionRoutes from './predictionRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/matches', matchRoutes);
router.use('/predictions', predictionRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/subscriptions', subscriptionRoutes);

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

export default router;
