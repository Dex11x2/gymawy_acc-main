import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// ==================== TYPES ====================
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

interface AchievementItem {
  contentType: ContentType;
  quantity: number;
  price: number;
  total: number;
}

interface EmployeeAchievement {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  items: AchievementItem[];
  totalAmount: number;
  syncedToPayroll?: boolean;
  syncedAt?: Date;
}

interface FormItem {
  contentType: ContentType;
  quantity: number;
}

// ==================== CONSTANTS ====================
const CONTENT_TYPES: Record<ContentType, string> = {
  short_video: 'فيديو قصير (Short Video)',
  long_video: 'فيديو طويل (Long-form Video)',
  vlog: 'فلوج (Vlog)',
  podcast: 'بودكاست (Podcast)',
  post_design: 'تصميم بوست (Post Design)',
  thumbnail: 'صورة مصغرة (Thumbnail)'
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: 'ر.س',
  USD: '$',
  EGP: 'ج.م'
};

// ==================== HELPER FUNCTIONS ====================
const extractId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value._id || value.id || '';
  return '';
};

const isValidId = (id: string | undefined | null): boolean => {
  return !!(id && id !== 'undefined' && id !== 'null' && id.trim() !== '');
};

const getCurrencySymbol = (currency: string): string => {
  return CURRENCY_SYMBOLS[currency] || currency;
};

