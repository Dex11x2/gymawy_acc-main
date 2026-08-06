import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Occasion from '../models/Occasion';
import User from '../models/User';

export const getOccasions = async (req: AuthRequest, res: Response) => {
  try {
    // المناسبات مشتركة للفريق كله (عشان الباقي يعرفوا بأعياد الميلاد والمناسبات)
    const occasions = await Occasion.find({})
      .populate('createdBy', 'name avatar')
      .sort({ date: 1 });
    res.json({ success: true, data: occasions });
  } catch (error: any) {
    console.error('Error getting occasions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTodayOccasions = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId || req.user?._id;
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // المناسبات المشتركة: اليوم بالضبط أو المتكررة بنفس الشهر/اليوم
    const allOccasions = await Occasion.find({}).populate('createdBy', 'name avatar');
    const occasions = allOccasions.filter((oc: any) => {
      const d = new Date(oc.date);
      return oc.isRecurring
        ? (d.getMonth() === today.getMonth() && d.getDate() === today.getDate())
        : (d >= todayStart && d <= todayEnd);
    });

    // أعياد ميلاد كل الموظفين (من تاريخ الميلاد)
    const employees = await User.find({ isActive: true });
    const birthdays = employees.filter(emp => {
      if (!emp.birthDate) return false;
      const birthDate = new Date(emp.birthDate);
      return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
    }).map(emp => ({
      title: `عيد ميلاد ${emp.name}`,
      type: 'birthday',
      date: emp.birthDate,
      description: `🎂 عيد ميلاد سعيد ${emp.name}!`
    }));

    res.json({ success: true, data: [...occasions, ...birthdays] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOccasion = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId || req.user?._id;
    const createdBy = req.user?._id || req.user?.userId;

    const occasion = await Occasion.create({
      ...req.body,
      companyId,
      createdBy
    });

    res.status(201).json({ success: true, data: occasion });
  } catch (error: any) {
    console.error('Error creating occasion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];
const canManageOccasion = (req: AuthRequest, oc: any): boolean => {
  const myId = (req.user?._id || req.user?.userId)?.toString();
  const ownerId = (oc.createdBy?._id || oc.createdBy)?.toString();
  return MANAGER_ROLES.includes(req.user?.role as string) || ownerId === myId;
};

export const updateOccasion = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await Occasion.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'المناسبة غير موجودة' });
    if (!canManageOccasion(req, existing)) return res.status(403).json({ success: false, message: 'تقدر تعدّل مناسباتك أنت فقط' });

    const { companyId, createdBy, ...allowed } = req.body; // منع تغيير المالك
    const occasion = await Occasion.findByIdAndUpdate(req.params.id, allowed, { new: true });
    res.json({ success: true, data: occasion });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOccasion = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await Occasion.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'المناسبة غير موجودة' });
    if (!canManageOccasion(req, existing)) return res.status(403).json({ success: false, message: 'تقدر تحذف مناسباتك أنت فقط' });

    await Occasion.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
