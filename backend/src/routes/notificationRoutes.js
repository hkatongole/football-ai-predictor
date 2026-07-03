import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

router.get('/vapid-public-key', notificationController.getVapidPublicKey);
router.post('/subscribe', optionalAuth, notificationController.subscribe); // works for logged-out users too (device-level)
router.post('/unsubscribe', notificationController.unsubscribe);
router.get('/', requireAuth, notificationController.myNotifications);
router.patch('/:id/read', requireAuth, notificationController.markRead);

export default router;
