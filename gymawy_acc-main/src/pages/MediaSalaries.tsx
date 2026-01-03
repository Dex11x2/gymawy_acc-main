import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Card, Badge, Button, Table } from '../components/ui';
import {
  Video,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Award,
  Calendar,
  Settings,
  DollarSign,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  Users,
  RefreshCw
} from 'lucide-react';

type ContentType = 'short_video' | 'long_video' | 'vlog' | 'podcast' | 'post_design' | 'thumbnail';

interface ContentPrice {
  id: string;
  type: ContentType;
  nameAr: string;
  price: number;
  currency: 'SAR' | 'USD' | 'EGP';
}

interface EmployeeWithPrices {
  employee: {
    _id: string;
    name: string;
    position?: string;
  };
  prices: ContentPrice[];
}

interface EmployeeAchievement {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  items: {
    contentType: ContentType;
    quantity: number;
    price: number;
    total: number;
  }[];
  totalAmount: number;
  syncedToPayroll?: boolean;
  syncedAt?: Date;
}

const CONTENT_TYPES = {
  short_video: 'فيديو قصير (Short Video)',
  long_video: 'فيديو طويل (Long-form Video)',
  vlog: 'فلوج (Vlog)',
  podcast: 'بودكاست (Podcast)',
  post_design: 'تصميم بوست (Post Design)',
  thumbnail: 'صورة مصغرة (Thumbnail)'
};