// ==================== MAIN COMPONENT ====================
const MediaSalaries: React.FC = () => {
  const { user } = useAuthStore();
  const { loadPayrolls, employees } = useDataStore();
  const { canWrite, canRead } = usePermissions();

  // ==================== PERMISSIONS ====================
  const canViewPrices = canRead('media_salaries_prices');
  const canEditPrices = canWrite('media_salaries_prices');
  const canViewAchievements = canRead('media_salaries_achievements');

  const currentEmployee = useMemo(() =>
    employees.find((e: any) => e.userId === user?.id || e.userId?._id === user?.id),
    [employees, user?.id]
  );

  const isAdmin = useMemo(() => {
    // Check role-based access (managers)
    const isManagerRole =
      currentEmployee?.isGeneralManager ||
      currentEmployee?.isAdministrativeManager ||
      user?.role === 'super_admin' ||
      user?.role === 'general_manager' ||
      user?.role === 'administrative_manager';

    // Check permission-based access
    const hasMediaSalariesPermission =
      canRead('media_salaries_prices') ||
      canRead('media_salaries_achievements') ||
      canRead('media_salaries');

    return isManagerRole || hasMediaSalariesPermission;
  }, [currentEmployee, user?.role, canRead]);

  const isVariableSalaryEmployee = currentEmployee?.salaryType === 'variable';
  const canViewMedia = canViewPrices || canViewAchievements || isVariableSalaryEmployee;

  // ==================== STATE ====================
  const getDefaultTab = useCallback(() => {
    if (canViewPrices) return 'prices';
    if (canViewAchievements) return 'achievements';
    if (isVariableSalaryEmployee) return 'my-achievements';
    return 'prices';
  }, [canViewPrices, canViewAchievements, isVariableSalaryEmployee]);

  const [activeTab, setActiveTab] = useState<'prices' | 'achievements' | 'my-achievements' | 'content-types'>(getDefaultTab());

  // Loading states
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  const [isLoadingMyAchievements, setIsLoadingMyAchievements] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prices state
  const [selectedEmployeeForPrices, setSelectedEmployeeForPrices] = useState<string>('');
  const [employeesWithPrices, setEmployeesWithPrices] = useState<EmployeeWithPrices[]>([]);
  const [currentEmployeePrices, setCurrentEmployeePrices] = useState<ContentPrice[]>([]);

  // Achievements state
  const [achievements, setAchievements] = useState<EmployeeAchievement[]>([]);
  const [myAchievements, setMyAchievements] = useState<EmployeeAchievement[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal state
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ContentPrice | null>(null);
  const [editingAchievement, setEditingAchievement] = useState<EmployeeAchievement | null>(null);
  const [isMyAchievementMode, setIsMyAchievementMode] = useState(false);
  const [selectedEmployeeForAchievement, setSelectedEmployeeForAchievement] = useState<string>('');
  const [employeePricesForForm, setEmployeePricesForForm] = useState<ContentPrice[]>([]);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean }>({
    message: '', type: 'success', isOpen: false
  });

  // Form data
  const [priceFormData, setPriceFormData] = useState({
    type: 'short_video' as ContentType,
    price: '' as number | '',
    currency: 'SAR' as 'SAR' | 'USD' | 'EGP'
  });

  const [achievementFormData, setAchievementFormData] = useState<{
    employeeId: string;
    employeeName: string;
    month: number;
    year: number;
    items: FormItem[];
  }>({
    employeeId: '',
    employeeName: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    items: []
  });

  // Content Types state
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [isLoadingContentTypes, setIsLoadingContentTypes] = useState(false);
  const [showContentTypeModal, setShowContentTypeModal] = useState(false);
  const [editingContentType, setEditingContentType] = useState<any | null>(null);
  const [contentTypeFormData, setContentTypeFormData] = useState({
    key: '',
    nameAr: '',
    nameEn: '',
    defaultPrice: '' as number | '',
    currency: 'SAR' as 'SAR' | 'USD' | 'EGP',
    displayOrder: 0
  });

  // ==================== COMPUTED VALUES ====================
  const variableSalaryEmployees = useMemo(() =>
    employeesWithPrices.map(e => ({
      id: e.employee._id,
      name: e.employee.name,
      position: e.employee.position
    })),
    [employeesWithPrices]
  );

  const monthlySummary = useMemo(() =>
    achievements.reduce((acc, achievement) => {
      acc.totalAmount += achievement.totalAmount;
      acc.syncedCount += achievement.syncedToPayroll ? 1 : 0;
      acc.totalItems += achievement.items.reduce((sum, item) => sum + item.quantity, 0);
      return acc;
    }, { totalAmount: 0, syncedCount: 0, totalItems: 0 }),
    [achievements]
  );

  const formTotal = useMemo(() => {
    return achievementFormData.items.reduce((sum, item) => {
      const price = employeePricesForForm.find(p => p.type === item.contentType)?.price || 0;
      return sum + (item.quantity * price);
    }, 0);
  }, [achievementFormData.items, employeePricesForForm]);

  // ==================== API FUNCTIONS ====================
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type, isOpen: true });
  }, []);

  const fetchAllEmployeesWithPrices = useCallback(async () => {
    try {
      setIsLoadingPrices(true);
      const response = await api.get('/media-prices/all-employees');
      const data = response.data
        .filter((item: any) => item.employee && extractId(item.employee))
        .map((item: any) => ({
          employee: {
            _id: extractId(item.employee),
            name: item.employee.name,
            position: item.employee.position
          },
          prices: (item.prices || []).map((p: any) => ({
            id: extractId(p),
            type: p.type,
            nameAr: p.nameAr,
            price: p.price,
            currency: p.currency
          }))
        }));
      setEmployeesWithPrices(data);

      if (!selectedEmployeeForPrices && data.length > 0) {
        setSelectedEmployeeForPrices(data[0].employee._id);
        setCurrentEmployeePrices(data[0].prices);
      }
    } catch (error) {
      console.error('Error fetching employees with prices:', error);
      showToast('حدث خطأ أثناء جلب بيانات الموظفين', 'error');
    } finally {
      setIsLoadingPrices(false);
    }
  }, [selectedEmployeeForPrices, showToast]);

  const fetchEmployeePrices = useCallback(async (employeeId: string): Promise<ContentPrice[]> => {
    if (!isValidId(employeeId)) return [];
    try {
      const response = await api.get(`/media-prices/employee/${employeeId}`);
      return response.data.map((p: any) => ({
        id: extractId(p),
        type: p.type,
        nameAr: p.nameAr,
        price: p.price,
        currency: p.currency
      }));
    } catch (error) {
      console.error('Error fetching employee prices:', error);
      return [];
    }
  }, []);

  const fetchAchievements = useCallback(async () => {
    try {
      setIsLoadingAchievements(true);
      const response = await api.get('/media-achievements', {
        params: { month: selectedMonth, year: selectedYear }
      });
      const data = response.data
        .filter((a: any) => a._id || a.id)
        .map((a: any) => ({
          id: String(a._id || a.id),
          employeeId: extractId(a.employeeId),
          employeeName: a.employeeId?.name || 'غير معروف',
          month: a.month,
          year: a.year,
          items: a.items || [],
          totalAmount: a.totalAmount || 0,
          syncedToPayroll: a.syncedToPayroll,
          syncedAt: a.syncedAt
        }));
      setAchievements(data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      showToast('حدث خطأ أثناء جلب الإنجازات', 'error');
    } finally {
      setIsLoadingAchievements(false);
    }
  }, [selectedMonth, selectedYear, showToast]);

  const fetchMyAchievements = useCallback(async () => {
    try {
      setIsLoadingMyAchievements(true);
      const response = await api.get('/media-achievements/my-achievements', {
        params: { month: selectedMonth, year: selectedYear }
      });
      const data = response.data
        .filter((a: any) => a._id || a.id)
        .map((a: any) => ({
          id: String(a._id || a.id),
          employeeId: extractId(a.employeeId),
          employeeName: a.employeeId?.name || 'غير معروف',
          month: a.month,
          year: a.year,
          items: a.items || [],
          totalAmount: a.totalAmount || 0,
          syncedToPayroll: a.syncedToPayroll,
          syncedAt: a.syncedAt
        }));
      setMyAchievements(data);
    } catch (error) {
      console.error('Error fetching my achievements:', error);
      showToast('حدث خطأ أثناء جلب إنجازاتك', 'error');
    } finally {
      setIsLoadingMyAchievements(false);
    }
  }, [selectedMonth, selectedYear, showToast]);

  // ==================== CONTENT TYPES FUNCTIONS ====================
  const fetchContentTypes = useCallback(async () => {
    try {
      setIsLoadingContentTypes(true);
      const response = await api.get('/content-types');
      console.log('Content types from backend:', response.data); // Debug log
      setContentTypes(response.data);
    } catch (error) {
      console.error('Error fetching content types:', error);
      showToast('حدث خطأ أثناء جلب أنواع المحتوى', 'error');
    } finally {
      setIsLoadingContentTypes(false);
    }
  }, [showToast]);

  const handleSaveContentType = async () => {
    try {
      setIsSubmitting(true);

      // Validation
      if (!contentTypeFormData.key || !contentTypeFormData.nameAr || !contentTypeFormData.nameEn) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
      }

      if (!contentTypeFormData.key.match(/^[a-z_]+$/)) {
        showToast('المفتاح يجب أن يحتوي على أحرف صغيرة وشرطات سفلية فقط', 'warning');
        return;
      }

      const payload = {
        ...contentTypeFormData,
        defaultPrice: Number(contentTypeFormData.defaultPrice) || 0
      };

      if (editingContentType) {
        // ✅ FIX: Use proper ID field from MongoDB
        const contentTypeId = editingContentType._id || editingContentType.id;
        console.log('Editing content type:', editingContentType, 'ID:', contentTypeId);

        if (!contentTypeId) {
          showToast('خطأ: معرف نوع المحتوى غير موجود', 'error');
          return;
        }

        await api.put(`/content-types/${contentTypeId}`, payload);
        showToast('تم تحديث نوع المحتوى بنجاح', 'success');
      } else {
        await api.post('/content-types', payload);
        showToast('تم إضافة نوع المحتوى بنجاح', 'success');
      }

      setShowContentTypeModal(false);
      setEditingContentType(null);
      fetchContentTypes();
    } catch (error: any) {
      console.error('Error saving content type:', error);
      showToast(error.response?.data?.message || 'حدث خطأ أثناء حفظ نوع المحتوى', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContentType = async (id: string) => {
    try {
      await api.delete(`/content-types/${id}`);
      showToast('تم حذف نوع المحتوى بنجاح', 'success');
      fetchContentTypes();
    } catch (error: any) {
      console.error('Error deleting content type:', error);
      showToast(error.response?.data?.message || 'حدث خطأ أثناء حذف نوع المحتوى', 'error');
    }
  };

  const handleRestoreContentType = async (id: string) => {
    try {
      await api.post(`/content-types/${id}/restore`);
      showToast('تم استعادة نوع المحتوى بنجاح', 'success');
      fetchContentTypes();
    } catch (error: any) {
      console.error('Error restoring content type:', error);
      showToast(error.response?.data?.message || 'حدث خطأ أثناء استعادة نوع المحتوى', 'error');
    }
  };

  const openAddContentType = () => {
    setContentTypeFormData({
      key: '',
      nameAr: '',
      nameEn: '',
      defaultPrice: '',
      currency: 'SAR',
      displayOrder: contentTypes.length
    });
    setEditingContentType(null);
    setShowContentTypeModal(true);
  };

  const openEditContentType = (contentType: any) => {
    console.log('Opening edit for content type:', contentType); // Debug log
    setContentTypeFormData({
      key: contentType.key,
      nameAr: contentType.nameAr,
      nameEn: contentType.nameEn,
      defaultPrice: contentType.defaultPrice,
      currency: contentType.currency,
      displayOrder: contentType.displayOrder
    });
    // ✅ FIX: Save the entire contentType object including _id
    setEditingContentType(contentType);
    setShowContentTypeModal(true);
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    loadPayrolls();
  }, [loadPayrolls]);

  useEffect(() => {
    if (activeTab === 'prices' && canViewPrices) {
      fetchAllEmployeesWithPrices();
    } else if (activeTab === 'achievements' && canViewAchievements) {
      fetchAchievements();
      if (employeesWithPrices.length === 0) {
        fetchAllEmployeesWithPrices();
      }
    } else if (activeTab === 'my-achievements' && isVariableSalaryEmployee) {
      fetchMyAchievements();
    } else if (activeTab === 'content-types' && isAdmin) {
      fetchContentTypes();
    }
  }, [activeTab, canViewPrices, canViewAchievements, isVariableSalaryEmployee, isAdmin, fetchContentTypes]);

  useEffect(() => {
    if (activeTab === 'achievements') {
      fetchAchievements();
    } else if (activeTab === 'my-achievements') {
      fetchMyAchievements();
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedEmployeeForPrices) {
      const employeeData = employeesWithPrices.find(e => e.employee._id === selectedEmployeeForPrices);
      if (employeeData) {
        setCurrentEmployeePrices(employeeData.prices);
      }
    }
  }, [selectedEmployeeForPrices, employeesWithPrices]);

  // Load prices when modal opens or employee changes
  useEffect(() => {
    const loadPrices = async () => {
      if (showAchievementModal && isValidId(selectedEmployeeForAchievement)) {
        const prices = await fetchEmployeePrices(selectedEmployeeForAchievement);
        setEmployeePricesForForm(prices);
      }
    };
    loadPrices();
  }, [showAchievementModal, selectedEmployeeForAchievement, fetchEmployeePrices]);

  // ==================== PRICE HANDLERS ====================
  const openEditPrice = (price: ContentPrice) => {
    if (!canEditPrices) {
      showToast('ليس لديك صلاحية لتعديل الأسعار', 'error');
      return;
    }
    setEditingPrice(price);
    setPriceFormData({ type: price.type, price: price.price, currency: price.currency });
    setShowPriceModal(true);
  };

  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForPrices || !editingPrice?.id) {
      showToast('يرجى اختيار موظف والسعر المراد تعديله', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put(`/media-prices/employee/${selectedEmployeeForPrices}/${editingPrice.id}`, {
        price: Number(priceFormData.price),
        currency: priceFormData.currency,
        nameAr: CONTENT_TYPES[priceFormData.type].split(' (')[0]
      });

      setCurrentEmployeePrices(prev => prev.map(p =>
        p.id === editingPrice.id
          ? { ...p, price: Number(priceFormData.price), currency: priceFormData.currency }
          : p
      ));

      setEmployeesWithPrices(prev => prev.map(e =>
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

      showToast('تم تحديث السعر بنجاح', 'success');
      setShowPriceModal(false);
    } catch (error: any) {
      console.error('Error saving price:', error);
      showToast(error.response?.data?.message || 'حدث خطأ أثناء حفظ السعر', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== ACHIEVEMENT HANDLERS ====================
  const resetAchievementForm = () => {
    setAchievementFormData({
      employeeId: '',
      employeeName: '',
      month: selectedMonth,
      year: selectedYear,
      items: []
    });
    setEmployeePricesForForm([]);
    setEditingAchievement(null);
    setSelectedEmployeeForAchievement('');
  };

  const openAddAchievement = () => {
    resetAchievementForm();
    setIsMyAchievementMode(false);

    const firstEmployee = variableSalaryEmployees[0];
    if (firstEmployee) {
      setSelectedEmployeeForAchievement(firstEmployee.id);
      setAchievementFormData(prev => ({
        ...prev,
        employeeId: firstEmployee.id,
        employeeName: firstEmployee.name
      }));
    }
    setShowAchievementModal(true);
  };

  const openEditAchievement = async (achievement: EmployeeAchievement) => {
    if (!isValidId(achievement.id)) {
      showToast('خطأ: بيانات الإنجاز غير صالحة', 'error');
      return;
    }

    if (achievement.syncedToPayroll) {
      showToast('لا يمكن تعديل إنجازات تمت مزامنتها مع الراتب', 'warning');
      return;
    }

    const employeeId = extractId(achievement.employeeId);

    // Load prices first
    const prices = await fetchEmployeePrices(employeeId);
    setEmployeePricesForForm(prices);

    setIsMyAchievementMode(false);
    setEditingAchievement(achievement);
    setSelectedEmployeeForAchievement(employeeId);
    setAchievementFormData({
      employeeId: employeeId,
      employeeName: achievement.employeeName,
      month: achievement.month,
      year: achievement.year,
      items: achievement.items.map(item => ({
        contentType: item.contentType,
        quantity: item.quantity
      }))
    });
    setShowAchievementModal(true);
  };

  const openAddMyAchievement = () => {
    if (!currentEmployee) {
      showToast('لم يتم العثور على بيانات الموظف', 'error');
      return;
    }

    resetAchievementForm();
    setIsMyAchievementMode(true);
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

  const openEditMyAchievement = async (achievement: EmployeeAchievement) => {
    if (!isValidId(achievement.id)) {
      showToast('خطأ: بيانات الإنجاز غير صالحة', 'error');
      return;
    }

    if (achievement.syncedToPayroll) {
      showToast('لا يمكن تعديل إنجازات تمت مزامنتها مع الراتب. تواصل مع الإدارة.', 'warning');
      return;
    }

    const employeeId = extractId(achievement.employeeId);

    // Load prices first
    const prices = await fetchEmployeePrices(employeeId);
    setEmployeePricesForForm(prices);

    setIsMyAchievementMode(true);
    setEditingAchievement(achievement);
    setSelectedEmployeeForAchievement(employeeId);
    setAchievementFormData({
      employeeId: employeeId,
      employeeName: achievement.employeeName,
      month: achievement.month,
      year: achievement.year,
      items: achievement.items.map(item => ({
        contentType: item.contentType,
        quantity: item.quantity
      }))
    });
    setShowAchievementModal(true);
  };

  const addAchievementItem = () => {
    setAchievementFormData(prev => ({
      ...prev,
      items: [...prev.items, { contentType: 'short_video', quantity: 1 }]
    }));
  };

  const removeAchievementItem = (index: number) => {
    setAchievementFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateAchievementItem = (index: number, field: 'contentType' | 'quantity', value: any) => {
    setAchievementFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleEmployeeChangeForAchievement = (employeeId: string) => {
    const employee = variableSalaryEmployees.find(e => e.id === employeeId);
    setSelectedEmployeeForAchievement(employeeId);
    setAchievementFormData(prev => ({
      ...prev,
      employeeId,
      employeeName: employee?.name || ''
    }));
  };

  const handleAchievementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMyAchievementMode && !isValidId(achievementFormData.employeeId)) {
      showToast('يرجى اختيار الموظف', 'error');
      return;
    }

    if (achievementFormData.items.length === 0) {
      showToast('يرجى إضافة إنجاز واحد على الأقل', 'error');
      return;
    }

    // Validate all items have quantity > 0
    const invalidItems = achievementFormData.items.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      showToast('يرجى إدخال كمية صحيحة لجميع الإنجازات', 'error');
      return;
    }

    // Build items with prices
    const itemsWithPrices = achievementFormData.items.map(item => {
      const price = employeePricesForForm.find(p => p.type === item.contentType)?.price || 0;
      return {
        contentType: item.contentType,
        quantity: item.quantity,
        price,
        total: item.quantity * price
      };
    });

    try {
      setIsSubmitting(true);

      if (isMyAchievementMode) {
        if (editingAchievement) {
          await api.put(`/media-achievements/my-achievements/${editingAchievement.id}`, {
            items: itemsWithPrices
          });
          showToast('تم تحديث إنجازاتك بنجاح', 'success');
        } else {
          await api.post('/media-achievements/my-achievements', {
            month: achievementFormData.month,
            year: achievementFormData.year,
            items: itemsWithPrices
          });
          showToast('تم إضافة إنجازاتك بنجاح', 'success');
        }
        setShowAchievementModal(false);
        fetchMyAchievements();
      } else {
        if (editingAchievement) {
          await api.put(`/media-achievements/${editingAchievement.id}`, {
            items: itemsWithPrices
          });
          showToast('تم تحديث الإنجازات بنجاح', 'success');
        } else {
          await api.post('/media-achievements', {
            employeeId: achievementFormData.employeeId,
            month: achievementFormData.month,
            year: achievementFormData.year,
            items: itemsWithPrices
          });
          showToast('تم إضافة الإنجازات بنجاح', 'success');
        }
        setShowAchievementModal(false);
        fetchAchievements();
      }
    } catch (error: any) {
      console.error('Error saving achievement:', error);
      const errorData = error.response?.data;

      // Handle duplicate achievement - auto open edit
      if (errorData?.existingId) {
        showToast('يوجد إنجاز مسجل لهذا الشهر. جاري فتح التعديل...', 'info');

        try {
          const response = await api.get(`/media-achievements/${errorData.existingId}`);
          const existingData = response.data;

          if (existingData) {
            const existingAchievement: EmployeeAchievement = {
              id: extractId(existingData) || errorData.existingId,
              employeeId: extractId(existingData.employeeId),
              employeeName: existingData.employeeId?.name || achievementFormData.employeeName,
              month: existingData.month,
              year: existingData.year,
              items: existingData.items || [],
              totalAmount: existingData.totalAmount || 0,
              syncedToPayroll: existingData.syncedToPayroll || false,
              syncedAt: existingData.syncedAt
            };

            setShowAchievementModal(false);

            // Wait for modal to close, then open edit
            setTimeout(() => {
              if (isMyAchievementMode) {
                openEditMyAchievement(existingAchievement);
              } else {
                openEditAchievement(existingAchievement);
              }
            }, 300);
          }
        } catch (fetchError) {
          console.error('Error fetching existing achievement:', fetchError);
          showToast('حدث خطأ أثناء جلب الإنجاز الموجود', 'error');
        }
        return;
      }

      showToast(errorData?.message || 'حدث خطأ أثناء حفظ الإنجازات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAchievement = (id: string) => {
    if (!isValidId(id)) {
      showToast('خطأ: معرف الإنجاز غير صالح', 'error');
      return;
    }

    const achievement = achievements.find(a => a.id === id);
    if (!achievement) {
      showToast('خطأ: الإنجاز غير موجود', 'error');
      return;
    }

    if (achievement.syncedToPayroll) {
      showToast('لا يمكن حذف إنجازات تمت مزامنتها مع الراتب', 'warning');
      return;
    }

    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!isValidId(deleteId)) {
      showToast('خطأ: لم يتم تحديد العنصر للحذف بشكل صحيح', 'error');
      setShowDeleteDialog(false);
      return;
    }

    try {
      await api.delete(`/media-achievements/${deleteId}`);
      setAchievements(prev => prev.filter(a => a.id !== deleteId));
      showToast('تم حذف الإنجازات بنجاح', 'success');
    } catch (error: any) {
      console.error('Error deleting:', error);
      showToast(error.response?.data?.message || 'حدث خطأ أثناء الحذف', 'error');
    } finally {
      setDeleteId(null);
      setShowDeleteDialog(false);
    }
  };

  const syncToPayroll = async (achievement: EmployeeAchievement) => {
    try {
      await api.post(`/media-achievements/${achievement.id}/sync-payroll`);

      setAchievements(prev => prev.map(a =>
        a.id === achievement.id
          ? { ...a, syncedToPayroll: true, syncedAt: new Date() }
          : a
      ));

      showToast('تم إضافة الإنجازات للراتب الشهري بنجاح', 'success');
      await loadPayrolls();
    } catch (error: any) {
      console.error('Error syncing to payroll:', error);
      showToast(error.response?.data?.message || 'حدث خطأ أثناء إضافة الإنجازات للراتب', 'error');
    }
  };

  // ==================== PERMISSION GUARD ====================
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

  // ==================== RENDER ====================
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
          {isAdmin && (
            <button
              onClick={() => setActiveTab('content-types')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'content-types'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              <Video className="w-4 h-4 inline ml-2" />
              أنواع المحتوى
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

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-500" />
              <select
                value={selectedEmployeeForPrices}
                onChange={(e) => setSelectedEmployeeForPrices(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[200px]"
              >
                <option value="">اختر موظف...</option>
                {employeesWithPrices.map(item => (
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditPrice(price)}
                                  className="text-brand-600 hover:text-brand-700"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
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
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Employee Cards Grid */}
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
                      selectedEmployeeForPrices === employee._id ? 'ring-2 ring-brand-500' : 'hover:shadow-md'
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
          {/* Summary Cards */}
          {achievements.length > 0 && (
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
                        {monthlySummary.syncedCount} / {achievements.length}
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}

          {/* Filters */}
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
                    <option key={i} value={2024 + i}>{2024 + i}</option>
                  ))}
                </select>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchAchievements} disabled={isLoadingAchievements}>
                <RefreshCw className={`w-4 h-4 ${isLoadingAchievements ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isAdmin && (
              <Button onClick={openAddAchievement}>
                <Plus className="w-4 h-4" />
                إضافة إنجازات
              </Button>
            )}
          </div>

          {/* Achievements Table */}
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
                    ) : achievements.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={6}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد إنجازات لهذا الشهر
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      achievements.map(achievement => (
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

          {/* Detailed Records */}
          {achievements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                سجل تفصيلي حسب الموظف
              </h3>

              {Object.entries(
                achievements.reduce((acc, achievement) => {
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

      {/* My Achievements Tab */}
      {activeTab === 'my-achievements' && isVariableSalaryEmployee && (
        <div className="space-y-6">
          {/* My Stats */}
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

          {/* Filters */}
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
                    <option key={i} value={2024 + i}>{2024 + i}</option>
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

          {/* My Achievements Table */}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditMyAchievement(achievement)}
                              className="text-brand-600 hover:text-brand-700"
                              disabled={achievement.syncedToPayroll}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* My Achievements Details */}
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

      {/* Content Types Tab */}
      {activeTab === 'content-types' && isAdmin && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">إدارة أنواع المحتوى</h2>
              <Button variant="ghost" size="sm" onClick={fetchContentTypes} disabled={isLoadingContentTypes}>
                <RefreshCw className={`w-4 h-4 ${isLoadingContentTypes ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Button onClick={openAddContentType}>
              <Plus className="w-4 h-4" />
              إضافة نوع محتوى
            </Button>
          </div>

          {isLoadingContentTypes ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <Card>
              <Card.Body className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>المفتاح (Key)</Table.Head>
                        <Table.Head>الاسم بالعربية</Table.Head>
                        <Table.Head>الاسم بالإنجليزية</Table.Head>
                        <Table.Head>السعر الافتراضي</Table.Head>
                        <Table.Head>العملة</Table.Head>
                        <Table.Head>الترتيب</Table.Head>
                        <Table.Head>الحالة</Table.Head>
                        <Table.Head>الإجراءات</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {contentTypes.map((contentType) => (
                        <Table.Row key={contentType._id}>
                          <Table.Cell>
                            <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                              {contentType.key}
                            </code>
                          </Table.Cell>
                          <Table.Cell>{contentType.nameAr}</Table.Cell>
                          <Table.Cell>{contentType.nameEn}</Table.Cell>
                          <Table.Cell>
                            {contentType.defaultPrice} {getCurrencySymbol(contentType.currency)}
                          </Table.Cell>
                          <Table.Cell>{contentType.currency}</Table.Cell>
                          <Table.Cell>{contentType.displayOrder}</Table.Cell>
                          <Table.Cell>
                            {contentType.isActive ? (
                              <Badge variant="success">نشط</Badge>
                            ) : (
                              <Badge variant="error">محذوف</Badge>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              {contentType.isActive ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEditContentType(contentType)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteContentType(contentType._id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRestoreContentType(contentType._id)}
                                >
                                  <RefreshCw className="w-4 h-4 text-green-500" />
                                </Button>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              </Card.Body>
            </Card>
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
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              <Save className="w-4 h-4" />
              {isSubmitting ? 'جاري الحفظ...' : 'تحديث'}
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
        onClose={() => {
          setShowAchievementModal(false);
          resetAchievementForm();
        }}
        title={
          isMyAchievementMode
            ? (editingAchievement ? 'تعديل إنجازاتي' : 'إضافة إنجازاتي')
            : (editingAchievement ? 'تعديل الإنجازات' : 'إضافة إنجازات جديدة')
        }
        size="lg"
      >
        <form onSubmit={handleAchievementSubmit} className="space-y-4">
          {/* Employee Selection - only for admin adding new */}
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

          {/* Show employee name in edit mode */}
          {(editingAchievement || isMyAchievementMode) && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isMyAchievementMode ? 'إنجازاتك الشخصية' : 'الموظف'}:
                <span className="font-semibold text-gray-900 dark:text-white mr-1">{achievementFormData.employeeName}</span>
              </p>
            </div>
          )}

          {/* Month/Year Selection */}
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
                  <option key={i} value={2024 + i}>{2024 + i}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الإنجازات</label>
              <Button type="button" size="sm" onClick={addAchievementItem}>
                <Plus className="w-4 h-4" />
                إضافة عنصر
              </Button>
            </div>

            {achievementFormData.items.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                اضغط "إضافة عنصر" لبدء تسجيل الإنجازات
              </div>
            ) : (
              achievementFormData.items.map((item, index) => {
                const itemPrice = employeePricesForForm.find(p => p.type === item.contentType)?.price || 0;
                const itemTotal = item.quantity * itemPrice;

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
                        min="1"
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
                        value={itemTotal.toFixed(2)}
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
              })
            )}

            {/* Total */}
            {achievementFormData.items.length > 0 && (
              <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-left">
                  <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبلغ</p>
                  <p className="text-xl font-bold text-success-600 dark:text-success-400">
                    {formTotal.toFixed(2)} {getCurrencySymbol('SAR')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || achievementFormData.items.length === 0 || !isValidId(selectedEmployeeForAchievement)}
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'جاري الحفظ...' : (editingAchievement ? 'تحديث' : 'إضافة')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAchievementModal(false);
                resetAchievementForm();
              }}
              className="flex-1"
            >
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Content Type Modal */}
      <Modal
        isOpen={showContentTypeModal}
        onClose={() => {
          setShowContentTypeModal(false);
          setEditingContentType(null);
        }}
        title={editingContentType ? 'تعديل نوع المحتوى' : 'إضافة نوع محتوى جديد'}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveContentType(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              المفتاح (Key) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contentTypeFormData.key}
              onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, key: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="مثال: short_video"
              disabled={!!editingContentType}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              أحرف صغيرة وشرطات سفلية فقط (a-z, _)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الاسم بالعربية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contentTypeFormData.nameAr}
                onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, nameAr: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="فيديو قصير"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                الاسم بالإنجليزية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contentTypeFormData.nameEn}
                onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, nameEn: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Short Video"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                السعر الافتراضي
              </label>
              <input
                type="number"
                step="0.01"
                value={contentTypeFormData.defaultPrice}
                onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, defaultPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                العملة
              </label>
              <select
                value={contentTypeFormData.currency}
                onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, currency: e.target.value as 'SAR' | 'USD' | 'EGP' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ترتيب العرض
            </label>
            <input
              type="number"
              value={contentTypeFormData.displayOrder}
              onChange={(e) => setContentTypeFormData({ ...contentTypeFormData, displayOrder: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="0"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'جاري الحفظ...' : (editingContentType ? 'تحديث' : 'إضافة')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowContentTypeModal(false);
                setEditingContentType(null);
              }}
              className="flex-1"
            >
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
        message="هل أنت متأكد من حذف الإنجازات؟ لا يمكن التراجع عن هذا الإجراء."
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
