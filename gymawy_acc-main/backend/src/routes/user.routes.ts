import express from 'express';
import * as controller from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', protect, controller.getAllUsers);
router.get('/:id', protect, controller.getUserById);
router.put('/:id', protect, controller.updateUser);

export default router;
