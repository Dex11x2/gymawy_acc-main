import { Response } from 'express';
import Complaint from '../models/Complaint';
import { notifyNewComplaint, createNotification } from '../services/notification.service';

const statusLabel: Record<string, string> = {
  'pending': 'قيد الانتظار',
  'in-progress': 'قيد المعالجة',
  'resolved': 'تم الحل ✅',
  'rejected': 'مرفوضة ❌'
};

export const getAll = async (req: any, res: Response) => {
  try {
    // ✅ FIXED: Managers see ALL complaints, regular employees see only their company's complaints
    const managerRoles = ['dev', 'administrative_manager', 'general_manager'];
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

    // إشعار للمدراء بالشكوى/المقترح الجديد
    await notifyNewComplaint(complaint.title, req.user.name || 'موظف', req.user.companyId, req.app.get('io'));

    res.status(201).json(complaint);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const before = await Complaint.findById(req.params.id);
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // إشعار صاحب الشكوى عند تغيّر الحالة أو الرد
    if (complaint && before && req.body.status && req.body.status !== before.status) {
      await createNotification({
        userId: complaint.userId.toString(),
        title: '📣 تحديث على شكواك',
        message: `«${complaint.title}» — الحالة: ${statusLabel[req.body.status] || req.body.status}`,
        type: 'complaint',
        link: '/complaints'
      }, req.app.get('io'));
    }

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
