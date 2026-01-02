import React, { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import api from '../services/api';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { Card, Button } from '../components/ui';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Lock,
  MapPin,
  Shield,
  User,
  Eye,
  Pencil,
  Save,
  Navigation,
  FileText
} from 'lucide-react';

const Branches: React.FC = () => {
  const { canRead, canWrite, canDelete } = usePermissions();

  const canViewBranches = canRead('branches');
  const canWriteBranches = canWrite('branches');
  const canDeleteBranches = canDelete('branches');
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeePermissions, setEmployeePermissions] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as any, isOpen: false });

  useEffect(() => {
    loadBranches();
    loadEmployeesAndPages();
    getCurrentLocation();
  }, []);

  // قائمة بجميع الصفحات المتاحة في النظام
  const getAllPages = () => {
    return [
      { module: 'dashboard', name: 'لوحة التحكم', nameEn: 'Dashboard', actions: ['view'] },
      { module: 'attendance_map', name: 'تسجيل الحضور', nameEn: 'Check In', actions: ['view', 'write'] },
      { module: 'attendance_management', name: 'إدارة الحضور', nameEn: 'Attendance Management', actions: ['view', 'write', 'delete'] },
      { module: 'branches', name: 'الفروع والصلاحيات', nameEn: 'Branches & Permissions', actions: ['view', 'write', 'delete'] },
      { module: 'departments', name: 'الأقسام', nameEn: 'Departments', actions: ['view', 'write', 'delete'] },
      { module: 'employees', name: 'الموظفين', nameEn: 'Employees', actions: ['view', 'write', 'delete'] },
      { module: 'salaries', name: 'الرواتب الشهرية', nameEn: 'Monthly Salaries', actions: ['view', 'write', 'delete'] },
      { module: 'media_salaries', name: 'رواتب الميديا', nameEn: 'Media Salaries', actions: ['view', 'write', 'delete'] },
      { module: 'revenues', name: 'الإيرادات', nameEn: 'Revenues', actions: ['view', 'write', 'delete'] },
      { module: 'expenses', name: 'المصروفات', nameEn: 'Expenses', actions: ['view', 'write', 'delete'] },
      { module: 'custody', name: 'العهد والسلف', nameEn: 'Custody & Advances', actions: ['view', 'write', 'delete'] },
      { module: 'tasks', name: 'المهام', nameEn: 'Tasks', actions: ['view', 'write', 'delete'] },
      { module: 'dev_tasks', name: 'مهام التطوير', nameEn: 'Dev Tasks', actions: ['view', 'write', 'delete'] },
      { module: 'chat', name: 'المحادثات', nameEn: 'Chat', actions: ['view', 'write'] },
      { module: 'posts', name: 'المنشورات', nameEn: 'Posts', actions: ['view', 'write', 'delete'] },
      { module: 'reviews', name: 'تقييمات الموظفين', nameEn: 'Employee Reviews', actions: ['view', 'write', 'delete'] },
      { module: 'reports', name: 'التقارير', nameEn: 'Reports', actions: ['view', 'write'] },
      { module: 'ads_funding', name: 'تقرير تمويل الإعلانات', nameEn: 'Ads Funding Report', actions: ['view', 'write', 'delete'] },
      { module: 'complaints', name: 'الشكاوى والمقترحات', nameEn: 'Complaints', actions: ['view', 'write', 'delete'] },
      { module: 'instructions', name: 'التعليمات', nameEn: 'Instructions', actions: ['view', 'write', 'delete'] },
      { module: 'occasions', name: 'المناسبات', nameEn: 'Occasions', actions: ['view', 'write', 'delete'] },
    ];
  };

  const loadEmployeesAndPages = async () => {
    try {
      const employeesRes = await api.get('/employees');
      setEmployees(employeesRes.data);

      // استخدام القائمة المحلية بدلاً من API
      setPages(getAllPages());
    } catch (error) {
      console.error(error);
      // في حالة الفشل، استخدم القائمة المحلية
      setPages(getAllPages());
    }
  };

  const handleEmployeeSelect = async (employee: any) => {
    setSelectedEmployee(employee);

    // محاولة الحصول على userId من مصادر مختلفة
    let userId = null;
    if (employee.userId) {
      userId = typeof employee.userId === 'object' ? employee.userId._id : employee.userId;
    }

    // إذا لم يتم العثور على userId، ابحث عن المستخدم بالبريد
    if (!userId && employee.email) {
      try {
        const usersRes = await api.get('/all-users');
        const foundUser = usersRes.data.find((u: any) => u.email === employee.email);
        if (foundUser) userId = foundUser._id;
      } catch (error) {
        console.error(error);
      }
    }

    if (!userId) {
      setToast({ message: 'لم يتم العثور على معرف المستخدم', type: 'error', isOpen: true });
      return;
    }

    try {
      const response = await api.get(`/users/${userId}`);
      const userPermissions = response.data.permissions || [];
      const permsMap: any = {};
      userPermissions.forEach((p: any) => {
        p.actions.forEach((action: string) => {
          permsMap[`${p.module}_${action}`] = true;
        });
      });
      setEmployeePermissions(permsMap);
      setShowPermissionsModal(true);
    } catch (error: any) {
      console.error(error);
      setToast({ message: 'فشل تحميل الصلاحيات: ' + (error.response?.data?.message || error.message), type: 'error', isOpen: true });
    }
  };

  const toggleEmployeePermission = (module: string, action: string) => {
    const key = `${module}_${action}`;
    const newValue = !employeePermissions[key];

    // إذا كان الإجراء write، يجب تفعيل create و edit أيضاً
    if (action === 'write') {
      setEmployeePermissions({
        ...employeePermissions,
        [key]: newValue,
        [`${module}_create`]: newValue,
        [`${module}_edit`]: newValue
      });
    } else {
      setEmployeePermissions({ ...employeePermissions, [key]: newValue });
    }
  };

  const saveEmployeePermissions = async () => {
    const userId = selectedEmployee.userId?._id || selectedEmployee.userId;
    try {
      const newPermissions: any[] = [];

      pages.forEach((page) => {
        const actions: string[] = [];
        if (employeePermissions[`${page.module}_view`]) actions.push('view');
        if (employeePermissions[`${page.module}_write`] || employeePermissions[`${page.module}_create`] || employeePermissions[`${page.module}_edit`]) {
          actions.push('write', 'create', 'edit');
        }
        if (employeePermissions[`${page.module}_delete`]) actions.push('delete');

        if (actions.length > 0) {
          newPermissions.push({ module: page.module, actions });
        }
      });

      await api.put(`/users/${userId}`, { permissions: newPermissions });
      setToast({ message: 'تم حفظ الصلاحيات بنجاح', type: 'success', isOpen: true });
      setShowPermissionsModal(false);
    } catch (error: any) {
      setToast({ message: 'فشل الحفظ', type: 'error', isOpen: true });
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setToast({ message: 'المتصفح لا يدعم تحديد الموقع', type: 'error', isOpen: true });
      return;
    }

    // محاولة سريعة أولاً بدقة منخفضة
    navigator.geolocation.getCurrentPosition(
      (position) => setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }),
      (error) => {
        // إذا فشلت المحاولة السريعة، نحاول بدقة عالية مع وقت أطول
        navigator.geolocation.getCurrentPosition(
          (position) => setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }),
          (err) => {
            console.error('Geolocation error:', err);
            let message = 'لم يتمكن من الحصول على الموقع';
            if (err.code === 1) {
              message = 'يرجى السماح بالوصول للموقع. استخدم localhost أو HTTPS';
            } else if (err.code === 2) {
              message = 'الموقع غير متاح - تأكد من تفعيل GPS';
            } else if (err.code === 3) {
              message = 'انتهى وقت الطلب - حاول مرة أخرى';
            }
            setToast({ message, type: 'warning', isOpen: true });
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
          }
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000
      }
    );
  };

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      latitude: parseFloat(formData.get('latitude') as string),
      longitude: parseFloat(formData.get('longitude') as string),
      radius: parseInt(formData.get('radius') as string),
      address: formData.get('address')
    };

    try {
      if (editingBranch) {
        const branchId = editingBranch._id || editingBranch.id;
        if (!branchId) {
          setToast({ message: 'معرف الفرع غير صحيح', type: 'error', isOpen: true });
          return;
        }
        await api.put(`/branches/${branchId}`, data);
        setToast({ message: 'تم التحديث بنجاح', type: 'success', isOpen: true });
      } else {
        await api.post('/branches', data);
        setToast({ message: 'تم الإضافة بنجاح', type: 'success', isOpen: true });
      }
      setShowModal(false);
      setEditingBranch(null);
      loadBranches();
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'حدث خطأ', type: 'error', isOpen: true });
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || id === 'undefined') {
      setToast({ message: 'معرف الفرع غير صحيح', type: 'error', isOpen: true });
      return;
    }
    if (!confirm('هل تريد حذف هذا الفرع؟')) return;
    try {
      await api.delete(`/branches/${id}`);
      setToast({ message: 'تم الحذف بنجاح', type: 'success', isOpen: true });
      loadBranches();
    } catch (error) {
      setToast({ message: 'فشل الحذف', type: 'error', isOpen: true });
    }
  };

  if (!canViewBranches) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى إدارة الفروع</p>
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
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            إدارة الفروع والصلاحيات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إضافة فروع وإدارة صلاحيات الأدوار</p>
        </div>
        {canWriteBranches && (
          <Button onClick={() => { setEditingBranch(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            إضافة فرع
          </Button>
        )}
      </div>

      {/* Employees Section */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-500" />
            إدارة صلاحيات الموظفين
          </h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {employees.map((employee: any, index: number) => (
              <button
                key={employee.id || employee._id || index}
                onClick={() => handleEmployeeSelect(employee)}
                className="p-4 bg-gradient-to-br from-brand-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-center group"
              >
                <div className="w-12 h-12 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm truncate">{employee.name}</div>
                <div className="text-xs opacity-80 truncate">{employee.position}</div>
              </button>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => {
          const branchId = branch._id || branch.id;
          return (
            <Card key={branchId} className="hover:shadow-lg transition-shadow">
              <Card.Body>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{branch.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    {canWriteBranches && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!branchId) {
                            setToast({ message: 'معرف الفرع غير صحيح', type: 'error', isOpen: true });
                            return;
                          }
                          setEditingBranch(branch);
                          setShowModal(true);
                        }}
                        className="text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteBranches && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!branchId) {
                            setToast({ message: 'معرف الفرع غير صحيح', type: 'error', isOpen: true });
                            return;
                          }
                          handleDelete(branchId);
                        }}
                        className="text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 text-brand-500" />
                    <span>{branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Navigation className="w-4 h-4 text-warning-500" />
                    <span>النطاق: {branch.radius} متر</span>
                  </div>
                  {branch.address && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <FileText className="w-4 h-4 text-info-500" />
                      <span>{branch.address}</span>
                    </div>
                  )}
                </div>

                <a
                  href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  عرض على الخريطة
                </a>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Branch Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingBranch ? 'تعديل فرع' : 'إضافة فرع جديد'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم الفرع *</label>
            <input
              type="text"
              name="name"
              defaultValue={editingBranch?.name}
              required
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentLocation) {
                (document.querySelector('[name="latitude"]') as HTMLInputElement).value = currentLocation.latitude;
                (document.querySelector('[name="longitude"]') as HTMLInputElement).value = currentLocation.longitude;
              } else {
                getCurrentLocation();
                setTimeout(() => {
                  if (currentLocation) {
                    (document.querySelector('[name="latitude"]') as HTMLInputElement).value = currentLocation.latitude;
                    (document.querySelector('[name="longitude"]') as HTMLInputElement).value = currentLocation.longitude;
                  }
                }, 1000);
              }
            }}
            className="w-full px-4 py-2.5 flex items-center justify-center gap-2 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {currentLocation ? 'استخدام موقعي الحالي' : 'تحديد الموقع تلقائياً'}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">خط العرض *</label>
              <input
                type="number"
                step="any"
                name="latitude"
                min="-90"
                max="90"
                defaultValue={editingBranch?.latitude}
                required
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">خط الطول *</label>
              <input
                type="number"
                step="any"
                name="longitude"
                min="-180"
                max="180"
                defaultValue={editingBranch?.longitude}
                required
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النطاق المسموح (متر) *</label>
            <input
              type="number"
              name="radius"
              defaultValue={editingBranch?.radius || 100}
              required
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العنوان</label>
            <input
              type="text"
              name="address"
              defaultValue={editingBranch?.address}
              className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} title={`صلاحيات: ${selectedEmployee?.name}`} size="xl">
        <div className="space-y-4">
          <div className="bg-info-50 dark:bg-info-900/20 p-4 rounded-lg border border-info-200 dark:border-info-800">
            <p className="text-sm text-info-800 dark:text-info-300">اختر الصلاحيات المناسبة لكل صفحة من خلال الأزرار التالية:</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pages.map((page) => {
              const hasView = employeePermissions[`${page.module}_view`] || false;
              const hasWrite = employeePermissions[`${page.module}_write`] ||
                             employeePermissions[`${page.module}_create`] ||
                             employeePermissions[`${page.module}_edit`] || false;
              const hasDelete = employeePermissions[`${page.module}_delete`] || false;

              return (
                <div key={page.module} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{page.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{page.nameEn}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* زر العرض */}
                      {page.actions.includes('view') && (
                        <button
                          type="button"
                          onClick={() => toggleEmployeePermission(page.module, 'view')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                            hasView
                              ? 'bg-success-500 text-white hover:bg-success-600'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          عرض
                        </button>
                      )}

                      {/* زر الكتابة/التعديل */}
                      {page.actions.includes('write') && (
                        <button
                          type="button"
                          onClick={() => toggleEmployeePermission(page.module, 'write')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                            hasWrite
                              ? 'bg-brand-500 text-white hover:bg-brand-600'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Pencil className="w-3 h-3" />
                          كتابة
                        </button>
                      )}

                      {/* زر الحذف */}
                      {page.actions.includes('delete') && (
                        <button
                          type="button"
                          onClick={() => toggleEmployeePermission(page.module, 'delete')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                            hasDelete
                              ? 'bg-error-500 text-white hover:bg-error-600'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={saveEmployeePermissions} className="flex-1">
            <Save className="w-4 h-4" />
            حفظ الصلاحيات
          </Button>
          <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default Branches;
