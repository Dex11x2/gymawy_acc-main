import express from 'express';
import * as controller from '../controllers/content.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

// Content Accounts
router.get('/accounts', controller.getAccounts);
router.post('/accounts', controller.createAccount);
router.put('/accounts/:id', controller.updateAccount);
router.delete('/accounts/:id', controller.deleteAccount);

// Content Items
router.get('/items', controller.getItems);
router.post('/items', controller.createItem);
router.post('/items/bulk', controller.bulkCreateItems);
router.put('/items/:id', controller.updateItem);
router.delete('/items/:id', controller.deleteItem);

export default router;
