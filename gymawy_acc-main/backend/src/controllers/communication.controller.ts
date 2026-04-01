import { Response } from 'express';
import { Communication } from '../models';

export const getAll = async (req: any, res: Response) => {
  try {
    const communications = await Communication.find({ companyId: req.user.companyId })
      .populate('senderId', 'name email')
      .populate('recipientIds', 'name email')
      .sort({ createdAt: -1 });
    res.json(communications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const communication = await Communication.create({
      ...req.body,
      companyId: req.user.companyId,
      senderId: req.user.id
    });
    res.status(201).json(communication);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const communication = await Communication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(communication);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    await Communication.findByIdAndDelete(req.params.id);
    res.json({ message: 'Communication deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
