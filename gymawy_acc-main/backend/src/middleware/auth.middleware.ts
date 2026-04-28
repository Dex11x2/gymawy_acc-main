import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyToken } from '../utils/jwt.util';
import User, { IUser } from '../models/User';

export interface AuthenticatedUser {
  userId: mongoose.Types.ObjectId;
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  role: IUser['role'];
  companyId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  isActive: boolean;
  permissions?: IUser['permissions'];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = verifyToken(token) as { id: string };
    const user = await User.findById(decoded.id).select('-password -plainPassword');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = {
      ...(user.toObject() as IUser),
      userId: user._id as mongoose.Types.ObjectId
    } as AuthenticatedUser;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
};
