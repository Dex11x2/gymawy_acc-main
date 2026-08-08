import express from 'express';
import * as ctrl from '../controllers/employeeOfMonth.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.get('/', ctrl.getCurrent);
router.get('/history', ctrl.getHistory);
router.post('/', ctrl.setEOM);
router.delete('/:id', ctrl.remove);

export default router;
