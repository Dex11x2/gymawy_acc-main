import { Request, Response } from 'express';
import FinancialReportSend from '../models/FinancialReportSend';
import User from '../models/User';
import { createNotification } from '../services/notification.service';

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// إرسال التقرير المالي للمدير الإداري والمدير العام + إشعارهم
export const sendToManagers = async (req: any, res: Response) => {
  try {
    const { month, year, note, summary } = req.body as { month: number; year: number; note?: string; summary?: string };
    if (!month || !year) return res.status(400).json({ message: 'الشهر والسنة مطلوبين' });

    // المستلمون: المدير الإداري + المدير العام (والدِڤ للاطلاع)
    const managers = await User.find({ role: { $in: ['general_manager', 'administrative_manager', 'dev'] } }).select('_id');
    const managerIds = managers.map((m: any) => m._id.toString());

    const record = await FinancialReportSend.create({
      month, year,
      sentById: req.user.id || req.user._id,
      sentByName: req.user.name,
      note: note || '',
      summary: summary || '',
    });

    if (managerIds.length > 0) {
      const mName = monthNames[(month - 1) % 12] || `${month}`;
      await createNotification({
        userId: managerIds,
        title: '📊 التقرير المالي',
        message: `${req.user.name} بعت التقرير المالي لشهر ${mName} ${year}${summary ? ` — ${summary}` : ''}${note ? ` (${note})` : ''}`,
        type: 'general',
        link: '/reports',
      }, req.app.get('io'));
    }

    res.status(201).json(record);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// آخر إرسالات التقرير المالي (لعرض الحالة)
export const getRecentSends = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query as any;
    const filter: any = {};
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    const sends = await FinancialReportSend.find(filter).sort({ createdAt: -1 }).limit(20);
    res.json(sends);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
