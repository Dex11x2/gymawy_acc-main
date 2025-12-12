import { Request, Response } from 'express';
import User from '../models/User';
import { generateToken } from '../utils/jwt.util';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, companyId, departmentId } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    
    const user = await User.create({ email, password, name, role, companyId, departmentId });
    const token = generateToken(String(user._id));
    
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        companyId: user.companyId,
        departmentId: user.departmentId 
      } 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('\n=== LOGIN ATTEMPT ===');
    console.log('Email/Phone:', email);
    console.log('Password provided:', password);
    
    // البحث بالبريد الإلكتروني أو رقم الهاتف (case-insensitive)
    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        { phone: email }
      ]
    });
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('✅ User found:', user.name);
    console.log('User ID:', user._id);
    console.log('User role:', user.role);
    console.log('Stored hashed password:', user.password?.substring(0, 20) + '...');
    console.log('Plain password in DB:', user.plainPassword);
    
    // Try plain password first if available
    let isPasswordValid = false;
    if (user.plainPassword) {
      isPasswordValid = password === user.plainPassword;
      console.log('Plain password comparison:', isPasswordValid ? '✅ MATCH' : '❌ NO MATCH');
      console.log('Expected:', user.plainPassword, '| Got:', password);
    }
    
    // If plain password fails or not available, try hashed
    if (!isPasswordValid) {
      isPasswordValid = await user.comparePassword(password);
      console.log('Hashed password comparison:', isPasswordValid ? '✅ MATCH' : '❌ NO MATCH');
    }
    
    if (!isPasswordValid) {
      console.log('❌ Password validation FAILED');
      console.log('===================\n');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = generateToken(String(user._id));
    const userData = { 
      id: user._id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      companyId: user.companyId,
      departmentId: user.departmentId,
      phone: user.phone,
      isActive: user.isActive,
      permissions: user.permissions || []
    };
    console.log('✅ Login SUCCESSFUL');
    console.log('User data:', userData);
    console.log('User permissions:', user.permissions);
    console.log('===================\n');
    res.json({ token, user: userData });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').populate('departmentId');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      departmentId: user.departmentId,
      phone: user.phone,
      isActive: user.isActive,
      permissions: user.permissions || []
    };
    
    res.json(userData);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
