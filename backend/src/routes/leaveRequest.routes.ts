import express from 'express';
import * as leaveRequestController from '../controllers/leaveRequest.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.get('/mine', leaveRequestController.getMine);            // طلبات الموظف الحالي
router.get('/my-balance', leaveRequestController.getMyBalance); // رصيد الموظف الحالي
router.get('/', leaveRequestController.getAll);
router.post('/', leaveRequestController.create);
router.patch('/:id/status', leaveRequestController.updateStatus);
router.patch('/balance', leaveRequestController.updateLeaveBalance);
router.get('/balance/:employeeId', leaveRequestController.getEmployeeBalance);
router.delete('/:id', leaveRequestController.remove);

export default router;
