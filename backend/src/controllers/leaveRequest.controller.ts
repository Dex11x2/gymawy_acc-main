import { Request, Response } from 'express';
import LeaveRequest from '../models/LeaveRequest';
import Employee from '../models/Employee';
import { notifyManagers, createNotification, resolveToUserId } from '../services/notification.service';

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];

// هل يقدر يوافق/يرفض؟ مدير أو معاه صلاحية leave_requests (السوبر أدمن بيحددها)
const canApproveLeave = (u: any): boolean =>
  MANAGER_ROLES.includes(u?.role) ||
  (Array.isArray(u?.permissions) && u.permissions.some((p: any) =>
    p.module === 'leave_requests' && Array.isArray(p.actions) &&
    p.actions.some((a: string) => ['write', 'edit', 'approve', 'delete'].includes(a))));

const monthRange = (d: Date): [Date, Date] => {
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return [s, e];
};
const weekRange = (d: Date): [Date, Date] => {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay()); // الأحد بداية الأسبوع
  const e = new Date(s);
  e.setDate(s.getDate() + 7);
  return [s, e];
};

// مجموع أيام/ساعات نوع معيّن للموظف داخل شهر/أسبوع (المعلّق + المقبول)
const sumUsed = async (employeeId: any, leaveType: string, ref: Date, period: 'month' | 'week', field: 'days' | 'hours', excludeId?: any) => {
  const [s, e] = period === 'month' ? monthRange(ref) : weekRange(ref);
  const q: any = { employeeId, leaveType, status: { $in: ['pending', 'approved'] }, startDate: { $gte: s, $lt: e } };
  if (excludeId) q._id = { $ne: excludeId };
  const reqs = await LeaveRequest.find(q).select(field);
  return reqs.reduce((sum, r: any) => sum + (r[field] || 0), 0);
};

// حساب التنبيهات (قواعد ناعمة — بتظهر للمدير، مابتمنعش الطلب)
const computeWarnings = async (employee: any, leaveType: string, start: Date, days: number, hours: number) => {
  const w: string[] = [];
  const now = new Date();
  const noticeDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const noticeHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (leaveType === 'annual') {
    if (days > (employee.leaveBalance?.annual ?? 0)) w.push(`الرصيد السنوي غير كافٍ (المتبقّي ${employee.leaveBalance?.annual ?? 0} يوم)`);
    if (days >= 3) {
      if (days > 15) w.push('أكثر من 15 يوم متتصلة');
      if (noticeDays < 60) w.push('التقديم قبل أقل من شهرين من بداية الأجازة (شرط الأجازات الطويلة)');
    } else {
      if (noticeHours < 48) w.push('التقديم قبل أقل من 48 ساعة');
      const used = await sumUsed(employee._id, 'annual', start, 'month', 'days');
      if (used + days > 2) w.push(`تجاوز يومين سنوية متفرقين في نفس الشهر (المستخدم ${used})`);
    }
  } else if (leaveType === 'emergency') {
    if (days > (employee.leaveBalance?.emergency ?? 0)) w.push(`رصيد العارضة غير كافٍ (المتبقّي ${employee.leaveBalance?.emergency ?? 0} يوم)`);
    const used = await sumUsed(employee._id, 'emergency', start, 'month', 'days');
    if (used + days > 1) w.push('تجاوز يوم عارضة واحد في نفس الشهر');
  } else if (leaveType === 'permission') {
    if ((hours || 0) > 2) w.push('الإذن أكثر من ساعتين');
    const used = await sumUsed(employee._id, 'permission', start, 'week', 'hours');
    if (used + (hours || 0) > 2) w.push(`تجاوز ساعتين إذن في نفس الأسبوع (المستخدم ${used} ساعة)`);
  }
  return w;
};

// رصيد موظف: سنوي + عارضة + ساعات الإذن المستخدمة هذا الأسبوع
const buildBalance = async (employee: any) => {
  const permUsedWeek = await sumUsed(employee._id, 'permission', new Date(), 'week', 'hours');
  return {
    annual: employee.leaveBalance?.annual ?? 0,
    annualTotal: 21,
    emergency: employee.leaveBalance?.emergency ?? 0,
    emergencyTotal: 7,
    permissionHoursUsed: permUsedWeek,
    permissionHoursTotal: 2,
    permissionHoursLeft: Math.max(0, 2 - permUsedWeek),
  };
};

