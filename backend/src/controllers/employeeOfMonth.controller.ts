import { Request, Response } from 'express';
import EmployeeOfMonth from '../models/EmployeeOfMonth';
import Employee from '../models/Employee';
import User from '../models/User';
import { createNotification } from '../services/notification.service';

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];
const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// موظف الشهر الحالي (يظهر للكل)
export const getCurrent = async (req: any, res: Response) => {
  try {
    const now = new Date();
    const eom = await EmployeeOfMonth.findOne({ month: now.getMonth() + 1, year: now.getFullYear() })
      .populate('employeeId', 'name avatar position');
    if (!eom) return res.json(null);

    // هل المستخدم الحالي هو موظف الشهر؟
    let isMe = false;
    const emp = await Employee.findOne({ userId: req.user?.id || req.user?._id });
    const eomEmpId = String((eom.employeeId as any)?._id || eom.employeeId);
    if (emp && String(emp._id) === eomEmpId) isMe = true;

    res.json({ ...eom.toObject(), isMe });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// سجل موظفي الشهور السابقة
export const getHistory = async (_req: Request, res: Response) => {
  try {
    const list = await EmployeeOfMonth.find({}).sort({ year: -1, month: -1 }).limit(24)
      .populate('employeeId', 'name avatar');
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// تعيين موظف الشهر (المدراء فقط) — واحد لكل شهر، يخطر الجميع
export const setEOM = async (req: any, res: Response) => {
  try {
    if (!MANAGER_ROLES.includes(req.user?.role)) {
      return res.status(403).json({ message: 'المدراء فقط يقدروا يعيّنوا موظف الشهر' });
    }
    const { employeeId, reason, month, year } = req.body;
    const emp = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ message: 'الموظف غير موجود' });

    const now = new Date();
    const m = Number(month) || now.getMonth() + 1;
    const y = Number(year) || now.getFullYear();

    const eom = await EmployeeOfMonth.findOneAndUpdate(
      { month: m, year: y },
      { employeeId, employeeName: emp.name, reason: reason || '', setById: req.user.id || req.user._id, setByName: req.user.name },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('employeeId', 'name avatar position');

    // إشعار لكل الموظفين
    const users = await User.find({ isActive: true }).select('_id');
    const ids = users.map((u: any) => u._id.toString());
    if (ids.length) {
      await createNotification({
        userId: ids,
        title: '🏆 موظف الشهر',
        message: `مبروك! ${emp.name} اختير موظف شهر ${monthNames[m - 1]} ${y}${reason ? ` — ${reason}` : ''}`,
        type: 'general',
        link: '/reviews',
      }, req.app.get('io'));
    }

    res.status(201).json(eom);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    if (!MANAGER_ROLES.includes(req.user?.role)) return res.status(403).json({ message: 'غير مصرح' });
    await EmployeeOfMonth.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
