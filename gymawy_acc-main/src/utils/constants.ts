export const APP_NAME = 'نظام محاسبة جيماوي برو';
export const APP_VERSION = '1.0.0';

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
} as const;

export const EXPENSE_TYPES = {
  OPERATIONAL: 'operational',
  CAPITAL: 'capital'
} as const;

export const PAYROLL_TYPES = {
  FIXED: 'fixed',
  VARIABLE: 'variable'
} as const;

export const REVENUE_CATEGORIES = [
  'اشتراكات',
  'مبيعات',
  'خدمات',
  'أخرى'
];

export const EXPENSE_CATEGORIES = [
  'مستلزمات مكتبية',
  'إيجار',
  'كهرباء وماء',
  'رواتب',
  'صيانة',
  'تسويق',
  'أخرى'
];

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const PERMISSIONS = {
  DASHBOARD: 'dashboard',
  DEPARTMENTS: 'departments',
  EMPLOYEES: 'employees',
  PAYROLL: 'payroll',
  EXPENSES: 'expenses',
  REVENUES: 'revenues',
  REPORTS: 'reports',
  CHAT: 'chat',
  POSTS: 'posts'
} as const;