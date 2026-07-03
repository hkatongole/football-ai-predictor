import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as subscriptionController from '../controllers/subscriptionController.js';

const router = Router();

router.get('/plans', subscriptionController.getPlans);
router.post('/checkout', requireAuth, subscriptionController.checkout);
// NOTE: webhook route itself is mounted with express.raw() in app.js, ahead of express.json().
router.post('/webhook', subscriptionController.webhook);

export default router;
