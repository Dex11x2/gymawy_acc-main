import { Request, Response } from 'express';
import Message from '../models/Message';
import Notification from '../models/Notification';
import User from '../models/User';

export const getAll = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    console.log(`🔍 Searching messages for user: ${userId}`);
    
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 });
    console.log(`📥 Fetched ${messages.length} messages for user ${userId}`);
    res.json(messages);
  } catch (error: any) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const { receiverId, content } = req.body;
    
    console.log('📨 Creating message:', { senderId: userId, receiverId, content });
    
    const message = await Message.create({
      senderId: userId,
      receiverId,
      content
    });
    
    console.log('✅ Message created:', message._id);
    
    // Create notification for receiver
    const sender = await User.findById(userId);
    if (sender) {
      await Notification.create({
        userId: receiverId,
        type: 'message',
        title: 'رسالة جديدة',
        message: `رسالة جديدة من ${sender.name}`,
        link: '/chat',
        senderId: userId,
        senderName: sender.name
      });
    }
    
    // Emit socket event
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`user-${receiverId}`).emit('new-message', message);
    }
    
    res.status(201).json(message);
  } catch (error: any) {
    console.error('❌ Error creating message:', error);
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const message = await Message.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() }, { new: true });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json(message);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markConversationAsRead = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const { otherUserId } = req.params;
    
    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({ message: 'Conversation marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteConversation = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const { otherUserId } = req.params;
    
    await Message.deleteMany({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    });
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
