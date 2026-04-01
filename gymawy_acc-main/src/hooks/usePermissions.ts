import { useAuthStore } from '../store/authStore';

export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasPermission = (module: string, action: string): boolean => {
    // Super admin, general manager, and administrative manager have all permissions
    if (user?.role === 'super_admin' || user?.role === 'general_manager' || user?.role === 'administrative_manager') {
      return true;
    }

    // Check if user has specific permission
    if (user?.permissions) {
      const modulePermission = user.permissions.find(p => p.module === module);

      if (action === 'read' || action === 'view') {
        return modulePermission?.actions.includes('read') ||
               modulePermission?.actions.includes('view') || false;
      }
      if (action === 'write' || action === 'edit') {
        return modulePermission?.actions.includes('write') ||
               modulePermission?.actions.includes('edit') || false;
      }
      return modulePermission?.actions.includes(action) || false;
    }

    return false;
  };

  const canRead = (module: string): boolean => {
    return hasPermission(module, 'view');
  };

  const canWrite = (module: string): boolean => {
    return hasPermission(module, 'write');
  };

  const canDelete = (module: string): boolean => {
    return hasPermission(module, 'delete');
  };

  const canUpdate = (module: string): boolean => {
    return hasPermission(module, 'update');
  };

  return {
    hasPermission,
    canRead,
    canWrite,
    canDelete,
    canUpdate
  };
};