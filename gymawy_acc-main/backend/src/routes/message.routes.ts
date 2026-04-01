import express from 'express';
import * as controller from '../controllers/message.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id/read', controller.markAsRead);
router.put('/conversation/:otherUserId/read', controller.markConversationAsRead);
router.delete('/conversation/:otherUserId', controller.deleteConversation);

export default router;
