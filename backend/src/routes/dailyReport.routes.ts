import express from 'express';
import * as dailyReportController from '../controllers/dailyReport.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.get('/', dailyReportController.getAll);
router.post('/', dailyReportController.create);
router.delete('/:id', dailyReportController.remove);

export default router;
