import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', subscriptionController.getAll);
router.get('/company', subscriptionController.getByCompany);
router.post('/', subscriptionController.create);
router.put('/:id', subscriptionController.update);
router.delete('/:id', subscriptionController.remove);

export default router;
