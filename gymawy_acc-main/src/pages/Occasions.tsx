import React, { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, Badge, Button } from '../components/ui';
import {
  PartyPopper,
  Plus,
  Lock,
  Edit2,
  Trash2,
  Cake,
  CalendarHeart,
  Calendar,
  Tag,
  RefreshCw,
  Save,
  X,
  Clock
} from 'lucide-react';

const Occasions: React.FC = () => {
  const { canRead, canWrite, canUpdate, canDelete } = usePermissions();
  const canViewOccasions = canRead('occasions');
  const canWriteOccasions = canWrite('occasions');
  const canUpdateOccasions = canUpdate('occasions');
  const canDeleteOccasions = canDelete('occasions');
  const [occasions, setOccasions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', type: 'holiday', date: '', description: '', isRecurring: false });
  const [toast, setToast] = useState({ message: '', type: 'success' as any, isOpen: false });

  useEffect(() => {
    loadOccasions();
  }, []);

  const loadOccasions = async () => {
    try {
      const res = await api.get('/occasions');
      setOccasions(res.data.data || []);
    } catch (error) {
      console.error('Error loading occasions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/occasions/${editingId}`, form);
        setToast({ message: 'تم تحديث المناسبة بنجاح', type: 'success', isOpen: true });
      } else {
        await api.post('/occasions', form);
        setToast({ message: 'تم إضافة المناسبة بنجاح', type: 'success', isOpen: true });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ title: '', type: 'holiday', date: '', description: '', isRecurring: false });
      await loadOccasions();
    } catch (error: any) {
      console.error('Error saving occasion:', error);
      setToast({ message: error.response?.data?.message || 'حدث خطأ', type: 'error', isOpen: true });
    }
  };

  const handleEdit = (occasion: any) => {
    const occasionId = occasion._id || occasion.id;
    setEditingId(occasionId);
    setForm({
      title: occasion.title,
      type: occasion.type,
      date: new Date(occasion.date).toISOString().split('T')[0],
      description: occasion.description || '',
      isRecurring: occasion.isRecurring
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!id || id === 'undefined') {
      setToast({ message: 'معرف المناسبة غير صحيح', type: 'error', isOpen: true });
      return;
    }
    if (!confirm('هل تريد حذف هذه المناسبة؟')) return;
    try {
      await api.delete(`/occasions/${id}`);
      setToast({ message: 'تم الحذف بنجاح', type: 'success', isOpen: true });
      await loadOccasions();
    } catch (error: any) {
      console.error('Delete error:', error);
      setToast({ message: error.response?.data?.message || 'فشل الحذف', type: 'error', isOpen: true });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: '', type: 'holiday', date: '', description: '', isRecurring: false });
    setShowForm(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Cake className="w-6 h-6" />;
      case 'holiday':
        return <PartyPopper className="w-6 h-6" />;
      case 'anniversary':
        return <CalendarHeart className="w-6 h-6" />;
      default:
        return <Calendar className="w-6 h-6" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      birthday: 'عيد ميلاد',
      holiday: 'عطلة',
      anniversary: 'ذكرى سنوية',
      other: 'أخرى'
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string): 'success' | 'error' | 'warning' | 'info' | 'light' => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'info' | 'light'> = {
      birthday: 'info',
      holiday: 'success',
      anniversary: 'warning',
      other: 'light'
    };
    return variants[type] || 'light';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      birthday: 'bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400',
      holiday: 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400',
      anniversary: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
      other: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    };
    return colors[type] || colors.other;
  };

  // Permission Guard
  if (!canViewOccasions) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى المناسبات</p>
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
            <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-xl flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-success-600 dark:text-success-400" />
            </div>
            المناسبات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة المناسبات والأعياد</p>
        </div>
        {canWriteOccasions && (
          <Button onClick={resetForm}>
            <Plus className="w-4 h-4" />
            إضافة مناسبة
          </Button>
        )}
      </div>

      {/* Occasions Grid */}
      {occasions.length === 0 ? (
        <Card>
          <Card.Body className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mb-4">
                <PartyPopper className="w-8 h-8 text-success-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد مناسبات</h3>
              <p className="text-gray-500 dark:text-gray-500">ابدأ بإضافة أول مناسبة</p>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {occasions.map((occasion) => {
            const occasionId = occasion._id || occasion.id;
            return (
              <Card key={occasionId} className="hover:shadow-lg transition-all">
                <Card.Body className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getTypeColor(occasion.type)}`}>
                      {getTypeIcon(occasion.type)}
                    </div>
                    {(canUpdateOccasions || canDeleteOccasions) && (
                      <div className="flex gap-2">
                        {canUpdateOccasions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(occasion)}
                            className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteOccasions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(occasionId)}
                            className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                    {occasion.title}
                  </h3>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={getTypeBadgeVariant(occasion.type)}>
                      <Tag className="w-3 h-3 ml-1" />
                      {getTypeLabel(occasion.type)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {new Date(occasion.date).toLocaleDateString('ar-EG', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  {occasion.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg mb-3 border border-gray-100 dark:border-gray-700">
                      {occasion.description}
                    </p>
                  )}

                  {occasion.isRecurring && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <RefreshCw className="w-4 h-4 text-brand-500" />
                      <span className="text-brand-600 dark:text-brand-400 text-sm font-medium">
                        متكررة سنوياً
                      </span>
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setForm({ title: '', type: 'holiday', date: '', description: '', isRecurring: false });
        }}
        title={editingId ? 'تعديل المناسبة' : 'إضافة مناسبة جديدة'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              العنوان *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="اسم المناسبة"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              النوع *
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="holiday">عطلة</option>
              <option value="birthday">عيد ميلاد</option>
              <option value="anniversary">ذكرى سنوية</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              التاريخ *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الوصف
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              placeholder="وصف المناسبة (اختياري)"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800">
            <input
              type="checkbox"
              id="isRecurring"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
              className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-brand-500" />
              مناسبة متكررة سنوياً
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Save className="w-4 h-4" />
              {editingId ? 'تحديث' : 'حفظ'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({ title: '', type: 'holiday', date: '', description: '', isRecurring: false });
              }}
              className="flex-1"
            >
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
};

export default Occasions;
