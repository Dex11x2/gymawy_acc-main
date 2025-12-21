import express from 'express';
import * as registrationController from '../controllers/registration.controller';
import authRoutes from './auth.routes';
import companyRoutes from './company.routes';
import employeeRoutes from './employee.routes';
import departmentRoutes from './department.routes';
import payrollRoutes from './payroll.routes';
import revenueRoutes from './revenue.routes';
import expenseRoutes from './expense.routes';
import taskRoutes from './task.routes';
import messageRoutes from './message.routes';
import postRoutes from './post.routes';
import notificationRoutes from './notification.routes';
import reviewRoutes from './review.routes';
import custodyRoutes from './custody.routes';
import attendanceRoutes from './attendance.routes';
import complaintRoutes from './complaint.routes';
import advanceRoutes from './advance.routes';
import registrationRoutes from './registration.routes';
import userRoutes from './user.routes';
import * as userController from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import passwordRoutes from './password.routes';
import chatRoutes from './chat.routes';
import communicationRoutes from './communication.routes';
import subscriptionRoutes from './subscription.routes';
import instructionRoutes from './instruction.routes';
import leaveRequestRoutes from './leaveRequest.routes';
import dailyAttendanceRoutes from './dailyAttendance.routes';
import chatMessageRoutes from './chatMessage.routes';
import attendanceSystemRoutes from './attendanceSystem.routes';
import branchRoutes from './branch.routes';
import devTaskRoutes from './devTask.routes';
import salaryRoutes from './salary.routes';

const router = express.Router();

router.use('/companies', companyRoutes);
router.use('/employees', employeeRoutes);
router.use('/departments', departmentRoutes);
router.use('/payroll', payrollRoutes);
router.use('/revenues', revenueRoutes);
router.use('/expenses', expenseRoutes);
router.use('/tasks', taskRoutes);
router.use('/messages', messageRoutes);
router.use('/posts', postRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/custody', custodyRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/attendance-system', attendanceSystemRoutes);
router.use('/daily-attendance', dailyAttendanceRoutes);
router.use('/complaints', complaintRoutes);
router.use('/advances', advanceRoutes);
router.use('/registration-requests', registrationRoutes);
router.use('/users', userRoutes);
router.get('/all-users', protect, userController.getAllUsers);
router.use('/password', passwordRoutes);
router.use('/chats', chatRoutes);
router.use('/communications', communicationRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/instructions', instructionRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/chat-messages', chatMessageRoutes);
router.use('/branches', branchRoutes);

import attendanceRecordRoutes from './attendanceRecord.routes';
router.use('/attendance-records', attendanceRecordRoutes);

import rolePermissionRoutes from './rolePermission.routes';
router.use('/permissions', rolePermissionRoutes);

import occasionRoutes from './occasion.routes';
router.use('/occasions', occasionRoutes);

import reportSettingsRoutes from './reportSettings.routes';
router.use('/report-settings', reportSettingsRoutes);

router.use('/dev-tasks', devTaskRoutes);
router.use('/salaries', salaryRoutes);

import adsFundingRoutes from './adsFunding.routes';
router.use('/ads-funding', adsFundingRoutes);

import mediaPriceRoutes from './mediaPrice.routes';
router.use('/media-prices', mediaPriceRoutes);

// Public registration endpoint
router.post('/register', registrationController.create);

export default router;
