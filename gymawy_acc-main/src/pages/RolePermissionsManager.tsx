import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import Toast from '../components/Toast';
import { Card } from '../components/ui';
import { Lock, Shield, Eye, Plus, Edit2, Trash2, Download } from 'lucide-react';

const RolePermissionsManager: React.FC = () => {
  const { user } = useAuthStore();
  const [roles, setRoles] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as any, isOpen: false });

  const isAdmin = ['super_admin', 'general_manager'].includes(user?.role || '');

  useEffect(() => {
    if (isAdmin) loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rolesRes, pagesRes] = await Promise.all([
        api.get('/permissions/roles'),
        api.get('/permissions/pages')
      ]);
      setRoles(rolesRes.data.data);
      setPages(pagesRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const response = await api.get(`/permissions/role/${roleId}`);
      setPermissions(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoleSelect = (role: any) => {
    setSelectedRole(role);
    loadRolePermissions(role._id);
  };

  const getPermission = (pageId: string) => {
    return permissions.find(p => p.pageId?._id === pageId) || {};
  };

  const togglePermission = async (pageId: string, field: string, value: boolean) => {
    try {
      const existing = getPermission(pageId);
      await api.put('/permissions/update', {
        roleId: selectedRole._id,
        pageId,
        canView: field === 'canView' ? value : existing.canView || false,
        canCreate: field === 'canCreate' ? value : existing.canCreate || false,
        canEdit: field === 'canEdit' ? value : existing.canEdit || false,
        canDelete: field === 'canDelete' ? value : existing.canDelete || false,
        canExport: field === 'canExport' ? value : existing.canExport || false
      });
      loadRolePermissions(selectedRole._id);
      setToast({ message: 'تم التحديث', type: 'success', isOpen: true });
    } catch (error: any) {
      setToast({ message: 'فشل التحديث', type: 'error', isOpen: true });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-error-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ليس لديك صلاحية</h2>
          <p className="text-gray-600 dark:text-gray-400">لا يمكنك الوصول إلى إدارة الصلاحيات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          إدارة الصلاحيات
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">تحديد صلاحيات كل دور على الصفحات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">الأدوار</h2>
          </Card.Header>
          <Card.Body className="p-4">
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role._id}
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full text-right p-4 rounded-xl transition-all ${
                    selectedRole?._id === role._id
                      ? 'bg-brand-100 dark:bg-brand-900/30 border-2 border-brand-500'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="font-bold text-gray-800 dark:text-white">{role.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{role.nameEn}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">المستوى: {role.level}</div>
                </button>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Permissions Table */}
        <Card className="lg:col-span-3">
          {selectedRole ? (
            <>
              <Card.Header className="border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-500" />
                  صلاحيات: {selectedRole.name}
                </h2>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 dark:text-gray-400">الصفحة</th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>عرض</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center gap-1">
                            <Plus className="w-4 h-4" />
                            <span>إضافة</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center gap-1">
                            <Edit2 className="w-4 h-4" />
                            <span>تعديل</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center gap-1">
                            <Trash2 className="w-4 h-4" />
                            <span>حذف</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center gap-1">
                            <Download className="w-4 h-4" />
                            <span>تصدير</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {pages.map((page) => {
                        const perm = getPermission(page._id);
                        return (
                          <tr key={page._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{page.icon}</span>
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-white">{page.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{page.path}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canView || false}
                                onChange={(e) => togglePermission(page._id, 'canView', e.target.checked)}
                                className="w-5 h-5 text-info-600 rounded border-gray-300 dark:border-gray-600 focus:ring-info-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canCreate || false}
                                onChange={(e) => togglePermission(page._id, 'canCreate', e.target.checked)}
                                className="w-5 h-5 text-success-600 rounded border-gray-300 dark:border-gray-600 focus:ring-success-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canEdit || false}
                                onChange={(e) => togglePermission(page._id, 'canEdit', e.target.checked)}
                                className="w-5 h-5 text-warning-600 rounded border-gray-300 dark:border-gray-600 focus:ring-warning-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canDelete || false}
                                onChange={(e) => togglePermission(page._id, 'canDelete', e.target.checked)}
                                className="w-5 h-5 text-error-600 rounded border-gray-300 dark:border-gray-600 focus:ring-error-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canExport || false}
                                onChange={(e) => togglePermission(page._id, 'canExport', e.target.checked)}
                                className="w-5 h-5 text-brand-600 rounded border-gray-300 dark:border-gray-600 focus:ring-brand-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </>
          ) : (
            <Card.Body className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-brand-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">اختر دوراً</h3>
                <p className="text-gray-500 dark:text-gray-500">اختر دوراً من القائمة لتعديل صلاحياته</p>
              </div>
            </Card.Body>
          )}
        </Card>
      </div>

      <Toast message={toast.message} type={toast.type} isOpen={toast.isOpen} onClose={() => setToast({ ...toast, isOpen: false })} />
    </div>
  );
};

export default RolePermissionsManager;
