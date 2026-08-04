import express from 'express';
import * as controller from '../controllers/deviceToken.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);
router.post('/', controller.register);
router.delete('/', controller.remove);

export default router;
