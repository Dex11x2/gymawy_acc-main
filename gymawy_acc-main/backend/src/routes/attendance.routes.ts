import express from 'express';
import * as attendanceController from '../controllers/attendance.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.get('/', attendanceController.getAll);
router.post('/', attendanceController.create);
router.put('/:id', attendanceController.update);
router.delete('/:id', attendanceController.remove);

export default router;
