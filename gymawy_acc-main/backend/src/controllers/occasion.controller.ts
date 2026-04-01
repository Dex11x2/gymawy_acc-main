import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Occasion from '../models/Occasion';
import User from '../models/User';

export const getOccasions = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId || req.user?._id;
    console.log('🔍 Getting occasions for companyId:', companyId);
    console.log('👤 User info:', { id: req.user?._id, companyId: req.user?.companyId, role: req.user?.role });
    
    const occasions = await Occasion.find({ companyId })
      .populate('createdBy', 'name')
      .sort({ date: 1 });
    
    console.log('📋 Found occasions:', occasions.length);
    
    // جلب جميع المناسبات بدون فلتر للتأكد
    const allOccasions = await Occasion.find({});
    console.log('📋 Total occasions in DB:', allOccasions.length);
    if (allOccasions.length > 0) {
      console.log('📋 Sample occasion companyId:', allOccasions[0].companyId);
    }
    
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

    const occasions = await Occasion.find({
      companyId,
      date: { $gte: todayStart, $lte: todayEnd }
    }).populate('createdBy', 'name');

    // Get birthdays
    const employees = await User.find({ companyId });
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
    
    console.log('Creating occasion:', { ...req.body, companyId, createdBy });
    
    const occasion = await Occasion.create({
      ...req.body,
      companyId,
      createdBy
    });
    
    console.log('Occasion created:', occasion);
    res.status(201).json({ success: true, data: occasion });
  } catch (error: any) {
    console.error('Error creating occasion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOccasion = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId || req.user?._id;
    const occasion = await Occasion.findOneAndUpdate(
      { _id: req.params.id, companyId },
      req.body,
      { new: true }
    );
    if (!occasion) return res.status(404).json({ success: false, message: 'المناسبة غير موجودة' });
    res.json({ success: true, data: occasion });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOccasion = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId || req.user?._id;
    const occasion = await Occasion.findOneAndDelete({
      _id: req.params.id,
      companyId
    });
    if (!occasion) return res.status(404).json({ success: false, message: 'المناسبة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
