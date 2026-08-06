import { Response } from 'express';
import Complaint from '../models/Complaint';
import User from '../models/User';
import { createNotification } from '../services/notification.service';

const statusLabel: Record<string, string> = {
  'pending': 'قيد الانتظار',
  'in-progress': 'قيد المعالجة',
  'resolved': 'تم الحل ✅',
  'rejected': 'مرفوضة ❌'
};

const typeLabel: Record<string, string> = {
  complaint: 'شكوى',
  suggestion: 'اقتراح',
  technical_issue: 'مشكلة تقنية',
};

// مين يقدر يشوف/يرد؟ dev يشوف الكل، وكل مدير يشوف الموجّه له، والموظف يشوف بتاعه بس
const canReview = (u: any, c: any): boolean => {
  if (u?.role === 'dev') return true;
  if (u?.role === 'general_manager') return c.recipientType === 'general_manager';
  if (u?.role === 'administrative_manager') return c.recipientType === 'administrative_manager';
  return false;
};

// إخفاء هوية صاحب الطلب لو مجهول (للجميع ماعدا صاحبه)
// نستخدم toJSON عشان تحويل _id→id العام يتطبّق (toObject بيتخطّاه)
const sanitize = (c: any, viewerId: string) => {
  const obj = c.toJSON ? c.toJSON() : c;
  const ownerId = (obj.userId?._id || obj.userId?.id || obj.userId)?.toString();
  if (obj.isAnonymous && ownerId !== viewerId) {
    return { ...obj, userName: 'مجهول', userId: undefined, userAvatar: undefined };
  }
  return obj;
};

export const getAll = async (req: any, res: Response) => {
  try {
    const role = req.user?.role;
    let filter: any;
    if (role === 'dev') {
      filter = {}; // السوبر أدمن يشوف الكل
    } else if (role === 'general_manager') {
      filter = { recipientType: 'general_manager' };
    } else if (role === 'administrative_manager') {
      filter = { recipientType: 'administrative_manager' };
    } else {
      filter = { userId: req.user.id }; // الموظف يشوف طلباته فقط
    }

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
    res.json(complaints.map((c) => sanitize(c, req.user.id)));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req: any, res: Response) => {
  try {
    const { type, title, description, recipientType, isAnonymous } = req.body;

    const complaint = await Complaint.create({
      type,
      title,
      description,
      recipientType,
      isAnonymous: !!isAnonymous,
      userId: req.user.id,
      userName: req.user.name,
      companyId: req.user.companyId,
      status: 'pending',
    });

    // توجيه الإشعار للمستلم المحدَّد فقط
    const roleForRecipient: Record<string, string> = {
      general_manager: 'general_manager',
      administrative_manager: 'administrative_manager',
      technical_support: 'dev',
      dev: 'dev',
    };
    const targetRole = roleForRecipient[recipientType] || 'dev';
    const recipients = await User.find({ role: targetRole }).select('_id');
    const recipientIds = recipients.map((u: any) => u._id.toString());

    if (recipientIds.length > 0) {
      const who = isAnonymous ? 'موظف (مجهول)' : req.user.name;
      await createNotification({
        userId: recipientIds,
        title: `📣 ${typeLabel[type] || 'طلب'} جديد`,
        message: `${who}: ${title}`,
        type: 'complaint',
        link: '/complaints',
      }, req.app.get('io'));
    }

    res.status(201).json(complaint);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req: any, res: Response) => {
  try {
    const before = await Complaint.findById(req.params.id);
    if (!before) return res.status(404).json({ message: 'الطلب غير موجود' });

    // الرد/تغيير الحالة للمستلم المختص أو المدراء فقط
    if (!canReview(req.user, before)) {
      return res.status(403).json({ message: 'غير مصرح لك بالرد على هذا الطلب' });
    }

    const patch: any = {};
    if (typeof req.body.status === 'string') patch.status = req.body.status;
    if (typeof req.body.response === 'string') {
      patch.response = req.body.response;
      patch.respondedBy = req.user.id;
      patch.respondedByName = req.user.name;
    }

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, patch, { new: true });

    // إشعار صاحب الطلب عند الرد أو تغيّر الحالة
    const statusChanged = patch.status && patch.status !== before.status;
    const gotResponse = patch.response && patch.response !== before.response;
    if (complaint && (statusChanged || gotResponse)) {
      await createNotification({
        userId: complaint.userId.toString(),
        title: gotResponse ? '💬 رد على طلبك' : '📣 تحديث على طلبك',
        message: `«${complaint.title}»${statusChanged ? ` — ${statusLabel[patch.status] || patch.status}` : ''}${gotResponse ? ` — ${patch.response.slice(0, 60)}` : ''}`,
        type: 'complaint',
        link: '/complaints',
      }, req.app.get('io'));
    }

    res.json(complaint);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const remove = async (req: any, res: Response) => {
  try {
    const c = await Complaint.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'الطلب غير موجود' });
    // صاحب الطلب يقدر يمسحه، أو المدير المختص/السوبر أدمن
    const ownerId = c.userId.toString();
    if (ownerId !== req.user.id && !canReview(req.user, c)) {
      return res.status(403).json({ message: 'غير مصرح لك بحذف هذا الطلب' });
    }
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم الحذف' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
