import express from 'express';
import * as chatMessageController from '../controllers/chatMessage.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.post('/send', chatMessageController.sendMessage);
router.get('/all', chatMessageController.getAllMessages);
router.get('/:otherUserId', chatMessageController.getMessages);

export default router;
