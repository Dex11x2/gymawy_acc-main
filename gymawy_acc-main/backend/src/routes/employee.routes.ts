import express from 'express';
import * as controller from '../controllers/employee.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.patch('/:id/password', controller.updatePassword);
router.patch('/:id/toggle-active', controller.toggleActive);
router.patch('/:id/permissions', controller.updatePermissions);
router.get('/:id/plain-password', controller.getPlainPassword);

export default router;
