import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDataStore } from "../store/dataStore";
import { useAuthStore } from "../store/authStore";
import { RevenueExpenseChart, CategoryPieChart } from "../components/Charts";
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Alert } from '../components/ui';
import {
  Users, Building2, UserCheck, TrendingUp, TrendingDown,
  DollarSign, Wallet, ArrowRight, Calendar, Clock,
  UserPlus, Receipt, CreditCard, Banknote, BarChart3,
  PieChart, AlertCircle, Loader2
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { departments, employees, revenues, expenses, devTasks, loadLeaveRequests, loadRevenues, loadExpenses, loadDevTasks } = useDataStore();
  const { user } = useAuthStore();

  // States for modals
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedTotalCurrency, setSelectedTotalCurrency] = useState<'EGP' | 'USD' | 'SAR' | 'AED'>('SAR');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});

  // فلترة البيانات للشهر الحالي فقط
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isCurrentMonth = (date: Date | string) => {
    const d = new Date(date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const currentMonthRevenues = revenues.filter(r => isCurrentMonth(r.date));
  const currentMonthExpenses = expenses.filter(e => isCurrentMonth(e.date));

  // Dev Tasks Stats
  const myTasks = devTasks?.filter(task => task.assignedTo === user?.id) || [];
  const pendingTasks = myTasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = myTasks.filter(task => task.status === 'in_progress').length;
  const testingTasks = myTasks.filter(task => task.status === 'testing').length;
  const overdueTasks = myTasks.filter(task => {
    const dueDate = new Date(task.dueDate);
    return dueDate < now && task.status !== 'completed' && task.status !== 'blocked';
  }).length;

  // حساب الإيرادات والمصروفات حسب العملة (الشهر الحالي)
  const revenuesByCurrency = {
    EGP: currentMonthRevenues
      .filter((r) => r.currency === "EGP")
      .reduce((sum, r) => sum + r.amount, 0),
    SAR: currentMonthRevenues
      .filter((r) => r.currency === "SAR")
      .reduce((sum, r) => sum + r.amount, 0),
    USD: currentMonthRevenues
      .filter((r) => r.currency === "USD")
      .reduce((sum, r) => sum + r.amount, 0),
    AED: currentMonthRevenues
      .filter((r) => r.currency === "AED")
      .reduce((sum, r) => sum + r.amount, 0),
  };

  // حساب المصروفات التشغيلية فقط (الشهر الحالي)
  const operationalExpensesByCurrency = {
    EGP: currentMonthExpenses
      .filter((e) => e.currency === "EGP" && (!e.type || e.type === "operational"))
      .reduce((sum, e) => sum + e.amount, 0),
    SAR: currentMonthExpenses
      .filter((e) => e.currency === "SAR" && (!e.type || e.type === "operational"))
      .reduce((sum, e) => sum + e.amount, 0),
    USD: currentMonthExpenses
      .filter((e) => e.currency === "USD" && (!e.type || e.type === "operational"))
      .reduce((sum, e) => sum + e.amount, 0),
    AED: currentMonthExpenses
      .filter((e) => e.currency === "AED" && (!e.type || e.type === "operational"))
      .reduce((sum, e) => sum + e.amount, 0),
  };

  // حساب صافي الربح لكل عملة
  const netProfitByCurrency = {
    EGP: revenuesByCurrency.EGP - operationalExpensesByCurrency.EGP,
    SAR: revenuesByCurrency.SAR - operationalExpensesByCurrency.SAR,
    USD: revenuesByCurrency.USD - operationalExpensesByCurrency.USD,
    AED: revenuesByCurrency.AED - operationalExpensesByCurrency.AED,
  };

  // Helper functions
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EGP': return 'ج.م';
      case 'SAR': return 'ر.س';
      case 'USD': return '$';
      case 'AED': return 'د.إ';
      default: return '';
    }
  };

  const getExchangeRates = async (targetCurrency: 'EGP' | 'USD' | 'SAR' | 'AED') => {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCurrency}`);
      const data = await response.json();
      return data.rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      const fallbackRates: Record<string, Record<string, number>> = {
        SAR: { EGP: 8.5, USD: 0.27, AED: 0.98, SAR: 1 },
        EGP: { SAR: 0.12, USD: 0.032, AED: 0.115, EGP: 1 },
        USD: { SAR: 3.75, EGP: 31.5, AED: 3.67, USD: 1 },
        AED: { SAR: 1.02, EGP: 8.7, USD: 0.27, AED: 1 }
      };
      return fallbackRates[targetCurrency];
    }
  };

  const calculateTotalRevenues = async (targetCurrency: 'EGP' | 'USD' | 'SAR' | 'AED') => {
    setIsCalculating(true);
    try {
      const rates = await getExchangeRates(targetCurrency);
      let total = 0;

      Object.entries(revenuesByCurrency).forEach(([currency, amount]) => {
        if (currency === targetCurrency) {
          total += amount;
        } else {
          const rate = rates[currency] || 1;
          total += amount / rate;
        }
      });

      setTotalAmount(total);
      setSelectedTotalCurrency(targetCurrency);
      setShowRevenueModal(true);
    } catch (error) {
      setToast({message: 'حدث خطأ في حساب الإجمالي', type: 'error', isOpen: true});
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateTotalExpenses = async (targetCurrency: 'EGP' | 'USD' | 'SAR' | 'AED') => {
    setIsCalculating(true);
    try {
      const rates = await getExchangeRates(targetCurrency);
      let total = 0;

      const totalExpensesByCurrency = {
        EGP: currentMonthExpenses.filter(e => e.currency === 'EGP').reduce((sum, e) => sum + e.amount, 0),
        SAR: currentMonthExpenses.filter(e => e.currency === 'SAR').reduce((sum, e) => sum + e.amount, 0),
        USD: currentMonthExpenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0),
        AED: currentMonthExpenses.filter(e => e.currency === 'AED').reduce((sum, e) => sum + e.amount, 0)
      };

      Object.entries(totalExpensesByCurrency).forEach(([currency, amount]) => {
        if (currency === targetCurrency) {
          total += amount;
        } else {
          const rate = rates[currency] || 1;
          total += amount / rate;
        }
      });

      setTotalAmount(total);
      setSelectedTotalCurrency(targetCurrency);
      setShowExpenseModal(true);
    } catch (error) {
      setToast({message: 'حدث خطأ في حساب الإجمالي', type: 'error', isOpen: true});
    } finally {
      setIsCalculating(false);
    }
  };

  React.useEffect(() => {
    loadLeaveRequests();
    loadRevenues();
    loadExpenses();
    loadDevTasks();
  }, []);

  React.useEffect(() => {
    console.log('Dashboard - Revenues:', revenues.length, revenues);
    console.log('Dashboard - Expenses:', expenses.length, expenses);
    console.log('Dashboard - Current Month Revenues:', currentMonthRevenues.length);
    console.log('Dashboard - Current Month Expenses:', currentMonthExpenses.length);
    console.log('Dashboard - Revenues by Currency:', revenuesByCurrency);
    console.log('Dashboard - Expenses by Currency:', operationalExpensesByCurrency);
    console.log('Dashboard - Net Profit by Currency:', netProfitByCurrency);
  }, [revenues, expenses]);

  const currentEmployee = employees.find((e: any) => String(e.userId?._id || e.userId?.id || e.userId) === String(user?.id));
  const employeeBalance = currentEmployee?.leaveBalance || { annual: 14, emergency: 7 };
  const isEmployee = user?.role === 'employee';

  // Currency card configurations
  const currencyCards = [
    { code: 'EGP', name: 'جنيه مصري', flag: '🇪🇬', color: 'success' as const, borderColor: 'border-success-500' },
    { code: 'SAR', name: 'ريال سعودي', flag: '🇸🇦', color: 'primary' as const, borderColor: 'border-brand-500' },
    { code: 'USD', name: 'دولار أمريكي', flag: '🇺🇸', color: 'info' as const, borderColor: 'border-blue-light-500' },
    { code: 'AED', name: 'درهم إماراتي', flag: '🇦🇪', color: 'warning' as const, borderColor: 'border-warning-500' },
  ];

  const recentActivities = [
    {
      id: 1,
      text: "تم إضافة موظف جديد: أحمد محمد",
      time: "منذ ساعة",
      type: "employee",
    },
    {
      id: 2,
      text: "تم إضافة إيراد جديد: 5000 ج.م",
      time: "منذ ساعتين",
      type: "revenue",
    },
    {
      id: 3,
      text: "تم صرف راتب لقسم المحاسبة",
      time: "منذ 3 ساعات",
      type: "payroll",
    },
    {
      id: 4,
      text: "تم إضافة مصروف: مستلزمات مكتبية",
      time: "منذ 4 ساعات",
      type: "expense",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section - TailAdmin Hero Pattern */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-r from-brand-500 to-brand-600 p-6 lg:p-8">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="text-white">
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">مرحباً بك في لوحة التحكم</h1>
              <p className="text-white/80 text-sm lg:text-base">
                نظرة شاملة على أداء شركتك المالي والتشغيلي - {new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowRevenueModal(true)}
                className="bg-success-500 hover:bg-success-600 text-white"
              >
                <Wallet className="h-4 w-4" />
                إجمالي الإيرادات
              </Button>
              <Button
                onClick={() => setShowExpenseModal(true)}
                className="bg-error-500 hover:bg-error-600 text-white"
              >
                <BarChart3 className="h-4 w-4" />
                إجمالي المصروفات
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial Stats by Currency - TailAdmin Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {currencyCards.map((currency) => (
          <Card
            key={currency.code}
            className={`border-t-4 ${currency.borderColor} dark:border-t-4`}
          >
            <Card.Body>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm lg:text-base font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
                  <span className="text-xl">{currency.flag}</span>
                  {currency.name}
                </h3>
                <span className="text-xl lg:text-2xl font-bold text-gray-400 dark:text-gray-500">
                  {getCurrencySymbol(currency.code)}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">الإيرادات</span>
                  <span className="text-sm lg:text-lg font-bold text-success-600 dark:text-success-400">
                    {revenuesByCurrency[currency.code as keyof typeof revenuesByCurrency].toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">المصروفات</span>
                  <span className="text-sm lg:text-lg font-bold text-error-600 dark:text-error-400">
                    {operationalExpensesByCurrency[currency.code as keyof typeof operationalExpensesByCurrency].toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-300">صافي الربح</span>
                    <span className={`text-sm lg:text-lg font-bold ${
                      netProfitByCurrency[currency.code as keyof typeof netProfitByCurrency] >= 0
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-error-600 dark:text-error-400'
                    }`}>
                      {netProfitByCurrency[currency.code as keyof typeof netProfitByCurrency].toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Dev Tasks Widget - TailAdmin Style */}
      {(user?.role === 'super_admin' || user?.role === 'general_manager' || user?.role === 'administrative_manager' || myTasks.length > 0) && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-brand-500 to-blue-light-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                مهام التطوير
              </h2>
              <Link to="/dev-tasks">
                <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                  عرض الكل
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-white/80" />
                  <p className="text-xs text-white/80">قيد الانتظار</p>
                </div>
                <p className="text-2xl font-bold text-white">{pendingTasks}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 text-white/80" />
                  <p className="text-xs text-white/80">قيد التنفيذ</p>
                </div>
                <p className="text-2xl font-bold text-white">{inProgressTasks}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-white/80" />
                  <p className="text-xs text-white/80">في الاختبار</p>
                </div>
                <p className="text-2xl font-bold text-white">{testingTasks}</p>
              </div>
              <div className={`${overdueTasks > 0 ? 'bg-error-500/40' : 'bg-white/20'} backdrop-blur-sm rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-white/80" />
                  <p className="text-xs text-white/80">متأخرة</p>
                </div>
                <p className="text-2xl font-bold text-white">{overdueTasks}</p>
                {overdueTasks > 0 && (
                  <Badge variant="error" size="sm" className="mt-2">
                    تحتاج متابعة!
                  </Badge>
                )}
              </div>
            </div>

            {myTasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-white/90">
                  إجمالي المهام الخاصة بك: <span className="font-bold">{myTasks.length}</span>
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Employee Leave Balance - TailAdmin Style */}
      {isEmployee && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-light-500 to-brand-500 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              رصيد إجازاتك
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/80 mb-1">الإجازات العادية</p>
                <p className="text-3xl font-bold text-white">{employeeBalance.annual}</p>
                <p className="text-xs text-white/70 mt-1">يوم متبقي</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/80 mb-1">الإجازات العارضة</p>
                <p className="text-3xl font-bold text-white">{employeeBalance.emergency}</p>
                <p className="text-xs text-white/70 mt-1">يوم متبقي</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="grid grid-cols-2 gap-4 text-sm text-white/90">
                <div>
                  <p className="opacity-80">مستخدم عادي:</p>
                  <p className="font-bold">{14 - employeeBalance.annual} يوم</p>
                </div>
                <div>
                  <p className="opacity-80">مستخدم عارض:</p>
                  <p className="font-bold">{7 - employeeBalance.emergency} يوم</p>
                </div>
              </div>
            </div>
            <Link to="/leave-requests" className="block mt-4">
              <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                طلب إجازة جديدة
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Stats Grid - Using StatCard Component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <Link to="/employees">
          <StatCard
            title="عدد الموظفين"
            value={employees.length.toString()}
            icon={<Users className="h-6 w-6" />}
            iconColor="primary"
          />
        </Link>
        <Link to="/departments">
          <StatCard
            title="عدد الأقسام"
            value={departments.length.toString()}
            icon={<Building2 className="h-6 w-6" />}
            iconColor="info"
          />
        </Link>
        <Link to="/employees">
          <StatCard
            title="الموظفين النشطين"
            value={employees.filter((emp) => emp.isActive).length.toString()}
            icon={<UserCheck className="h-6 w-6" />}
            iconColor="success"
          />
        </Link>
      </div>

      {/* Charts - TailAdmin Card Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-500" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                الإيرادات والمصروفات
              </h3>
            </div>
          </Card.Header>
          <Card.Body>
            <RevenueExpenseChart
              data={useMemo(() => {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
                return months.map((month) => ({
                  month,
                  revenue: Math.floor(Math.random() * 50000) + 10000,
                  expense: Math.floor(Math.random() * 30000) + 5000,
                }));
              }, [])}
            />
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-brand-500" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                توزيع المصروفات
              </h3>
            </div>
          </Card.Header>
          <Card.Body>
            <CategoryPieChart
              data={useMemo(
                () => [
                  { name: "رواتب", value: 40 },
                  { name: "إيجار", value: 25 },
                  { name: "مرافق", value: 15 },
                  { name: "صيانة", value: 10 },
                  { name: "أخرى", value: 10 },
                ],
                []
              )}
            />
          </Card.Body>
        </Card>
      </div>

      {/* Quick Actions and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Quick Actions */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              إجراءات سريعة
            </h3>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                to="/employees"
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="h-6 w-6 text-brand-500" />
                </div>
                <p className="text-sm font-medium text-brand-600 dark:text-brand-400">إضافة موظف</p>
              </Link>
              <Link
                to="/revenues"
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-success-50 dark:bg-success-500/10 hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="h-6 w-6 text-success-500" />
                </div>
                <p className="text-sm font-medium text-success-600 dark:text-success-400">إضافة إيراد</p>
              </Link>
              <Link
                to="/expenses"
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-error-50 dark:bg-error-500/10 hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-error-100 dark:bg-error-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="h-6 w-6 text-error-500" />
                </div>
                <p className="text-sm font-medium text-error-600 dark:text-error-400">إضافة مصروف</p>
              </Link>
              <Link
                to="/payroll"
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-light-50 dark:bg-blue-light-500/10 hover:bg-blue-light-100 dark:hover:bg-blue-light-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-light-100 dark:bg-blue-light-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Banknote className="h-6 w-6 text-blue-light-500" />
                </div>
                <p className="text-sm font-medium text-blue-light-600 dark:text-blue-light-400">صرف راتب</p>
              </Link>
              <button
                onClick={() => setShowRevenueModal(true)}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-success-50 dark:bg-success-500/10 hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-success-500" />
                </div>
                <p className="text-sm font-medium text-success-600 dark:text-success-400">إجمالي الإيرادات</p>
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-warning-50 dark:bg-warning-500/10 hover:bg-warning-100 dark:hover:bg-warning-500/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-warning-100 dark:bg-warning-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6 text-warning-500" />
                </div>
                <p className="text-sm font-medium text-warning-600 dark:text-warning-400">إجمالي المصروفات</p>
              </button>
            </div>
          </Card.Body>
        </Card>

        {/* Recent Activities */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              الأنشطة الأخيرة
            </h3>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3"
                >
                  <div className="w-2 h-2 bg-brand-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-white/90">{activity.text}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/reports"
              className="flex items-center justify-center gap-2 text-brand-500 hover:text-brand-600 dark:text-brand-400 text-sm font-medium mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 transition-colors"
            >
              عرض جميع الأنشطة
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Link>
          </Card.Body>
        </Card>
      </div>

      {/* Note about Capital Expenses - Using Alert Component */}
      <Alert type="warning" title="ملاحظة مهمة">
        المصروفات التأسيسية لا تُخصم من صافي الربح وتظهر بشكل متراكم (من بداية الشركة). فقط المصروفات
        التشغيلية يتم خصمها من الإيرادات لحساب صافي الربح.
      </Alert>

      {/* Total Revenues Modal */}
      <Modal
        isOpen={showRevenueModal}
        onClose={() => setShowRevenueModal(false)}
        title="إجمالي الإيرادات"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              إجمالي إيرادات {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.entries(revenuesByCurrency).map(([currency, amount]) => (
                <div key={currency} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currency}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {amount.toLocaleString()} {getCurrencySymbol(currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h4 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-3">تحويل إلى عملة واحدة:</h4>
            <div className="flex gap-2 mb-4">
              {(['SAR', 'EGP', 'USD', 'AED'] as ('EGP' | 'USD' | 'SAR' | 'AED')[]).map((currency) => (
                <Button
                  key={currency}
                  onClick={() => calculateTotalRevenues(currency)}
                  disabled={isCalculating}
                  variant="outline"
                  className="flex-1 border-success-200 text-success-600 hover:bg-success-50 dark:border-success-500/30 dark:text-success-400 dark:hover:bg-success-500/10"
                >
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : getCurrencySymbol(currency)}
                </Button>
              ))}
            </div>

            {totalAmount > 0 && (
              <div className="bg-success-50 dark:bg-success-500/10 p-4 rounded-xl text-center">
                <p className="text-sm text-success-600 dark:text-success-400 mb-1">الإجمالي بعملة {selectedTotalCurrency}</p>
                <p className="text-2xl font-bold text-success-700 dark:text-success-300">
                  {totalAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} {getCurrencySymbol(selectedTotalCurrency)}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Total Expenses Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="إجمالي المصروفات"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              إجمالي مصروفات {new Date().toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.entries({
                EGP: currentMonthExpenses.filter(e => e.currency === 'EGP').reduce((sum, e) => sum + e.amount, 0),
                SAR: currentMonthExpenses.filter(e => e.currency === 'SAR').reduce((sum, e) => sum + e.amount, 0),
                USD: currentMonthExpenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0),
                AED: currentMonthExpenses.filter(e => e.currency === 'AED').reduce((sum, e) => sum + e.amount, 0)
              }).map(([currency, amount]) => (
                <div key={currency} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currency}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {amount.toLocaleString()} {getCurrencySymbol(currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h4 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-3">تحويل إلى عملة واحدة:</h4>
            <div className="flex gap-2 mb-4">
              {(['SAR', 'EGP', 'USD', 'AED'] as ('EGP' | 'USD' | 'SAR' | 'AED')[]).map((currency) => (
                <Button
                  key={currency}
                  onClick={() => calculateTotalExpenses(currency)}
                  disabled={isCalculating}
                  variant="outline"
                  className="flex-1 border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                  {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : getCurrencySymbol(currency)}
                </Button>
              ))}
            </div>

            {totalAmount > 0 && (
              <div className="bg-error-50 dark:bg-error-500/10 p-4 rounded-xl text-center">
                <p className="text-sm text-error-600 dark:text-error-400 mb-1">الإجمالي بعملة {selectedTotalCurrency}</p>
                <p className="text-2xl font-bold text-error-700 dark:text-error-300">
                  {totalAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} {getCurrencySymbol(selectedTotalCurrency)}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Toast Notifications */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
};

export default Dashboard;
