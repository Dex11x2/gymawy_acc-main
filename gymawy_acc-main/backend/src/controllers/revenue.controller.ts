import { Request, Response } from 'express';
import Revenue from '../models/Revenue';

export const getAll = async (req: any, res: Response) => {
  try {
    const filter = req.user?.role === 'super_admin' ? {} : { companyId: req.user?.companyId };
    const revenues = await Revenue.find(filter).populate('departmentId createdBy');
    res.json(revenues);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const revenue = await Revenue.create({ ...req.body, createdBy: req.user.id, companyId: req.user.companyId });
    res.status(201).json(revenue);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const revenue = await Revenue.findById(req.params.id);
    if (!revenue) return res.status(404).json({ message: 'Revenue not found' });
    res.json(revenue);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const revenue = await Revenue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!revenue) return res.status(404).json({ message: 'Revenue not found' });
    res.json(revenue);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const revenue = await Revenue.findByIdAndDelete(req.params.id);
    if (!revenue) return res.status(404).json({ message: 'Revenue not found' });
    res.json({ message: 'Revenue deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
