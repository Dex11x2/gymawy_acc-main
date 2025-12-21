// قائمة الصلاحيات المتاحة في النظام
export const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'لوحة التحكم', nameEn: 'Dashboard' },
  { id: 'attendance', name: 'الحضور والانصراف', nameEn: 'Attendance' },
  { id: 'departments', name: 'الأقسام', nameEn: 'Departments' },
  { id: 'employees', name: 'الموظفين', nameEn: 'Employees' },
  { id: 'salaries', name: 'الرواتب الشهرية', nameEn: 'Monthly Salaries' },
  { id: 'media_salaries', name: 'رواتب الميديا (عام)', nameEn: 'Media Salaries (General)' },
  { id: 'media_salaries_prices', name: 'إعدادات أسعار المحتوى', nameEn: 'Content Prices Settings' },
  { id: 'media_salaries_achievements', name: 'إنجازات الموظفين', nameEn: 'Employee Achievements' },
  { id: 'revenues', name: 'الإيرادات', nameEn: 'Revenues' },
  { id: 'expenses', name: 'المصروفات', nameEn: 'Expenses' },
  { id: 'custody', name: 'العهد والسلف', nameEn: 'Custody & Advances' },
  { id: 'tasks', name: 'المهام', nameEn: 'Tasks' },
  { id: 'chat', name: 'المحادثات', nameEn: 'Chat' },
  { id: 'posts', name: 'المنشورات', nameEn: 'Posts' },
  { id: 'reviews', name: 'تقييمات الموظفين', nameEn: 'Employee Reviews' },
  { id: 'reports', name: 'التقارير', nameEn: 'Reports' },
  { id: 'ads_funding', name: 'تقرير عمليات تمويل الإعلانات', nameEn: 'Ads Funding Report' },
];

export const AVAILABLE_ACTIONS = ['view', 'read', 'create', 'update', 'delete'];

export const DEFAULT_EMPLOYEE_PERMISSIONS = [
  { module: 'attendance', actions: ['view', 'read', 'create'] },
  { module: 'tasks', actions: ['view', 'read', 'create', 'update'] },
  { module: 'chat', actions: ['view', 'read', 'create'] },
  { module: 'posts', actions: ['view', 'read'] },
];
