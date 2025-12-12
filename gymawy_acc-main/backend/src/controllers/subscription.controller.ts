import { Response } from 'express';
import { Subscription } from '../models';

export const getAll = async (req: any, res: Response) => {
  try {
    const subscriptions = await Subscription.find().populate('companyId', 'name email');
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getByCompany = async (req: any, res: Response) => {
  try {
    const subscription = await Subscription.findOne({ companyId: req.user.companyId });
    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const subscription = await Subscription.create(req.body);
    res.status(201).json(subscription);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(subscription);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    await Subscription.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subscription deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
