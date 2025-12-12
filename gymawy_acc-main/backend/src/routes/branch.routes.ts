import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branch.controller';

const router = Router();

router.use(protect);

router.get('/', getBranches);
router.post('/', authorize('super_admin', 'general_manager', 'administrative_manager'), createBranch);
router.put('/:id', authorize('super_admin', 'general_manager', 'administrative_manager'), updateBranch);
router.delete('/:id', authorize('super_admin', 'general_manager'), deleteBranch);

export default router;
