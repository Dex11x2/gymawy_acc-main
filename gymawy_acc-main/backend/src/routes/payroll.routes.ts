import express from 'express';
import * as controller from '../controllers/payroll.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
