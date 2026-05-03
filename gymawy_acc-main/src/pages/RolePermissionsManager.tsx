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

  const ROLE_LEVELS: Record<string, number> = {
    dev: 4, general_manager: 3, administrative_manager: 2, employee: 1,
  };
  const myLevel = ROLE_LEVELS[user?.role || ''] || 0;
  const isAdmin = myLevel >= 2; // Anyone who can manage someone below them
  const isSuperAdmin = user?.role === 'dev';

  // Only show roles strictly below the current user's level
  const editableRoles = roles.filter((r: any) => (r.level || 0) < myLevel);

  const [showAddPage, setShowAddPage] = useState(false);
  const [newPage, setNewPage] = useState({ name: '', nameEn: '', path: '', icon: '📄', module: '' });

  const handleAddPage = async () => {
    if (!newPage.name || !newPage.nameEn || !newPage.path || !newPage.module) {
      setToast({ message: 'الاسم بالعربي/الإنجليزي والمسار والـ module مطلوبين', type: 'error', isOpen: true });
      return;
    }
    try {
      await api.post('/permissions/pages', newPage);
      setToast({ message: 'تمت إضافة الصفحة. كل الأدوار يبدأوا بصلاحيات صفر عليها — وزّعها من فضلك', type: 'success', isOpen: true });
      setShowAddPage(false);
      setNewPage({ name: '', nameEn: '', path: '', icon: '📄', module: '' });
      loadData();
    } catch (e: any) {
      setToast({ message: e.response?.data?.message || 'فشل الإضافة', type: 'error', isOpen: true });
    }
  };

  const handleDeletePage = async (pageId: string, pageName: string) => {
    if (!window.confirm(`متأكد من حذف "${pageName}"؟ كل صلاحياتها على كل الأدوار هتتمسح كمان.`)) return;
    try {
      await api.delete(`/permissions/pages/${pageId}`);
      setToast({ message: 'تم الحذف', type: 'success', isOpen: true });
      loadData();
      if (selectedRole) loadRolePermissions(idOf(selectedRole));
    } catch (e: any) {
      setToast({ message: e.response?.data?.message || 'فشل الحذف', type: 'error', isOpen: true });
    }
  };

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

  const idOf = (obj: any) => obj?.id || obj?._id;

  const handleRoleSelect = (role: any) => {
    setSelectedRole(role);
    loadRolePermissions(idOf(role));
  };

  const getPermission = (pageId: string) => {
    return permissions.find(p => idOf(p.pageId) === pageId) || {};
  };

  const togglePermission = async (pageId: string, field: string, value: boolean) => {
    try {
      const existing = getPermission(pageId);
      await api.put('/permissions/update', {
        roleId: idOf(selectedRole),
        pageId,
        canView: field === 'canView' ? value : existing.canView || false,
        canCreate: field === 'canCreate' ? value : existing.canCreate || false,
        canEdit: field === 'canEdit' ? value : existing.canEdit || false,
        canDelete: field === 'canDelete' ? value : existing.canDelete || false,
        canExport: field === 'canExport' ? value : existing.canExport || false
      });
      loadRolePermissions(idOf(selectedRole));
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            إدارة الصلاحيات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تحديد صلاحيات كل دور على الصفحات. تقدر تعدّل الأدوار اللي تحت مستواك فقط.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setShowAddPage(!showAddPage)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة صفحة جديدة
          </button>
        )}
      </div>

      {showAddPage && isSuperAdmin && (
        <div className="bg-white dark:bg-gray-800 border-2 border-brand-200 dark:border-brand-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="الاسم العربي *" value={newPage.name} onChange={(e) => setNewPage({ ...newPage, name: e.target.value })} />
          <input className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Name (English) *" value={newPage.nameEn} onChange={(e) => setNewPage({ ...newPage, nameEn: e.target.value })} />
          <input className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="المسار /path *" value={newPage.path} onChange={(e) => setNewPage({ ...newPage, path: e.target.value })} />
          <input className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="module key *" value={newPage.module} onChange={(e) => setNewPage({ ...newPage, module: e.target.value })} />
          <div className="flex gap-2">
            <input className="px-3 py-2 border rounded w-16 dark:bg-gray-700 dark:border-gray-600 text-center" placeholder="📄" value={newPage.icon} onChange={(e) => setNewPage({ ...newPage, icon: e.target.value })} />
            <button onClick={handleAddPage} className="flex-1 bg-success-500 hover:bg-success-600 text-white rounded-lg text-sm">حفظ</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">الأدوار</h2>
          </Card.Header>
          <Card.Body className="p-4">
            <div className="space-y-2">
              {editableRoles.map((role) => (
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
                        const perm = getPermission(idOf(page));
                        return (
                          <tr key={idOf(page)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{page.icon}</span>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800 dark:text-white">{page.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{page.path}</p>
                                </div>
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handleDeletePage(idOf(page), page.name)}
                                    title="حذف الصفحة من الكتالوج"
                                    className="p-1 text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canView || false}
                                onChange={(e) => togglePermission(idOf(page), 'canView', e.target.checked)}
                                className="w-5 h-5 text-info-600 rounded border-gray-300 dark:border-gray-600 focus:ring-info-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canCreate || false}
                                onChange={(e) => togglePermission(idOf(page), 'canCreate', e.target.checked)}
                                className="w-5 h-5 text-success-600 rounded border-gray-300 dark:border-gray-600 focus:ring-success-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canEdit || false}
                                onChange={(e) => togglePermission(idOf(page), 'canEdit', e.target.checked)}
                                className="w-5 h-5 text-warning-600 rounded border-gray-300 dark:border-gray-600 focus:ring-warning-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canDelete || false}
                                onChange={(e) => togglePermission(idOf(page), 'canDelete', e.target.checked)}
                                className="w-5 h-5 text-error-600 rounded border-gray-300 dark:border-gray-600 focus:ring-error-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canExport || false}
                                onChange={(e) => togglePermission(idOf(page), 'canExport', e.target.checked)}
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
