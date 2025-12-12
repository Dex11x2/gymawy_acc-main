import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Input, Textarea } from '../components/ui';
import {
  Wallet, Plus, Edit2, Trash2, Check, X,
  TrendingUp, TrendingDown, Users, AlertCircle,
  ChevronDown, ChevronUp, FileText
} from 'lucide-react';

type Currency = 'EGP' | 'SAR' | 'USD' | 'AED';

interface Employee {
  _id: string;
  name: string;
  email: string;
  position: string;
  salary: number;
  salaryCurrency: Currency;
}

interface SalaryItem {
  description: string;
  amount: number;
}

interface LateDeduction {
  date: string;
  minutes: number;
  amount: number;
}

interface AbsenceDeduction {
  date: string;
  amount: number;
}

interface Salary {
  _id: string;
  employeeId: Employee;
  month: number;
  year: number;
  baseSalary: number;
  currency: Currency;
  bonuses: SalaryItem[];
  allowances: SalaryItem[];
  deductions: SalaryItem[];
  lateDeductions: LateDeduction[];
  absenceDeductions: AbsenceDeduction[];
  totalBonuses: number;
  totalAllowances: number;
  totalDeductions: number;
  totalLateDeductions: number;
  totalAbsenceDeductions: number;
  netSalary: number;
  isPaid: boolean;
  paidAt?: string;
  paidBy?: { name: string; email: string };
  paymentMethod?: 'cash' | 'bank_transfer' | 'check';
  paymentReference?: string;
  notes?: string;
}