export const getAll = async (req: any, res: Response) => {
  try {
    const leaveRequests = await LeaveRequest.find({})
      .populate('employeeId', 'name email')
      .populate('reviewedBy', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(leaveRequests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// طلبات الموظف الحالي
export const getMine = async (req: any, res: Response) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.id || req.user._id });
    if (!employee) return res.json([]);
    const requests = await LeaveRequest.find({ employeeId: employee._id })
      .populate('reviewedBy', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// رصيد الموظف الحالي
export const getMyBalance = async (req: any, res: Response) => {
  try {
    const employee = await Employee.findOne({ userId: req.user.id || req.user._id });
    if (!employee) return res.status(404).json({ message: 'لا يوجد سجل موظف لحسابك' });
    res.json(await buildBalance(employee));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const { leaveType, startDate, endDate, reason, hours, startTime } = req.body;
    let { employeeId } = req.body;

    // لو مفيش employeeId (الموظف بيقدّم لنفسه)
    if (!employeeId) {
      const me = await Employee.findOne({ userId: req.user.id || req.user._id });
      if (!me) return res.status(400).json({ message: 'لا يوجد سجل موظف لحسابك' });
      employeeId = me._id;
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'الموظف غير موجود' });

    const start = new Date(startDate);
    const isPermission = leaveType === 'permission';
    const end = isPermission ? start : new Date(endDate || startDate);
    const days = isPermission ? 0 : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const hrs = isPermission ? Number(hours) || 0 : 0;

    const warnings = await computeWarnings(employee, leaveType, start, days, hrs);

    const leaveRequest = await LeaveRequest.create({
      employeeId,
      employeeName: employee.name,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      hours: hrs || undefined,
      startTime,
      reason: reason || '',
      warnings,
      companyId: req.user.companyId,
      status: 'pending'
    });

    const label = isPermission ? `إذن (${hrs} ساعة)` : `${days} يوم`;
    await notifyManagers({
      title: '🏖️ طلب أجازة/إذن جديد',
      message: `${employee.name} قدّم طلب ${leaveTypeAr(leaveType)} — ${label}${warnings.length ? ' ⚠️ فيه ملاحظات' : ''}`,
      type: 'general',
      link: '/leave-requests',
      companyId: req.user.companyId
    }, req.app.get('io'));

    res.status(201).json(leaveRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStatus = async (req: any, res: Response) => {
  try {
    if (!canApproveLeave(req.user)) {
      return res.status(403).json({ message: 'غير مصرح لك بمراجعة طلبات الأجازات' });
    }
    const { status, reviewNotes, deductFromEmergency } = req.body;
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) return res.status(404).json({ message: 'الطلب غير موجود' });

    leaveRequest.status = status;
    leaveRequest.reviewedBy = req.user.id || req.user._id;
    leaveRequest.reviewedByName = req.user.name;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.reviewNotes = reviewNotes;
    await leaveRequest.save();

    // خصم من الرصيد عند الموافقة (الإذونات لا تُخصم — تُحسب أسبوعيًا)
    if (status === 'approved' && leaveRequest.leaveType !== 'permission') {
      const employee = await Employee.findById(leaveRequest.employeeId);
      if (employee) {
        if (deductFromEmergency && (leaveRequest.leaveType === 'annual' || leaveRequest.leaveType === 'sick')) {
          employee.leaveBalance.emergency = Math.max(0, employee.leaveBalance.emergency - leaveRequest.days);
        } else if (leaveRequest.leaveType === 'annual' || leaveRequest.leaveType === 'sick') {
          employee.leaveBalance.annual = Math.max(0, employee.leaveBalance.annual - leaveRequest.days);
        } else if (leaveRequest.leaveType === 'emergency') {
          employee.leaveBalance.emergency = Math.max(0, employee.leaveBalance.emergency - leaveRequest.days);
        }
        await employee.save();
      }
    }

    // إشعار الموظف بالقرار
    if (status === 'approved' || status === 'rejected') {
      const targetUserId = await resolveToUserId(leaveRequest.employeeId);
      if (targetUserId) {
        await createNotification({
          userId: targetUserId,
          title: status === 'approved' ? '✅ تمت الموافقة على طلبك' : '❌ تم رفض طلبك',
          message: `طلب ${leaveTypeAr(leaveRequest.leaveType)} — ${status === 'approved' ? 'مقبول' : 'مرفوض'}${reviewNotes ? `: ${reviewNotes}` : ''}`,
          type: 'attendance',
          link: '/my-space'
        }, req.app.get('io'));
      }
    }

    res.json(leaveRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLeaveBalance = async (req: any, res: Response) => {
  try {
    const { employeeId, annual, emergency } = req.body;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'الموظف غير موجود' });
    if (annual !== undefined) employee.leaveBalance.annual = annual;
    if (emergency !== undefined) employee.leaveBalance.emergency = emergency;
    await employee.save();
    res.json({ message: 'تم تحديث الرصيد', leaveBalance: employee.leaveBalance });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeeBalance = async (req: Request, res: Response) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ message: 'الموظف غير موجود' });
    res.json(await buildBalance(employee));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await LeaveRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

function leaveTypeAr(t: string): string {
  switch (t) {
    case 'annual': return 'أجازة سنوية';
    case 'emergency': return 'أجازة عارضة';
    case 'sick': return 'أجازة مرضية';
    case 'unpaid': return 'أجازة بدون راتب';
    case 'permission': return 'إذن';
    default: return 'أجازة';
  }
}
