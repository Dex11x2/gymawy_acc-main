import express from 'express';
import * as controller from '../controllers/post.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/like', controller.toggleLike);
router.post('/:id/comments', controller.addComment);
router.post('/:id/react', controller.react);
router.post('/:id/pin', controller.togglePin);
router.post('/:id/vote', controller.votePoll);

export default router;
