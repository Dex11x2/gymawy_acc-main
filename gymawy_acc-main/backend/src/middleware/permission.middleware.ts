import { Response, NextFunction } from 'express';

export const checkPermission = (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'export') => {
  return (req: any, res: Response, next: NextFunction) => {
    if (req.user?.role === 'super_admin') {
      return next();
    }

    const permissions = req.user?.permissions || [];
    const modulePermission = permissions.find((p: any) => p.module === module);

    if (!modulePermission) {
      return res.status(403).json({ success: false, message: 'ليس لديك صلاحية الوصول' });
    }

    const actionMap: any = {
      view: ['view', 'read'],
      create: ['create', 'write'],
      edit: ['edit', 'update', 'write'],
      delete: ['delete'],
      export: ['export']
    };

    const allowedActions = actionMap[action] || [action];
    const hasPermission = allowedActions.some((a: string) => modulePermission.actions.includes(a));

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: `ليس لديك صلاحية ${action}` });
    }

    next();
  };
};
