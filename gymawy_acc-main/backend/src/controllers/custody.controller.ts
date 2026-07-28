import { Request, Response } from 'express';
import Custody from '../models/Custody';
import { createNotification, resolveToUserId } from '../services/notification.service';

export const getAll = async (req: any, res: Response) => {
  try {
    const custodies = await Custody.find({}).populate('employeeId');
    res.json(custodies);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const custody = await Custody.create(req.body);

    // إشعار الموظف بإسناد عهدة جديدة
    const targetUserId = await resolveToUserId(custody.employeeId);
    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        title: '📦 عهدة جديدة',
        message: `تم إسناد عهدة إليك: ${custody.itemName}`,
        type: 'general',
        link: '/custody'
      }, req.app.get('io'));
    }

    res.status(201).json(custody);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const custody = await Custody.findById(req.params.id);
    if (!custody) return res.status(404).json({ message: 'Custody not found' });
    res.json(custody);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const custody = await Custody.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!custody) return res.status(404).json({ message: 'Custody not found' });
    res.json(custody);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const custody = await Custody.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!custody) return res.status(404).json({ message: 'Custody not found' });
    res.json({ message: 'Custody deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
