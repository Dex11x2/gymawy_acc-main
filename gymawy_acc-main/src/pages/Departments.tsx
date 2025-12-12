import React, { useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { Department } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import { Card, StatCard, Badge, Button, Input, Textarea, Table } from '../components/ui';
import { Building2, Users, CheckCircle, Plus, Edit2, Trash2, Eye } from 'lucide-react';

const Departments: React.FC = () => {
  const { departments, employees, payrolls, addDepartment, updateDepartment, deleteDepartment, loadDepartments, loadEmployees, loadPayrolls } = useDataStore();
  const { user } = useAuthStore();
  const { canWrite, canDelete } = usePermissions();

  const canCreateDepartment = canWrite('departments');
  const canEditDepartment = canWrite('departments');
  const canDeleteDepartment = canDelete('departments');
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});

  React.useEffect(() => {
    loadDepartments();
    loadEmployees();
    loadPayrolls();
  }, [loadDepartments, loadEmployees, loadPayrolls]);

  // Calculate department statistics
  const getDepartmentStats = (deptId: string) => {
    const deptEmployees = employees.filter(emp => emp.departmentId === deptId);
    const deptPayrolls = payrolls.filter(p =>
      deptEmployees.some(emp => emp.id === p.employeeId)
    );
    const avgSalary = deptPayrolls.length > 0
      ? deptPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0) / deptPayrolls.length
      : 0;

    return {
      employeeCount: deptEmployees.length,
      avgSalary: Math.round(avgSalary)
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDepartment && !canEditDepartment) {
      setToast({message: 'ليس لديك صلاحية لتعديل الأقسام', type: 'error', isOpen: true});
      return;
    }
    if (!editingDepartment && !canCreateDepartment) {
      setToast({message: 'ليس لديك صلاحية لإضافة أقسام', type: 'error', isOpen: true});
      return;
    }

    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, formData);
        setToast({message: 'تم تحديث القسم بنجاح', type: 'success', isOpen: true});
      } else {
        const departmentData: any = { ...formData };
        if (user?.companyId) {
          departmentData.companyId = user.companyId;
        }
        await addDepartment(departmentData);
        setToast({message: 'تم إضافة القسم بنجاح', type: 'success', isOpen: true});
      }

      await loadDepartments();
      setShowModal(false);
      setEditingDepartment(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving department:', error);
      setToast({message: 'حدث خطأ أثناء حفظ القسم', type: 'error', isOpen: true});
    }
  };

  const handleEdit = (department: Department) => {
    if (!canEditDepartment) {
      setToast({message: 'ليس لديك صلاحية لتعديل الأقسام', type: 'error', isOpen: true});
      return;
    }
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (!canDeleteDepartment) {
      setToast({message: 'ليس لديك صلاحية لحذف الأقسام', type: 'error', isOpen: true});
      return;
    }
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteDepartment(deleteId);
      setToast({message: 'تم حذف القسم بنجاح', type: 'success', isOpen: true});
      setDeleteId(null);
    }
  };

  const openAddModal = () => {
    if (!canCreateDepartment) {
      setToast({message: 'ليس لديك صلاحية لإضافة أقسام', type: 'error', isOpen: true});
      return;
    }
    setEditingDepartment(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">الأقسام</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة أقسام الشركة</p>
        </div>
        {canCreateDepartment && (
          <Button
            onClick={openAddModal}
            variant="primary"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة قسم جديد
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="إجمالي الأقسام"
          value={departments.length.toString()}
          icon={<Building2 className="w-6 h-6" />}
          badgeColor="primary"
        />
        <StatCard
          title="الأقسام النشطة"
          value={departments.length.toString()}
          icon={<CheckCircle className="w-6 h-6" />}
          badgeColor="success"
        />
        <StatCard
          title="إجمالي الموظفين"
          value={employees.length.toString()}
          icon={<Users className="w-6 h-6" />}
          badgeColor="info"
        />
      </div>

      {/* Departments Table */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">قائمة الأقسام</h2>
        </Card.Header>
        <Card.Body className="p-0">
          {departments.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">لا توجد أقسام</h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">ابدأ بإضافة أول قسم في شركتك</p>
              {canCreateDepartment && (
                <Button
                  onClick={openAddModal}
                  variant="primary"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  إضافة قسم جديد
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>اسم القسم</Table.Head>
                  <Table.Head>الوصف</Table.Head>
                  <Table.Head>عدد الموظفين</Table.Head>
                  <Table.Head>متوسط الرواتب</Table.Head>
                  <Table.Head>الإجراءات</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {departments.map((department) => {
                  const stats = getDepartmentStats(department.id);
                  return (
                    <Table.Row key={department.id}>
                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold">
                            {department.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {department.name}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <span className="text-gray-600 dark:text-gray-400">
                          {department.description || 'لا يوجد وصف'}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="primary">
                          {stats.employeeCount} موظف
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="success">
                          {stats.avgSalary.toLocaleString()} ر.س
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          {canEditDepartment && (
                            <button
                              onClick={() => handleEdit(department)}
                              className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteDepartment && (
                            <button
                              onClick={() => handleDelete(department.id)}
                              className="p-2 rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 text-gray-500 hover:text-error-600 dark:text-gray-400 dark:hover:text-error-400 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {!canEditDepartment && !canDeleteDepartment && (
                            <span className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              عرض فقط
                            </span>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDepartment ? 'تعديل القسم' : 'إضافة قسم جديد'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="اسم القسم *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="أدخل اسم القسم"
            required
          />

          <Textarea
            label="الوصف"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="أدخل وصف القسم (اختياري)"
            rows={3}
          />

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
            >
              {editingDepartment ? 'تحديث' : 'إضافة'}
            </Button>
            <Button
              type="button"
              onClick={() => setShowModal(false)}
              variant="outline"
              className="flex-1"
            >
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
        message="هل أنت متأكد من حذف هذا القسم؟ لا يمكن التراجع عن هذا الإجراء."
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

export default Departments;
