import { Response } from 'express';
import Attendance from '../models/Attendance';

export const getAll = async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;

    // ✅ FIXED: Managers see ALL attendance, regular employees see only their company's attendance
    const managerRoles = ['super_admin', 'administrative_manager', 'general_manager'];
    const query: any = managerRoles.includes(req.user?.role)
      ? {}  // Managers see all attendance
      : { companyId: req.user?.companyId }; // Regular employees see only their company

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query);
    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const attendance = await Attendance.create(req.body);
    res.status(201).json(attendance);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(attendance);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Attendance deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
