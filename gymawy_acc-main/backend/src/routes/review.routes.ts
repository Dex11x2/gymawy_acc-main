import express from 'express';
import * as reviewController from '../controllers/review.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.get('/', reviewController.getAll);
router.post('/', reviewController.create);
router.put('/:id', reviewController.update);
router.delete('/:id', reviewController.remove);
router.post('/:id/comments', reviewController.addComment);

export default router;
