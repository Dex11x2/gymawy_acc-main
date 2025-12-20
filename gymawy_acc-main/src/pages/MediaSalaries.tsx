import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
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
  TrendingUp
} from 'lucide-react';

type ContentType = 'short_video' | 'long_video' | 'vlog' | 'podcast' | 'post_design' | 'thumbnail';

interface ContentPrice {
  id: string;
  type: ContentType;
  nameAr: string;
  price: number;
  currency: 'SAR' | 'USD' | 'EGP';
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
  const { payrolls, addPayroll, updatePayroll, loadPayrolls, employees, loadEmployees } = useDataStore();
  const { canWrite, canRead } = usePermissions();

  const canViewMedia = canRead('media_salaries');
  const canEditMedia = canWrite('media_salaries');

  // Only general_manager, administrative_manager, and super_admin can view/edit prices
  const canManagePrices = ['super_admin', 'general_manager', 'administrative_manager'].includes(user?.role || '');

  const [activeTab, setActiveTab] = useState<'prices' | 'achievements'>(canManagePrices ? 'prices' : 'achievements');

  // Prices State
  const [prices, setPrices] = useState<ContentPrice[]>(() => {
    const saved = localStorage.getItem('mediaPrices');
    return saved ? JSON.parse(saved) : [
      { id: '1', type: 'short_video', nameAr: 'فيديو قصير', price: 50, currency: 'SAR' },
      { id: '2', type: 'long_video', nameAr: 'فيديو طويل', price: 150, currency: 'SAR' },
      { id: '3', type: 'vlog', nameAr: 'فلوج', price: 100, currency: 'SAR' },
      { id: '4', type: 'podcast', nameAr: 'بودكاست', price: 200, currency: 'SAR' },
      { id: '5', type: 'post_design', nameAr: 'تصميم بوست', price: 30, currency: 'SAR' },
      { id: '6', type: 'thumbnail', nameAr: 'صورة مصغرة', price: 20, currency: 'SAR' }
    ];
  });

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<ContentPrice | null>(null);

