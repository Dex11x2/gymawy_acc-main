import React, { useState, useEffect } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { exportExpensesToPDF, exportExpensesToExcel } from '../utils/exportUtils';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Input, Textarea, Table } from '../components/ui';
import { TrendingDown, Wallet, Plus, Edit2, Trash2, Eye, Calculator, Calendar, FileDown, FileSpreadsheet, Wrench, Building2, BarChart3, Lock } from 'lucide-react';

type Currency = 'EGP' | 'USD' | 'SAR' | 'AED';

const Expenses: React.FC = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, loadExpenses } = useDataStore();
  const { user } = useAuthStore();
  const { canRead, canWrite, canDelete } = usePermissions();

  const canViewExpenses = canRead('expenses');
  const canCreateExpense = canWrite('expenses');
  const canEditExpense = canWrite('expenses');
  const canDeleteExpense = canDelete('expenses');
  const [showModal, setShowModal] = useState(false);

  // تحميل المصروفات عند فتح الصفحة
  useEffect(() => {
    console.log('🔍 Expenses Page - Diagnostic Info:');
    console.log('  Current user:', user);
    console.log('  User permissions:', user?.permissions);
    console.log('  User companyId:', user?.companyId);
    console.log('  User role:', user?.role);
    console.log('  Can view expenses:', canViewExpenses);
    console.log('  Can create expense:', canCreateExpense);
    console.log('  Can edit expense:', canEditExpense);
    console.log('  Can delete expense:', canDeleteExpense);

    if (canViewExpenses) {
      console.log('  ✅ User has VIEW permission - Loading expenses...');
      loadExpenses();
    } else {
      console.warn('  ⚠️ User does NOT have VIEW permission for expenses');
    }
  }, [loadExpenses, user, canViewExpenses, canCreateExpense, canEditExpense, canDeleteExpense]);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [selectedTotalCurrency, setSelectedTotalCurrency] = useState<Currency>('SAR');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const [formData, setFormData] = useState({
    amount: '' as number | '',
    currency: 'SAR' as Currency,
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
    type: 'operational' as 'operational' | 'capital'
  });

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EGP': return 'ج.م';
      case 'SAR': return 'ر.س';
      case 'USD': return '$';
      case 'AED': return 'د.إ';
      default: return 'ج.م';
    }
  };

  // Filter expenses: show expenses only for selected year and month
  // استخدام UTC لتجنب مشاكل التوقيت المحلي
  const filteredExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date);
    if (e.type === 'capital') {
      // Capital expenses: show only for selected year, all months up to selected month
      return expenseDate.getUTCFullYear() === selectedYear &&
             expenseDate.getUTCMonth() + 1 <= selectedMonth;
    }
    // Operational expenses only for selected month and year
    return expenseDate.getUTCMonth() + 1 === selectedMonth && expenseDate.getUTCFullYear() === selectedYear;
  });

  const expensesByCurrency = {
    EGP: filteredExpenses.filter(e => e.currency === 'EGP').reduce((sum, e) => sum + e.amount, 0),
    SAR: filteredExpenses.filter(e => e.currency === 'SAR').reduce((sum, e) => sum + e.amount, 0),
    USD: filteredExpenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0),
    AED: filteredExpenses.filter(e => e.currency === 'AED').reduce((sum, e) => sum + e.amount, 0)
  };

  // Calculate operational and capital expenses
  const operationalExpenses = filteredExpenses.filter(e => e.type === 'operational');
  const capitalExpenses = filteredExpenses.filter(e => e.type === 'capital');

  const operationalByCurrency = operationalExpenses.reduce((acc, e) => {
    if (!acc[e.currency]) acc[e.currency] = 0;
    acc[e.currency] += e.amount;
    return acc;
  }, {} as Record<string, number>);

  const capitalByCurrency = capitalExpenses.reduce((acc, e) => {
    if (!acc[e.currency]) acc[e.currency] = 0;
    acc[e.currency] += e.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense && !canEditExpense) {
      setToast({message: 'ليس لديك صلاحية لتعديل المصروفات', type: 'error', isOpen: true});
      return;
    }
    if (!editingExpense && !canCreateExpense) {
      setToast({message: 'ليس لديك صلاحية لإضافة مصروفات', type: 'error', isOpen: true});
      return;
    }

    const expenseData: any = {
      title: formData.description || formData.category || 'مصروف',
      amount: Number(formData.amount) || 0,
      currency: formData.currency,
      description: formData.description,
      date: new Date(formData.date),
      category: formData.category,
      notes: formData.notes,
      type: formData.type || 'operational',
      exchangeRate: 1,
      baseAmount: Number(formData.amount) || 0
    };
    if (user?.companyId) expenseData.companyId = user.companyId;
    if (user?.id) expenseData.createdBy = user.id;

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
        setToast({message: 'تم تحديث المصروف بنجاح', type: 'success', isOpen: true});
      } else {
        await addExpense(expenseData);
        setToast({message: 'تم إضافة المصروف بنجاح', type: 'success', isOpen: true});
      }
      setShowModal(false);
      setEditingExpense(null);
      resetForm();
    } catch (error: any) {
      console.error('Expense error:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'حدث خطأ أثناء الحفظ';
      setToast({message: errorMsg, type: 'error', isOpen: true});
    }
  };

  const handleDelete = (id: string) => {
    if (!canDeleteExpense) {
      setToast({message: 'ليس لديك صلاحية لحذف المصروفات', type: 'error', isOpen: true});
      return;
    }
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteExpense(deleteId);
      setToast({message: 'تم حذف المصروف بنجاح', type: 'success', isOpen: true});
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      currency: 'SAR',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      notes: '',
      type: 'operational'
    });
  };

  const handleEdit = (expense: any) => {
    if (!canEditExpense) {
      setToast({message: 'ليس لديك صلاحية لتعديل المصروفات', type: 'error', isOpen: true});
      return;
    }
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount,
      currency: expense.currency || 'SAR',
      description: expense.description,
      date: new Date(expense.date).toISOString().split('T')[0],
      category: expense.category || '',
      notes: expense.notes || '',
      type: expense.type
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    if (!canCreateExpense) {
      setToast({message: 'ليس لديك صلاحية لإضافة مصروفات', type: 'error', isOpen: true});
      return;
    }
    setEditingExpense(null);
    resetForm();
    setShowModal(true);
  };

  const getExchangeRates = async (targetCurrency: Currency) => {
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

  const calculateTotalExpenses = async (targetCurrency: Currency) => {
    setIsCalculating(true);
    try {
      const rates = await getExchangeRates(targetCurrency);
      let total = 0;

      Object.entries(expensesByCurrency).forEach(([currency, amount]) => {
        if (currency === targetCurrency) {
          total += amount;
        } else {
          const rate = rates[currency] || 1;
          total += amount / rate;
        }
      });

      setTotalAmount(total);
      setSelectedTotalCurrency(targetCurrency);
      setShowTotalModal(true);
    } catch (error) {
      setToast({message: 'حدث خطأ في حساب الإجمالي', type: 'error', isOpen: true});
    } finally {
      setIsCalculating(false);
    }
  };

  // Permission guard - show access denied if user doesn't have VIEW permission
  if (!canViewExpenses) {
    return (
      <div className="p-4 lg:p-6">
        <Card>
          <Card.Body className="p-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-error-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                ليس لديك صلاحية للوصول
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                لا يمكنك عرض صفحة المصروفات. يرجى التواصل مع المدير لمنحك الصلاحيات المناسبة.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                الصلاحية المطلوبة: عرض المصروفات (expenses.view)
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
                الدور الحالي: {user?.role || 'غير محدد'}
              </p>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">المصروفات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة مصروفات الشركة</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowTotalModal(true)}
            variant="outline"
            className="gap-2"
          >
            <Calculator className="w-4 h-4" />
            إجمالي المصروفات
          </Button>
          {canCreateExpense && (
            <Button
              onClick={openAddModal}
              variant="primary"
              className="gap-2 bg-error-500 hover:bg-error-600"
            >
              <Plus className="w-4 h-4" />
              إضافة مصروف
            </Button>
          )}
        </div>
      </div>

      {/* Currency Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="جنيه مصري (EGP)"
          value={`${expensesByCurrency.EGP.toLocaleString()} ج.م`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="green"
        />
        <StatCard
          title="ريال سعودي (SAR)"
          value={`${expensesByCurrency.SAR.toLocaleString()} ر.س`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="blue"
        />
        <StatCard
          title="دولار أمريكي (USD)"
          value={`${expensesByCurrency.USD.toLocaleString()} $`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="purple"
        />
        <StatCard
          title="درهم إماراتي (AED)"
          value={`${expensesByCurrency.AED.toLocaleString()} د.إ`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="orange"
        />
      </div>

      {/* Type Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-warning-500">
          <Card.Body className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مصروفات تشغيلية</p>
                <div className="space-y-1 mt-2">
                  {Object.entries(operationalByCurrency).map(([curr, total]) => (
                    <p key={curr} className="text-lg font-bold text-warning-600 dark:text-warning-400">
                      {total.toLocaleString()} {getCurrencySymbol(curr)}
                    </p>
                  ))}
                  {Object.keys(operationalByCurrency).length === 0 && (
                    <p className="text-lg font-bold text-gray-400">0</p>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center text-warning-600 dark:text-warning-400">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <Card.Body className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مصروفات تأسيسية (متراكمة)</p>
                <div className="space-y-1 mt-2">
                  {Object.entries(capitalByCurrency).map(([curr, total]) => (
                    <p key={curr} className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {total.toLocaleString()} {getCurrencySymbol(curr)}
                    </p>
                  ))}
                  {Object.keys(capitalByCurrency).length === 0 && (
                    <p className="text-lg font-bold text-gray-400">0</p>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card className="border-t-4 border-t-gray-500">
          <Card.Body className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">عدد المصروفات</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">{filteredExpenses.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <Card.Body className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(selectedYear, i).toLocaleDateString('ar-EG', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({length: 6}, (_, i) => 2024 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Expenses Table */}
      <Card>
        <Card.Header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            مصروفات {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={() => exportExpensesToPDF(filteredExpenses, selectedMonth, selectedYear)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </Button>
            <Button
              onClick={() => exportExpensesToExcel(filteredExpenses, selectedMonth, selectedYear)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingDown className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد مصروفات</h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">لم يتم تسجيل أي مصروفات لهذا الشهر</p>
              {canCreateExpense && (
                <Button onClick={openAddModal} variant="primary" className="gap-2 bg-error-500 hover:bg-error-600">
                  <Plus className="w-4 h-4" />
                  إضافة مصروف
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>التاريخ</Table.Head>
                  <Table.Head>الفئة</Table.Head>
                  <Table.Head>الوصف</Table.Head>
                  <Table.Head>النوع</Table.Head>
                  <Table.Head>المبلغ</Table.Head>
                  <Table.Head>الإجراءات</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredExpenses.map((expense) => (
                  <Table.Row key={expense.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(expense.date).toLocaleDateString('ar-EG')}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {expense.category || '-'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-gray-600 dark:text-gray-400">
                        {expense.description || '-'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={expense.type === 'operational' ? 'warning' : 'info'}>
                        {expense.type === 'operational' ? 'تشغيلي' : 'تأسيسي'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-error-600 dark:text-error-400">
                          {expense.amount.toLocaleString()}
                        </span>
                        <Badge
                          variant={
                            expense.currency === 'EGP' ? 'success' :
                            expense.currency === 'SAR' ? 'primary' :
                            expense.currency === 'USD' ? 'info' : 'warning'
                          }
                          size="sm"
                        >
                          {getCurrencySymbol(expense.currency || 'SAR')}
                        </Badge>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-2">
                        {canEditExpense && (
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteExpense && (
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-400 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!canEditExpense && !canDeleteExpense && (
                          <span className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            عرض فقط
                          </span>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة *</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="EGP">الجنيه المصري (EGP)</option>
                <option value="SAR">الريال السعودي (SAR)</option>
                <option value="USD">الدولار الأمريكي (USD)</option>
                <option value="AED">الدرهم الإماراتي (AED)</option>
              </select>
            </div>

            <Input
              type="number"
              label="المبلغ *"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              required
              min="0"
              step="0.01"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فئة المصروف *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="">اختر فئة المصروف</option>
                <option value="مستلزمات مكتبية">مستلزمات مكتبية</option>
                <option value="إيجار">إيجار</option>
                <option value="كهرباء وماء">كهرباء وماء</option>
                <option value="رواتب">رواتب</option>
                <option value="صيانة">صيانة</option>
                <option value="تسويق">تسويق</option>
                <option value="مواصلات">مواصلات</option>
                <option value="ضرائب">ضرائب</option>
                <option value="تأمينات">تأمينات</option>
                <option value="اشتراكات">اشتراكات</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <Input
              label="الوصف"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف المصروف (اختياري)"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع المصروف *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'operational' | 'capital' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="operational">مصروف تشغيلي</option>
                <option value="capital">مصروف تأسيسي</option>
              </select>
            </div>

            <Input
              type="date"
              label="التاريخ *"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <Textarea
            label="ملاحظات"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="ملاحظات إضافية..."
            rows={3}
          />

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" className="flex-1 bg-error-500 hover:bg-error-600">
              {editingExpense ? 'تحديث' : 'إضافة'}
            </Button>
            <Button type="button" onClick={() => setShowModal(false)} variant="outline" className="flex-1">
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Total Expenses Modal */}
      <Modal
        isOpen={showTotalModal}
        onClose={() => setShowTotalModal(false)}
        title="إجمالي المصروفات"
        size="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              إجمالي مصروفات {new Date(selectedYear, selectedMonth-1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.entries(expensesByCurrency).map(([currency, amount]) => (
                <Card key={currency} className="bg-gray-50 dark:bg-gray-900">
                  <Card.Body className="p-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{currency}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {amount.toLocaleString()} {getCurrencySymbol(currency)}
                    </p>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">تحويل إلى عملة واحدة:</h4>
            <div className="flex gap-2 mb-4">
              {(['SAR', 'EGP', 'USD', 'AED'] as Currency[]).map((currency) => (
                <Button
                  key={currency}
                  onClick={() => calculateTotalExpenses(currency)}
                  disabled={isCalculating}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {isCalculating ? '...' : getCurrencySymbol(currency)}
                </Button>
              ))}
            </div>

            {totalAmount > 0 && (
              <Card className="bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800">
                <Card.Body className="p-4 text-center">
                  <p className="text-sm text-error-600 dark:text-error-400 mb-1">الإجمالي بعملة {selectedTotalCurrency}</p>
                  <p className="text-2xl font-bold text-error-700 dark:text-error-300">
                    {totalAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} {getCurrencySymbol(selectedTotalCurrency)}
                  </p>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا المصروف؟"
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
      />
    </div>
  );
};

export default Expenses;
