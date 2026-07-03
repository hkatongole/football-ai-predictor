import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Stricter limiter for auth endpoints to slow brute-force attempts
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/me', requireAuth, authController.me);

export default router;
