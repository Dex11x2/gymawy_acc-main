import express from 'express';
import { protect } from '../middleware/auth.middleware';
import MediaAchievement from '../models/MediaAchievement';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';

const router = express.Router();

// جلب كل الإنجازات (للشهر/السنة المحددة)
router.get('/', protect, async (req: any, res) => {
  try {
    const { month, year } = req.query;
    const companyId = req.user?.companyId;

    const query: any = { companyId };
    if (month) query.month = parseInt(month as string);
    if (year) query.year = parseInt(year as string);

    const achievements = await MediaAchievement.find(query)
      .populate('employeeId', 'name position')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(achievements);
  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ message: error.message });
  }
});

// جلب إنجازات موظف معين
router.get('/employee/:employeeId', protect, async (req: any, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const query: any = { employeeId };
    if (month) query.month = parseInt(month as string);
    if (year) query.year = parseInt(year as string);

    const achievements = await MediaAchievement.find(query)
      .populate('employeeId', 'name position')
      .sort({ year: -1, month: -1 });

    res.json(achievements);
  } catch (error: any) {
    console.error('Error fetching employee achievements:', error);
    res.status(500).json({ message: error.message });
  }
});

// جلب إنجاز واحد بالـ ID
router.get('/:id', protect, async (req: any, res) => {
  try {
    const achievement = await MediaAchievement.findById(req.params.id)
      .populate('employeeId', 'name position')
      .populate('createdBy', 'name');

    if (!achievement) {
      return res.status(404).json({ message: 'الإنجاز غير موجود' });
    }

    res.json(achievement);
  } catch (error: any) {
    console.error('Error fetching achievement:', error);
    res.status(500).json({ message: error.message });
  }
});

// إضافة إنجاز جديد
router.post('/', protect, async (req: any, res) => {
  try {
    const { employeeId, month, year, items } = req.body;
    const companyId = req.user?.companyId;
    const createdBy = req.user?.userId;

    // حساب الإجمالي
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0);

    // التحقق من عدم وجود إنجاز للشهر نفسه
    const existing = await MediaAchievement.findOne({ employeeId, month, year });
    if (existing) {
      return res.status(400).json({
        message: 'يوجد إنجاز مسجل لهذا الموظف في هذا الشهر. استخدم التعديل بدلاً من الإضافة.',
        existingId: existing._id
      });
    }

    const achievement = await MediaAchievement.create({
      employeeId,
      companyId,
      month,
      year,
      items,
      totalAmount,
      createdBy,
      syncedToPayroll: false
    });

    const populated = await MediaAchievement.findById(achievement._id)
      .populate('employeeId', 'name position');

    console.log(`✅ Achievement created for employee ${employeeId}: ${month}/${year} = ${totalAmount}`);
    res.status(201).json(populated);
  } catch (error: any) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ message: error.message });
  }
});

// تعديل إنجاز
router.put('/:id', protect, async (req: any, res) => {
  try {
    const { items } = req.body;

    // حساب الإجمالي الجديد
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0);

    const achievement = await MediaAchievement.findByIdAndUpdate(
      req.params.id,
      { items, totalAmount },
      { new: true }
    ).populate('employeeId', 'name position');

    if (!achievement) {
      return res.status(404).json({ message: 'الإنجاز غير موجود' });
    }

    // إذا كان مزامن مع الراتب، ألغِ المزامنة
    if (achievement.syncedToPayroll) {
      achievement.syncedToPayroll = false;
      achievement.syncedAt = undefined;
      await achievement.save();
    }

    console.log(`✅ Achievement updated: ${achievement._id}`);
    res.json(achievement);
  } catch (error: any) {
    console.error('Error updating achievement:', error);
    res.status(500).json({ message: error.message });
  }
});

// حذف إنجاز
router.delete('/:id', protect, async (req: any, res) => {
  try {
    const achievement = await MediaAchievement.findById(req.params.id);

    if (!achievement) {
      return res.status(404).json({ message: 'الإنجاز غير موجود' });
    }

    if (achievement.syncedToPayroll) {
      return res.status(400).json({
        message: 'لا يمكن حذف إنجاز تمت مزامنته مع الراتب'
      });
    }

    await MediaAchievement.findByIdAndDelete(req.params.id);
    console.log(`✅ Achievement deleted: ${req.params.id}`);
    res.json({ message: 'تم حذف الإنجاز بنجاح' });
  } catch (error: any) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({ message: error.message });
  }
});

// مزامنة الإنجاز مع الراتب
router.post('/:id/sync-payroll', protect, async (req: any, res) => {
  try {
    const achievement = await MediaAchievement.findById(req.params.id)
      .populate('employeeId');

    if (!achievement) {
      return res.status(404).json({ message: 'الإنجاز غير موجود' });
    }

    if (achievement.syncedToPayroll) {
      return res.status(400).json({ message: 'تمت المزامنة مسبقاً' });
    }

    const employee = await Employee.findById(achievement.employeeId);
    const baseSalary = employee?.salary || 0;

    // البحث عن راتب موجود لهذا الشهر
    let payroll = await Payroll.findOne({
      employeeId: achievement.employeeId,
      month: achievement.month.toString(),
      year: achievement.year
    });

    if (payroll) {
      // تحديث الراتب الموجود
      payroll.bonuses = (payroll.bonuses || 0) + achievement.totalAmount;
      payroll.netSalary = payroll.baseSalary + payroll.bonuses - (payroll.deductions || 0);
      payroll.notes = `${payroll.notes || ''}\nمكافأة ميديا: ${achievement.totalAmount} ر.س`.trim();
      await payroll.save();
    } else {
      // إنشاء راتب جديد
      payroll = await Payroll.create({
        employeeId: achievement.employeeId,
        companyId: achievement.companyId,
        month: achievement.month.toString(),
        year: achievement.year,
        baseSalary,
        bonuses: achievement.totalAmount,
        deductions: 0,
        netSalary: baseSalary + achievement.totalAmount,
        currency: 'SAR',
        status: 'pending',
        notes: `مكافأة ميديا: ${achievement.totalAmount} ر.س`
      });
    }

    // تحديث حالة الإنجاز
    achievement.syncedToPayroll = true;
    achievement.syncedAt = new Date();
    await achievement.save();

    console.log(`✅ Achievement synced to payroll: ${achievement._id}`);
    res.json({
      message: 'تم إضافة الإنجازات للراتب الشهري بنجاح',
      achievement,
      payroll
    });
  } catch (error: any) {
    console.error('Error syncing to payroll:', error);
    res.status(500).json({ message: error.message });
  }
});

// ملخص الإنجازات للشهر
router.get('/summary/:month/:year', protect, async (req: any, res) => {
  try {
    const { month, year } = req.params;
    const companyId = req.user?.companyId;

    const achievements = await MediaAchievement.find({
      companyId,
      month: parseInt(month),
      year: parseInt(year)
    }).populate('employeeId', 'name position');

    const summary = {
      totalAmount: achievements.reduce((sum, a) => sum + a.totalAmount, 0),
      totalEmployees: achievements.length,
      syncedCount: achievements.filter(a => a.syncedToPayroll).length,
      totalItems: achievements.reduce((sum, a) =>
        sum + a.items.reduce((s, i) => s + i.quantity, 0), 0
      ),
      byEmployee: achievements.map(a => ({
        employee: a.employeeId,
        totalAmount: a.totalAmount,
        itemsCount: a.items.reduce((s, i) => s + i.quantity, 0),
        synced: a.syncedToPayroll
      }))
    };

    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
