import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import api from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Card, Badge, Button, Avatar } from '../components/ui';
import {
  KeyRound,
  Users,
  Key,
  Save,
  X,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

const PasswordManagement: React.FC = () => {
  const { user } = useAuthStore();
  const { employees, loadEmployees } = useDataStore();

  useEffect(() => {
    if (loadEmployees) loadEmployees();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean }>({
    message: '',
    type: 'success',
    isOpen: false
  });

  const isSuperAdmin = user?.role === 'super_admin';
  const isManager = user?.role === 'general_manager' || user?.role === 'administrative_manager';

  const allUsers = isSuperAdmin
    ? (employees || [])
    : isManager
      ? (employees || []).filter((emp: any) => emp.companyId === user?.companyId)
      : [];

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setToast({ message: 'كلمات المرور غير متطابقة', type: 'error', isOpen: true });
      return;
    }

    if (newPassword.length < 6) {
      setToast({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', type: 'error', isOpen: true });
      return;
    }

    try {
      if (selectedUser?.id === user?.id) {
        await api.post('/password/change', {
          currentPassword,
          newPassword
        });
      } else {
        await api.post(`/users/${selectedUser.id}/change-password`, {
          newPassword
        });
      }

      setToast({ message: 'تم تغيير كلمة المرور بنجاح', type: 'success', isOpen: true });
      setTimeout(() => {
        setShowModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        setSelectedUser(null);
      }, 2000);
    } catch (error: any) {
      setToast({ message: error.response?.data?.message || 'فشل تغيير كلمة المرور', type: 'error', isOpen: true });
    }
  };

  const openChangePasswordModal = (userToEdit: any) => {
    setSelectedUser(userToEdit);
    setShowModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="error">Super Admin</Badge>;
      case 'general_manager':
        return <Badge variant="info">مدير عام</Badge>;
      case 'administrative_manager':
        return <Badge variant="warning">مدير إداري</Badge>;
      default:
        return <Badge variant="success">موظف</Badge>;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            إدارة كلمات المرور
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">تغيير وإدارة كلمات مرور المستخدمين</p>
        </div>
      </div>

      {/* My Password Card */}
      <Card className="border-2 border-purple-100 dark:border-purple-800/50">
        <Card.Body className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-brand-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{user?.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                <div className="mt-2">
                  {getRoleBadge(user?.role || '')}
                </div>
              </div>
            </div>
            <Button onClick={() => openChangePasswordModal(user)}>
              <Key className="w-4 h-4" />
              تغيير كلمة المرور
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Other Users */}
      {(isSuperAdmin || isManager) && allUsers.length > 0 && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" />
              {isSuperAdmin ? 'جميع المستخدمين' : 'موظفي الشركة'}
            </h2>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {allUsers.map((u: any) => (
                <div key={u.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        alt={u.name}
                        size="medium"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">{u.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                        <div className="mt-1">
                          {getRoleBadge(u.role)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openChangePasswordModal(u)}
                    >
                      <Key className="w-4 h-4" />
                      تغيير كلمة المرور
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Empty State */}
      {(isSuperAdmin || isManager) && allUsers.length === 0 && (
        <Card>
          <Card.Body className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">لا يوجد مستخدمين</h3>
              <p className="text-gray-500 dark:text-gray-500">لا يوجد مستخدمين آخرين لإدارة كلمات مرورهم</p>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={showModal && selectedUser !== null}
        onClose={() => {
          setShowModal(false);
          setSelectedUser(null);
        }}
        title="تغيير كلمة المرور"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-brand-500 rounded-xl flex items-center justify-center text-white font-bold">
                {selectedUser.name?.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white">{selectedUser.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {selectedUser.id === user?.id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    كلمة المرور الحالية *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 pl-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="أدخل كلمة المرور الحالية"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  كلمة المرور الجديدة *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pl-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="أدخل كلمة المرور الجديدة"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  يجب أن تكون 6 أحرف على الأقل
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تأكيد كلمة المرور *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pl-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="أعد إدخال كلمة المرور"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-error-500 mt-1">
                    كلمات المرور غير متطابقة
                  </p>
                )}
                {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                  <p className="text-xs text-success-500 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    كلمات المرور متطابقة
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleChangePassword}
                className="flex-1"
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                <Save className="w-4 h-4" />
                تغيير كلمة المرور
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1"
              >
                <X className="w-4 h-4" />
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
};

export default PasswordManagement;
