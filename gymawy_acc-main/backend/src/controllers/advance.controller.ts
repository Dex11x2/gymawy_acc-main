import { Request, Response } from 'express';
import Advance from '../models/Advance';

export const getAll = async (req: any, res: Response) => {
  try {
    // ✅ FIXED: Managers see ALL advances, regular employees see only their company's advances
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const filter = managerRoles.includes(req.user?.role)
      ? {}  // Managers see all advances
      : { companyId: req.user?.companyId }; // Regular employees see only their company

    const advances = await Advance.find(filter).populate('employeeId approvedBy');
    res.json(advances);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const advance = await Advance.create(req.body);
    res.status(201).json(advance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const advance = await Advance.findById(req.params.id).populate('employeeId approvedBy');
    if (!advance) return res.status(404).json({ message: 'Advance not found' });
    res.json(advance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const advance = await Advance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!advance) return res.status(404).json({ message: 'Advance not found' });
    res.json(advance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const advance = await Advance.findByIdAndDelete(req.params.id);
    if (!advance) return res.status(404).json({ message: 'Advance not found' });
    res.json({ message: 'Advance deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approve = async (req: any, res: Response) => {
  try {
    const advance = await Advance.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user.id },
      { new: true }
    );
    if (!advance) return res.status(404).json({ message: 'Advance not found' });
    res.json(advance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
