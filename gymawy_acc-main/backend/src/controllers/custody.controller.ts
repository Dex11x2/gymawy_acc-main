import { Request, Response } from 'express';
import Custody from '../models/Custody';

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
    const custody = await Custody.findByIdAndDelete(req.params.id);
    if (!custody) return res.status(404).json({ message: 'Custody not found' });
    res.json({ message: 'Custody deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
