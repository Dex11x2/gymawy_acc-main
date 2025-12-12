// قائمة الصلاحيات الشاملة للنظام

export const MODULES = {
  DASHBOARD: 'dashboard',
  ATTENDANCE: 'attendance',
  ATTENDANCE_SYSTEM: 'attendance_system',
  ATTENDANCE_MANAGEMENT: 'attendance_management',
  LEAVE_REQUESTS: 'leave_requests',
  DEPARTMENTS: 'departments',
  EMPLOYEES: 'employees',
  BRANCHES: 'branches',
  SALARIES: 'salaries',
  MEDIA_SALARIES: 'media_salaries',
  REVENUES: 'revenues',
  EXPENSES: 'expenses',
  CUSTODY: 'custody',
  TASKS: 'tasks',
  CHAT: 'chat',
  POSTS: 'posts',
  REVIEWS: 'reviews',
  REPORTS: 'reports',
  ADS_FUNDING: 'ads_funding',
  OCCASIONS: 'occasions',
  COMPLAINTS: 'complaints',
  COMMUNICATION: 'communication',
  SUBSCRIPTIONS: 'subscriptions',
  PERMISSIONS: 'permissions',
} as const;

export const ACTIONS = {
  VIEW: 'view',
  WRITE: 'write',
  EDIT: 'edit',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
  COMMENT: 'comment',
  LIKE: 'like',
  RETURN: 'return',
} as const;

export interface ModulePermissions {
  module: string;
  label: string;
  actions: {
    action: string;
    label: string;
  }[];
}

export const ALL_PERMISSIONS: ModulePermissions[] = [
  {
    module: MODULES.DASHBOARD,
    label: 'لوحة التحكم',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.OCCASIONS,
    label: 'المناسبات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.ATTENDANCE,
    label: 'الحضور والانصراف (قديم)',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'تسجيل' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.ATTENDANCE_SYSTEM,
    label: 'نظام الحضور والانصراف',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة سجل' },
      { action: ACTIONS.EDIT, label: 'تعديل سجل' },
      { action: ACTIONS.DELETE, label: 'حذف سجل' },
      { action: ACTIONS.APPROVE, label: 'تأكيد اليوم' },
      { action: ACTIONS.EXPORT, label: 'تصدير PDF' },
    ],
  },
  {
    module: MODULES.ATTENDANCE_MANAGEMENT,
    label: 'إدارة الحضور',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.LEAVE_REQUESTS,
    label: 'طلبات الإجازات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'تقديم طلب' },
      { action: ACTIONS.EDIT, label: 'تعديل طلب' },
      { action: ACTIONS.DELETE, label: 'حذف طلب' },
      { action: ACTIONS.APPROVE, label: 'مراجعة واعتماد' },
      { action: 'manage_balance', label: 'إدارة الرصيد' },
    ],
  },
  {
    module: MODULES.DEPARTMENTS,
    label: 'الأقسام',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
    ],
  },
  {
    module: MODULES.EMPLOYEES,
    label: 'الموظفين',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.BRANCHES,
    label: 'الفروع',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
    ],
  },
  {
    module: MODULES.SALARIES,
    label: 'الرواتب الشهرية',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.APPROVE, label: 'موافقة' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.MEDIA_SALARIES,
    label: 'رواتب الميديا',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.REVENUES,
    label: 'الإيرادات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.EXPENSES,
    label: 'المصروفات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.APPROVE, label: 'موافقة' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.CUSTODY,
    label: 'العهد والسلف',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.APPROVE, label: 'موافقة' },
      { action: ACTIONS.RETURN, label: 'إرجاع' },
    ],
  },
  {
    module: MODULES.TASKS,
    label: 'المهام',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.COMMENT, label: 'تعليق' },
    ],
  },
  {
    module: MODULES.CHAT,
    label: 'المحادثات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إرسال' },
      { action: ACTIONS.DELETE, label: 'حذف' },
    ],
  },
  {
    module: MODULES.POSTS,
    label: 'المنشورات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.COMMENT, label: 'تعليق' },
      { action: ACTIONS.LIKE, label: 'إعجاب' },
    ],
  },
  {
    module: MODULES.REVIEWS,
    label: 'تقييمات الموظفين',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.COMMENT, label: 'تعليق' },
    ],
  },
  {
    module: MODULES.REPORTS,
    label: 'التقارير',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.ADS_FUNDING,
    label: 'تقرير عمليات تمويل الإعلانات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.EXPORT, label: 'تصدير' },
    ],
  },
  {
    module: MODULES.COMPLAINTS,
    label: 'الشكاوى والمقترحات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'تقديم' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: 'respond', label: 'الرد' },
    ],
  },
  {
    module: MODULES.COMMUNICATION,
    label: 'التعليمات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
    ],
  },
  {
    module: MODULES.SUBSCRIPTIONS,
    label: 'الاشتراكات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.WRITE, label: 'إضافة' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
      { action: ACTIONS.DELETE, label: 'حذف' },
      { action: ACTIONS.APPROVE, label: 'موافقة' },
    ],
  },
  {
    module: MODULES.PERMISSIONS,
    label: 'إدارة الصلاحيات',
    actions: [
      { action: ACTIONS.VIEW, label: 'عرض' },
      { action: ACTIONS.EDIT, label: 'تعديل' },
    ],
  },
];

export const DEFAULT_PERMISSIONS = {
  super_admin: ALL_PERMISSIONS.map(m => ({
    module: m.module,
    actions: m.actions.map(a => a.action),
  })),
  
  general_manager: ALL_PERMISSIONS.map(m => ({
    module: m.module,
    actions: m.actions.map(a => a.action),
  })),
  
  administrative_manager: ALL_PERMISSIONS.map(m => ({
    module: m.module,
    actions: m.actions
      .filter(a => a.action !== ACTIONS.DELETE || [MODULES.TASKS, MODULES.POSTS, MODULES.CHAT].includes(m.module as typeof MODULES.TASKS | typeof MODULES.POSTS | typeof MODULES.CHAT))
      .map(a => a.action),
  })),
  
  employee: [
    { module: MODULES.DASHBOARD, actions: [ACTIONS.VIEW] },
    { module: MODULES.ATTENDANCE, actions: [ACTIONS.VIEW, ACTIONS.WRITE] },
    { module: MODULES.ATTENDANCE_SYSTEM, actions: [ACTIONS.VIEW] },
    { module: MODULES.LEAVE_REQUESTS, actions: [ACTIONS.VIEW, ACTIONS.WRITE] },
    { module: MODULES.EMPLOYEES, actions: [ACTIONS.VIEW] },
    { module: MODULES.SALARIES, actions: [ACTIONS.VIEW] },
    { module: MODULES.CUSTODY, actions: [ACTIONS.VIEW, ACTIONS.WRITE] },
    { module: MODULES.TASKS, actions: [ACTIONS.VIEW, ACTIONS.WRITE, ACTIONS.EDIT, ACTIONS.COMMENT] },
    { module: MODULES.CHAT, actions: [ACTIONS.VIEW, ACTIONS.WRITE] },
    { module: MODULES.POSTS, actions: [ACTIONS.VIEW, ACTIONS.WRITE, ACTIONS.COMMENT, ACTIONS.LIKE] },
    { module: MODULES.REVIEWS, actions: [ACTIONS.VIEW] },
    { module: MODULES.COMPLAINTS, actions: [ACTIONS.VIEW, ACTIONS.WRITE] },
    { module: MODULES.COMMUNICATION, actions: [ACTIONS.VIEW] },
    { module: MODULES.OCCASIONS, actions: [ACTIONS.VIEW] },
  ],
};
