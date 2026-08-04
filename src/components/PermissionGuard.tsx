import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  module: string;
  action?: 'read' | 'write' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action = 'read',
  children,
  fallback
}) => {
  const { canRead, canWrite, canDelete } = usePermissions();

  const hasPermission = () => {
    switch (action) {
      case 'read':
        return canRead(module);
      case 'write':
        return canWrite(module);
      case 'delete':
        return canDelete(module);
      default:
        return canRead(module);
    }
  };

  if (!hasPermission()) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-xl font-medium text-gray-600 mb-2">
          ليس لديك صلاحية للوصول
        </h3>
        <p className="text-gray-500 text-center">
          تحتاج إلى صلاحية {action === 'read' ? 'العرض' : action === 'write' ? 'التعديل' : 'الحذف'} 
          {' '}لهذه الصفحة
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;