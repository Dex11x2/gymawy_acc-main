import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button } from '../components/ui';
import {
  MessageSquare, Plus, Lock, Clock, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Lightbulb, Wrench, User, Calendar, Send, FileText, EyeOff,
} from 'lucide-react';

type RecipientType = 'general_manager' | 'administrative_manager' | 'technical_support' | 'dev';

const recipientLabel: Record<string, string> = {
  general_manager: 'المدير العام',
  administrative_manager: 'المدير الإداري',
  technical_support: 'الدعم الفني (المطوّر)',
  dev: 'السوبر أدمن',
};

const Complaints: React.FC = () => {
  const { user } = useAuthStore();
  const { complaints, loadComplaints, addComplaint, updateComplaint } = useDataStore();
  const { canRead, canWrite } = usePermissions();
  const canViewComplaints = canRead('complaints');
  const canWriteComplaints = canWrite('complaints');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean }>({ message: '', type: 'success', isOpen: false });
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  const [formData, setFormData] = useState({
    type: 'complaint' as 'complaint' | 'suggestion' | 'technical_issue',
    title: '',
    description: '',
    isAnonymous: false,
  });
  const [recipientType, setRecipientType] = useState<RecipientType>('general_manager');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalRecipient: RecipientType = formData.type === 'technical_issue' ? 'technical_support' : recipientType;
      await addComplaint({
        type: formData.type,
        title: formData.title,
        description: formData.description,
        isAnonymous: formData.isAnonymous,
        recipientType: finalRecipient,
        status: 'pending',
      });
      setToast({ message: 'تم إرسال طلبك بنجاح', type: 'success', isOpen: true });
      setShowModal(false);
      setFormData({ type: 'complaint', title: '', description: '', isAnonymous: false });
      setRecipientType('general_manager');
      await loadComplaints();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'تعذّر إرسال الطلب', type: 'error', isOpen: true });
    }
  };

  // مين يقدر يرد على الطلب ده؟ (نفس منطق الباك)
  const canReviewThis = (c: any): boolean => {
    if (user?.role === 'dev') return true;
    if (user?.role === 'general_manager') return c.recipientType === 'general_manager';
    if (user?.role === 'administrative_manager') return c.recipientType === 'administrative_manager';
    return false;
  };

  const setStatus = async (c: any, status: string) => {
    setSavingId(c.id);
    try {
      await updateComplaint(c.id, { status });
      setToast({ message: 'تم تحديث الحالة', type: 'success', isOpen: true });
      await loadComplaints();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'تعذّر التحديث', type: 'error', isOpen: true });
    } finally { setSavingId(null); }
  };

  const sendReply = async (c: any) => {
    const text = (replyText[c.id] || '').trim();
    if (!text) return;
    setSavingId(c.id);
    try {
      await updateComplaint(c.id, { response: text, status: c.status === 'pending' ? 'in-progress' : c.status });
      setReplyText({ ...replyText, [c.id]: '' });
      setToast({ message: 'تم إرسال الرد', type: 'success', isOpen: true });
      await loadComplaints();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'تعذّر إرسال الرد', type: 'error', isOpen: true });
    } finally { setSavingId(null); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">قيد الانتظار</Badge>;
      case 'in-progress': return <Badge variant="info">قيد المعالجة</Badge>;
      case 'resolved': return <Badge variant="success">تم الحل</Badge>;
      case 'rejected': return <Badge variant="error">مرفوض</Badge>;
      default: return <Badge variant="light">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'complaint': return <AlertTriangle className="w-5 h-5 text-warning-500" />;
      case 'technical_issue': return <Wrench className="w-5 h-5 text-error-500" />;
      case 'suggestion': return <Lightbulb className="w-5 h-5 text-success-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            الشكاوى والمقترحات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">اكتب شكواك أو مقترحك، اختار يوصل لمين، وتقدر تخليه باسمك أو مجهول</p>
        </div>
        {canWriteComplaints && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> إضافة جديد
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="قيد الانتظار" value={complaints.filter(c => c.status === 'pending').length} icon={<Clock className="w-6 h-6" />} iconColor="orange" />
        <StatCard title="قيد المعالجة" value={complaints.filter(c => c.status === 'in-progress').length} icon={<RefreshCw className="w-6 h-6" />} iconColor="blue" />
        <StatCard title="تم الحل" value={complaints.filter(c => c.status === 'resolved').length} icon={<CheckCircle className="w-6 h-6" />} iconColor="green" />
        <StatCard title="مرفوض" value={complaints.filter(c => c.status === 'rejected').length} icon={<XCircle className="w-6 h-6" />} iconColor="red" />
      </div>

      {/* List */}
      <Card>
        <Card.Header className="bg-brand-500 dark:bg-brand-600 text-white rounded-t-2xl">
          <h2 className="text-lg font-semibold">الطلبات</h2>
        </Card.Header>
        <Card.Body className="p-0">
          {complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">لا توجد شكاوى أو مقترحات</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {complaints.map((complaint) => {
                const reviewable = canReviewThis(complaint);
                return (
                  <div key={complaint.id} className="p-5 lg:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div className="w-11 h-11 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center shrink-0">
                        {getTypeIcon(complaint.type)}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">{complaint.title}</h3>
                      {getStatusBadge(complaint.status)}
                      {complaint.isAnonymous && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          <EyeOff className="w-3 h-3" /> مجهول
                        </span>
                      )}
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-3">
                      <p className="text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap">{complaint.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><User className="w-4 h-4" /> {complaint.userName}</span>
                      <span className="flex items-center gap-1"><Send className="w-4 h-4" /> إلى: {recipientLabel[complaint.recipientType] || complaint.recipientType}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(complaint.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>

                    {/* الرد (لصاحب الطلب والمستلم) */}
                    {complaint.response && (
                      <div className="mt-4 p-4 bg-success-50 dark:bg-success-900/20 rounded-xl border-r-4 border-success-500">
                        <p className="text-sm font-bold text-success-800 dark:text-success-400 mb-1 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> الرد{complaint.respondedByName ? ` (${complaint.respondedByName})` : ''}:
                        </p>
                        <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{complaint.response}</p>
                      </div>
                    )}

                    {/* أدوات الرد للمستلم/المدير */}
                    {reviewable && (
                      <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setStatus(complaint, 'in-progress')} disabled={savingId === complaint.id}
                            className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-info-50 text-info-700 hover:bg-info-100 dark:bg-info-500/15 dark:text-info-300">قيد المعالجة</button>
                          <button onClick={() => setStatus(complaint, 'resolved')} disabled={savingId === complaint.id}
                            className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-500/15 dark:text-success-300">تم الحل</button>
                          <button onClick={() => setStatus(complaint, 'rejected')} disabled={savingId === complaint.id}
                            className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-error-50 text-error-700 hover:bg-error-100 dark:bg-error-500/15 dark:text-error-300">رفض</button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <textarea
                            value={replyText[complaint.id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [complaint.id]: e.target.value })}
                            placeholder="اكتب ردك على الموظف..."
                            rows={2}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                          />
                          <Button onClick={() => sendReply(complaint)} disabled={savingId === complaint.id || !(replyText[complaint.id] || '').trim()} className="gap-1 sm:self-stretch">
                            <Send className="w-4 h-4" /> رد
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="طلب جديد" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النوع</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              required
            >
              <option value="complaint">شكوى</option>
              <option value="suggestion">مقترح</option>
              <option value="technical_issue">مشكلة تقنية</option>
            </select>
          </div>

          {formData.type !== 'technical_issue' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">يتقدّم لمين؟</label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                required
              >
                <option value="general_manager">المدير العام</option>
                <option value="administrative_manager">المدير الإداري</option>
                <option value="dev">السوبر أدمن</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">الطلب هيوصل للشخص ده بس.</p>
            </div>
          ) : (
            <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg p-4 flex items-center gap-3 text-info-800 dark:text-info-300">
              <Wrench className="w-5 h-5 text-info-600" />
              <div><p className="font-medium">هيوصل إلى:</p><p className="text-sm">مطوّر التطبيق</p></div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العنوان</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التفاصيل</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              rows={4}
              required
            />
          </div>

          {/* خيار المجهول */}
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <input
              type="checkbox"
              checked={formData.isAnonymous}
              onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-brand-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-100"><EyeOff className="w-4 h-4" /> تقديم مجهول (إخفاء اسمي)</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">لو فعّلته، المستلم مش هيشوف اسمك — هيظهر «مجهول». تقدر تكتب بصراحة.</span>
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1"><Send className="w-4 h-4" /> إرسال</Button>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">إلغاء</Button>
          </div>
        </form>
      </Modal>

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default Complaints;
