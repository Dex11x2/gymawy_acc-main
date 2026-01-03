import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';
import * as controller from '../controllers/attendanceRecord.controller';

const router = Router();

router.use(protect);

router.post('/check-in', controller.checkIn);
router.post('/check-out', controller.checkOut);
router.get('/today', controller.getTodayRecord);
router.get('/today-all', authorize('super_admin', 'general_manager', 'administrative_manager'), controller.getAllTodayRecords);
router.get('/monthly-report', controller.getMonthlyReport);
router.post('/manual', authorize('super_admin', 'general_manager', 'administrative_manager'), controller.manualEntry);
router.put('/:id', authorize('super_admin', 'general_manager', 'administrative_manager'), controller.updateRecord);
router.delete('/:id', authorize('super_admin', 'general_manager', 'administrative_manager'), controller.deleteRecord);

// إدارة صور السيلفي
router.get('/selfie-stats', authorize('super_admin', 'general_manager'), controller.getSelfieStats);
router.post('/cleanup-selfies', authorize('super_admin', 'general_manager'), controller.cleanupSelfiePhotos);

export default router;
