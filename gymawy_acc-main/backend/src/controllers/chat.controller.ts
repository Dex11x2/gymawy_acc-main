import { Response } from 'express';
import { Chat } from '../models';

export const getAll = async (req: any, res: Response) => {
  try {
    const chats = await Chat.find({ 
      companyId: req.user.companyId,
      participants: req.user.id 
    }).populate('participants', 'name email').sort({ lastMessageAt: -1 });
    res.json(chats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const chat = await Chat.create({
      ...req.body,
      companyId: req.user.companyId,
      participants: [req.user.id, ...req.body.participants]
    });
    res.status(201).json(chat);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const chat = await Chat.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(chat);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ message: 'Chat deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
