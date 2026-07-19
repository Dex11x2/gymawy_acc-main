import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import CalendarMonth from '../models/CalendarMonth';
import CalendarEntry from '../models/CalendarEntry';
import CalendarAccount from '../models/CalendarAccount';
import CalendarActivity from '../models/CalendarActivity';

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];

const isManager = (req: AuthRequest): boolean =>
  !!req.user?.role && MANAGER_ROLES.includes(req.user.role);

// Authorization helper: managers always allowed; otherwise the user must have
// the requested action granted on the `content_calendar` module.
const can = (req: AuthRequest, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
  if (isManager(req)) return true;
  const perms = req.user?.permissions || [];
  const mod = perms.find((p) => p.module === 'content_calendar');
  if (!mod) return false;
  if (action === 'view') return mod.actions.includes('view') || mod.actions.includes('read');
  return mod.actions.includes(action) || mod.actions.includes('edit') || mod.actions.includes('write');
};

// Fire-and-forget activity logging (never blocks or breaks the request).
const logActivity = (
  req: AuthRequest,
  action: 'create' | 'update' | 'delete',
  targetType: 'month' | 'entry' | 'account',
  description: string,
  monthId?: any,
) => {
  CalendarActivity.create({
    userId: req.user?.userId,
    userName: req.user?.name || '',
    action,
    targetType,
    description,
    monthId,
  }).catch(() => { /* non-critical */ });
};

const DEFAULT_ACCOUNTS = [
  { key: 'gymawya', name: 'جيماوية', color: '#3B82F6', order: 1 },
  { key: 'gymbirch', name: 'جيم بيرش', color: '#F97316', order: 2 },
  { key: 'gymawyz', name: 'جيماويز', color: '#22C55E', order: 3 },
  { key: 'youssef_ashraf', name: 'يوسف اشرف', color: '#EC4899', order: 4 },
];

const ensureAccountsSeeded = async () => {
  const count = await CalendarAccount.countDocuments();
  if (count === 0) {
    await CalendarAccount.insertMany(DEFAULT_ACCOUNTS);
  }
  return CalendarAccount.find({ isActive: true }).sort({ order: 1, name: 1 });
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

// ---------- Accounts ----------

export const getAccounts = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'view')) return res.status(403).json({ message: 'ليس لديك صلاحية' });
    const accounts = await ensureAccountsSeeded();
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'create')) return res.status(403).json({ message: 'ليس لديك صلاحية لإضافة حساب' });
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'اسم الحساب مطلوب' });
    await ensureAccountsSeeded();
    const last = await CalendarAccount.findOne().sort({ order: -1 });
    const key = 'acc_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    const account = await CalendarAccount.create({
      key,
      name,
      color: req.body.color || '#3B82F6',
      order: (last?.order || 0) + 1,
      createdBy: req.user!.userId,
    });
    logActivity(req, 'create', 'account', `أضاف حساب «${name}»`);
    res.status(201).json(account);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'edit')) return res.status(403).json({ message: 'ليس لديك صلاحية للتعديل' });
    const allowed: Record<string, any> = {};
    for (const k of ['name', 'color', 'order', 'isActive']) {
      if (req.body[k] !== undefined) allowed[k] = req.body[k];
    }
    const account = await CalendarAccount.findByIdAndUpdate(req.params.id, allowed, { new: true });
    if (!account) return res.status(404).json({ message: 'الحساب غير موجود' });
    logActivity(req, 'update', 'account', `عدّل حساب «${account.name}»`);
    res.json(account);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'delete')) return res.status(403).json({ message: 'ليس لديك صلاحية للحذف' });
    const account = await CalendarAccount.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ message: 'الحساب غير موجود' });
    logActivity(req, 'delete', 'account', `حذف حساب «${account.name}»`);
    res.json({ message: 'تم الحذف' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Activity (managers only) ----------

export const getActivity = async (req: AuthRequest, res: Response) => {
  try {
    if (!isManager(req)) return res.status(403).json({ message: 'سجل الأنشطة خاص بالمدراء' });
    const items = await CalendarActivity.find()
      .sort({ createdAt: -1 })
      .limit(150)
      .populate('userId', 'name');
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
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
    const accounts = await ensureAccountsSeeded();
    const daysInMonth = new Date(year, month, 0).getDate();
    const entries: any[] = [];
    for (const acc of accounts) {
      for (let day = 1; day <= daysInMonth; day++) {
        const isRest = day % 2 === 0;
        entries.push({
          monthId: created._id,
          account: acc.key,
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

    logActivity(req, 'create', 'month', `أنشأ شهر «${created.title}»`, created._id);
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
    logActivity(req, 'update', 'month', `عدّل شهر «${updated.title}»`, updated._id);
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
    logActivity(req, 'delete', 'month', `حذف شهر «${month.title}»`);
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

// Generate the day-rows for a given account in a month (used when an account
// was added after the month was created and has no rows yet).
export const generateDays = async (req: AuthRequest, res: Response) => {
  try {
    if (!can(req, 'create')) return res.status(403).json({ message: 'ليس لديك صلاحية' });
    const account = req.body.account;
    if (!account) return res.status(400).json({ message: 'الحساب مطلوب' });
    const month = await CalendarMonth.findById(req.params.monthId);
    if (!month) return res.status(404).json({ message: 'الشهر غير موجود' });

    const existing = await CalendarEntry.countDocuments({ monthId: month._id, account });
    if (existing > 0) return res.json({ message: 'الأيام موجودة بالفعل', created: 0 });

    const daysInMonth = new Date(month.year, month.month, 0).getDate();
    const entries: any[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const isRest = day % 2 === 0;
      entries.push({
        monthId: month._id,
        account,
        title: isRest ? 'راحه' : '',
        contentType: isRest ? 'rest' : '',
        publishDate: new Date(month.year, month.month - 1, day, 12, 0, 0),
        isRest,
        rowOrder: day,
        platforms: [],
      });
    }
    await CalendarEntry.insertMany(entries);
    logActivity(req, 'create', 'entry', `ولّد أيام «${month.title}»`, month._id);
    res.status(201).json({ message: 'تم', created: entries.length });
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
    logActivity(req, 'create', 'entry', `أضاف صفًا في «${month.title}»`, month._id);
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
    logActivity(req, 'update', 'entry', updated.title ? `عدّل صف «${updated.title}»` : 'عدّل صفًا', updated.monthId);
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
    logActivity(req, 'delete', 'entry', deleted.title ? `حذف صف «${deleted.title}»` : 'حذف صفًا', deleted.monthId);
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

    logActivity(req, 'update', 'entry', 'أضاف تعليقًا', entry.monthId);
    const populated = await CalendarEntry.findById(entry._id).populate('comments.authorId', 'name');
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
