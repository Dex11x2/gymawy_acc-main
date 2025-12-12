import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Card, Badge, Button } from '../components/ui';
import {
  BookOpen,
  Plus,
  Lock,
  Edit2,
  Trash2,
  Scroll,
  Scale,
  CheckSquare,
  RefreshCw,
  Pin,
  List,
  Clock,
  Save,
  X
} from 'lucide-react';

interface Instruction {
  id: string;
  title: string;
  content: string;
  category: 'work-rules' | 'rights' | 'duties' | 'procedures' | 'other';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const Instructions: React.FC = () => {
  useAuthStore();
  const { canRead, canWrite, canUpdate, canDelete } = usePermissions();
  const canViewInstructions = canRead('instructions');
  const canWriteInstructions = canWrite('instructions');
  const canUpdateInstructions = canUpdate('instructions');
  const canDeleteInstructions = canDelete('instructions');
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({
    message: '', type: 'success', isOpen: false
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'work-rules' as 'work-rules' | 'rights' | 'duties' | 'procedures' | 'other',
  });

  const categories = [
    { id: 'work-rules', name: 'شروط العمل', icon: Scroll, color: 'blue' },
    { id: 'rights', name: 'حقوق الموظفين', icon: Scale, color: 'green' },
    { id: 'duties', name: 'واجبات الموظفين', icon: CheckSquare, color: 'orange' },
    { id: 'procedures', name: 'إجراءات العمل', icon: RefreshCw, color: 'purple' },
    { id: 'other', name: 'أخرى', icon: Pin, color: 'gray' },
  ];

  useEffect(() => {
    loadInstructions();
  }, []);

  const loadInstructions = async () => {
    try {
      const response = await api.get('/instructions');
      setInstructions(response.data);
    } catch (error) {
      console.error('Error loading instructions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingInstruction && !canUpdateInstructions) {
      setToast({message: 'ليس لديك صلاحية لتعديل التعليمات', type: 'error', isOpen: true});
      return;
    }

    if (!editingInstruction && !canWriteInstructions) {
      setToast({message: 'ليس لديك صلاحية لإضافة تعليمات', type: 'error', isOpen: true});
      return;
    }

    try {
      if (editingInstruction) {
        await api.put(`/instructions/${editingInstruction.id}`, formData);
        setToast({message: 'تم تحديث التعليمات بنجاح', type: 'success', isOpen: true});
      } else {
        await api.post('/instructions', formData);
        setToast({message: 'تم إضافة التعليمات بنجاح', type: 'success', isOpen: true});
      }

      loadInstructions();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setToast({message: error.response?.data?.message || 'حدث خطأ', type: 'error', isOpen: true});
    }
  };

  const handleEdit = (instruction: Instruction) => {
    if (!canUpdateInstructions) {
      setToast({message: 'ليس لديك صلاحية لتعديل التعليمات', type: 'error', isOpen: true});
      return;
    }
    setEditingInstruction(instruction);
    setFormData({
      title: instruction.title,
      content: instruction.content,
      category: instruction.category,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (!canDeleteInstructions) {
      setToast({message: 'ليس لديك صلاحية لحذف التعليمات', type: 'error', isOpen: true});
      return;
    }
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await api.delete(`/instructions/${deleteId}`);
        setToast({message: 'تم حذف التعليمات بنجاح', type: 'success', isOpen: true});
        loadInstructions();
        setDeleteId(null);
      } catch (error: any) {
        setToast({message: error.response?.data?.message || 'فشل الحذف', type: 'error', isOpen: true});
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'work-rules',
    });
    setEditingInstruction(null);
  };

  const filteredInstructions = selectedCategory === 'all'
    ? instructions
    : instructions.filter(i => i.category === selectedCategory);

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.id === category) || { name: category, icon: Pin, color: 'gray' };
  };

  const getCategoryBadgeVariant = (category: string): 'success' | 'error' | 'warning' | 'info' | 'light' => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'info' | 'light'> = {
      'work-rules': 'info',
      'rights': 'success',
      'duties': 'warning',
      'procedures': 'light',
      'other': 'light'
    };
    return variants[category] || 'light';
  };

  // Permission Guard
  if (!canViewInstructions) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى التعليمات</p>
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
            <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            تعليمات العمل
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">شروط وإجراءات العمل للموظفين</p>
        </div>
        {canWriteInstructions && (
          <Button onClick={() => {
            resetForm();
            setShowModal(true);
          }}>
            <Plus className="w-4 h-4" />
            إضافة تعليمات
          </Button>
        )}
      </div>

      {/* Categories Filter */}
      <Card>
        <Card.Body className="p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg transition-all font-medium flex items-center gap-2 ${
                selectedCategory === 'all'
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
              الكل
            </button>
            {categories.map(cat => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg transition-all font-medium flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Instructions List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredInstructions.length === 0 ? (
          <Card>
            <Card.Body className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-warning-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  لا توجد تعليمات
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  {canWriteInstructions ? 'ابدأ بإضافة أول تعليمات للموظفين' : 'لم يتم إضافة تعليمات بعد'}
                </p>
              </div>
            </Card.Body>
          </Card>
        ) : (
          filteredInstructions.map(instruction => {
            const categoryInfo = getCategoryInfo(instruction.category);
            const IconComponent = categoryInfo.icon;
            return (
              <Card key={instruction.id} className="hover:shadow-lg transition-shadow">
                <Card.Body className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-7 h-7 text-warning-600 dark:text-warning-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                          {instruction.title}
                        </h2>
                        <Badge variant={getCategoryBadgeVariant(instruction.category)} className="mt-1">
                          {categoryInfo.name}
                        </Badge>
                      </div>
                    </div>
                    {(canUpdateInstructions || canDeleteInstructions) && (
                      <div className="flex gap-2">
                        {canUpdateInstructions && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(instruction)}
                          >
                            <Edit2 className="w-4 h-4" />
                            تعديل
                          </Button>
                        )}
                        {canDeleteInstructions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(instruction.id)}
                            className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {instruction.content}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>آخر تحديث: {new Date(instruction.updatedAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                </Card.Body>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingInstruction ? 'تعديل التعليمات' : 'إضافة تعليمات جديدة'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              العنوان *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="عنوان التعليمات"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              التصنيف *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              المحتوى *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="اكتب محتوى التعليمات هنا..."
              rows={10}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingInstruction ? (
                <>
                  <Save className="w-4 h-4" />
                  تحديث
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  إضافة
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              <X className="w-4 h-4" />
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذه التعليمات؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
      />
    </div>
  );
};

export default Instructions;
