import express from 'express';
import { getOccasions, getTodayOccasions, createOccasion, updateOccasion, deleteOccasion } from '../controllers/occasion.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

router.get('/', getOccasions);
router.get('/today', getTodayOccasions);
router.post('/', createOccasion);
router.put('/:id', updateOccasion);
router.delete('/:id', deleteOccasion);

export default router;
