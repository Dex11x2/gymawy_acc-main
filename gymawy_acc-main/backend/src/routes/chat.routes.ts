import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', chatController.getAll);
router.post('/', chatController.create);
router.put('/:id', chatController.update);
router.delete('/:id', chatController.remove);

export default router;
