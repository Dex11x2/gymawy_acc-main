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

  const revenues = await Revenue.find({
    companyId,
    date: { $gte: today, $lt: tomorrow }
  });
  const expenses = await Expense.find({
    companyId,
    date: { $gte: today, $lt: tomorrow }
  });

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
    financial: { revenue: totalRevenue, expenses: totalExpenses, netProfit: totalRevenue - totalExpenses },
    tasks: { completed: completedTasks, pending: pendingTasks, overdue: overdueTasks },
    alerts
  };
};
