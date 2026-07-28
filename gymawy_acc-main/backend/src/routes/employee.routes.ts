import express from 'express';
import * as controller from '../controllers/employee.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// إدارة الموظفين والوصول لكلمات المرور مقصورة على المدراء
const managers = authorize('dev', 'general_manager', 'administrative_manager');

router.use(protect);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', managers, controller.create);
router.put('/:id', managers, controller.update);
router.delete('/:id', managers, controller.remove);
router.patch('/:id/password', managers, controller.updatePassword);
router.patch('/:id/toggle-active', managers, controller.toggleActive);
router.patch('/:id/permissions', managers, controller.updatePermissions);
router.get('/:id/plain-password', managers, controller.getPlainPassword);

export default router;
