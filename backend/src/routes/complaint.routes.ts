import express from 'express';
import * as complaintController from '../controllers/complaint.controller';
import { protect as authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticate);

router.get('/', complaintController.getAll);
router.post('/', complaintController.create);
router.put('/:id', complaintController.update);
router.delete('/:id', complaintController.remove);

export default router;
