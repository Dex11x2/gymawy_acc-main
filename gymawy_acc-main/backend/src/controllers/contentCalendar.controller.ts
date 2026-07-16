import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import CalendarMonth from '../models/CalendarMonth';
import CalendarEntry from '../models/CalendarEntry';

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];

// Authorization helper: managers always allowed; otherwise the user must have
// the requested action granted on the `content_calendar` module.
const can = (req: AuthRequest, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
  const role = req.user?.role;
  if (role && MANAGER_ROLES.includes(role)) return true;
  const perms = req.user?.permissions || [];
  const mod = perms.find((p) => p.module === 'content_calendar');
  if (!mod) return false;
  if (action === 'view') return mod.actions.includes('view') || mod.actions.includes('read');
  return mod.actions.includes(action) || mod.actions.includes('edit') || mod.actions.includes('write');
};

// Fields on CalendarEntry that clients are allowed to write.
const ENTRY_FIELDS = [
  'title', 'contentType', 'account', 'publishDate', 'videoLink', 'platforms',
  'assigneeId', 'editorId', 'collaboration', 'uploadDeadline', 'filmed', 'done',
  'ytSevenDays', 'instaSevenDays', 'tiktokSevenDays', 'script', 'isRest', 'rowOrder',
] as const;

const pickEntryFields = (body: any) => {
  const out: Record<string, any> = {};
  for (const key of ENTRY_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

// ---------- Months ----------

export const getMonths = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'view')) return res.status(403).json({ message: 'ليس لديك صلاحية لعرض تقويم المحتوى' });
    const months = await CalendarMonth.find()
      .populate('ownerId', 'name')
      .sort({ status: 1, year: -1, month: -1, order: 1 });
    res.json(months);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMonth = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'create')) return res.status(403).json({ message: 'ليس لديك صلاحية لإضافة شهر' });

    const month = Number(req.body.month);
    const year = Number(req.body.year);
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'الشهر أو السنة غير صحيحة' });
    }

    const exists = await CalendarMonth.findOne({ month, year });
    if (exists) return res.status(400).json({ message: 'الشهر موجود بالفعل' });

    const created = await CalendarMonth.create({
      month,
      year,
      title: `${month} - ${year}`,
      iconColor: req.body.iconColor || '#3B82F6',
      ownerId: req.body.ownerId || req.user!.userId,
      status: 'active',
      order: Number(req.body.order) || 0,
      createdBy: req.user!.userId,
    });

    // Auto-generate rows per account ≈ days in month, alternating content / "راحه".
    const daysInMonth = new Date(year, month, 0).getDate();
    const ACCOUNT_KEYS = ['gymawya', 'gymbirch', 'gymawyz', 'youssef_ashraf'];
    const entries: any[] = [];
    for (const account of ACCOUNT_KEYS) {
      for (let day = 1; day <= daysInMonth; day++) {
        const isRest = day % 2 === 0;
        entries.push({
          monthId: created._id,
          account,
          title: isRest ? 'راحه' : '',
          contentType: isRest ? 'rest' : '',
          publishDate: new Date(year, month - 1, day, 12, 0, 0),
          isRest,
          rowOrder: day,
          platforms: [],
        });
      }
    }
    if (entries.length) await CalendarEntry.insertMany(entries);

    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMonth = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'edit')) return res.status(403).json({ message: 'ليس لديك صلاحية للتعديل' });
    const allowed: Record<string, any> = {};
    for (const key of ['title', 'iconColor', 'status', 'order', 'ownerId']) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }
    const updated = await CalendarMonth.findByIdAndUpdate(req.params.id, allowed, { new: true });
    if (!updated) return res.status(404).json({ message: 'الشهر غير موجود' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMonth = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'delete')) return res.status(403).json({ message: 'ليس لديك صلاحية للحذف' });
    const month = await CalendarMonth.findByIdAndDelete(req.params.id);
    if (!month) return res.status(404).json({ message: 'الشهر غير موجود' });
    await CalendarEntry.deleteMany({ monthId: month._id });
    res.json({ message: 'تم الحذف' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Entries ----------

export const getEntries = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'view')) return res.status(403).json({ message: 'ليس لديك صلاحية للعرض' });
    const entries = await CalendarEntry.find({ monthId: req.params.monthId })
      .populate('assigneeId', 'name')
      .populate('editorId', 'name')
      .populate('comments.authorId', 'name')
      .sort({ rowOrder: 1, createdAt: 1 });
    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'create')) return res.status(403).json({ message: 'ليس لديك صلاحية للإضافة' });
    const month = await CalendarMonth.findById(req.params.monthId);
    if (!month) return res.status(404).json({ message: 'الشهر غير موجود' });

    let rowOrder = Number(req.body.rowOrder);
    if (!rowOrder) {
      const last = await CalendarEntry.findOne({ monthId: month._id }).sort({ rowOrder: -1 });
      rowOrder = (last?.rowOrder || 0) + 1;
    }

    const entry = await CalendarEntry.create({
      ...pickEntryFields(req.body),
      monthId: month._id,
      rowOrder,
    });
    res.status(201).json(entry);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'edit')) return res.status(403).json({ message: 'ليس لديك صلاحية للتعديل' });
    const updated = await CalendarEntry.findByIdAndUpdate(
      req.params.id,
      pickEntryFields(req.body),
      { new: true },
    )
      .populate('assigneeId', 'name')
      .populate('editorId', 'name')
      .populate('comments.authorId', 'name');
    if (!updated) return res.status(404).json({ message: 'الصف غير موجود' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'delete')) return res.status(403).json({ message: 'ليس لديك صلاحية للحذف' });
    const deleted = await CalendarEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'الصف غير موجود' });
    res.json({ message: 'تم الحذف' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'view')) return res.status(403).json({ message: 'ليس لديك صلاحية' });
    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ message: 'التعليق فارغ' });

    const entry = await CalendarEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'الصف غير موجود' });

    entry.comments.push({
      id: new Date().getTime().toString() + Math.round(Math.random() * 1e6),
      authorId: req.user!.userId,
      authorName: req.user!.name,
      content,
      createdAt: new Date(),
    } as any);
    await entry.save();

    const populated = await CalendarEntry.findById(entry._id).populate('comments.authorId', 'name');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
