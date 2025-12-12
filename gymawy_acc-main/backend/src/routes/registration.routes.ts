import express from 'express';
import * as controller from '../controllers/registration.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/', controller.create); // Public - no auth needed
router.use(protect); // Protect remaining routes
router.get('/', controller.getAll);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