  // Achievements State
  const [achievements, setAchievements] = useState<EmployeeAchievement[]>(() => {
    const saved = localStorage.getItem('mediaAchievements');
    return saved ? JSON.parse(saved) : [];
  });

  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<EmployeeAchievement | null>(null);
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
    employeeId: user?.id || '',
    employeeName: user?.name || '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    items: [] as { contentType: ContentType; quantity: number }[]
  });

  // Load payrolls and employees on mount
  useEffect(() => {
    loadPayrolls();
    loadEmployees();
  }, [loadPayrolls, loadEmployees]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('mediaPrices', JSON.stringify(prices));
  }, [prices]);

  useEffect(() => {
    localStorage.setItem('mediaAchievements', JSON.stringify(achievements));
  }, [achievements]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      SAR: 'ر.س',
      USD: '$',
      EGP: 'ج.م'
    };
    return symbols[currency] || currency;
  };

  // Price Handlers
  const openAddPrice = () => {
    if (!canEditMedia) {
      setToast({ message: 'ليس لديك صلاحية لتعديل الأسعار', type: 'error', isOpen: true });
      return;
    }
    setEditingPrice(null);
    setPriceFormData({ type: 'short_video', price: '', currency: 'SAR' });
    setShowPriceModal(true);
  };

  const openEditPrice = (price: ContentPrice) => {
    if (!canEditMedia) {
      setToast({ message: 'ليس لديك صلاحية لتعديل الأسعار', type: 'error', isOpen: true });
      return;
    }
    setEditingPrice(price);
    setPriceFormData({ type: price.type, price: price.price, currency: price.currency });
    setShowPriceModal(true);
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPrice) {
      setPrices(prices.map(p =>
        p.id === editingPrice.id
          ? { ...p, type: priceFormData.type, price: Number(priceFormData.price), currency: priceFormData.currency, nameAr: CONTENT_TYPES[priceFormData.type] }
          : p
      ));
      setToast({ message: 'تم تحديث السعر بنجاح', type: 'success', isOpen: true });
    } else {
      const newPrice: ContentPrice = {
        id: Date.now().toString(),
        type: priceFormData.type,
        nameAr: CONTENT_TYPES[priceFormData.type],
        price: Number(priceFormData.price),
        currency: priceFormData.currency
      };
      setPrices([...prices, newPrice]);
      setToast({ message: 'تم إضافة السعر بنجاح', type: 'success', isOpen: true });
    }
    setShowPriceModal(false);
  };

  const handleDeletePrice = (id: string) => {
    if (!canEditMedia) {
      setToast({ message: 'ليس لديك صلاحية لحذف الأسعار', type: 'error', isOpen: true });
      return;
    }
    setDeleteId(id);
    setDeleteType('price');
    setShowDeleteDialog(true);
  };

  // Achievement Handlers
  const openAddAchievement = () => {
    setEditingAchievement(null);
    setAchievementFormData({
      employeeId: user?.id || '',
      employeeName: user?.name || '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      items: []
    });
    setShowAchievementModal(true);
  };

  const openEditAchievement = (achievement: EmployeeAchievement) => {
    setEditingAchievement(achievement);
    setAchievementFormData({
      employeeId: achievement.employeeId,
      employeeName: achievement.employeeName,
      month: achievement.month,
      year: achievement.year,
      items: achievement.items.map(item => ({ contentType: item.contentType, quantity: item.quantity }))
    });
    setShowAchievementModal(true);
  };

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

  const handleAchievementSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const itemsWithPrices = achievementFormData.items.map(item => {
      const price = prices.find(p => p.type === item.contentType)?.price || 0;
      return {
        contentType: item.contentType,
        quantity: item.quantity,
        price,
        total: item.quantity * price
      };
    });

    const totalAmount = itemsWithPrices.reduce((sum, item) => sum + item.total, 0);

    if (editingAchievement) {
      setAchievements(achievements.map(a =>
        a.id === editingAchievement.id
          ? { ...a, ...achievementFormData, items: itemsWithPrices, totalAmount }
          : a
      ));
      setToast({ message: 'تم تحديث الإنجازات بنجاح', type: 'success', isOpen: true });
    } else {
      const newAchievement: EmployeeAchievement = {
        id: Date.now().toString(),
        ...achievementFormData,
        items: itemsWithPrices,
        totalAmount
      };
      setAchievements([...achievements, newAchievement]);
      setToast({ message: 'تم إضافة الإنجازات بنجاح', type: 'success', isOpen: true });
    }
    setShowAchievementModal(false);
  };

  const handleDeleteAchievement = (id: string) => {
    setDeleteId(id);
    setDeleteType('achievement');
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      if (deleteType === 'price') {
        setPrices(prices.filter(p => p.id !== deleteId));
        setToast({ message: 'تم حذف السعر بنجاح', type: 'success', isOpen: true });
      } else {
        setAchievements(achievements.filter(a => a.id !== deleteId));
        setToast({ message: 'تم حذف الإنجازات بنجاح', type: 'success', isOpen: true });
      }
      setDeleteId(null);
    }
  };

  // Sync achievement to payroll
  const syncToPayroll = async (achievement: EmployeeAchievement) => {
    try {
      // Find existing payroll for this employee/month/year
      const existingPayroll = payrolls.find(
        p => p.employeeId === achievement.employeeId &&
             p.month === achievement.month &&
             p.year === achievement.year
      );

      // Find employee to get base salary
      const employee = employees.find(e => e.id === achievement.employeeId);
      const baseSalary = employee?.salary || 0;

      if (existingPayroll) {
        // Update existing payroll - add media achievements to bonuses
        await updatePayroll(existingPayroll.id, {
          bonuses: (existingPayroll.bonuses || 0) + achievement.totalAmount,
          netSalary: existingPayroll.baseSalary + ((existingPayroll.bonuses || 0) + achievement.totalAmount) - (existingPayroll.deductions || 0),
          notes: `${existingPayroll.notes || ''}\nمكافأة ميديا: ${achievement.totalAmount} ر.س`.trim()
        });
      } else {
        // Create new payroll entry
        await addPayroll({
          employeeId: achievement.employeeId,
          month: achievement.month,
          year: achievement.year,
          baseSalary: baseSalary,
          bonuses: achievement.totalAmount,
          deductions: 0,
          netSalary: baseSalary + achievement.totalAmount,
          currency: 'SAR',
          type: 'variable',
          notes: `مكافأة ميديا: ${achievement.totalAmount} ر.س`
        });
      }

      // Mark achievement as synced
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
    } catch (error) {
      console.error('Error syncing to payroll:', error);
      setToast({
        message: 'حدث خطأ أثناء إضافة الإنجازات للراتب',
        type: 'error',
        isOpen: true
      });
    }
  };

  const filteredAchievements = achievements.filter(a =>
    a.month === selectedMonth && a.year === selectedYear
  );

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
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة أسعار المحتوى وتسجيل إنجازات الموظفين</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 space-x-reverse">
          {canManagePrices && (
            <button
              onClick={() => setActiveTab('prices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'prices'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              <Settings className="w-4 h-4 inline ml-2" />
              إعدادات الأسعار
            </button>
          )}
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
        </nav>
      </div>

      {/* Prices Tab */}
      {activeTab === 'prices' && canManagePrices && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">أسعار أنواع المحتوى</h2>
            {canEditMedia && canManagePrices && (
              <Button onClick={openAddPrice}>
                <Plus className="w-4 h-4" />
                إضافة سعر
              </Button>
            )}
          </div>

          <Card>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>نوع المحتوى</Table.Head>
                      <Table.Head>السعر</Table.Head>
                      <Table.Head>العملة</Table.Head>
                      {canManagePrices && <Table.Head>الإجراءات</Table.Head>}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {prices.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={canManagePrices ? 4 : 3}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد أسعار محددة
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      prices.map(price => (
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
                          {canManagePrices && (
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePrice(price.id)}
                                  className="text-error-600 hover:text-error-700"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            </div>

            <Button onClick={openAddAchievement}>
              <Plus className="w-4 h-4" />
              إضافة إنجازات
            </Button>
          </div>

          <Card>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>الموظف</Table.Head>
                      <Table.Head>الشهر</Table.Head>
                      <Table.Head>الإجمالي</Table.Head>
                      <Table.Head>الحالة</Table.Head>
                      <Table.Head>الإجراءات</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filteredAchievements.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={5}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد إنجازات لهذا الشهر
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      filteredAchievements.map(achievement => (
                        <Table.Row key={achievement.id}>
                          <Table.Cell>
                            <span className="font-medium text-gray-900 dark:text-white">{achievement.employeeName}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(achievement.year, achievement.month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                            </div>
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
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAchievement(achievement.id)}
                                className="text-error-600 hover:text-error-700"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      )}

      {/* Price Modal */}
      <Modal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        title={editingPrice ? 'تعديل السعر' : 'إضافة سعر جديد'}
        size="md"
      >
        <form onSubmit={handlePriceSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع المحتوى</label>
            <select
              value={priceFormData.type}
              onChange={(e) => setPriceFormData({ ...priceFormData, type: e.target.value as ContentType })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              {Object.entries(CONTENT_TYPES).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
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
              {editingPrice ? 'تحديث' : 'إضافة'}
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
        title={editingAchievement ? 'تعديل الإنجازات' : 'إضافة إنجازات جديدة'}
        size="lg"
      >
        <form onSubmit={handleAchievementSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
              <select
                value={achievementFormData.month}
                onChange={(e) => setAchievementFormData({ ...achievementFormData, month: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
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

            {achievementFormData.items.map((item, index) => (
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
                <div className="w-32">
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
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">السعر</label>
                  <input
                    type="text"
                    value={prices.find(p => p.type === item.contentType)?.price || 0}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
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
            ))}

            {achievementFormData.items.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                اضغط "إضافة عنصر" لبدء تسجيل الإنجازات
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={achievementFormData.items.length === 0}>
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
