import { Request, Response } from 'express';
import ChatMessage from '../models/ChatMessage';

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = (req as any).user.id;

    const message = await ChatMessage.create({
      senderId,
      receiverId,
      content
    });

    const populatedMessage = await ChatMessage.findById(message._id)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    res.status(201).json(populatedMessage);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { otherUserId } = req.params;

    const messages = await ChatMessage.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const messages = await ChatMessage.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