const Salaries: React.FC = () => {
  const { user } = useAuthStore();
  const { canWrite } = usePermissions();

  const canEdit = canWrite('salaries');

  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({
    message: '',
    type: 'success',
    isOpen: false
  });

  const [formData, setFormData] = useState({
    baseSalary: 0,
    bonuses: [] as SalaryItem[],
    allowances: [] as SalaryItem[],
    deductions: [] as SalaryItem[],
    lateDeductions: [] as LateDeduction[],
    absenceDeductions: [] as AbsenceDeduction[],
    notes: ''
  });

  const [statistics, setStatistics] = useState({
    totalEmployees: 0,
    totalNetSalary: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalPaid: 0,
    totalUnpaid: 0
  });

  useEffect(() => {
    loadSalaries();
    loadStatistics();
  }, [selectedMonth, selectedYear]);

  const loadSalaries = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/salaries?month=${selectedMonth}&year=${selectedYear}`);

      console.log('📦 Received salaries data:', {
        count: response.data.length,
        sample: response.data[0],
        sampleKeys: response.data[0] ? Object.keys(response.data[0]) : [],
        sampleId: response.data[0]?._id
      });

      // Set salaries directly without filtering for now
      setSalaries(response.data);
    } catch (error: any) {
      console.error('Error loading salaries:', error);
      setToast({ message: 'حدث خطأ في تحميل الرواتب', type: 'error', isOpen: true });
    } finally {
      setLoading(false);
    }
  };



  const loadStatistics = async () => {
    try {
      const response = await api.get(`/salaries/statistics?month=${selectedMonth}&year=${selectedYear}`);
      setStatistics(response.data);
    } catch (error: any) {
      console.error('Error loading statistics:', error);
    }
  };

  const getCurrencySymbol = (c: Currency) => {
    switch (c) {
      case 'EGP': return 'ج.م';
      case 'SAR': return 'ر.س';
      case 'USD': return '$';
      case 'AED': return 'د.إ';
      default: return '';
    }
  };

  const getMonthName = (month: number) => {
    return new Date(selectedYear, month - 1).toLocaleDateString('ar-EG', { month: 'long' });
  };

  const handleGenerateSalaries = async () => {
    console.log('🔥 handleGenerateSalaries called', {
      canEdit,
      user,
      selectedMonth,
      selectedYear,
      showGenerateDialog
    });

    if (!canEdit) {
      console.error('❌ No permission to generate salaries');
      setToast({ message: 'ليس لديك صلاحية لتوليد الرواتب', type: 'error', isOpen: true });
      return;
    }

    try {
      setLoading(true);
      console.log('📤 Sending generate request:', {
        month: selectedMonth,
        year: selectedYear,
        companyId: user?.companyId
      });

      const response = await api.post('/salaries/generate', {
        month: selectedMonth,
        year: selectedYear,
        companyId: user?.companyId
      });

      console.log('✅ Generate response:', response.data);

      setToast({ message: 'تم توليد الرواتب بنجاح', type: 'success', isOpen: true });
      setShowGenerateDialog(false);
      await loadSalaries();
      await loadStatistics();
    } catch (error: any) {
      console.error('❌ Error generating salaries:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      const errorMsg = error?.response?.data?.message || 'حدث خطأ في توليد الرواتب';
      setToast({ message: errorMsg, type: 'error', isOpen: true });
    } finally {
      setLoading(false);
      console.log('🏁 Generate salaries finished');
    }
  };

  const openEditModal = (salary: Salary) => {
    if (!canEdit) {
      setToast({ message: 'ليس لديك صلاحية لتعديل الرواتب', type: 'error', isOpen: true });
      return;
    }

    setEditingSalary(salary);
    setFormData({
      baseSalary: salary.baseSalary,
      bonuses: [...salary.bonuses],
      allowances: [...salary.allowances],
      deductions: [...salary.deductions],
      lateDeductions: [...salary.lateDeductions],
      absenceDeductions: [...salary.absenceDeductions],
      notes: salary.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSalary) return;

    try {
      setLoading(true);
      await api.put(`/salaries/${editingSalary._id}`, formData);

      setToast({ message: 'تم تحديث الراتب بنجاح', type: 'success', isOpen: true });
      setShowEditModal(false);
      await loadSalaries();
      await loadStatistics();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'حدث خطأ في تحديث الراتب';
      setToast({ message: errorMsg, type: 'error', isOpen: true });
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentStatus = async (salaryId: string) => {
    console.log('💰 togglePaymentStatus called with:', {
      salaryId,
      type: typeof salaryId,
      isUndefined: salaryId === 'undefined',
      isEmpty: !salaryId
    });

    if (!canEdit) {
      setToast({ message: 'ليس لديك صلاحية لتغيير حالة الصرف', type: 'error', isOpen: true });
      return;
    }

    // Validate salaryId
    if (!salaryId || salaryId === 'undefined') {
      console.error('❌ Invalid salaryId:', salaryId);
      setToast({ message: 'معرف الراتب غير صحيح', type: 'error', isOpen: true });
      return;
    }

    try {
      console.log('📤 Sending toggle payment request for:', salaryId);
      await api.patch(`/salaries/${salaryId}/toggle-payment`, {
        paymentMethod: 'bank_transfer'
      });

      console.log('✅ Payment status toggled successfully');
      setToast({ message: 'تم تحديث حالة الصرف بنجاح', type: 'success', isOpen: true });
      await loadSalaries();
      await loadStatistics();
    } catch (error: any) {
      console.error('❌ Error toggling payment status:', error);
      const errorMsg = error?.response?.data?.message || 'حدث خطأ في تحديث حالة الصرف';
      setToast({ message: errorMsg, type: 'error', isOpen: true });
    }
  };

  const addItem = (type: 'bonuses' | 'allowances' | 'deductions') => {
    setFormData({
      ...formData,
      [type]: [...formData[type], { description: '', amount: 0 }]
    });
  };

  const updateItem = (type: 'bonuses' | 'allowances' | 'deductions', index: number, field: 'description' | 'amount', value: string | number) => {
    const items = [...formData[type]];
    items[index] = { ...items[index], [field]: value };
    setFormData({ ...formData, [type]: items });
  };

  const removeItem = (type: 'bonuses' | 'allowances' | 'deductions', index: number) => {
    const items = [...formData[type]];
    items.splice(index, 1);
    setFormData({ ...formData, [type]: items });
  };

  const calculatePreviewTotal = () => {
    const totalBonuses = formData.bonuses.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    const totalAllowances = formData.allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalDeductions = formData.deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const totalLateDeductions = formData.lateDeductions.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalAbsenceDeductions = formData.absenceDeductions.reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const additions = totalBonuses + totalAllowances;
    const deductions = totalDeductions + totalLateDeductions + totalAbsenceDeductions;

    return {
      baseSalary: formData.baseSalary,
      additions,
      deductions,
      netSalary: formData.baseSalary + additions - deductions
    };
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto font-outfit">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">الرواتب الشهرية</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة رواتب الموظفين</p>
        </div>
        <div className="flex gap-3">
          {canEdit && salaries.length === 0 && (
            <Button
              onClick={() => {
                console.log('🔵 Generate button clicked - opening dialog');
                setShowGenerateDialog(true);
              }}
              variant="primary"
              className="gap-2 bg-brand-600 hover:bg-brand-500"
              disabled={loading}
            >
              <Plus className="w-4 h-4" />
              توليد الرواتب
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <Card.Body className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-brand-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-brand-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = 2024 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الموظفين"
          value={statistics.totalEmployees.toString()}
          icon={<Users className="w-6 h-6" />}
          iconColor="info"
        />
        <StatCard
          title="إجمالي الرواتب"
          value={`${statistics.totalNetSalary.toLocaleString()}`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="success"
        />
        <StatCard
          title="تم الصرف"
          value={`${statistics.paidCount} (${statistics.totalPaid.toLocaleString()})`}
          icon={<Check className="w-6 h-6" />}
          iconColor="blue"
        />
        <StatCard
          title="لم يتم الصرف"
          value={`${statistics.unpaidCount} (${statistics.totalUnpaid.toLocaleString()})`}
          icon={<AlertCircle className="w-6 h-6" />}
          iconColor="orange"
        />
      </div>

      {/* Salaries List */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            رواتب {getMonthName(selectedMonth)} {selectedYear}
          </h2>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
            </div>
          ) : salaries.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد رواتب</h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                لم يتم توليد الرواتب لهذا الشهر بعد
              </p>
              {canEdit && (
                <Button
                  onClick={() => {
                    console.log('Generate button clicked');
                    setShowGenerateDialog(true);
                  }}
                  variant="primary"
                  className="gap-2 bg-brand-600 hover:bg-brand-500"
                >
                  <Plus className="w-4 h-4" />
                  توليد الرواتب
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-100 dark:bg-gray-800/50 border-b border-brand-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      الموظف
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      الوظيفة
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      الراتب الأساسي
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      الصافي
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      حالة الصرف
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {salaries.map((salary) => (
                    <React.Fragment key={salary._id}>
                      <tr className="hover:bg-brand-100/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {salary.employeeId?.name || 'غير محدد'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {salary.employeeId?.email || ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                          {salary.employeeId?.position || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {salary.baseSalary.toLocaleString()} {getCurrencySymbol(salary.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                            {salary.netSalary.toLocaleString()} {getCurrencySymbol(salary.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {canEdit ? (
                            <button
                              onClick={() => {
                                console.log('🔴 Button clicked, salary object:', {
                                  _id: salary._id,
                                  id: (salary as any).id,
                                  keys: Object.keys(salary),
                                  fullObject: salary
                                });
                                togglePaymentStatus(salary._id);
                              }}
                              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                salary.isPaid
                                  ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 hover:bg-success-200 dark:hover:bg-success-900/50'
                                  : 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 hover:bg-warning-200 dark:hover:bg-warning-900/50'
                              }`}
                            >
                              {salary.isPaid ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  تم الصرف
                                </>
                              ) : (
                                <>
                                  <X className="w-4 h-4" />
                                  لم يتم الصرف
                                </>
                              )}
                            </button>
                          ) : (
                            <Badge variant={salary.isPaid ? 'success' : 'warning'}>
                              {salary.isPaid ? 'تم الصرف' : 'لم يتم الصرف'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setExpandedRow(expandedRow === salary._id ? null : salary._id)}
                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                              title="عرض التفاصيل"
                            >
                              {expandedRow === salary._id ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(salary)}
                                className="p-2 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/20 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                                title="تعديل"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRow === salary._id && (
                        <tr className="bg-gray-50 dark:bg-gray-800/30">
                          <td colSpan={6} className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Additions */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-success-600" />
                                  الإضافات
                                </h4>
                                <div className="space-y-2">
                                  {salary.bonuses.map((bonus, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">{bonus.description}</span>
                                      <span className="text-success-600 dark:text-success-400 font-medium">
                                        +{bonus.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                  {salary.allowances.map((allowance, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">{allowance.description}</span>
                                      <span className="text-success-600 dark:text-success-400 font-medium">
                                        +{allowance.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                  {salary.bonuses.length === 0 && salary.allowances.length === 0 && (
                                    <p className="text-gray-400 dark:text-gray-500 text-sm">لا توجد إضافات</p>
                                  )}
                                </div>
                              </div>

                              {/* Deductions */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <TrendingDown className="w-4 h-4 text-error-600" />
                                  الخصومات
                                </h4>
                                <div className="space-y-2">
                                  {salary.deductions.map((deduction, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">{deduction.description}</span>
                                      <span className="text-error-600 dark:text-error-400 font-medium">
                                        -{deduction.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                  {salary.lateDeductions.map((late, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">
                                        تأخير ({late.minutes} دقيقة)
                                      </span>
                                      <span className="text-error-600 dark:text-error-400 font-medium">
                                        -{late.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                  {salary.absenceDeductions.map((absence, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-600 dark:text-gray-400">غياب</span>
                                      <span className="text-error-600 dark:text-error-400 font-medium">
                                        -{absence.amount.toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                  {salary.deductions.length === 0 &&
                                    salary.lateDeductions.length === 0 &&
                                    salary.absenceDeductions.length === 0 && (
                                      <p className="text-gray-400 dark:text-gray-500 text-sm">لا توجد خصومات</p>
                                    )}
                                </div>
                              </div>

                              {/* Summary */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-brand-600" />
                                  الملخص
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">الراتب الأساسي</span>
                                    <span className="font-medium">{salary.baseSalary.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-success-600 dark:text-success-400">إجمالي الإضافات</span>
                                    <span className="text-success-600 dark:text-success-400 font-medium">
                                      +{(salary.totalBonuses + salary.totalAllowances).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-error-600 dark:text-error-400">إجمالي الخصومات</span>
                                    <span className="text-error-600 dark:text-error-400 font-medium">
                                      -
                                      {(
                                        salary.totalDeductions +
                                        salary.totalLateDeductions +
                                        salary.totalAbsenceDeductions
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between font-bold">
                                      <span className="text-gray-900 dark:text-white">الصافي</span>
                                      <span className="text-brand-600 dark:text-brand-400">
                                        {salary.netSalary.toLocaleString()} {getCurrencySymbol(salary.currency)}
                                      </span>
                                    </div>
                                  </div>
                                  {salary.notes && (
                                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                      <p className="text-sm text-gray-600 dark:text-gray-400">{salary.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`تعديل راتب ${editingSalary?.employeeId?.name || ''}`}
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Base Salary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الراتب الأساسي
            </label>
            <Input
              type="number"
              value={formData.baseSalary}
              onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
              min="0"
              step="0.01"
            />
            <p className="mt-1 text-xs text-gray-500">
              سيتم تحديث الراتب الأساسي في بيانات الموظف تلقائياً
            </p>
          </div>

          {/* Bonuses */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الحوافز</label>
              <Button size="sm" variant="outline" onClick={() => addItem('bonuses')}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {formData.bonuses.map((bonus, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="الوصف"
                    value={bonus.description}
                    onChange={(e) => updateItem('bonuses', idx, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="المبلغ"
                    value={bonus.amount}
                    onChange={(e) => updateItem('bonuses', idx, 'amount', Number(e.target.value))}
                    className="w-32"
                  />
                  <button
                    onClick={() => removeItem('bonuses', idx)}
                    className="p-2 text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Allowances */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">البدلات</label>
              <Button size="sm" variant="outline" onClick={() => addItem('allowances')}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {formData.allowances.map((allowance, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="الوصف"
                    value={allowance.description}
                    onChange={(e) => updateItem('allowances', idx, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="المبلغ"
                    value={allowance.amount}
                    onChange={(e) => updateItem('allowances', idx, 'amount', Number(e.target.value))}
                    className="w-32"
                  />
                  <button
                    onClick={() => removeItem('allowances', idx)}
                    className="p-2 text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الخصومات</label>
              <Button size="sm" variant="outline" onClick={() => addItem('deductions')}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {formData.deductions.map((deduction, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="الوصف"
                    value={deduction.description}
                    onChange={(e) => updateItem('deductions', idx, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="المبلغ"
                    value={deduction.amount}
                    onChange={(e) => updateItem('deductions', idx, 'amount', Number(e.target.value))}
                    className="w-32"
                  />
                  <button
                    onClick={() => removeItem('deductions', idx)}
                    className="p-2 text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="ملاحظات إضافية"
            />
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">معاينة الحساب</h4>
            {(() => {
              const preview = calculatePreviewTotal();
              return (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>الراتب الأساسي</span>
                    <span className="font-medium">{preview.baseSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-success-600">
                    <span>الإضافات</span>
                    <span className="font-medium">+{preview.additions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-error-600">
                    <span>الخصومات</span>
                    <span className="font-medium">-{preview.deductions.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-lg">
                    <span>الصافي</span>
                    <span className="text-brand-600">{preview.netSalary.toLocaleString()}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={handleSaveEdit} variant="primary" className="flex-1" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
          <Button onClick={() => setShowEditModal(false)} variant="outline" className="flex-1">
            إلغاء
          </Button>
        </div>
      </Modal>

      {/* Generate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onConfirm={handleGenerateSalaries}
        title="توليد الرواتب"
        message={`هل أنت متأكد من توليد الرواتب لشهر ${getMonthName(selectedMonth)} ${selectedYear}؟ سيتم إنشاء سجل راتب لكل موظف نشط.`}
        type="info"
        confirmText="توليد"
        cancelText="إلغاء"
      />

      {/* Toast */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
};

export default Salaries;
