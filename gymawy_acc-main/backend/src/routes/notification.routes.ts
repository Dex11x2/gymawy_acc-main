import express from 'express';
import * as controller from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id/read', controller.markAsRead);
router.put('/read-all', controller.markAllAsRead);
router.delete('/:id', controller.deleteNotification);

export default router;
