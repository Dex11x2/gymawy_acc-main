import { Router } from 'express';
import * as communicationController from '../controllers/communication.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', communicationController.getAll);
router.post('/', communicationController.create);
router.put('/:id', communicationController.update);
router.delete('/:id', communicationController.remove);

export default router;
