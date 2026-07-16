import express from 'express';
import * as controller from '../controllers/contentCalendar.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.use(protect);

// Months
router.get('/months', controller.getMonths);
router.post('/months', controller.createMonth);
router.patch('/months/:id', controller.updateMonth);
router.delete('/months/:id', controller.deleteMonth);

// Entries (rows)
router.get('/months/:monthId/entries', controller.getEntries);
router.post('/months/:monthId/entries', controller.createEntry);
router.patch('/entries/:id', controller.updateEntry);
router.delete('/entries/:id', controller.deleteEntry);
router.post('/entries/:id/comments', controller.addComment);

export default router;
