import express from 'express';
import {
  getAllDevTasks,
  getDevTaskById,
  createDevTask,
  updateDevTask,
  deleteDevTask,
  updateDevTaskStatus,
  updateDevTaskTestingStatus,
  addDevTaskComment,
} from '../controllers/devTask.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all dev tasks
router.get('/', getAllDevTasks);

// Get dev task by ID
router.get('/:id', getDevTaskById);

// Create dev task
router.post('/', createDevTask);

// Update dev task
router.put('/:id', updateDevTask);

// Delete dev task
router.delete('/:id', deleteDevTask);

// Update task status
router.patch('/:id/status', updateDevTaskStatus);

// Update testing status
router.patch('/:id/testing', updateDevTaskTestingStatus);

// Add comment
router.post('/:id/comments', addDevTaskComment);

export default router;
