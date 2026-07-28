import { Router } from 'express';
import * as passwordController from '../controllers/password.controller';
import { protect as authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// استرجاع كلمة المرور (لم يكن محميًا وكان يسرّب التوكن) — مقصور على المدراء
const managers = authorize('dev', 'general_manager', 'administrative_manager');
router.post('/request-reset', authenticate, managers, passwordController.requestReset);
router.post('/reset', authenticate, managers, passwordController.resetPassword);
router.post('/change', authenticate, passwordController.changePassword);

export default router;
