import express from 'express';
import * as controller from '../controllers/videoReview.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.get('/', controller.getReviews);
router.get('/mentionable', controller.getMentionable);
router.post('/', controller.createReview);
router.post('/:id/steps', controller.addStep);
router.post('/:id/seen', controller.markSeen);
router.post('/:id/approve', controller.approve);
router.delete('/:id', controller.deleteReview);

export default router;
