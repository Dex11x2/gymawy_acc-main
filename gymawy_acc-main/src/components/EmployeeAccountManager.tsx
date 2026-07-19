import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import api from '../services/api';
import { Employee } from '../types';
import { useAuthStore } from '../store/authStore';

interface Props {
  employee: Employee;
  onUpdate: () => void;
  onDelete: () => void;
}

const EmployeeAccountManager: React.FC<Props> = ({ employee, onUpdate, onDelete }) => {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({
    message: '', type: 'success', isOpen: false
  });
  const [currentEmployee, setCurrentEmployee] = useState(employee);
  const [plainPassword, setPlainPassword] = useState('');

  // التحقق من الصلاحيات
  const canManageAccounts = user?.role === 'dev' || 
                            user?.role === 'general_manager' || 
                            user?.role === 'administrative_manager';

  useEffect(() => {
    setCurrentEmployee(employee);
  }, [employee]);

  useEffect(() => {
    if (showModal) {
      fetchEmployeeDetails();
    }
  }, [showModal]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await api.get(`/employees/${employee.id}`);
      const emp = response.data;
      console.log('📄 Fetched employee:', emp);
      setCurrentEmployee(emp);
      
      // جلب plainPassword من User
      if ((emp as any).userId) {
        try {
          const userResponse = await api.get(`/employees/${employee.id}/plain-password`);
          if (userResponse.data.plainPassword) {
            setPlainPassword(userResponse.data.plainPassword);
          }
        } catch (error) {
          console.log('Could not fetch plain password');
        }
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword) {
      setToast({message: 'يرجى إدخال كلمة المرور الجديدة', type: 'warning', isOpen: true});
      return;
    }
    try {
      await api.patch(`/employees/${employee.id}/password`, { newPassword });
      setToast({message: 'تم تحديث كلمة المرور بنجاح', type: 'success', isOpen: true});
      setPlainPassword(newPassword);
      setNewPassword('');
      await fetchEmployeeDetails();
      onUpdate();
    } catch (error: any) {
      setToast({message: error.response?.data?.message || 'فشل تحديث كلمة المرور', type: 'error', isOpen: true});
    }
  };

  const handleToggleActive = async () => {
    try {
      const response = await api.patch(`/employees/${employee.id}/toggle-active`);
      setCurrentEmployee({...currentEmployee, isActive: response.data.isActive});
      setToast({message: response.data.message, type: 'success', isOpen: true});
      await fetchEmployeeDetails();
      onUpdate();
    } catch (error: any) {
      setToast({message: error.response?.data?.message || 'فشل تغيير حالة الحساب', type: 'error', isOpen: true});
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete(`/employees/${employee.id}`);
      setToast({message: 'تم حذف الحساب والموظف بنجاح', type: 'success', isOpen: true});
      setShowDeleteDialog(false);
      setShowModal(false);
      onDelete();
    } catch (error: any) {
      setToast({message: error.response?.data?.message || 'فشل حذف الحساب', type: 'error', isOpen: true});
    }
  };

  if (!canManageAccounts) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-purple-600 hover:text-purple-800 font-medium"
      >
        ⚙️ إدارة الحساب
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`إدارة حساب: ${employee.name}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* حالة الحساب */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-800">حالة الحساب</h3>
                <p className="text-sm text-gray-600">
                  {currentEmployee.isActive ? '✅ الحساب نشط' : '❌ الحساب معطل'}
                </p>
              </div>
              <button
                onClick={handleToggleActive}
                className={`px-4 py-2 rounded-lg font-medium ${
                  currentEmployee.isActive
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {currentEmployee.isActive ? '🔒 تعطيل الحساب' : '🔓 تفعيل الحساب'}
              </button>
            </div>
          </div>

          {/* معلومات الحساب */}
          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-800 mb-3">📧 معلومات الحساب</h3>
            
            <div className="space-y-3 mb-4">
              {/* البريد الإلكتروني */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600">البريد الإلكتروني:</p>
                <p className="text-lg font-medium text-gray-800 mt-1 break-words">{currentEmployee.email}</p>
              </div>
              
              {/* رقم الهاتف */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600">رقم الهاتف:</p>
                <p className="text-lg font-medium text-gray-800 mt-1">{currentEmployee.phone || 'غير محدد'}</p>
              </div>
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-800 mb-3">🔑 إدارة كلمة المرور</h3>
            
            {/* عرض كلمة المرور */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">كلمة المرور الحالية:</p>
                  <p className="text-lg font-mono mt-1 break-words">
                    {showPassword ? (plainPassword || (currentEmployee as any).plainPassword || 'غير متاحة') : '••••••••'}
                  </p>
                  {!plainPassword && !(currentEmployee as any).plainPassword && (
                    <p className="text-xs text-gray-500 mt-1">⚠️ لم يتم حفظ كلمة المرور - قم بتحديثها</p>
                  )}
                </div>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-blue-600 hover:text-blue-800 px-4 py-2"
                >  {showPassword ? '🙈 إخفاء' : '👁️ إظهار'}
                </button>
              </div>
            </div>

            {/* تغيير كلمة المرور */}
            <div className="flex gap-3">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة المرور الجديدة"
                className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handlePasswordChange}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                تحديث
              </button>
            </div>
          </div>

          {/* حذف الحساب */}
          <div className="border-t pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 mb-2">⚠️ منطقة الخطر</h3>
              <p className="text-sm text-red-700 mb-3">
                حذف الحساب سيؤدي إلى حذف الموظف وجميع بياناته بشكل نهائي
              </p>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                🗑️ حذف الحساب والموظف
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="تأكيد حذف الحساب"
        message={`هل أنت متأكد من حذف حساب "${employee.name}"؟ سيتم حذف الموظف وجميع بياناته بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف نهائياً"
        cancelText="إلغاء"
        type="danger"
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
      />
    </>
  );
};

export default EmployeeAccountManager;
