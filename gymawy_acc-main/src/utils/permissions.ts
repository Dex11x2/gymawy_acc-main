import { User } from '../types';

export const hasPermission = (user: User | null, module: string, action: string): boolean => {
  if (!user) {
    console.warn('No user found, denying permission');
    return false;
  }

  // Super Admin لديه كل الصلاحيات
  if (user.role === 'super_admin') {
    return true;
  }

  // جميع المستخدمين يجب التحقق من صلاحياتهم
  // حتى المدراء يحتاجون لصلاحيات محددة

  // إذا لم تكن هناك صلاحيات محددة، منع الوصول
  if (!user.permissions || user.permissions.length === 0) {
    console.log(`User ${user.name} has no permissions defined`);
    return false;
  }

  // البحث عن صلاحية المودل المطلوب
  const permission = user.permissions.find(p => p.module === module);
  if (!permission) {
    console.log(`User ${user.name} has no permission for module: ${module}`);
    return false;
  }

  // التحقق من الإجراء المطلوب مع دعم الأسماء المترادفة
  let hasAction = false;

  // دعم الأسماء المترادفة للإجراءات
  if (action === 'view' || action === 'read') {
    hasAction = permission.actions.includes('view') ||
                permission.actions.includes('read');
  } else if (action === 'write' || action === 'edit' || action === 'create' || action === 'update') {
    hasAction = permission.actions.includes('write') ||
                permission.actions.includes('edit') ||
                permission.actions.includes('create') ||
                permission.actions.includes('update');
  } else {
    hasAction = permission.actions.includes(action);
  }

  console.log(`User ${user.name} ${hasAction ? 'CAN' : 'CANNOT'} ${action} in ${module}`);
  return hasAction;
};

export const canView = (user: User | null, module: string) => hasPermission(user, module, 'view');
export const canCreate = (user: User | null, module: string) => hasPermission(user, module, 'create');
export const canEdit = (user: User | null, module: string) => hasPermission(user, module, 'edit');
export const canDelete = (user: User | null, module: string) => hasPermission(user, module, 'delete');
