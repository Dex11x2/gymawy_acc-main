import { Response } from 'express';
import { PasswordReset } from '../models';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const requestReset = async (req: any, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await PasswordReset.create({ userId: user._id, token, expiresAt });
    
    res.json({ message: 'Password reset token created', token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req: any, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    const resetRequest = await PasswordReset.findOne({ token, isUsed: false });
    
    if (!resetRequest || resetRequest.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(resetRequest.userId, { password: hashedPassword });
    
    resetRequest.isUsed = true;
    await resetRequest.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
