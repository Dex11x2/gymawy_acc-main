import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import { getBranches, createBranch, updateBranch, deleteBranch, updateBranchIP, removeBranchIP, getCurrentIP } from '../controllers/branch.controller';

const router = Router();

router.use(protect);

router.get('/', getBranches);
router.get('/current-ip', getCurrentIP);
router.post('/', authorize('super_admin', 'general_manager', 'administrative_manager'), createBranch);
router.put('/:id', authorize('super_admin', 'general_manager', 'administrative_manager'), updateBranch);
router.post('/:id/update-ip', authorize('super_admin', 'general_manager', 'administrative_manager'), updateBranchIP);
router.post('/:id/remove-ip', authorize('super_admin', 'general_manager', 'administrative_manager'), removeBranchIP);
router.delete('/:id', authorize('super_admin', 'general_manager'), deleteBranch);

export default router;
