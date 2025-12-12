import { Router } from 'express';
import * as passwordController from '../controllers/password.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/request-reset', passwordController.requestReset);
router.post('/reset', passwordController.resetPassword);
router.post('/change', authenticate, passwordController.changePassword);

export default router;