const MediaSalaries: React.FC = () => {
  const { user } = useAuthStore();
  const { loadPayrolls, employees } = useDataStore();
  const { canWrite, canRead } = usePermissions();

  // الصلاحيات المنفصلة لإعدادات الأسعار وإنجازات الموظفين
  const canViewPrices = canRead('media_salaries_prices');
  const canEditPrices = canWrite('media_salaries_prices');
  const canViewAchievements = canRead('media_salaries_achievements');

  // التحقق من إذا كان الموظف الحالي من نوع الراتب المتغير
  const currentEmployee = employees.find((e: any) => e.userId === user?.id || e.userId?._id === user?.id);

  // صلاحية تعديل الإنجازات: المدير العام، المدير الإداري، أو super_admin فقط
  const isAdmin = currentEmployee?.isGeneralManager || currentEmployee?.isAdministrativeManager || user?.role === 'super_admin' || user?.role === 'general_manager' || user?.role === 'administrative_manager';
  const isVariableSalaryEmployee = currentEmployee?.salaryType === 'variable';

  // للتوافق مع النظام القديم - يمكن الوصول إذا كان لديه أي من الصلاحيتين أو موظف ميديا
  const canViewMedia = canViewPrices || canViewAchievements || isVariableSalaryEmployee;

  // تحديد التاب الافتراضي
  const getDefaultTab = () => {
    if (canViewPrices) return 'prices';
    if (canViewAchievements) return 'achievements';
    if (isVariableSalaryEmployee) return 'my-achievements';
    return 'prices';
  };

  const [activeTab, setActiveTab] = useState<'prices' | 'achievements' | 'my-achievements'>(getDefaultTab());
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);

  // State لاختيار الموظف في تاب الأسعار
  const [selectedEmployeeForPrices, setSelectedEmployeeForPrices] = useState<string>('');
  const [employeesWithPrices, setEmployeesWithPrices] = useState<EmployeeWithPrices[]>([]);
  const [currentEmployeePrices, setCurrentEmployeePrices] = useState<ContentPrice[]>([]);

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ContentPrice | null>(null);

  // Achievements State - من قاعدة البيانات
  const [achievements, setAchievements] = useState<EmployeeAchievement[]>([]);
  const [myAchievements, setMyAchievements] = useState<EmployeeAchievement[]>([]);
  const [isLoadingMyAchievements, setIsLoadingMyAchievements] = useState(false);
  const [selectedEmployeeForAchievement, setSelectedEmployeeForAchievement] = useState<string>('');

  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<EmployeeAchievement | null>(null);
  const [isMyAchievementMode, setIsMyAchievementMode] = useState(false); // للتفرقة بين إنجازاتي وإنجازات الموظفين
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'price' | 'achievement'>('price');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean }>({
    message: '', type: 'success', isOpen: false
  });

  const [priceFormData, setPriceFormData] = useState({
    type: 'short_video' as ContentType,
    price: '' as number | '',
    currency: 'SAR' as 'SAR' | 'USD' | 'EGP'
  });

  const [achievementFormData, setAchievementFormData] = useState({
    employeeId: '',
    employeeName: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    items: [] as { contentType: ContentType; quantity: number }[]
  });

  // Load payrolls on mount
  useEffect(() => {
    loadPayrolls();
  }, [loadPayrolls]);

  // جلب جميع الموظفين مع أسعارهم
  const fetchAllEmployeesWithPrices = useCallback(async () => {
    try {
      setIsLoadingPrices(true);
      const response = await api.get('/media-prices/all-employees');
      const data = response.data
        .filter((item: any) => item.employee && (item.employee._id || item.employee.id)) // تصفية الموظفين بدون معرف
        .map((item: any) => ({
          employee: {
            _id: item.employee._id || item.employee.id, // ضمان وجود _id
            name: item.employee.name,
            position: item.employee.position
          },
          prices: item.prices.map((p: any) => ({
            id: p._id || p.id, // ضمان وجود id
            type: p.type,
            nameAr: p.nameAr,
            price: p.price,
            currency: p.currency
          }))
        }));
      setEmployeesWithPrices(data);

      // إذا لم يكن هناك موظف مختار، اختر الأول
      if (!selectedEmployeeForPrices && data.length > 0) {
        setSelectedEmployeeForPrices(data[0].employee._id);
        setCurrentEmployeePrices(data[0].prices);
      }
    } catch (error) {
      console.error('Error fetching employees with prices:', error);
      setToast({ message: 'حدث خطأ أثناء جلب بيانات الموظفين', type: 'error', isOpen: true });
    } finally {
      setIsLoadingPrices(false);
    }
  }, [selectedEmployeeForPrices]);

  // جلب أسعار موظف معين
  const fetchEmployeePrices = useCallback(async (employeeId: string) => {
    if (!employeeId) return;
    try {
      setIsLoadingPrices(true);
      const response = await api.get(`/media-prices/employee/${employeeId}`);
      const fetchedPrices = response.data
        .filter((p: any) => p._id || p.id) // تصفية الأسعار بدون معرف
        .map((p: any) => ({
          id: p._id || p.id, // ضمان وجود id
          type: p.type,
          nameAr: p.nameAr,
          price: p.price,
          currency: p.currency
        }));
      setCurrentEmployeePrices(fetchedPrices);
    } catch (error) {
      console.error('Error fetching employee prices:', error);
      setToast({ message: 'حدث خطأ أثناء جلب أسعار الموظف', type: 'error', isOpen: true });
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  // جلب الإنجازات من قاعدة البيانات
  const fetchAchievements = useCallback(async () => {
    try {
      setIsLoadingAchievements(true);
      const response = await api.get('/media-achievements', {
        params: { month: selectedMonth, year: selectedYear }
      });
      const data = response.data.map((a: any) => ({
        id: String(a._id),
        employeeId: String(a.employeeId?._id || a.employeeId),
        employeeName: a.employeeId?.name || 'غير معروف',
        month: a.month,
        year: a.year,
        items: a.items,
        totalAmount: a.totalAmount,
        syncedToPayroll: a.syncedToPayroll,
        syncedAt: a.syncedAt
      }));
      setAchievements(data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setToast({ message: 'حدث خطأ أثناء جلب الإنجازات', type: 'error', isOpen: true });
    } finally {
      setIsLoadingAchievements(false);
    }
  }, [selectedMonth, selectedYear]);

  // جلب إنجازاتي (للموظف الحالي فقط)
  const fetchMyAchievements = useCallback(async () => {
    try {
      setIsLoadingMyAchievements(true);
      const response = await api.get('/media-achievements/my-achievements', {
        params: { month: selectedMonth, year: selectedYear }
      });
      const data = response.data.map((a: any) => ({
        id: String(a._id),
        employeeId: String(a.employeeId?._id || a.employeeId),
        employeeName: a.employeeId?.name || 'غير معروف',
        month: a.month,
        year: a.year,
        items: a.items,
        totalAmount: a.totalAmount,
        syncedToPayroll: a.syncedToPayroll,
        syncedAt: a.syncedAt
      }));
      setMyAchievements(data);
    } catch (error) {
      console.error('Error fetching my achievements:', error);
      setToast({ message: 'حدث خطأ أثناء جلب إنجازاتك', type: 'error', isOpen: true });
    } finally {
      setIsLoadingMyAchievements(false);
    }
  }, [selectedMonth, selectedYear]);

  // جلب البيانات عند تغيير التاب
  useEffect(() => {
    if (activeTab === 'prices' && canViewPrices) {
      fetchAllEmployeesWithPrices();
    } else if (activeTab === 'achievements' && canViewAchievements) {
      fetchAchievements();
      // جلب الموظفين ذوي الراتب المتغير لاستخدامهم في مودال إضافة الإنجازات
      if (employeesWithPrices.length === 0) {
        fetchAllEmployeesWithPrices();
      }
    } else if (activeTab === 'my-achievements' && isVariableSalaryEmployee) {
      fetchMyAchievements();
    }
  }, [activeTab, canViewPrices, canViewAchievements, isVariableSalaryEmployee, fetchAllEmployeesWithPrices, fetchAchievements, fetchMyAchievements, employeesWithPrices.length]);

  // تحديث الأسعار عند تغيير الموظف المختار
  useEffect(() => {
    if (selectedEmployeeForPrices) {
      const employeeData = employeesWithPrices.find(e => e.employee._id === selectedEmployeeForPrices);
      if (employeeData) {
        setCurrentEmployeePrices(employeeData.prices);
      } else {
        fetchEmployeePrices(selectedEmployeeForPrices);
      }
    }
  }, [selectedEmployeeForPrices, employeesWithPrices, fetchEmployeePrices]);

  // جلب الإنجازات عند تغيير الشهر/السنة
  useEffect(() => {
    if (activeTab === 'achievements') {
      fetchAchievements();
    }
  }, [selectedMonth, selectedYear, activeTab, fetchAchievements]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      SAR: 'ر.س',
      USD: '$',
      EGP: 'ج.م'
    };
    return symbols[currency] || currency;
  };

  // Price Handlers
  const openEditPrice = (price: ContentPrice) => {
    if (!canEditPrices) {
      setToast({ message: 'ليس لديك صلاحية لتعديل الأسعار', type: 'error', isOpen: true });
      return;
    }
    setEditingPrice(price);
    setPriceFormData({ type: price.type, price: price.price, currency: price.currency });
    setShowPriceModal(true);
  };

  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeForPrices || !editingPrice) {
      setToast({ message: 'يرجى اختيار موظف والسعر المراد تعديله', type: 'error', isOpen: true });
      return;
    }

    // التحقق من وجود معرفات صالحة
    if (!editingPrice.id) {
      setToast({ message: 'خطأ: معرف السعر غير صالح', type: 'error', isOpen: true });
      return;
    }

    try {
      // تحديث السعر في قاعدة البيانات
      await api.put(`/media-prices/employee/${selectedEmployeeForPrices}/${editingPrice.id}`, {
        price: Number(priceFormData.price),
        currency: priceFormData.currency,
        nameAr: CONTENT_TYPES[priceFormData.type].split(' (')[0]
      });

      // تحديث الـ state المحلي
      setCurrentEmployeePrices(currentEmployeePrices.map(p =>
        p.id === editingPrice.id
          ? { ...p, price: Number(priceFormData.price), currency: priceFormData.currency }
          : p
      ));

      // تحديث employeesWithPrices
      setEmployeesWithPrices(employeesWithPrices.map(e =>
        e.employee._id === selectedEmployeeForPrices
          ? {
              ...e,
              prices: e.prices.map(p =>
                p.id === editingPrice.id
                  ? { ...p, price: Number(priceFormData.price), currency: priceFormData.currency }
                  : p
              )
            }
          : e
      ));

      setToast({ message: 'تم تحديث السعر بنجاح', type: 'success', isOpen: true });
      setShowPriceModal(false);
    } catch (error: any) {
      console.error('Error saving price:', error);
      setToast({ message: error.response?.data?.message || 'حدث خطأ أثناء حفظ السعر', type: 'error', isOpen: true });
    }
  };

  // Achievement Handlers
  // الموظفين ذوي الراتب المتغير فقط (للإنجازات)
  const variableSalaryEmployees = employeesWithPrices.map(e => ({
    id: e.employee._id,
    name: e.employee.name,
    position: e.employee.position
  }));

  const openAddAchievement = () => {
    const firstEmployee = variableSalaryEmployees[0];
    setIsMyAchievementMode(false);
    setEditingAchievement(null);
    setSelectedEmployeeForAchievement(firstEmployee?.id || '');
    setAchievementFormData({
      employeeId: firstEmployee?.id || '',
      employeeName: firstEmployee?.name || '',
      month: selectedMonth,
      year: selectedYear,
      items: []
    });
    setShowAchievementModal(true);
  };

  const openEditAchievement = (achievement: EmployeeAchievement) => {
    if (achievement.syncedToPayroll) {
      setToast({ message: 'لا يمكن تعديل إنجازات تمت مزامنتها مع الراتب', type: 'warning', isOpen: true });
      return;
    }
    setIsMyAchievementMode(false);
    setEditingAchievement(achievement);
    setSelectedEmployeeForAchievement(achievement.employeeId);
    setAchievementFormData({
      employeeId: achievement.employeeId,
      employeeName: achievement.employeeName,
      month: achievement.month,
      year: achievement.year,
      items: achievement.items.map(item => ({ contentType: item.contentType, quantity: item.quantity }))
    });
    setShowAchievementModal(true);
  };

  // فتح مودال إضافة إنجازاتي (للموظف نفسه)
  const openAddMyAchievement = () => {
    if (!currentEmployee) {
      setToast({ message: 'لم يتم العثور على بيانات الموظف', type: 'error', isOpen: true });
      return;
    }
    setIsMyAchievementMode(true);
    setEditingAchievement(null);
    setSelectedEmployeeForAchievement(currentEmployee.id);
    setAchievementFormData({
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      month: selectedMonth,
      year: selectedYear,
      items: []
    });
    setShowAchievementModal(true);
  };

  // فتح مودال تعديل إنجازاتي (للموظف نفسه)
  const openEditMyAchievement = (achievement: EmployeeAchievement) => {
    if (achievement.syncedToPayroll) {
      setToast({ message: 'لا يمكن تعديل إنجازات تمت مزامنتها مع الراتب. تواصل مع الإدارة.', type: 'warning', isOpen: true });
      return;
    }
    setIsMyAchievementMode(true);
    setEditingAchievement(achievement);
    setSelectedEmployeeForAchievement(achievement.employeeId);
    setAchievementFormData({
      employeeId: achievement.employeeId,
      employeeName: achievement.employeeName,
      month: achievement.month,
      year: achievement.year,
      items: achievement.items.map(item => ({ contentType: item.contentType, quantity: item.quantity }))
    });
    setShowAchievementModal(true);
  };

  // تحميل أسعار الموظف المختار للإنجاز
  const [selectedEmployeeAchievementPrices, setSelectedEmployeeAchievementPrices] = useState<ContentPrice[]>([]);

  useEffect(() => {
    const loadPricesForAchievement = async () => {
      if (selectedEmployeeForAchievement && showAchievementModal) {
        try {
          const response = await api.get(`/media-prices/employee/${selectedEmployeeForAchievement}`);
          const fetchedPrices = response.data.map((p: any) => ({
            id: p._id,
            type: p.type,
            nameAr: p.nameAr,
            price: p.price,
            currency: p.currency
          }));
          setSelectedEmployeeAchievementPrices(fetchedPrices);
        } catch (error) {
          console.error('Error fetching prices for achievement:', error);
        }
      }
    };
    loadPricesForAchievement();
  }, [selectedEmployeeForAchievement, showAchievementModal]);

  const addAchievementItem = () => {
    setAchievementFormData({
      ...achievementFormData,
      items: [...achievementFormData.items, { contentType: 'short_video', quantity: 0 }]
    });
  };

  const removeAchievementItem = (index: number) => {
    setAchievementFormData({
      ...achievementFormData,
      items: achievementFormData.items.filter((_, i) => i !== index)
    });
  };

  const updateAchievementItem = (index: number, field: 'contentType' | 'quantity', value: any) => {
    const newItems = [...achievementFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setAchievementFormData({ ...achievementFormData, items: newItems });
  };

  const handleEmployeeChangeForAchievement = (employeeId: string) => {
    const employee = variableSalaryEmployees.find(e => e.id === employeeId);
    setSelectedEmployeeForAchievement(employeeId);
    setAchievementFormData({
      ...achievementFormData,
      employeeId,
      employeeName: employee?.name || ''
    });
  };

  const handleAchievementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMyAchievementMode && !achievementFormData.employeeId) {
      setToast({ message: 'يرجى اختيار الموظف', type: 'error', isOpen: true });
      return;
    }

    if (achievementFormData.items.length === 0) {
      setToast({ message: 'يرجى إضافة إنجازات', type: 'error', isOpen: true });
      return;
    }

    const itemsWithPrices = achievementFormData.items.map(item => {
      const price = selectedEmployeeAchievementPrices.find(p => p.type === item.contentType)?.price || 0;
      return {
        contentType: item.contentType,
        quantity: item.quantity,
        price,
        total: item.quantity * price
      };
    });

    try {
      if (isMyAchievementMode) {
        // وضع إنجازاتي - الموظف يضيف/يعدل لنفسه
        if (editingAchievement) {
          await api.put(`/media-achievements/my-achievements/${editingAchievement.id}`, {
            items: itemsWithPrices
          });
          setToast({ message: 'تم تحديث إنجازاتك بنجاح', type: 'success', isOpen: true });
        } else {
          await api.post('/media-achievements/my-achievements', {
            month: achievementFormData.month,
            year: achievementFormData.year,
            items: itemsWithPrices
          });
          setToast({ message: 'تم إضافة إنجازاتك بنجاح', type: 'success', isOpen: true });
        }
        setShowAchievementModal(false);
        fetchMyAchievements(); // إعادة تحميل إنجازاتي
      } else {
        // وضع الإدارة - المدير يضيف/يعدل للموظفين
        if (editingAchievement) {
          await api.put(`/media-achievements/${editingAchievement.id}`, {
            items: itemsWithPrices
          });
          setToast({ message: 'تم تحديث الإنجازات بنجاح', type: 'success', isOpen: true });
        } else {
          await api.post('/media-achievements', {
            employeeId: achievementFormData.employeeId,
            month: achievementFormData.month,
            year: achievementFormData.year,
            items: itemsWithPrices
          });
          setToast({ message: 'تم إضافة الإنجازات بنجاح', type: 'success', isOpen: true });
        }
        setShowAchievementModal(false);
        fetchAchievements(); // إعادة تحميل الإنجازات
      }
    } catch (error: any) {
      console.error('Error saving achievement:', error);
      const message = error.response?.data?.message || 'حدث خطأ أثناء حفظ الإنجازات';
      setToast({ message, type: 'error', isOpen: true });
    }
  };

  const handleDeleteAchievement = (id: string) => {
    console.log('handleDeleteAchievement called with id:', id);
    const achievement = achievements.find(a => a.id === id);
    if (achievement?.syncedToPayroll) {
      setToast({ message: 'لا يمكن حذف إنجازات تمت مزامنتها مع الراتب', type: 'warning', isOpen: true });
      return;
    }
    if (!id) {
      console.error('Achievement ID is undefined or empty');
      setToast({ message: 'خطأ: معرف الإنجاز غير موجود', type: 'error', isOpen: true });
      return;
    }
    setDeleteId(id);
    setDeleteType('achievement');
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) {
      console.error('Delete failed: deleteId is empty');
      setToast({ message: 'خطأ: لم يتم تحديد العنصر للحذف', type: 'error', isOpen: true });
      return;
    }

    try {
      if (deleteType === 'achievement') {
        console.log('Deleting achievement with ID:', deleteId);
        await api.delete(`/media-achievements/${deleteId}`);
        setAchievements(achievements.filter(a => a.id !== deleteId));
        setToast({ message: 'تم حذف الإنجازات بنجاح', type: 'success', isOpen: true });
      }
      setDeleteId(null);
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Error deleting:', error);
      setToast({ message: error.response?.data?.message || 'حدث خطأ أثناء الحذف', type: 'error', isOpen: true });
    }
  };

  // Sync achievement to payroll
  const syncToPayroll = async (achievement: EmployeeAchievement) => {
    try {
      await api.post(`/media-achievements/${achievement.id}/sync-payroll`);

      // تحديث الـ state المحلي
      setAchievements(achievements.map(a =>
        a.id === achievement.id
          ? { ...a, syncedToPayroll: true, syncedAt: new Date() }
          : a
      ));

      setToast({
        message: 'تم إضافة الإنجازات للراتب الشهري بنجاح',
        type: 'success',
        isOpen: true
      });

      // Reload payrolls to reflect changes
      await loadPayrolls();
    } catch (error: any) {
      console.error('Error syncing to payroll:', error);
      setToast({
        message: error.response?.data?.message || 'حدث خطأ أثناء إضافة الإنجازات للراتب',
        type: 'error',
        isOpen: true
      });
    }
  };

  const filteredAchievements = achievements;

  // Calculate monthly summary for current filter
  const monthlySummary = filteredAchievements.reduce((acc, achievement) => {
    acc.totalAmount += achievement.totalAmount;
    acc.syncedCount += achievement.syncedToPayroll ? 1 : 0;
    acc.totalItems += achievement.items.reduce((sum, item) => sum + item.quantity, 0);
    return acc;
  }, { totalAmount: 0, syncedCount: 0, totalItems: 0 });

  // Permission Guard
  if (!canViewMedia) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى رواتب الميديا</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            رواتب الميديا
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة أسعار المحتوى لكل موظف وتسجيل إنجازاتهم</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 space-x-reverse">
          {canViewPrices && (
            <button
              onClick={() => setActiveTab('prices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'prices'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              <Settings className="w-4 h-4 inline ml-2" />
              أسعار الموظفين
            </button>
          )}
          {canViewAchievements && (
            <button
              onClick={() => setActiveTab('achievements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'achievements'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              <Award className="w-4 h-4 inline ml-2" />
              إنجازات الموظفين
            </button>
          )}
          {isVariableSalaryEmployee && (
            <button
              onClick={() => setActiveTab('my-achievements')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-achievements'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              <User className="w-4 h-4 inline ml-2" />
              إنجازاتي
            </button>
          )}
        </nav>
      </div>

      {/* Prices Tab */}
      {activeTab === 'prices' && canViewPrices && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">أسعار أنواع المحتوى</h2>
              <Button variant="ghost" size="sm" onClick={fetchAllEmployeesWithPrices} disabled={isLoadingPrices}>
                <RefreshCw className={`w-4 h-4 ${isLoadingPrices ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* اختيار الموظف */}
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-500" />
              <select
                value={selectedEmployeeForPrices}
                onChange={(e) => setSelectedEmployeeForPrices(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[200px]"
              >
                <option value="">اختر موظف...</option>
                {employeesWithPrices.filter(item => item.employee._id).map(item => (
                  <option key={item.employee._id} value={item.employee._id}>
                    {item.employee.name} {item.employee.position ? `- ${item.employee.position}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedEmployeeForPrices ? (
            <Card>
              <Card.Body className="p-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {employeesWithPrices.find(e => e.employee._id === selectedEmployeeForPrices)?.employee.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {employeesWithPrices.find(e => e.employee._id === selectedEmployeeForPrices)?.employee.position || 'لا يوجد منصب'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>نوع المحتوى</Table.Head>
                        <Table.Head>السعر</Table.Head>
                        <Table.Head>العملة</Table.Head>
                        {canEditPrices && <Table.Head>الإجراءات</Table.Head>}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {currentEmployeePrices.length === 0 ? (
                        <Table.Row>
                          <Table.Cell colSpan={canEditPrices ? 4 : 3}>
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              {isLoadingPrices ? 'جاري تحميل الأسعار...' : 'لا توجد أسعار محددة لهذا الموظف'}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ) : (
                        currentEmployeePrices.map(price => (
                          <Table.Row key={price.id}>
                            <Table.Cell>
                              <span className="font-medium text-gray-900 dark:text-white">{price.nameAr}</span>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-success-600 dark:text-success-400 font-semibold">
                                {price.price.toFixed(2)}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant="info">{getCurrencySymbol(price.currency)}</Badge>
                            </Table.Cell>
                            {canEditPrices && (
                              <Table.Cell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditPrice(price)}
                                    className="text-brand-600 hover:text-brand-700"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </Table.Cell>
                            )}
                          </Table.Row>
                        ))
                      )}
                    </Table.Body>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Body>
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">اختر موظف لعرض وتعديل أسعاره</p>
                  <p className="text-sm mt-2">كل موظف له أسعار مستقلة لأنواع المحتوى المختلفة</p>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* عرض كل الموظفين مع ملخص أسعارهم */}
          {employeesWithPrices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                ملخص أسعار جميع الموظفين
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeesWithPrices.map(({ employee, prices }) => (
                  <Card
                    key={employee._id}
                    className={`cursor-pointer transition-all ${
                      selectedEmployeeForPrices === employee._id
                        ? 'ring-2 ring-brand-500'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedEmployeeForPrices(employee._id)}
                  >
                    <Card.Body>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{employee.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{employee.position || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {prices.slice(0, 4).map(p => (
                          <div key={p.id} className="flex justify-between bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1">
                            <span className="text-gray-600 dark:text-gray-400 truncate">{p.nameAr}</span>
                            <span className="text-success-600 dark:text-success-400 font-medium">
                              {p.price} {getCurrencySymbol(p.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {prices.length > 4 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          +{prices.length - 4} أنواع أخرى
                        </p>
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {/* Monthly Summary Cards */}
          {filteredAchievements.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                <Card.Body>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">إجمالي الشهر</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                        {monthlySummary.totalAmount.toFixed(2)} {getCurrencySymbol('SAR')}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <Card.Body>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">عدد المحتوى</p>
                      <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        {monthlySummary.totalItems} قطعة
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                <Card.Body>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700 dark:text-purple-300">تمت المزامنة</p>
                      <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                        {monthlySummary.syncedCount} / {filteredAchievements.length}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('ar-EG', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={2024 + i}>
                      {2024 + i}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchAchievements} disabled={isLoadingAchievements}>
                <RefreshCw className={`w-4 h-4 ${isLoadingAchievements ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* زر إضافة إنجازات للموظفين الآخرين - فقط للمدراء */}
            {isAdmin && (
              <Button onClick={openAddAchievement}>
                <Plus className="w-4 h-4" />
                إضافة إنجازات
              </Button>
            )}
          </div>

          <Card>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>الموظف</Table.Head>
                      <Table.Head>الشهر</Table.Head>
                      <Table.Head>عدد المحتوى</Table.Head>
                      <Table.Head>الإجمالي</Table.Head>
                      <Table.Head>الحالة</Table.Head>
                      <Table.Head>الإجراءات</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {isLoadingAchievements ? (
                      <Table.Row>
                        <Table.Cell colSpan={6}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                            جاري التحميل...
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : filteredAchievements.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={6}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد إنجازات لهذا الشهر
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      filteredAchievements.map(achievement => (
                        <Table.Row key={achievement.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{achievement.employeeName}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(achievement.year, achievement.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-blue-600 dark:text-blue-400">
                              {achievement.items.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-success-600 dark:text-success-400 font-bold">
                              {achievement.totalAmount.toFixed(2)} {getCurrencySymbol('SAR')}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            {achievement.syncedToPayroll ? (
                              <Badge variant="success">
                                <CheckCircle className="w-3 h-3 ml-1" />
                                تمت الإضافة للراتب
                              </Badge>
                            ) : (
                              <Badge variant="warning">
                                <AlertCircle className="w-3 h-3 ml-1" />
                                في الانتظار
                              </Badge>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            {/* الإجراءات فقط للمدراء */}
                            {isAdmin ? (
                              <div className="flex gap-2">
                                {!achievement.syncedToPayroll && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => syncToPayroll(achievement)}
                                    className="text-success-600 hover:text-success-700"
                                    title="إضافة للراتب الشهري"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditAchievement(achievement)}
                                  className="text-brand-600 hover:text-brand-700"
                                  disabled={achievement.syncedToPayroll}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAchievement(achievement.id)}
                                  className="text-error-600 hover:text-error-700"
                                  disabled={achievement.syncedToPayroll}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">عرض فقط</span>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* سجل الإنجازات التفصيلي لكل موظف */}
          {filteredAchievements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                سجل تفصيلي حسب الموظف
              </h3>

              {/* تجميع الإنجازات حسب الموظف */}
              {Object.entries(
                filteredAchievements.reduce((acc, achievement) => {
                  if (!acc[achievement.employeeId]) {
                    acc[achievement.employeeId] = {
                      employeeName: achievement.employeeName,
                      achievements: [],
                      totalAmount: 0,
                      totalItems: 0
                    };
                  }
                  acc[achievement.employeeId].achievements.push(achievement);
                  acc[achievement.employeeId].totalAmount += achievement.totalAmount;
                  acc[achievement.employeeId].totalItems += achievement.items.reduce((sum, item) => sum + item.quantity, 0);
                  return acc;
                }, {} as Record<string, { employeeName: string; achievements: EmployeeAchievement[]; totalAmount: number; totalItems: number }>)
              ).map(([employeeId, data]) => (
                <Card key={employeeId}>
                  <Card.Body>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{data.employeeName}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{data.achievements.length} سجل إنجازات</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المحتوى</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{data.totalItems} قطعة</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الراتب</p>
                          <p className="text-lg font-bold text-success-600 dark:text-success-400">{data.totalAmount.toFixed(2)} {getCurrencySymbol('SAR')}</p>
                        </div>
                      </div>
                    </div>

                    {/* تفاصيل كل سجل إنجازات */}
                    <div className="space-y-3">
                      {data.achievements.map((achievement) => (
                        <div key={achievement.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {new Date(achievement.year, achievement.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                              </span>
                              {achievement.syncedToPayroll && (
                                <Badge variant="success" className="text-xs">مزامن</Badge>
                              )}
                            </div>
                            <span className="text-sm font-bold text-success-600 dark:text-success-400">
                              {achievement.totalAmount.toFixed(2)} {getCurrencySymbol('SAR')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {achievement.items.map((item, idx) => (
                              <div key={idx} className="bg-white dark:bg-gray-700 rounded px-2 py-1 text-xs">
                                <span className="text-gray-600 dark:text-gray-400">{CONTENT_TYPES[item.contentType].split(' (')[0]}</span>
                                <div className="flex justify-between">
                                  <span className="font-medium">{item.quantity}×</span>
                                  <span className="text-success-600 dark:text-success-400">{item.total.toFixed(0)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Achievements Tab - للموظف نفسه */}
      {activeTab === 'my-achievements' && isVariableSalaryEmployee && (
        <div className="space-y-6">
          {/* إحصائيات إنجازاتي */}
          {myAchievements.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                <Card.Body>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">إجمالي إنجازاتي</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                        {myAchievements.reduce((sum, a) => sum + a.totalAmount, 0).toFixed(2)} {getCurrencySymbol('SAR')}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <Card.Body>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">عدد المحتوى</p>
                      <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        {myAchievements.reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.quantity, 0), 0)} قطعة
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                <Card.Body>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700 dark:text-purple-300">حالة المزامنة</p>
                      <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                        {myAchievements.filter(a => a.syncedToPayroll).length} / {myAchievements.length}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('ar-EG', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={2024 + i}>
                      {2024 + i}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchMyAchievements} disabled={isLoadingMyAchievements}>
                <RefreshCw className={`w-4 h-4 ${isLoadingMyAchievements ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <Button onClick={openAddMyAchievement}>
              <Plus className="w-4 h-4" />
              إضافة إنجازاتي
            </Button>
          </div>

          <Card>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>الشهر</Table.Head>
                      <Table.Head>عدد المحتوى</Table.Head>
                      <Table.Head>الإجمالي</Table.Head>
                      <Table.Head>الحالة</Table.Head>
                      <Table.Head>الإجراءات</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {isLoadingMyAchievements ? (
                      <Table.Row>
                        <Table.Cell colSpan={5}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                            جاري التحميل...
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : myAchievements.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={5}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد إنجازات لهذا الشهر. أضف إنجازاتك الآن!
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      myAchievements.map(achievement => (
                        <Table.Row key={achievement.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(achievement.year, achievement.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-blue-600 dark:text-blue-400">
                              {achievement.items.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-success-600 dark:text-success-400 font-bold">
                              {achievement.totalAmount.toFixed(2)} {getCurrencySymbol('SAR')}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            {achievement.syncedToPayroll ? (
                              <Badge variant="success">
                                <CheckCircle className="w-3 h-3 ml-1" />
                                تمت الإضافة للراتب
                              </Badge>
                            ) : (
                              <Badge variant="warning">
                                <AlertCircle className="w-3 h-3 ml-1" />
                                في انتظار المراجعة
                              </Badge>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditMyAchievement(achievement)}
                                className="text-brand-600 hover:text-brand-700"
                                disabled={achievement.syncedToPayroll}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* تفاصيل إنجازاتي */}
          {myAchievements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5" />
                تفاصيل إنجازاتي
              </h3>

              {myAchievements.map((achievement) => (
                <Card key={achievement.id}>
                  <Card.Body>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {new Date(achievement.year, achievement.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                        </span>
                        {achievement.syncedToPayroll && (
                          <Badge variant="success" className="text-xs">تم احتسابه في الراتب</Badge>
                        )}
                      </div>
                      <span className="text-lg font-bold text-success-600 dark:text-success-400">
                        {achievement.totalAmount.toFixed(2)} {getCurrencySymbol('SAR')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {achievement.items.map((item, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{CONTENT_TYPES[item.contentType].split(' (')[0]}</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{item.quantity}</p>
                          <p className="text-sm text-success-600 dark:text-success-400">{item.total.toFixed(0)} {getCurrencySymbol('SAR')}</p>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Modal */}
      <Modal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        title="تعديل السعر"
        size="md"
      >
        <form onSubmit={handlePriceSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع المحتوى</label>
            <input
              type="text"
              value={editingPrice ? CONTENT_TYPES[editingPrice.type] : ''}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              disabled
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السعر</label>
              <input
                type="number"
                step="0.01"
                value={priceFormData.price}
                onChange={(e) => setPriceFormData({ ...priceFormData, price: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العملة</label>
              <select
                value={priceFormData.currency}
                onChange={(e) => setPriceFormData({ ...priceFormData, currency: e.target.value as 'SAR' | 'USD' | 'EGP' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="SAR">ر.س - ريال سعودي</option>
                <option value="USD">$ - دولار أمريكي</option>
                <option value="EGP">ج.م - جنيه مصري</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Save className="w-4 h-4" />
              تحديث
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowPriceModal(false)} className="flex-1">
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Achievement Modal */}
      <Modal
        isOpen={showAchievementModal}
        onClose={() => setShowAchievementModal(false)}
        title={
          isMyAchievementMode
            ? (editingAchievement ? 'تعديل إنجازاتي' : 'إضافة إنجازاتي')
            : (editingAchievement ? 'تعديل الإنجازات' : 'إضافة إنجازات جديدة')
        }
        size="lg"
      >
        <form onSubmit={handleAchievementSubmit} className="space-y-4">
          {/* اختيار الموظف - فقط في وضع الإدارة وليس التعديل */}
          {!isMyAchievementMode && !editingAchievement && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموظف</label>
              <select
                value={selectedEmployeeForAchievement}
                onChange={(e) => handleEmployeeChangeForAchievement(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">اختر موظف...</option>
                {variableSalaryEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.position ? `- ${emp.position}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* عرض اسم الموظف في وضع التعديل أو إنجازاتي */}
          {(editingAchievement || isMyAchievementMode) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isMyAchievementMode ? 'إنجازاتك الشخصية' : 'الموظف'}:
                <span className="font-semibold text-gray-900 dark:text-white mr-1">{achievementFormData.employeeName}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
              <select
                value={achievementFormData.month}
                onChange={(e) => setAchievementFormData({ ...achievementFormData, month: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={!!editingAchievement}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleDateString('ar-EG', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السنة</label>
              <select
                value={achievementFormData.year}
                onChange={(e) => setAchievementFormData({ ...achievementFormData, year: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={!!editingAchievement}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={i} value={2024 + i}>
                    {2024 + i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الإنجازات</label>
              <Button type="button" size="sm" onClick={addAchievementItem}>
                <Plus className="w-4 h-4" />
                إضافة عنصر
              </Button>
            </div>

            {achievementFormData.items.map((item, index) => {
              const itemPrice = selectedEmployeeAchievementPrices.find(p => p.type === item.contentType)?.price || 0;
              return (
                <div key={index} className="flex gap-3 items-end p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">نوع المحتوى</label>
                    <select
                      value={item.contentType}
                      onChange={(e) => updateAchievementItem(index, 'contentType', e.target.value as ContentType)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    >
                      {Object.entries(CONTENT_TYPES).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">العدد</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateAchievementItem(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      min="0"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">السعر</label>
                    <input
                      type="text"
                      value={itemPrice}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      disabled
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الإجمالي</label>
                    <input
                      type="text"
                      value={(item.quantity * itemPrice).toFixed(2)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold"
                      disabled
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAchievementItem(index)}
                    className="text-error-600 hover:text-error-700 mb-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            {achievementFormData.items.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                اضغط "إضافة عنصر" لبدء تسجيل الإنجازات
              </div>
            )}

            {/* إجمالي الإنجازات */}
            {achievementFormData.items.length > 0 && (
              <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-left">
                  <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبلغ</p>
                  <p className="text-xl font-bold text-success-600 dark:text-success-400">
                    {achievementFormData.items.reduce((sum, item) => {
                      const price = selectedEmployeeAchievementPrices.find(p => p.type === item.contentType)?.price || 0;
                      return sum + (item.quantity * price);
                    }, 0).toFixed(2)} {getCurrencySymbol('SAR')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={achievementFormData.items.length === 0 || !selectedEmployeeForAchievement}>
              <Save className="w-4 h-4" />
              {editingAchievement ? 'تحديث' : 'إضافة'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowAchievementModal(false)} className="flex-1">
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف ${deleteType === 'price' ? 'السعر' : 'الإنجازات'}؟ لا يمكن التراجع عن هذا الإجراء.`}
        type="danger"
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
};

export default MediaSalaries;
