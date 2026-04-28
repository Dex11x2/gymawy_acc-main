import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database';
import { startDailyReportJob } from './jobs/dailyReport.job';
import { startSelfieCleanupJob } from './jobs/selfieCleanup.job';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

// Initialize Express app
const app: Application = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// Allowed origins - Allow all local IPs for development
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  /^http:\/\/192\.168\.\d+\.\d+:5173$/,
  /^http:\/\/172\.\d+\.\d+\.\d+:5173$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
  'http://72.61.185.175',
  'http://gymmawy.net',
  'http://www.gymmawy.net',
  'https://gymmawy.net',
  'https://www.gymmawy.net'
];

// Initialize Socket.io
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      return allowed.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev')); // Logging

// Rate limiting - general API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 min per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 min per IP
  message: 'Too many login attempts, please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: '✅ Gemawi Backend API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    message: '🚀 Welcome to Gemawi Accounting System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      companies: '/api/companies',
      employees: '/api/employees',
      departments: '/api/departments',
      payroll: '/api/payroll',
      revenues: '/api/revenues',
      expenses: '/api/expenses',
      tasks: '/api/tasks',
      messages: '/api/messages',
      posts: '/api/posts',
      notifications: '/api/notifications',
      reviews: '/api/reviews',
      custody: '/api/custody',
      attendance: '/api/attendance'
    },
    documentation: 'See README.md for full API documentation'
  });
});

// Import routes
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/index';
import { listUsers, resetAllPasswords, resetUserPassword, createUserForEmployee } from './controllers/debug.controller';

// Use routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', apiRoutes);

// Debug endpoints - only available in development
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/users', listUsers);
  app.get('/api/debug/reset-all-passwords', resetAllPasswords);
  app.post('/api/debug/reset-all-passwords', resetAllPasswords);
  app.post('/api/debug/reset-password/:email', resetUserPassword);
  app.get('/api/debug/create-users-for-employees', createUserForEmployee);
  app.post('/api/debug/create-users-for-employees', createUserForEmployee);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Join user to their room
  socket.on('join', ({ userId }) => {
    socket.join(`user-${userId}`);
    console.log(`✅ User ${userId} connected to Gemawi Pro`);
  });

  // Handle sending messages
  socket.on('send-message', ({ receiverId, content, senderId, senderName }) => {
    console.log(`📨 Message from ${senderId} (${senderName}) to ${receiverId}: ${content}`);
    
    // Send to specific user room only (no duplicate)
    io.to(`user-${receiverId}`).emit('new-message', {
      senderId,
      senderName,
      content,
      timestamp: new Date()
    });
    
    console.log(`✅ Message sent to user-${receiverId}`);
  });

  // Handle typing indicator
  socket.on('typing', ({ receiverId, senderId }) => {
    io.to(`user-${receiverId}`).emit('user-typing', { userId: senderId });
  });

  // Handle task comment
  socket.on('task-comment', ({ taskId, comment, notifyUserId }) => {
    io.to(`user-${notifyUserId}`).emit('new-task-comment', {
      taskId,
      comment
    });
  });

  // Handle notification
  socket.on('new-notification', ({ userId, notification }) => {
    io.to(`user-${userId}`).emit('notification', notification);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Make io available to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    await ensureSuperAdminExists();
    startDailyReportJob();
    startSelfieCleanupJob(); // تنظيف صور السيلفي شهرياً

    httpServer.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ========================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

async function ensureSuperAdminExists() {
  try {
    const User = (await import('./models/User')).default;

    const existing = await User.findOne({ role: 'super_admin' });
    if (existing) return;

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const phone = process.env.SUPER_ADMIN_PHONE;

    if (!email || !password) {
      console.warn('⚠️ No super admin found. Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars to bootstrap one.');
      return;
    }

    await new User({ name, email, phone, password, role: 'super_admin', isActive: true }).save();
    console.log(`✅ Super admin bootstrapped (${email}). Change the password immediately.`);
  } catch (error: any) {
    console.error('❌ Failed to ensure super admin:', error.message);
  }
}

startServer();

export { io };
