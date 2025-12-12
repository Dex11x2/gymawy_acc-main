import { Request, Response } from 'express';
import AdOperation from '../models/AdOperation';

export const getAll = async (req: any, res: Response) => {
  try {
    const filter = req.user?.role === 'super_admin' ? {} : { companyId: req.user?.companyId };
    const operations = await AdOperation.find(filter).populate('createdBy').sort({ date: -1 });
    res.json(operations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const operation = await AdOperation.create({
      ...req.body,
      createdBy: req.user.id,
      companyId: req.user.companyId
    });
    res.status(201).json(operation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const operation = await AdOperation.findById(req.params.id);
    if (!operation) return res.status(404).json({ message: 'Operation not found' });
    res.json(operation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const operation = await AdOperation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!operation) return res.status(404).json({ message: 'Operation not found' });
    res.json(operation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const operation = await AdOperation.findByIdAndDelete(req.params.id);
    if (!operation) return res.status(404).json({ message: 'Operation not found' });
    res.json({ message: 'Operation deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
