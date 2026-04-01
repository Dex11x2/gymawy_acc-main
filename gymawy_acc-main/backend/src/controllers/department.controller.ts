import { Request, Response } from 'express';
import Department from '../models/Department';

export const getAll = async (req: any, res: Response) => {
  try {
    const departments = await Department.find({});
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json(department);
  } catch (error: any) {
    console.error('Department creation error:', error.message);
    res.status(500).json({ message: error.message, error: error.toString() });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
