import React, { useState, useEffect } from "react";
import { usePermissions } from "../hooks/usePermissions";
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Table } from '../components/ui';
import {
  Megaphone,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Filter,
  DollarSign,
  Users,
  TrendingUp,
  Music,
  Camera,
  Save,
  X,
  Calendar,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface AdOperation {
  id: string;
  _id?: string;
  platform: 'tiktok' | 'instagram';
  date: string;
  action: string;
  cost: number;
  clientsCount: number;
  revenue: number;
  currency: 'SAR' | 'USD' | 'KWD' | 'EGP';
}

const AdsFundingReport: React.FC = () => {
  const { canWrite, canDelete, canRead } = usePermissions();

  const canViewAds = canRead('ads_funding');
  const canWriteAds = canWrite('ads_funding');
  const canDeleteAds = canDelete('ads_funding');

  const [operations, setOperations] = useState<AdOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdOperation | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean }>({
    message: '', type: 'success', isOpen: false
  });

  const [formData, setFormData] = useState({
    platform: 'tiktok' as 'tiktok' | 'instagram',
    date: new Date().toISOString().split("T")[0],
    action: '',
    cost: '' as number | '',
    clientsCount: '' as number | '',
    revenue: '' as number | '',
    currency: 'SAR' as 'SAR' | 'USD' | 'KWD' | 'EGP'
  });

  // Load operations from API
  const loadOperations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/ads-funding');
      const ops = response.data.map((op: any) => ({
        ...op,
        id: op._id || op.id
      }));
      setOperations(ops);
    } catch (error: any) {
      console.error('Failed to load ads funding operations:', error);
      setToast({
        message: 'فشل في تحميل البيانات: ' + (error.response?.data?.message || error.message),
        type: 'error',
        isOpen: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    if (canViewAds) {
      loadOperations();
    }
  }, [canViewAds]);

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      SAR: 'ر.س',
      USD: '$',
      KWD: 'د.ك',
      EGP: 'ج.م'
    };
    return symbols[currency] || currency;
  };

  const filteredOperations = operations.filter(op => {
    const opDate = new Date(op.date);
    return opDate.getMonth() + 1 === selectedMonth && opDate.getFullYear() === selectedYear;
  });

  const tiktokOps = filteredOperations.filter(op => op.platform === 'tiktok');
  const instagramOps = filteredOperations.filter(op => op.platform === 'instagram');

  const calculateTotals = (ops: AdOperation[]) => ({
    cost: ops.reduce((sum, op) => sum + op.cost, 0),
    clients: ops.reduce((sum, op) => sum + op.clientsCount, 0),
    revenue: ops.reduce((sum, op) => sum + op.revenue, 0),
    profit: ops.reduce((sum, op) => sum + (op.revenue - op.cost), 0)
  });

  const tiktokTotals = calculateTotals(tiktokOps);
  const instagramTotals = calculateTotals(instagramOps);
  const grandTotals = calculateTotals(filteredOperations);

  const openAdd = () => {
    if (!canWriteAds) {
      setToast({ message: 'ليس لديك صلاحية لإضافة عمليات', type: 'error', isOpen: true });
      return;
    }
    setEditing(null);
    setFormData({
      platform: 'tiktok',
      date: new Date().toISOString().split("T")[0],
      action: '',
      cost: '',
      clientsCount: '',
      revenue: '',
      currency: 'SAR'
    });
    setShowModal(true);
  };

  const openEdit = (op: AdOperation) => {
    if (!canWriteAds) {
      setToast({ message: 'ليس لديك صلاحية لتعديل العمليات', type: 'error', isOpen: true });
      return;
    }
    setEditing(op);
    setFormData({
      platform: op.platform,
      date: new Date(op.date).toISOString().split("T")[0],
      action: op.action,
      cost: op.cost,
      clientsCount: op.clientsCount,
      revenue: op.revenue,
      currency: op.currency
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const data = {
        platform: formData.platform,
        date: formData.date,
        action: formData.action,
        cost: Number(formData.cost) || 0,
        clientsCount: Number(formData.clientsCount) || 0,
        revenue: Number(formData.revenue) || 0,
        currency: formData.currency
      };

      if (editing) {
        await api.put(`/ads-funding/${editing.id}`, data);
        setToast({ message: 'تم تحديث العملية بنجاح', type: 'success', isOpen: true });
      } else {
        await api.post('/ads-funding', data);
        setToast({ message: 'تم إضافة العملية بنجاح', type: 'success', isOpen: true });
      }

      setShowModal(false);
      await loadOperations();
    } catch (error: any) {
      console.error('Failed to save operation:', error);
      setToast({
        message: 'فشل في حفظ العملية: ' + (error.response?.data?.message || error.message),
        type: 'error',
        isOpen: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!canDeleteAds) {
      setToast({ message: 'ليس لديك صلاحية لحذف العمليات', type: 'error', isOpen: true });
      return;
    }
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await api.delete(`/ads-funding/${deleteId}`);
        setToast({ message: 'تم حذف العملية بنجاح', type: 'success', isOpen: true });
        setDeleteId(null);
        setShowDeleteDialog(false);
        await loadOperations();
      } catch (error: any) {
        console.error('Failed to delete operation:', error);
        setToast({
          message: 'فشل في حذف العملية: ' + (error.response?.data?.message || error.message),
          type: 'error',
          isOpen: true
        });
      }
    }
  };

  // Permission Guard
  if (!canViewAds) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى تقرير تمويل الإعلانات</p>
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
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            تقرير عمليات تمويل الإعلانات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة إعلانات TikTok و Instagram شهرياً</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadOperations} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          {canWriteAds && (
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" />
              إضافة عملية
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-500" />
            الفلاتر
          </h2>
        </Card.Header>
        <Card.Body>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={i} value={2025 + i}>
                    {2025 + i}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="mr-2 text-gray-600 dark:text-gray-400">جاري التحميل...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="إجمالي المصاريف"
              value={grandTotals.cost.toFixed(2)}
              icon={<DollarSign className="w-6 h-6" />}
              iconColor="red"
              subtitle="تكلفة الإعلانات"
            />
            <StatCard
              title="إجمالي العملاء"
              value={grandTotals.clients.toString()}
              icon={<Users className="w-6 h-6" />}
              iconColor="blue"
              subtitle="عميل جديد"
            />
            <StatCard
              title="إجمالي الإيرادات"
              value={grandTotals.revenue.toFixed(2)}
              icon={<TrendingUp className="w-6 h-6" />}
              iconColor="green"
              subtitle="من الإعلانات"
            />
          </div>

          {/* TikTok Section */}
          <Card>
            <div className="bg-gray-900 dark:bg-black text-white p-4 rounded-t-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">إعلانات TikTok</h2>
              </div>
              <div className="sm:mr-auto flex flex-wrap gap-4 text-sm">
                <Badge variant="error">التكلفة: {tiktokTotals.cost.toFixed(2)}</Badge>
                <Badge variant="info">العملاء: {tiktokTotals.clients}</Badge>
                <Badge variant="success">الإيرادات: {tiktokTotals.revenue.toFixed(2)}</Badge>
              </div>
            </div>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>التاريخ</Table.Head>
                      <Table.Head>الإجراء</Table.Head>
                      <Table.Head>التكلفة</Table.Head>
                      <Table.Head>عدد العملاء</Table.Head>
                      <Table.Head>الإيرادات</Table.Head>
                      <Table.Head>الإجراءات</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {tiktokOps.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={6}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد عمليات لهذا الشهر
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      tiktokOps.map(op => (
                        <Table.Row key={op.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(op.date).toLocaleDateString('ar-EG')}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="font-medium text-gray-900 dark:text-white">{op.action}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-error-600 dark:text-error-400 font-medium">
                              {op.cost.toFixed(2)} {getCurrencySymbol(op.currency)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-gray-900 dark:text-white">{op.clientsCount}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-success-600 dark:text-success-400 font-medium">
                              {op.revenue.toFixed(2)} {getCurrencySymbol(op.currency)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex gap-2">
                              {canWriteAds && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(op)}
                                  className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}
                              {canDeleteAds && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(op.id)}
                                  className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
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

          {/* Instagram Section */}
          <Card>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold">إعلانات Instagram</h2>
              </div>
              <div className="sm:mr-auto flex flex-wrap gap-4 text-sm">
                <Badge variant="error">التكلفة: {instagramTotals.cost.toFixed(2)}</Badge>
                <Badge variant="info">العملاء: {instagramTotals.clients}</Badge>
                <Badge variant="success">الإيرادات: {instagramTotals.revenue.toFixed(2)}</Badge>
              </div>
            </div>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>التاريخ</Table.Head>
                      <Table.Head>الإجراء</Table.Head>
                      <Table.Head>التكلفة</Table.Head>
                      <Table.Head>عدد العملاء</Table.Head>
                      <Table.Head>الإيرادات</Table.Head>
                      <Table.Head>الإجراءات</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {instagramOps.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={6}>
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            لا توجد عمليات لهذا الشهر
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      instagramOps.map(op => (
                        <Table.Row key={op.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(op.date).toLocaleDateString('ar-EG')}
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="font-medium text-gray-900 dark:text-white">{op.action}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-error-600 dark:text-error-400 font-medium">
                              {op.cost.toFixed(2)} {getCurrencySymbol(op.currency)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-gray-900 dark:text-white">{op.clientsCount}</span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-success-600 dark:text-success-400 font-medium">
                              {op.revenue.toFixed(2)} {getCurrencySymbol(op.currency)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex gap-2">
                              {canWriteAds && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(op)}
                                  className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}
                              {canDeleteAds && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(op.id)}
                                  className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
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
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'تعديل عملية إعلانية' : 'إضافة عملية إعلانية'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المنصة</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as 'tiktok' | 'instagram' })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التاريخ</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العملة</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'SAR' | 'USD' | 'KWD' | 'EGP' })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="SAR">ر.س - ريال سعودي</option>
                <option value="USD">$ - دولار أمريكي</option>
                <option value="KWD">د.ك - دينار كويتي</option>
                <option value="EGP">ج.م - جنيه مصري</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الإجراء</label>
            <input
              type="text"
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="مثال: حملة إعلانية - منتج X"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التكلفة</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value === '' ? '' : Number(e.target.value) })}
                onFocus={(e) => e.target.value === '0' && setFormData({ ...formData, cost: '' })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">عدد العملاء</label>
              <input
                type="number"
                value={formData.clientsCount}
                onChange={(e) => setFormData({ ...formData, clientsCount: e.target.value === '' ? '' : Number(e.target.value) })}
                onFocus={(e) => e.target.value === '0' && setFormData({ ...formData, clientsCount: '' })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الإيرادات</label>
              <input
                type="number"
                step="0.01"
                value={formData.revenue}
                onChange={(e) => setFormData({ ...formData, revenue: e.target.value === '' ? '' : Number(e.target.value) })}
                onFocus={(e) => e.target.value === '0' && setFormData({ ...formData, revenue: '' })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
              disabled={isSaving}
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
        message="هل أنت متأكد من حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء."
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

export default AdsFundingReport;
