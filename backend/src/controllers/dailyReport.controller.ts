import { Request, Response } from 'express';
import DailyReport, { REPORT_SECTIONS, SectionStatus } from '../models/DailyReport';
import { notifyManagers } from '../services/notification.service';

const MANAGER_ROLES = ['dev', 'general_manager', 'administrative_manager'];

const hasPerm = (u: any, module: string, actions: string[]): boolean =>
  Array.isArray(u?.permissions) && u.permissions.some((p: any) =>
    p.module === module && Array.isArray(p.actions) && p.actions.some((a: string) => actions.includes(a)));

// يقدر يملأ/يبعت ريبورت؟ مدير أو معاه صلاحية daily_report write
const canFill = (u: any): boolean => MANAGER_ROLES.includes(u?.role) || hasPerm(u, 'daily_report', ['write', 'edit']);
// يقدر يراجع؟ مدير أو معاه صلاحية daily_report view
const canReview = (u: any): boolean => MANAGER_ROLES.includes(u?.role) || hasPerm(u, 'daily_report', ['view', 'read', 'write']);

const RANK: Record<SectionStatus, number> = { green: 0, yellow: 1, red: 2 };
const worstStatus = (statuses: SectionStatus[]): SectionStatus => {
  let worst: SectionStatus = 'green';
  for (const s of statuses) if (RANK[s] > RANK[worst]) worst = s;
  return worst;
};

// كل الريبورتات (الأحدث فوق)
export const getAll = async (req: Request, res: Response) => {
  try {
    if (!canReview((req as any).user)) return res.status(403).json({ message: 'ليس لديك صلاحية مراجعة التقارير' });
    const reports = await DailyReport.find({}).sort({ date: -1, createdAt: -1 }).limit(365);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// إنشاء/إرسال ريبورت
export const create = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!canFill(user)) return res.status(403).json({ message: 'ليس لديك صلاحية إرسال التقرير' });

    const { date, sections, note } = req.body as {
      date?: string;
      sections?: Array<{ key: string; status: SectionStatus; text?: string }>;
      note?: string;
    };

    // تطبيع الأقسام على الترتيب الثابت
    const incoming = new Map((sections || []).map((s) => [s.key, s]));
    const normalized = REPORT_SECTIONS.map((def) => {
      const s = incoming.get(def.key);
      const status: SectionStatus = s?.status && ['green', 'yellow', 'red'].includes(s.status) ? s.status : 'green';
      return { key: def.key, status, text: (s?.text || '').trim() };
    });

    const overallStatus = worstStatus(normalized.map((s) => s.status));
    const reportDate = date ? new Date(date) : new Date();

    const report = await DailyReport.create({
      date: reportDate,
      createdById: user.id || user._id,
      createdByName: user.name || 'المدير الإداري',
      sections: normalized,
      overallStatus,
      note: (note || '').trim(),
      companyId: user.companyId ?? null,
    });

    // إشعار للمدراء (المدير العام) إن فيه ريبورت جديد
    try {
      const dateStr = reportDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
      const flag = overallStatus === 'red' ? '🔴' : overallStatus === 'yellow' ? '🟡' : '🟢';
      await notifyManagers(
        {
          title: `${flag} تقرير يومي جديد`,
          message: `${report.createdByName} بعت تقرير يوم ${dateStr}`,
          type: 'daily_report',
          link: '/daily-report?tab=review',
        },
        req.app.get('io')
      );
    } catch (e) {
      console.error('تعذّر إرسال إشعار التقرير اليومي:', e);
    }

    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// حذف ريبورت
export const remove = async (req: Request, res: Response) => {
  try {
    if (!canReview((req as any).user)) return res.status(403).json({ message: 'ليس لديك صلاحية حذف التقرير' });
    const deleted = await DailyReport.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'التقرير غير موجود' });
    res.json({ message: 'تم حذف التقرير' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
