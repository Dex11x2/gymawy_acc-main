import React, { useState, useEffect, useRef } from "react";
import { useDataStore } from "../store/dataStore";
import { useAuthStore } from "../store/authStore";
import { Employee } from "../types";
import {
  exportEmployeesToPDF,
  exportEmployeesToExcel,
} from "../utils/exportUtils";
import { usePermissions } from '../hooks/usePermissions';
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import EmployeeAccountManager from "../components/EmployeeAccountManager";
import { Card, StatCard, Badge, Button, Input, Table, Avatar, Checkbox } from '../components/ui';
import {
  Users, UserCheck, Wallet, UserPlus, Plus, FileSpreadsheet, FileText,
  ChevronDown, Edit2, Trash2, Eye, EyeOff, Briefcase, Shield, Calendar
} from 'lucide-react';

const Employees: React.FC = () => {
  const {
    employees,
    departments,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    loadEmployees,
    loadDepartments,
  } = useDataStore();
  const { user } = useAuthStore();

  const { canRead, canWrite, canDelete } = usePermissions();

  const canAddEmployee = canWrite('employees');
  const canEditEmployee = canWrite('employees');
  const canDeleteEmployee = canDelete('employees');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});

  useEffect(() => {
    if (canRead('employees')) {
      loadEmployees();
      loadDepartments();
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      loadDepartments();
    }
  }, [showModal, loadDepartments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    departmentId: "",
    salary: '' as number | '',
    salaryCurrency: "EGP" as "EGP" | "USD" | "SAR" | "AED",
    salaryType: "fixed" as "fixed" | "variable",
    hireDate: new Date().toISOString().split("T")[0],
    password: "",
    isGeneralManager: false,
    isAdministrativeManager: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const filteredEmployees = filterDepartment
    ? employees.filter((emp) => emp.departmentId === filterDepartment)
    : employees;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEmployee && !canEditEmployee) {
      setToast({message: 'ليس لديك صلاحية لتعديل الموظفين', type: 'error', isOpen: true});
      return;
    }
    if (!editingEmployee && !canAddEmployee) {
      setToast({message: 'ليس لديك صلاحية لإضافة موظفين', type: 'error', isOpen: true});
      return;
    }

    const isCreatingManager = formData.isGeneralManager || formData.isAdministrativeManager;
    if (isCreatingManager && !editingEmployee) {
      const currentEmployee = employees.find(emp => emp.email === user?.email);
      const isSuperAdmin = user?.role === 'super_admin';
      const isGeneralManager = currentEmployee?.isGeneralManager || false;
      const isAdministrativeManager = currentEmployee?.isAdministrativeManager || false;

      if (!isSuperAdmin && !isGeneralManager && !isAdministrativeManager) {
        setToast({message: 'ليس لديك صلاحية لإنشاء مديرين. فقط السوبر أدمن والمدير العام والمدير الإداري يمكنهم ذلك.', type: 'error', isOpen: true});
        return;
      }
    }

    if (!formData.departmentId) {
      setToast({message: 'يرجى اختيار القسم - هذا الحقل إجباري', type: 'warning', isOpen: true});
      return;
    }

    if (departments.length === 0) {
      setToast({message: 'يجب إضافة قسم أولاً من صفحة الأقسام', type: 'warning', isOpen: true});
      return;
    }

    if (editingEmployee) {
      const employeeData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        departmentId: formData.departmentId,
        salary: Number(formData.salary) || 0,
        salaryCurrency: formData.salaryCurrency,
        salaryType: formData.salaryType,
        hireDate: new Date(formData.hireDate),
        isGeneralManager: formData.isGeneralManager,
        isAdministrativeManager: formData.isAdministrativeManager,
      };

      await updateEmployee(editingEmployee.id, employeeData);
      await loadEmployees();
      setToast({message: 'تم تحديث بيانات الموظف بنجاح', type: 'success', isOpen: true});
    } else {
      try {
        const employeeData: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          departmentId: formData.departmentId,
          salary: Number(formData.salary) || 0,
          salaryCurrency: formData.salaryCurrency,
          salaryType: formData.salaryType,
          hireDate: new Date(formData.hireDate),
          password: formData.password,
          isActive: true,
          isGeneralManager: formData.isGeneralManager,
          isAdministrativeManager: formData.isAdministrativeManager,
          permissions: [],
        };

        if (user?.companyId) {
          employeeData.companyId = user.companyId;
        }

        await addEmployee(employeeData);
        await loadEmployees();
        alert(`تم إضافة الموظف بنجاح!\n\nالبريد: ${formData.email}\nكلمة المرور: ${formData.password}\n\nاحفظ هذه البيانات!`);
        setToast({message: `تم إضافة الموظف بنجاح`, type: 'success', isOpen: true});
      } catch (error: any) {
        setToast({message: `فشل إضافة الموظف: ${error.response?.data?.message || error.message}`, type: 'error', isOpen: true});
        return;
      }
    }

    setShowModal(false);
    setEditingEmployee(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      position: "",
      departmentId: "",
      salary: '',
      salaryCurrency: "EGP",
      salaryType: "fixed",
      hireDate: new Date().toISOString().split("T")[0],
      password: "",
      isGeneralManager: false,
      isAdministrativeManager: false,
    });
  };

  const handleEdit = (employee: Employee) => {
    if (!canEditEmployee) {
      setToast({message: 'ليس لديك صلاحية لتعديل الموظفين', type: 'error', isOpen: true});
      return;
    }
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      departmentId: employee.departmentId,
      salary: employee.salary,
      salaryCurrency: employee.salaryCurrency || "EGP",
      salaryType: employee.salaryType || "fixed",
      hireDate: (employee.hireDate instanceof Date
        ? employee.hireDate
        : new Date(employee.hireDate)
      )
        .toISOString()
        .split("T")[0],
      password: "",
      isGeneralManager: employee.isGeneralManager || false,
      isAdministrativeManager: employee.isAdministrativeManager || false,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (!canDeleteEmployee) {
      setToast({message: 'ليس لديك صلاحية لحذف الموظفين', type: 'error', isOpen: true});
      return;
    }
    setDeleteId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteEmployee(deleteId);
      setToast({message: 'تم حذف الموظف بنجاح', type: 'success', isOpen: true});
      setDeleteId(null);
    }
  };

  const openAddModal = () => {
    if (!canAddEmployee) {
      setToast({message: 'ليس لديك صلاحية لإضافة موظفين', type: 'error', isOpen: true});
      return;
    }
    setEditingEmployee(null);
    resetForm();
    setShowModal(true);
  };

  const getDepartmentName = (departmentId: string) => {
    if (!departmentId) return "غير محدد";
    const department = departments.find((d) => {
      const deptId = (d as any)._id || d.id;
      return String(deptId) === String(departmentId) || String(d.id) === String(departmentId);
    });
    return department?.name || "غير محدد";
  };

  // Calculate salary totals by currency
  const salaryByCurrency = employees.reduce((acc, emp) => {
    const curr = emp.salaryCurrency || 'EGP';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += emp.salary;
    return acc;
  }, {} as Record<string, number>);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EGP': return 'ج.م';
      case 'SAR': return 'ر.س';
      case 'USD': return '$';
      case 'AED': return 'د.إ';
      default: return currency;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">الموظفين</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة موظفي الشركة</p>
        </div>
        <div className="flex gap-3">
          <div className="relative" ref={exportMenuRef}>
            <Button
              onClick={() => setShowExportMenu(!showExportMenu)}
              variant="outline"
              className="border-success-200 text-success-600 hover:bg-success-50 dark:border-success-500/30 dark:text-success-400 dark:hover:bg-success-500/10"
            >
              <FileSpreadsheet className="h-4 w-4" />
              تصدير التقرير
              <ChevronDown className="h-4 w-4" />
            </Button>
            {showExportMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => {
                    exportEmployeesToPDF(filteredEmployees);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-200"
                >
                  <FileText className="h-4 w-4 text-error-500" />
                  معاينة PDF
                </button>
                <button
                  onClick={() => {
                    exportEmployeesToExcel(filteredEmployees);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-200 border-t border-gray-100 dark:border-gray-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-success-500" />
                  تحميل Excel
                </button>
              </div>
            )}
          </div>
          {canAddEmployee && (
            <Button onClick={openAddModal}>
              <Plus className="h-4 w-4" />
              إضافة موظف
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="إجمالي الموظفين"
          value={employees.length.toString()}
          icon={<Users className="h-6 w-6" />}
          iconColor="primary"
        />
        <StatCard
          title="الموظفين النشطين"
          value={employees.filter((emp) => emp.isActive).length.toString()}
          icon={<UserCheck className="h-6 w-6" />}
          iconColor="success"
        />
        <Card>
          <Card.Body>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي الرواتب</p>
                <div className="space-y-1 mt-1">
                  {Object.entries(salaryByCurrency).map(([curr, total]) => (
                    <p key={curr} className="text-lg font-bold text-gray-800 dark:text-white">
                      {total.toLocaleString()} {getCurrencySymbol(curr)}
                    </p>
                  ))}
                  {Object.keys(salaryByCurrency).length === 0 && (
                    <p className="text-lg font-bold text-gray-800 dark:text-white">0</p>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning-100 dark:bg-warning-500/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-warning-600 dark:text-warning-400" />
              </div>
            </div>
          </Card.Body>
        </Card>
        <StatCard
          title="الموظفين الجدد"
          value={employees.filter((emp) => {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return emp.hireDate > monthAgo;
          }).length.toString()}
          icon={<UserPlus className="h-6 w-6" />}
          iconColor="info"
          subtitle="هذا الشهر"
        />
      </div>

      {/* Filter */}
      <Card>
        <Card.Body>
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              فلترة حسب القسم:
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <option value="">جميع الأقسام</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {filterDepartment && (
              <Badge variant="primary">
                {getDepartmentName(filterDepartment)}
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Employees Table */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">قائمة الموظفين</h2>
          </div>
        </Card.Header>

        {filteredEmployees.length === 0 ? (
          <Card.Body>
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                <Users className="h-10 w-10 text-brand-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-600 dark:text-gray-300 mb-2">
                لا يوجد موظفين
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">ابدأ بإضافة أول موظف في شركتك</p>
              {canAddEmployee && (
                <Button onClick={openAddModal}>
                  <Plus className="h-4 w-4" />
                  إضافة موظف جديد
                </Button>
              )}
            </div>
          </Card.Body>
        ) : (
          <Card.Body className="p-0">
            <Table>
              <Table.Header>
                <Table.Row hover={false}>
                  <Table.Head>الموظف</Table.Head>
                  <Table.Head>المنصب</Table.Head>
                  <Table.Head>القسم</Table.Head>
                  <Table.Head>الراتب</Table.Head>
                  <Table.Head>تاريخ التوظيف</Table.Head>
                  <Table.Head align="center">الإجراءات</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredEmployees.map((employee) => (
                  <Table.Row key={employee.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <Avatar alt={employee.name} size="medium" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800 dark:text-white">
                              {employee.name}
                            </p>
                            {employee.isGeneralManager && (
                              <Badge variant="primary" size="sm">مدير عام</Badge>
                            )}
                            {employee.isAdministrativeManager && (
                              <Badge variant="info" size="sm">مدير إداري</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>{employee.position}</Table.Cell>
                    <Table.Cell>
                      <Badge
                        variant={employee.departmentId ? "primary" : "light"}
                      >
                        {getDepartmentName(employee.departmentId)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-medium">
                        {employee.salary.toLocaleString()} {getCurrencySymbol(employee.salaryCurrency || 'EGP')}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        {new Date(employee.hireDate).toLocaleDateString("ar-EG")}
                      </div>
                    </Table.Cell>
                    <Table.Cell align="center">
                      <div className="flex items-center justify-center gap-1">
                        {canEditEmployee && (
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-2 rounded-lg text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canEditEmployee && (
                          <EmployeeAccountManager
                            employee={employee}
                            onUpdate={loadEmployees}
                            onDelete={loadEmployees}
                          />
                        )}
                        {canDeleteEmployee && (
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="p-2 rounded-lg text-error-600 bg-error-50 hover:bg-error-100 dark:bg-error-500/10 dark:hover:bg-error-500/20 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {!canEditEmployee && !canDeleteEmployee && (
                          <span className="text-gray-400 text-sm">عرض فقط</span>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Card.Body>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? "تعديل الموظف" : "إضافة موظف جديد"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info Section */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <Card.Body>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-brand-500" />
                <h3 className="font-semibold text-gray-800 dark:text-white">المعلومات الشخصية</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="الاسم الكامل"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                  required
                />
                <Input
                  type="email"
                  label="البريد الإلكتروني"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="أدخل البريد الإلكتروني"
                  required
                />
                <Input
                  type="tel"
                  label="رقم الهاتف"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="أدخل رقم الهاتف"
                  required
                />
                <Input
                  label="المنصب"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="أدخل المنصب"
                  required
                />
              </div>
            </Card.Body>
          </Card>

          {/* Work Info Section */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <Card.Body>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5 text-brand-500" />
                <h3 className="font-semibold text-gray-800 dark:text-white">معلومات العمل</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    القسم <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    required
                  >
                    <option value="">اختر القسم</option>
                    {departments.length === 0 ? (
                      <option value="" disabled>لا توجد أقسام - قم بإضافة قسم أولاً</option>
                    ) : (
                      departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))
                    )}
                  </select>
                  {departments.length === 0 && (
                    <p className="text-error-500 text-xs mt-1">يجب إضافة قسم أولاً من صفحة الأقسام</p>
                  )}
                </div>
                <Input
                  type="date"
                  label="تاريخ التوظيف"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  required
                />
              </div>
            </Card.Body>
          </Card>

          {/* Salary Info Section */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <Card.Body>
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5 text-brand-500" />
                <h3 className="font-semibold text-gray-800 dark:text-white">معلومات الراتب</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    نوع الراتب <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={formData.salaryType}
                    onChange={(e) => {
                      const newType = e.target.value as 'fixed' | 'variable';
                      setFormData({
                        ...formData,
                        salaryType: newType,
                        // Reset salary to 0 when switching to variable
                        salary: newType === 'variable' ? 0 : formData.salary
                      });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    required
                  >
                    <option value="fixed">راتب ثابت</option>
                    <option value="variable">راتب متغير (حسب المهام)</option>
                  </select>
                </div>
                {formData.salaryType === 'fixed' ? (
                  <>
                    <Input
                      type="number"
                      label="الراتب الأساسي"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="0"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        عملة الراتب <span className="text-error-500">*</span>
                      </label>
                      <select
                        value={formData.salaryCurrency}
                        onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                        required
                      >
                        <option value="EGP">جنيه مصري (EGP)</option>
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">راتب متغير حسب المهام</h4>
                          <p className="text-sm text-blue-600 dark:text-blue-300">
                            راتب هذا الموظف يُحسب تلقائياً من إنجازاته في صفحة "رواتب الميديا".
                            كل مهمة يكملها تُضاف لراتبه الشهري حسب الأسعار المحددة.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Password Section */}
          <Input
            type={showPassword ? "text" : "password"}
            label="كلمة المرور"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={editingEmployee ? "اتركه فارغاً للإبقاء على القديمة" : "أدخل كلمة المرور"}
            required={!editingEmployee}
            helperText={editingEmployee ? "اتركه فارغاً للإبقاء على كلمة المرور الحالية" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          </button>

          {/* Admin Permissions Section */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <Card.Body>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-brand-500" />
                <h3 className="font-semibold text-gray-800 dark:text-white">الصلاحيات الإدارية</h3>
              </div>

              {(() => {
                const currentEmployee = employees.find(emp => emp.email === user?.email);
                const isSuperAdmin = user?.role === 'super_admin';
                const isGeneralManager = currentEmployee?.isGeneralManager || false;
                const isAdministrativeManager = currentEmployee?.isAdministrativeManager || false;
                const canCreateManagers = isSuperAdmin || isGeneralManager || isAdministrativeManager;

                if (!canCreateManagers) {
                  return (
                    <div className="bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-warning-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-warning-800 dark:text-warning-300">لا يمكنك إنشاء مديرين</p>
                          <p className="text-xs text-warning-700 dark:text-warning-400 mt-1">فقط السوبر أدمن والمدير العام والمدير الإداري يمكنهم إنشاء حسابات للمديرين</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-3">
                <Checkbox
                  checked={formData.isGeneralManager}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const currentEmployee = employees.find(emp => emp.email === user?.email);
                    const isSuperAdmin = user?.role === 'super_admin';
                    const isGeneralManager = currentEmployee?.isGeneralManager || false;
                    const isAdministrativeManager = currentEmployee?.isAdministrativeManager || false;
                    const canCreateManagers = isSuperAdmin || isGeneralManager || isAdministrativeManager;

                    if (!canCreateManagers && checked) {
                      setToast({message: 'ليس لديك صلاحية لإنشاء مديرين', type: 'error', isOpen: true});
                      return;
                    }
                    setFormData({ ...formData, isGeneralManager: checked });
                  }}
                  disabled={(() => {
                    const currentEmployee = employees.find(emp => emp.email === user?.email);
                    const isSuperAdmin = user?.role === 'super_admin';
                    const isGeneralManager = currentEmployee?.isGeneralManager || false;
                    const isAdministrativeManager = currentEmployee?.isAdministrativeManager || false;
                    return !isSuperAdmin && !isGeneralManager && !isAdministrativeManager;
                  })()}
                  label={
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">مدير عام</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">يستقبل الشكاوى والاقتراحات الموجهة للمدير العام + يمكنه إنشاء مديرين</p>
                    </div>
                  }
                />
                <Checkbox
                  checked={formData.isAdministrativeManager}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const currentEmployee = employees.find(emp => emp.email === user?.email);
                    const isSuperAdmin = user?.role === 'super_admin';
                    const isGeneralManager = currentEmployee?.isGeneralManager || false;
                    const isAdministrativeManager = currentEmployee?.isAdministrativeManager || false;
                    const canCreateManagers = isSuperAdmin || isGeneralManager || isAdministrativeManager;

                    if (!canCreateManagers && checked) {
                      setToast({message: 'ليس لديك صلاحية لإنشاء مديرين', type: 'error', isOpen: true});
                      return;
                    }
                    setFormData({ ...formData, isAdministrativeManager: checked });
                  }}
                  disabled={(() => {
                    const currentEmployee = employees.find(emp => emp.email === user?.email);
                    const isSuperAdmin = user?.role === 'super_admin';
                    const isGeneralManager = currentEmployee?.isGeneralManager || false;
                    const isAdministrativeManager = currentEmployee?.isAdministrativeManager || false;
                    return !isSuperAdmin && !isGeneralManager && !isAdministrativeManager;
                  })()}
                  label={
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">مدير إداري</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">يستقبل الشكاوى والاقتراحات الموجهة للمدير الإداري + يمكنه إنشاء مديرين</p>
                    </div>
                  }
                />
              </div>
            </Card.Body>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button type="submit" className="flex-1">
              {editingEmployee ? (
                <>
                  <Edit2 className="h-4 w-4" />
                  تحديث
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  إضافة
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
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
        message="هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء."
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

export default Employees;
