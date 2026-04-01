import { Request, Response } from 'express';
import Instruction from '../models/Instruction';

export const getAll = async (req: any, res: Response) => {
  try {
    const instructions = await Instruction.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(instructions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const User = (await import('../models/User')).default;
    const currentUser = await User.findById(req.user.userId);
    
    // التحقق من الصلاحيات
    if (currentUser?.role !== 'super_admin' && 
        currentUser?.role !== 'general_manager' && 
        currentUser?.role !== 'administrative_manager') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لإضافة تعليمات' });
    }
    
    const instruction = await Instruction.create({
      ...req.body,
      createdBy: req.user.userId
    });
    
    res.status(201).json(instruction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const User = (await import('../models/User')).default;
    const currentUser = await User.findById(req.user.userId);
    
    // التحقق من الصلاحيات
    if (currentUser?.role !== 'super_admin' && 
        currentUser?.role !== 'general_manager' && 
        currentUser?.role !== 'administrative_manager') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لتعديل التعليمات' });
    }
    
    const instruction = await Instruction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!instruction) {
      return res.status(404).json({ message: 'Instruction not found' });
    }
    
    res.json(instruction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    const User = (await import('../models/User')).default;
    const currentUser = await User.findById(req.user.userId);
    
    // التحقق من الصلاحيات
    if (currentUser?.role !== 'super_admin' && 
        currentUser?.role !== 'general_manager' && 
        currentUser?.role !== 'administrative_manager') {
      return res.status(403).json({ message: 'ليس لديك صلاحية لحذف التعليمات' });
    }
    
    const instruction = await Instruction.findByIdAndDelete(req.params.id);
    
    if (!instruction) {
      return res.status(404).json({ message: 'Instruction not found' });
    }
    
    res.json({ message: 'Instruction deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
