import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { useNotificationStore } from '../store/notificationStore';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button } from '../components/ui';
import {
  MessageSquare,
  Plus,
  Lock,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Wrench,
  User,
  Calendar,
  Send,
  FileText
} from 'lucide-react';

const Complaints: React.FC = () => {
  const { user } = useAuthStore();
  const { complaints, loadComplaints, addComplaint } = useDataStore();
  const { canRead, canWrite } = usePermissions();
  const canViewComplaints = canRead('complaints');
  const canWriteComplaints = canWrite('complaints');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const [formData, setFormData] = useState({
    type: 'complaint' as 'complaint' | 'suggestion' | 'technical_issue',
    title: '',
    description: ''
  });

  const [recipientType, setRecipientType] = useState<'general_manager' | 'administrative_manager' | 'technical_support'>('general_manager');
  const { addNotification } = useNotificationStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let recipientId = '';
    if (recipientType === 'technical_support') {
      recipientId = 'super-admin-1';
    }

    await addComplaint({
      recipientType,
      recipientId,
      ...formData,
      status: 'pending'
    });

    // إرسال إشعار للمستلم
    if (recipientId) {
      const notificationTitle =
        formData.type === 'complaint' ? 'شكوى جديدة' :
        formData.type === 'technical_issue' ? 'مشكلة تقنية' : 'اقتراح جديد';

      addNotification({
        userId: recipientId,
        type: 'system',
        title: notificationTitle,
        message: `${user?.name}: ${formData.title}`
      });
    }

    // إرسال تلقائي للسوبر أدمن (إلا إذا كانت شكوى تقنية)
    if (formData.type !== 'technical_issue') {
      addNotification({
        userId: 'super-admin-1',
        type: 'system',
        title: formData.type === 'complaint' ? 'شكوى جديدة' : 'اقتراح جديد',
        message: `${user?.name} (${user?.companyId}): ${formData.title}`
      });
    }

    setToast({message: 'تم إرسال الطلب بنجاح', type: 'success', isOpen: true});
    setShowModal(false);
    setFormData({ type: 'complaint', title: '', description: '' });
    setRecipientType('general_manager');
    await loadComplaints();
  };

  const userComplaints = user?.role === 'super_admin'
    ? complaints
    : complaints.filter(c => c.userId === user?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">قيد الانتظار</Badge>;
      case 'in-progress':
        return <Badge variant="info">قيد المعالجة</Badge>;
      case 'resolved':
        return <Badge variant="success">تم الحل</Badge>;
      case 'rejected':
        return <Badge variant="error">مرفوض</Badge>;
      default:
        return <Badge variant="light">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'complaint':
        return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      case 'technical_issue':
        return <Wrench className="w-5 h-5 text-error-500" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-success-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // Permission Guard
  if (!canViewComplaints) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى الشكاوى والاقتراحات</p>
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
              <MessageSquare className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            الشكاوى والاقتراحات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">شاركنا آرائك ومقترحاتك</p>
        </div>
        {canWriteComplaints && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            إضافة جديد
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="قيد الانتظار"
          value={complaints.filter(c => c.status === 'pending').length}
          icon={<Clock className="w-6 h-6" />}
          iconColor="orange"
        />
        <StatCard
          title="قيد المعالجة"
          value={complaints.filter(c => c.status === 'in-progress').length}
          icon={<RefreshCw className="w-6 h-6" />}
          iconColor="blue"
        />
        <StatCard
          title="تم الحل"
          value={complaints.filter(c => c.status === 'resolved').length}
          icon={<CheckCircle className="w-6 h-6" />}
          iconColor="green"
        />
        <StatCard
          title="مرفوض"
          value={complaints.filter(c => c.status === 'rejected').length}
          icon={<XCircle className="w-6 h-6" />}
          iconColor="red"
        />
      </div>

      {/* Complaints List */}
      <Card>
        <Card.Header className="bg-brand-500 dark:bg-brand-600 text-white rounded-t-2xl">
          <h2 className="text-lg font-semibold">جميع الطلبات</h2>
        </Card.Header>
        <Card.Body className="p-0">
          {userComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">لا توجد شكاوى أو اقتراحات</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {userComplaints.map((complaint) => (
                <div key={complaint.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
                          {getTypeIcon(complaint.type)}
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{complaint.title}</h3>
                        {getStatusBadge(complaint.status)}
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
                        <p className="text-gray-600 dark:text-gray-300">{complaint.description}</p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {complaint.userName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(complaint.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>

                      {complaint.response && (
                        <div className="mt-4 p-4 bg-success-50 dark:bg-success-900/20 rounded-xl border-r-4 border-success-500">
                          <p className="text-sm font-bold text-success-800 dark:text-success-400 mb-2 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            الرد:
                          </p>
                          <p className="text-gray-700 dark:text-gray-200">{complaint.response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="إضافة جديد"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النوع</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as any;
                setFormData({ ...formData, type: newType });
                if (newType === 'technical_issue') {
                  setRecipientType('technical_support');
                }
              }}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            >
              <option value="complaint">شكوى</option>
              <option value="suggestion">اقتراح</option>
              <option value="technical_issue">مشكلة تقنية</option>
            </select>
          </div>

          {formData.type !== 'technical_issue' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">إرسال إلى</label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as any)}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="general_manager">المدير العام</option>
                <option value="administrative_manager">المدير الإداري</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">* سيتم إرسال نسخة تلقائياً للإدارة العليا</p>
            </div>
          )}

          {formData.type === 'technical_issue' && (
            <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg p-4">
              <div className="flex items-center gap-3 text-info-800 dark:text-info-300">
                <div className="w-10 h-10 bg-info-100 dark:bg-info-900/30 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-info-600" />
                </div>
                <div>
                  <p className="font-medium">سيتم إرسال المشكلة إلى:</p>
                  <p className="text-sm">مطور التطبيق</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العنوان</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={4}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Send className="w-4 h-4" />
              إرسال
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
      />
    </div>
  );
};

export default Complaints;
