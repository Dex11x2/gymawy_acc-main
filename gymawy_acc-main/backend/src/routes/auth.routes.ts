import express from 'express';
import User from '../models/User';
import Employee from '../models/Employee';
import { generateToken } from '../utils/jwt.util';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// One-time Super Admin seeding (secured by setup token)
router.post('/seed-super-admin', async (req, res) => {
  try {
    const setupToken = req.header('x-setup-token');
    if (!process.env.ADMIN_SETUP_TOKEN || setupToken !== process.env.ADMIN_SETUP_TOKEN) {
      return res.status(403).json({ message: 'Invalid setup token' });
    }

    const totalUsers = await User.countDocuments();
    if (totalUsers > 0) {
      return res.status(400).json({ message: 'Super admin seeding is allowed only on a fresh install' });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'email, password and name are required' });
    }

    const user = await User.create({ email, password, name, role: 'super_admin' });
    const token = generateToken((user._id as any).toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Register (protected - only from inside the app)
router.post('/register', protect, async (req: any, res) => {
  try {
    const { email, password, name } = req.body;
    let { role, companyId } = req.body as { role: string; companyId?: string };

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'email, password and name are required' });
    }

    // Only allow super_admin to create admins/employees. Admin can only create employees in their company.
    if (req.user.role === 'super_admin') {
      if (!['admin', 'employee'].includes(role)) {
        return res.status(400).json({ message: 'role must be admin or employee' });
      }
      // if creating admin/employee and no companyId provided for admin, keep as provided or null
    } else if (req.user.role === 'admin') {
      // Admins can only create employees and inside their company
      role = 'employee';
      companyId = req.user.companyId;
    } else {
      return res.status(403).json({ message: 'Not authorized to create users' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ email, password, name, role, companyId });
    const token = generateToken((user._id as any).toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }
    
    const token = generateToken((user._id as any).toString());
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        permissions: user.permissions
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', protect, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', protect, async (req: any, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.put('/change-password', protect, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create account for existing employee
router.post('/create-employee-account', protect, async (req: any, res) => {
  try {
    const { employeeId, email, name } = req.body;
    
    if (!employeeId || !email || !name) {
      return res.status(400).json({ message: 'employeeId, email and name are required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const defaultPassword = 'Gymmawy@123';
    const user = await User.create({
      email,
      password: defaultPassword,
      plainPassword: defaultPassword,
      name,
      role: 'employee',
      companyId: employee.companyId,
      departmentId: employee.departmentId,
      permissions: []
    });

    employee.userId = user._id as any;
    await employee.save();

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      },
      defaultPassword
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
