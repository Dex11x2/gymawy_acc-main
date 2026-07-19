import { Request, Response } from 'express';
import User from '../models/User';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ isActive: true })
      .select('_id name email role avatar')
      .sort({ name: 1 });
    
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const update: any = { ...req.body };

    // Normalise per-user permission override: empty array means clear override
    if ('permissions' in update) {
      if (Array.isArray(update.permissions)) {
        const cleaned = update.permissions
          .filter((p: any) => p && p.module && Array.isArray(p.actions) && p.actions.length > 0)
          .map((p: any) => ({ module: p.module, actions: p.actions }));
        if (cleaned.length === 0) {
          delete update.permissions;
          update.$unset = { ...(update.$unset || {}), permissions: '' };
        } else {
          update.permissions = cleaned;
        }
      } else {
        delete update.permissions;
        update.$unset = { ...(update.$unset || {}), permissions: '' };
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
