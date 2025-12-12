import React, { useState, useEffect } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Table, Avatar } from '../components/ui';
import {
  Wallet,
  Plus,
  Lock,
  Clock,
  CheckCircle,
  FileText,
  Banknote
} from 'lucide-react';

const Advances: React.FC = () => {
  const { employees, advances, addAdvance, updateAdvance, loadEmployees } = useDataStore();
  const { user } = useAuthStore();
  const { canRead, canWrite } = usePermissions();

  const canViewAdvances = canRead('advances');
  const canWriteAdvances = canWrite('advances');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});

  useEffect(() => {
    if (loadEmployees) loadEmployees();
  }, []);

  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '' as number | '',
    date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For super_admin, use a default company ObjectId
    let companyId = user?.companyId || (user as any)?.companyId;

    if (!companyId && user?.role === 'super_admin') {
      companyId = '507f1f77bcf86cd799439011'; // Valid ObjectId for super admin
    }

    if (!companyId && employees && employees.length > 0) {
      companyId = (employees[0] as any)?.companyId || '507f1f77bcf86cd799439011';
    }

    if (!companyId) {
      companyId = '507f1f77bcf86cd799439011';
    }

    try {
      await addAdvance({
        companyId: companyId,
        employeeId: formData.employeeId,
        amount: Number(formData.amount) || 0,
        currency: 'SAR',
        reason: formData.reason,
        requestDate: new Date(formData.date),
        status: 'pending',
        date: new Date(formData.date),
        deductedFromSalary: false
      });
      setToast({message: 'تم إضافة السلفة بنجاح', type: 'success', isOpen: true});
      setShowModal(false);
      setFormData({
        employeeId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reason: ''
      });
    } catch (error: any) {
      console.error('Advance error:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'حدث خطأ أثناء إضافة السلفة';
      setToast({message: errorMsg, type: 'error', isOpen: true});
    }
  };

  const markAsPaid = (id: string) => {
    updateAdvance(id, { status: 'paid' });
    setToast({message: 'تم تحديث حالة السلفة', type: 'success', isOpen: true});
  };

  const totalAdvances = (advances || []).reduce((sum, a) => sum + a.amount, 0);
  const pendingAdvances = (advances || []).filter(a => a.status === 'pending');
  const paidAdvances = (advances || []).filter(a => a.status === 'paid');

  if (!canViewAdvances) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى السلفيات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            السلفيات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة السلف المالية للموظفين</p>
        </div>
        {canWriteAdvances && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            إضافة سلفة جديدة
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي السلفيات"
          value={`${totalAdvances.toLocaleString()} ج.م`}
          icon={<Banknote className="w-6 h-6" />}
          iconColor="blue"
        />
        <StatCard
          title="معلقة"
          value={pendingAdvances.length}
          icon={<Clock className="w-6 h-6" />}
          iconColor="orange"
        />
        <StatCard
          title="مدفوعة"
          value={paidAdvances.length}
          icon={<CheckCircle className="w-6 h-6" />}
          iconColor="green"
        />
      </div>

      {/* Advances Table */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">قائمة السلفيات</h2>
        </Card.Header>
        <Card.Body className="p-0">
          {!advances || advances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                <Banknote className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد سلفيات</h3>
              <p className="text-gray-500 dark:text-gray-500">ابدأ بإضافة سلفة جديدة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>الموظف</Table.Head>
                    <Table.Head>المبلغ</Table.Head>
                    <Table.Head>التاريخ</Table.Head>
                    <Table.Head>السبب</Table.Head>
                    <Table.Head>الحالة</Table.Head>
                    <Table.Head>إجراءات</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(advances || []).map((advance) => {
                    // Check if employeeId is populated object or just ID
                    const employee = (advance.employeeId as any)?.name ?
                      (advance.employeeId as any) :
                      employees.find((e: any) =>
                        e.id === advance.employeeId ||
                        e._id === advance.employeeId ||
                        e.userId?._id === advance.employeeId ||
                        e.userId?.id === advance.employeeId
                      );
                    return (
                      <Table.Row key={advance.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              alt={employee?.name}
                              size="small"
                            />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {employee?.name}
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-bold text-gray-800 dark:text-white">
                            {advance.amount.toLocaleString()} ج.م
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400">
                            {(() => {
                              try {
                                const date = advance.date || advance.requestDate;
                                if (!date) return '-';
                                const dateObj = new Date(date);
                                return isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleDateString('ar-EG');
                              } catch {
                                return '-';
                              }
                            })()}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400">{advance.reason}</span>
                        </Table.Cell>
                        <Table.Cell>
                          {advance.status === 'pending' ? (
                            <Badge variant="warning">معلقة</Badge>
                          ) : (
                            <Badge variant="success">مدفوعة</Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {canWriteAdvances && advance.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsPaid(advance.id)}
                              className="text-success-600 hover:text-success-700 hover:bg-success-50 dark:hover:bg-success-900/20"
                            >
                              <CheckCircle className="w-4 h-4 ml-1" />
                              تحديد كمدفوعة
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="إضافة سلفة جديدة"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموظف *</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="">اختر الموظف</option>
                {(employees || []).map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المبلغ *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="0"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التاريخ *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">السبب *</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="سبب السلفة"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Plus className="w-4 h-4" />
              إضافة السلفة
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

export default Advances;
