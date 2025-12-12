import express from 'express';
import * as controller from '../controllers/task.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.post('/:id/comments', controller.addComment);
router.delete('/:id', controller.remove);

export default router;
