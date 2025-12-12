import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Table, Avatar } from '../components/ui';
import {
  Package,
  Plus,
  Lock,
  RefreshCw,
  Wallet,
  RotateCcw,
  FileText,
  Calendar
} from 'lucide-react';

const Custody: React.FC = () => {
  const { user } = useAuthStore();
  const { custodies, employees, loadCustodies, loadEmployees, addCustody, updateCustody } = useDataStore();
  const { canRead, canWrite, canUpdate } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isOpen: false });
  const [formData, setFormData] = useState({
    employeeId: '',
    itemName: '',
    itemValue: '' as string | number,
    receivedDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (canRead('custody')) {
      loadCustodies();
      loadEmployees();
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite('custody')) {
      setToast({ message: 'ليس لديك صلاحية لإضافة العهد', type: 'error', isOpen: true });
      return;
    }

    try {
      const custodyData = {
        employeeId: formData.employeeId,
        itemName: formData.itemName,
        amount: Number(formData.itemValue) || 0,
        currency: 'EGP' as const,
        issueDate: new Date(formData.receivedDate),
        notes: formData.notes,
        status: 'active' as const,
        companyId: user?.companyId || '',
        type: 'material' as const
      };

      await addCustody(custodyData);
      setToast({ message: 'تم إضافة العهدة بنجاح', type: 'success', isOpen: true });
      setShowModal(false);
      setFormData({
        employeeId: '',
        itemName: '',
        itemValue: '',
        receivedDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (error) {
      console.error('Error creating custody:', error);
      setToast({ message: 'خطأ في إضافة العهدة', type: 'error', isOpen: true });
    }
  };

  const returnCustody = async (custodyId: string) => {
    if (!canUpdate('custody')) {
      setToast({ message: 'ليس لديك صلاحية لإرجاع العهد', type: 'error', isOpen: true });
      return;
    }

    try {
      await updateCustody(custodyId, { status: 'returned', returnDate: new Date() });
      setToast({ message: 'تم إرجاع العهدة بنجاح', type: 'success', isOpen: true });
    } catch (error) {
      console.error('Error returning custody:', error);
      setToast({ message: 'خطأ في إرجاع العهدة', type: 'error', isOpen: true });
    }
  };

  if (!canRead('custody')) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى إدارة العهد</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const activeCustodies = (custodies || []).filter(c => c.status === 'active');
  const totalValue = activeCustodies.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            إدارة العهد
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">متابعة وإدارة عهد الموظفين</p>
        </div>
        {canWrite('custody') && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            إضافة عهدة جديدة
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي العهد"
          value={(custodies || []).length}
          icon={<Package className="w-6 h-6" />}
          iconColor="blue"
        />
        <StatCard
          title="العهد النشطة"
          value={activeCustodies.length}
          icon={<RefreshCw className="w-6 h-6" />}
          iconColor="orange"
        />
        <StatCard
          title="القيمة الإجمالية"
          value={`${totalValue.toLocaleString()} ج.م`}
          icon={<Wallet className="w-6 h-6" />}
          iconColor="purple"
        />
      </div>

      {/* Custody Table */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">قائمة العهد</h2>
        </Card.Header>
        <Card.Body className="p-0">
          {!custodies || custodies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد عهد</h3>
              <p className="text-gray-500 dark:text-gray-500">ابدأ بإضافة عهدة جديدة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>الموظف</Table.Head>
                    <Table.Head>اسم الجهاز</Table.Head>
                    <Table.Head>القيمة</Table.Head>
                    <Table.Head>تاريخ الاستلام</Table.Head>
                    <Table.Head>تاريخ الإرجاع</Table.Head>
                    <Table.Head>الحالة</Table.Head>
                    <Table.Head>الإجراءات</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(custodies || []).map((item) => {
                    const employee = (item.employeeId as any) || null;
                    return (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              alt={employee?.name}
                              size="small"
                            />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {employee?.name || 'غير محدد'}
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-medium text-gray-800 dark:text-white">{item.itemName}</span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400">
                            {(item.amount || 0).toLocaleString()} {item.currency || 'ج.م'}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(item.issueDate).toLocaleDateString('ar-EG', { calendar: 'gregory' })}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-gray-600 dark:text-gray-400">
                            {item.returnDate
                              ? new Date(item.returnDate).toLocaleDateString('ar-EG', { calendar: 'gregory' })
                              : '-'
                            }
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          {item.status === 'active' ? (
                            <Badge variant="warning">نشطة</Badge>
                          ) : (
                            <Badge variant="success">مرتجعة</Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {item.status === 'active' && canUpdate('custody') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => returnCustody(item.id)}
                              className="text-success-600 hover:text-success-700 hover:bg-success-50 dark:hover:bg-success-900/20"
                            >
                              <RotateCcw className="w-4 h-4 ml-1" />
                              إرجاع العهدة
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
        title="إضافة عهدة جديدة"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الموظف
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            >
              <option value="">اختر الموظف</option>
              {(employees || []).map((employee: any) => (
                <option key={employee.userId?._id || employee.id} value={employee.userId?._id || employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              اسم الجهاز/العهدة
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({...formData, itemName: e.target.value})}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="مثال: لابتوب Dell"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              القيمة (ج.م)
            </label>
            <input
              type="number"
              value={formData.itemValue}
              onChange={(e) => setFormData({...formData, itemValue: e.target.value === '' ? '' : Number(e.target.value)})}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              تاريخ الاستلام
            </label>
            <input
              type="date"
              value={formData.receivedDate}
              onChange={(e) => setFormData({...formData, receivedDate: e.target.value})}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Plus className="w-4 h-4" />
              إضافة العهدة
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

export default Custody;
