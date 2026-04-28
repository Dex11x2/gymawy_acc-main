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

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } },
        { phone: email }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
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
    res.json({ token, user: userData });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
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
