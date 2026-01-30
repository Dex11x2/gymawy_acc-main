import express from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import * as controller from '../controllers/contentType.controller';

const router = express.Router();

// جميع المسارات محمية بـ protect
router.use(protect);

// فقط المديرون يمكنهم إدارة أنواع المحتوى
const managerRoles = ['super_admin', 'general_manager', 'administrative_manager'];

// جلب جميع أنواع المحتوى - متاح لجميع المستخدمين المسجلين
router.get('/', controller.getAll);

// إنشاء نوع محتوى جديد - المديرون فقط
router.post('/', authorize(...managerRoles), controller.create);

// تحديث نوع محتوى - المديرون فقط
router.put('/:id', authorize(...managerRoles), controller.update);

// حذف ناعم لنوع المحتوى - المديرون فقط
router.delete('/:id', authorize(...managerRoles), controller.softDelete);

// استعادة نوع محتوى محذوف - المديرون فقط
router.post('/:id/restore', authorize(...managerRoles), controller.restore);

export default router;
