import express from 'express';
import {
  getSalaries,
  getSalaryById,
  generateMonthlySalaries,
  createOrUpdateSalary,
  updateSalary,
  togglePaymentStatus,
  deleteSalary,
  getSalaryStatistics
} from '../controllers/salary.controller';
import { protect } from '../middleware/auth.middleware';
import { validateObjectId } from '../middleware/validation.middleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all salaries (with filters)
router.get('/', getSalaries);

// Get salary statistics
router.get('/statistics', getSalaryStatistics);

// Generate monthly salaries for all employees
router.post('/generate', generateMonthlySalaries);

// Get salary by ID
router.get('/:id', validateObjectId(), getSalaryById);

// Create or update salary
router.post('/', createOrUpdateSalary);

// Update salary
router.put('/:id', validateObjectId(), updateSalary);

// Toggle payment status
router.patch('/:id/toggle-payment', validateObjectId(), togglePaymentStatus);

// Delete salary
router.delete('/:id', validateObjectId(), deleteSalary);

export default router;
