import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import * as predictionController from '../controllers/predictionController.js';

const router = Router();

router.get('/today', predictionController.getTodayPredictions);
router.get('/:matchId', optionalAuth, predictionController.getMatchPredictions);

export default router;
