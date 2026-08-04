import { Request, Response } from 'express';
import Notification from '../models/Notification';

export const create = async (req: any, res: Response) => {
  try {
    const notification = await Notification.create(req.body);
    
    // Emit socket event
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`user-${req.body.userId}`).emit('notification', notification);
    }
    
    res.status(201).json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAll = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() }, { new: true });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
