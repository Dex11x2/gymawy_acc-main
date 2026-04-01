import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import * as controller from '../controllers/rolePermission.controller';

const router = Router();

router.use(protect);

router.get('/roles', controller.getAllRoles);
router.get('/pages', controller.getAllPages);
router.get('/role/:roleId', controller.getRolePermissions);
router.get('/my-permissions', controller.getUserPermissions);
router.put('/update', authorize('super_admin', 'general_manager'), controller.updateRolePermissions);

export default router;
