import express from 'express';
import * as ctrl from '../controllers/financialReport.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.get('/', ctrl.getRecentSends);
router.post('/send', ctrl.sendToManagers);

export default router;
