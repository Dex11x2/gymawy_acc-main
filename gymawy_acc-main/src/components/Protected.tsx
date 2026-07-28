import React from 'react';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';

// حارس وصول على مستوى الصفحة — يمنع فتح الصفحات الحساسة عبر اللينك المباشر
// module: صلاحية مطلوبة (المدراء/dev يتجاوزوا). roles: أدوار مسموح لها فقط.
const Protected: React.FC<{ module?: string; roles?: string[]; children: React.ReactNode }> = ({ module, roles, children }) => {
  const { user } = useAuthStore();
  const { canRead } = usePermissions();

  const roleOk = roles ? !!user && roles.includes(user.role) : true;
  const moduleOk = module ? canRead(module) : true;

  if (roleOk && moduleOk) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-6xl mb-4">🔒</div>
      <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">ليس لديك صلاحية للوصول</h3>
      <p className="text-gray-500 dark:text-gray-400">هذه الصفحة غير متاحة لحسابك. راجع المدير لو محتاج صلاحية.</p>
    </div>
  );
};

export default Protected;
