import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import * as controller from '../controllers/rolePermission.controller';

const router = Router();

router.use(protect);

router.get('/roles', controller.getAllRoles);
router.get('/pages', controller.getAllPages);
router.get('/role/:roleId', controller.getRolePermissions);
router.get('/my-permissions', controller.getUserPermissions);
router.put('/update', authorize('dev', 'general_manager', 'administrative_manager'), controller.updateRolePermissions);

// Pages catalog management — super admin only
router.post('/pages', authorize('dev'), controller.createPage);
router.put('/pages/:id', authorize('dev'), controller.updatePage);
router.delete('/pages/:id', authorize('dev'), controller.deletePage);

export default router;
