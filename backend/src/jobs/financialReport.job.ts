import * as cron from 'node-cron';
import Revenue from '../models/Revenue';
import Expense from '../models/Expense';
import User from '../models/User';
import FinancialReportSend from '../models/FinancialReportSend';
import { createNotification } from '../services/notification.service';

let job: cron.ScheduledTask | null = null;

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const CUR_SYM: Record<string, string> = { EGP: 'ج.م', SAR: 'ر.س', USD: '$', AED: 'د.إ' };

// تجهيز وإرسال التقرير المالي اليومي للمدراء تلقائيًا
export const runDailyFinancialReport = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const [revs, exps] = await Promise.all([
    Revenue.find({ date: { $gte: start, $lt: end } }).select('currency amount'),
    Expense.find({ date: { $gte: start, $lt: end } }).select('currency amount type'),
  ]);

  const parts: string[] = [];
  for (const c of ['EGP', 'SAR', 'USD', 'AED']) {
    const rev = revs.filter((r: any) => r.currency === c).reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const opExp = exps.filter((e: any) => e.currency === c && (e.type === 'operational' || !e.type)).reduce((s: number, e: any) => s + (e.amount || 0), 0);
    if (rev || opExp) parts.push(`${CUR_SYM[c]} صافي ${Math.round(rev - opExp).toLocaleString()}`);
  }
  const summary = parts.join(' · ') || 'لا توجد حركة';

  // المرسِل: منير عماد لو موجود، وإلا أول مدير
  const munir = await User.findOne({ name: { $regex: 'منير' } }).select('_id name');
  const managers = await User.find({ role: { $in: ['general_manager', 'administrative_manager', 'dev'] } }).select('_id');
  const sender: any = munir || managers[0];
  if (!sender) { console.log('⚠️ لا يوجد مستلمون للتقرير المالي'); return; }

  await FinancialReportSend.create({
    month, year,
    sentById: sender._id,
    sentByName: munir ? munir.name : 'منير عماد (تلقائي)',
    summary,
    note: 'إرسال تلقائي يومي',
  });

  const ids = managers.map((m: any) => m._id.toString());
  if (ids.length) {
    await createNotification({
      userId: ids,
      title: '📊 التقرير المالي اليومي',
      message: `تقرير ${monthNames[month - 1]} ${year} (تلقائي) — ${summary}`,
      type: 'general',
      link: '/reports',
    });
  }
  console.log(`✅ التقرير المالي اليومي اتبعت تلقائيًا — ${summary}`);
};

// جدولة يومية (الافتراضي 9 مساءً بتوقيت القاهرة)
export const startFinancialReportJob = () => {
  if (process.env.FINANCIAL_REPORT_ENABLED === 'false') {
    console.log('⏸️ التقرير المالي التلقائي معطّل');
    return;
  }
  const cronExpr = process.env.FINANCIAL_REPORT_CRON || '0 21 * * *';
  if (job) { job.stop(); job = null; }
  job = cron.schedule(cron.validate(cronExpr) ? cronExpr : '0 21 * * *', async () => {
    console.log('⏰ تشغيل التقرير المالي اليومي التلقائي...');
    try { await runDailyFinancialReport(); } catch (e) { console.error('❌ خطأ في التقرير المالي التلقائي:', e); }
  }, { timezone: 'Africa/Cairo' });
  console.log(`✅ تم جدولة التقرير المالي اليومي التلقائي (${cronExpr} — توقيت القاهرة)`);
};

export const stopFinancialReportJob = () => { if (job) { job.stop(); job = null; } };
