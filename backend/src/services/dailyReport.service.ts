import Employee from '../models/Employee';
import AttendanceRecord from '../models/AttendanceRecord';
import Revenue from '../models/Revenue';
import Expense from '../models/Expense';
import Task from '../models/Task';

export interface DailyReportData {
  date: Date;
  attendance: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    totalEmployees: number;
  };
  financial: {
    revenue: number;
    expenses: number;
    netProfit: number;
    byCurrency: { currency: string; revenue: number; expense: number; net: number }[];
  };
  tasks: {
    completed: number;
    pending: number;
    overdue: number;
  };
  alerts: string[];
}

export const generateDailyReport = async (companyId: string): Promise<DailyReportData> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendanceRecords = await AttendanceRecord.find({
    date: { $gte: today, $lt: tomorrow }
  }).populate('userId');

  const totalEmployees = await Employee.countDocuments({ companyId });
  const present = attendanceRecords.filter(r => r.status === 'present').length;
  const late = attendanceRecords.filter(r => r.status === 'late').length;
  const absent = attendanceRecords.filter(r => r.status === 'absent').length;
  const onLeave = attendanceRecords.filter(r => r.status === 'leave').length;

  // مطابقة باليوم فقط (companyId غير موثوق/فارغ في النظام)
  const revenues = await Revenue.find({ date: { $gte: today, $lt: tomorrow } });
  const expenses = await Expense.find({ date: { $gte: today, $lt: tomorrow } });

  // حساب لكل عملة: صافي = إيرادات − مرتجعات − مصروفات تشغيلية (الرأسمالية لا تُخصم)
  const CURS = ['EGP', 'SAR', 'USD', 'AED'];
  const byCurrency = CURS.map((c) => {
    const rev = revenues.filter((r: any) => r.currency === c).reduce((s, r: any) => s + (r.amount || 0), 0);
    const refunds = expenses.filter((e: any) => e.currency === c && e.type === 'refund').reduce((s, e: any) => s + (e.amount || 0), 0);
    const op = expenses.filter((e: any) => e.currency === c && (e.type === 'operational' || !e.type)).reduce((s, e: any) => s + (e.amount || 0), 0);
    const netRevenue = rev - refunds;
    return { currency: c, revenue: netRevenue, expense: op, net: netRevenue - op };
  }).filter((x) => x.revenue || x.expense);

  // الأرقام الرئيسية بالجنيه المصري (للتوافق)
  const egp = byCurrency.find((x) => x.currency === 'EGP') || { revenue: 0, expense: 0, net: 0 };
  const totalRevenue = egp.revenue;
  const totalExpenses = egp.expense;

  const tasks = await Task.find({ companyId });
  const completedTasks = tasks.filter(t => t.status === 'completed' && 
    new Date(t.updatedAt) >= today && new Date(t.updatedAt) < tomorrow).length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < today).length;

  const alerts: string[] = [];
  if (absent > totalEmployees * 0.2) {
    alerts.push(`⚠️ نسبة الغياب مرتفعة: ${absent} موظف`);
  }
  if (late > totalEmployees * 0.15) {
    alerts.push(`⏰ نسبة التأخير مرتفعة: ${late} موظف`);
  }
  if (totalExpenses > totalRevenue) {
    alerts.push(`💰 المصروفات تتجاوز الإيرادات اليوم`);
  }
  if (overdueTasks > 0) {
    alerts.push(`📋 ${overdueTasks} مهمة متأخرة`);
  }

  return {
    date: today,
    attendance: { present, absent, late, onLeave, totalEmployees },
    financial: { revenue: totalRevenue, expenses: totalExpenses, netProfit: totalRevenue - totalExpenses, byCurrency },
    tasks: { completed: completedTasks, pending: pendingTasks, overdue: overdueTasks },
    alerts
  };
};
