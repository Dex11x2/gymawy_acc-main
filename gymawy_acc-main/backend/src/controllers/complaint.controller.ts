import { Response } from 'express';
import Complaint from '../models/Complaint';

export const getAll = async (req: any, res: Response) => {
  try {
    // ✅ FIXED: Managers see ALL complaints, regular employees see only their company's complaints
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const filter = managerRoles.includes(req.user?.role)
      ? {}  // Managers see all complaints
      : { companyId: req.user?.companyId }; // Regular employees see only their company

    const complaints = await Complaint.find(filter);
    res.json(complaints);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const complaint = await Complaint.create({
      ...req.body,
      userId: req.user.id,
      userName: req.user.name
    });
    res.status(201).json(complaint);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(complaint);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
