import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useDataStore } from '../store/dataStore';
import { translations } from '../i18n/translations';
import { GlobalSearch } from './GlobalSearch';
import Logo from './Logo';
import { NotificationPanel } from './NotificationPanel';
import { autoBackup } from '../utils/backup';
import { iconComponents, IconName } from './Icons';
import { Avatar, Button } from './ui';
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { user, logout } = useAuthStore();
  const { language, theme, setLanguage, toggleTheme } = useSettingsStore();
  const { getUnreadCount, loadNotifications, addNotification } = useNotificationStore();
  const { loadRevenues, loadExpenses, loadDepartments, loadEmployees, loadDevTasks, devTasks } = useDataStore();
  const location = useLocation();
  const t = translations[language];
  const unreadCount = getUnreadCount(user?.id || '');

  // Page titles
  useEffect(() => {
    const pageTitles: Record<string, string> = {
      '/dashboard': 'جيماوي - لوحة التحكم',
      '/attendance-map': 'جيماوي - تسجيل الحضور',
      '/attendance-management': 'جيماوي - إدارة الحضور',
      '/branches': 'جيماوي - الفروع والصلاحيات',
      '/departments': 'جيماوي - الأقسام',
      '/employees': 'جيماوي - الموظفين',
      '/payroll': 'جيماوي - الرواتب الشهرية',
      '/media-salaries': 'جيماوي - رواتب الميديا',
      '/revenues': 'جيماوي - الإيرادات',
      '/expenses': 'جيماوي - المصروفات',
      '/custody': 'جيماوي - العهد والسلف',
      '/tasks': 'جيماوي - المهام',
      '/chat': 'جيماوي - المحادثات',
      '/posts': 'جيماوي - المنشورات',
      '/reviews': 'جيماوي - التقييمات',
      '/reports': 'جيماوي - التقارير',
      '/complaints': 'جيماوي - الشكاوى',
      '/instructions': 'جيماوي - التعليمات',
      '/occasions': 'جيماوي - المناسبات',
      '/profile': 'جيماوي - الملف الشخصي',
      '/dev-tasks': 'جيماوي - مهام التطوير'
    };
    document.title = pageTitles[location.pathname] || 'جيماوي - نظام المحاسبة';
  }, [location.pathname]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          await Promise.all([
            loadRevenues(),
            loadExpenses(),
            loadDepartments(),
            loadEmployees(),
            loadNotifications(),
            loadDevTasks()
          ]);
        } catch (error) {
          console.error('Error loading data:', error);
        }
      };
      loadData();
    }
  }, [user?.id]);

  // Check for overdue tasks
  useEffect(() => {
    if (!user || !devTasks) return;

    const checkOverdueTasks = () => {
      const now = new Date();
      const overdueTasks = devTasks.filter(task => {
        if (task.status === 'completed' || task.status === 'blocked') return false;
        if (task.assignedTo !== user.id && user.role !== 'super_admin' && user.role !== 'general_manager' && user.role !== 'administrative_manager') return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < now;
      });

      if (overdueTasks.length > 0) {
        const message = language === 'ar'
          ? `لديك ${overdueTasks.length} مهمة متأخرة تحتاج إلى متابعة`
          : `You have ${overdueTasks.length} overdue task(s) that need attention`;

        addNotification({

          userId: user.id,
          title: language === 'ar' ? 'مهام متأخرة' : 'Overdue Tasks',
          message: message,
          type: 'system',



        });
      }
    };

    checkOverdueTasks();
    const interval = setInterval(checkOverdueTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, devTasks, language, addNotification]);

  // Theme and language effects
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // autoBackup(); // Disabled - was downloading backup file automatically

    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
        setShowUserDropdown(false);
        if (isMobile) setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', handleResize);
    };
  }, [language, theme, isMobile]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasPermission = (module: string) => {
    if (user?.role === 'super_admin') return true;
    if (!user?.permissions || user.permissions.length === 0) return false;
    const modulePermission = user.permissions.find(p => p.module === module);
    if (!modulePermission) return false;
    return modulePermission.actions.includes('view') || modulePermission.actions.includes('read');
  };

  const menuItems = [
    { id: 'dashboard' as IconName, name: t.dashboard, path: '/dashboard', show: user?.role === 'super_admin' || hasPermission('dashboard') },
    { id: 'attendance-map' as IconName, name: language === 'ar' ? 'تسجيل الحضور' : 'Check In', path: '/attendance-map', show: true },
    { id: 'attendance-management' as IconName, name: language === 'ar' ? 'إدارة الحضور' : 'Attendance Management', path: '/attendance-management', show: ['super_admin', 'general_manager', 'administrative_manager'].includes(user?.role || '') },
    { id: 'branches' as IconName, name: language === 'ar' ? 'الفروع والصلاحيات' : 'Branches & Permissions', path: '/branches', show: ['super_admin', 'general_manager', 'administrative_manager'].includes(user?.role || '') },
    { id: 'departments' as IconName, name: t.departments, path: '/departments', show: user?.role === 'super_admin' || hasPermission('departments') },
    { id: 'employees' as IconName, name: t.employees, path: '/employees', show: user?.role === 'super_admin' || hasPermission('employees') },
    { id: 'payroll' as IconName, name: language === 'ar' ? 'الرواتب الشهرية' : 'Monthly Salaries', path: '/payroll', show: user?.role === 'super_admin' || hasPermission('salaries') },
    { id: 'payroll' as IconName, name: language === 'ar' ? 'رواتب الميديا' : 'Media Salaries', path: '/media-salaries', show: user?.role === 'super_admin' || hasPermission('media_salaries') },
    { id: 'revenues' as IconName, name: t.revenues, path: '/revenues', show: user?.role === 'super_admin' || hasPermission('revenues') },
    { id: 'expenses' as IconName, name: t.expenses, path: '/expenses', show: user?.role === 'super_admin' || hasPermission('expenses') },
    { id: 'custody' as IconName, name: language === 'ar' ? 'العهد والسلف' : 'Custody & Advances', path: '/custody', show: user?.role === 'super_admin' || hasPermission('custody') },
    { id: 'tasks' as IconName, name: t.tasks, path: '/tasks', show: user?.role === 'super_admin' || hasPermission('tasks') },
    { id: 'dev-tasks' as IconName, name: language === 'ar' ? 'مهام التطوير' : 'Dev Tasks', path: '/dev-tasks', show: user?.role === 'super_admin' || hasPermission('dev_tasks') },
    { id: 'chat' as IconName, name: language === 'ar' ? 'المحادثات' : 'Chat', path: '/chat', show: true },
    { id: 'posts' as IconName, name: language === 'ar' ? 'المنشورات' : 'Posts', path: '/posts', show: user?.role === 'super_admin' || hasPermission('posts') },
    { id: 'reviews' as IconName, name: language === 'ar' ? 'تقييمات الموظفين' : 'Employee Reviews', path: '/reviews', show: user?.role === 'super_admin' || hasPermission('reviews') },
    { id: 'reports' as IconName, name: t.reports, path: '/reports', show: user?.role === 'super_admin' || hasPermission('reports') },
    { id: 'ads-funding' as IconName, name: language === 'ar' ? 'تقرير تمويل الإعلانات' : 'Ads Funding Report', path: '/ads-funding', show: user?.role === 'super_admin' || hasPermission('ads_funding') },
    { id: 'complaints' as IconName, name: language === 'ar' ? 'الشكاوى والمقترحات' : 'Complaints', path: '/complaints', show: user?.role === 'super_admin' || hasPermission('complaints') },
    { id: 'instructions' as IconName, name: language === 'ar' ? 'التعليمات' : 'Instructions', path: '/instructions', show: user?.role === 'super_admin' || hasPermission('instructions') },
    { id: 'occasions' as IconName, name: language === 'ar' ? 'المناسبات' : 'Occasions', path: '/occasions', show: user?.role === 'super_admin' || hasPermission('occasions') },
  ].filter(item => item.show);

  const sidebarWidth = sidebarOpen ? 'w-[290px]' : 'w-[90px]';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 z-50 flex flex-col
          bg-brand-50 dark:bg-gray-900
          shadow-lg lg:shadow-none
          transition-all duration-300 ease-in-out
          ${isMobile
            ? `w-[290px] ${mobileSidebarOpen
                ? (language === 'ar' ? 'right-0' : 'left-0')
                : (language === 'ar' ? '-right-[290px]' : '-left-[290px]')
              }`
            : sidebarWidth
          }
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 px-6 py-5">
          <Link to="/dashboard" className="flex items-center">
            {(sidebarOpen || isMobile) ? (
              <Logo variant="wordmark" height={32} />
            ) : (
              <Logo variant="mark" height={32} />
            )}
          </Link>

          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Menu Section Label */}
        {(sidebarOpen || isMobile) && (
          <div className="px-5 py-4">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {language === 'ar' ? 'القائمة' : 'MENU'}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const IconComponent = iconComponents[item.id];
              const isActive = location.pathname === item.path;

              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => isMobile && setMobileSidebarOpen(false)}
                    className={`
                      group relative flex items-center gap-3 rounded-lg px-3.5 py-3 font-medium
                      transition-all duration-200
                      ${(sidebarOpen || isMobile) ? 'justify-start' : 'justify-center'}
                      ${isActive
                        ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <span className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-brand-500`} />
                    )}

                    <IconComponent
                      className={`flex-shrink-0 transition-transform duration-200 ${!isActive ? 'group-hover:scale-110' : ''}`}
                      size={20}
                    />

                    {(sidebarOpen || isMobile) && (
                      <span className="text-sm">{item.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer - Collapse Toggle (Desktop Only) */}
        {!isMobile && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            >
              {language === 'ar' ? (
                sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />
              ) : (
                sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />
              )}
              {sidebarOpen && (
                <span>{language === 'ar' ? 'طي القائمة' : 'Collapse'}</span>
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-200 bg-brand-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Search Button */}
            <button
              onClick={() => setShowSearch(true)}
              className="hidden sm:flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-700"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">{language === 'ar' ? 'بحث أو أمر...' : 'Search or type command...'}</span>
              <span className="hidden rounded bg-white px-1.5 py-0.5 text-xs text-gray-400 shadow-sm dark:bg-gray-700 md:inline">⌘K</span>
            </button>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="notification-btn"
              title={theme === 'light' ? t.darkMode : t.lightMode}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="notification-btn"
              >
                {unreadCount > 0 && (
                  <span className="notification-dot">
                    <span className="notification-dot-ping" />
                  </span>
                )}
                <Bell className="h-5 w-5" />
              </button>
              <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
            </div>

            {/* User Dropdown */}
            <div className="relative user-dropdown-container">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <Avatar
                  src={(user as any)?.avatar}
                  alt={user?.name}
                  initials={user?.name?.charAt(0)}
                  size="medium"
                  status="online"
                  showStatus
                />
                <div className="hidden text-right lg:block">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role === 'super_admin' ? 'Super Admin' :
                     user?.role === 'general_manager' ? 'مدير عام' :
                     user?.role === 'administrative_manager' ? 'مدير إداري' : 'موظف'}
                  </p>
                </div>
                <ChevronRight className={`hidden h-4 w-4 text-gray-500 transition-transform lg:block ${showUserDropdown ? 'rotate-90' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {showUserDropdown && (
                <div className="user-dropdown-menu animate-fadeIn">
                  <div className="mb-3 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setShowUserDropdown(false)}
                    className="user-dropdown-item"
                  >
                    <User className="h-5 w-5" />
                    <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
                  </Link>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowSettings(true);
                    }}
                    className="user-dropdown-item w-full"
                  >
                    <Settings className="h-5 w-5" />
                    <span>{t.settings}</span>
                  </button>

                  <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

                  <button
                    onClick={logout}
                    className="user-dropdown-item w-full text-error-500 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>{t.logout}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 bg-brand-50 dark:bg-gray-950 ${location.pathname === '/chat' ? 'overflow-hidden p-0' : 'overflow-auto p-4 lg:p-6'}`}>
          <div className={location.pathname === '/chat' ? 'h-full' : 'mx-auto max-w-screen-2xl'}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto">
          <div className="modal-backdrop animate-fadeIn" onClick={() => setShowSettings(false)} />
          <div className="modal-content max-w-md p-6 m-4 animate-fadeInScale" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowSettings(false)}
              className="modal-close-btn"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">{t.settings}</h3>

            <div className="space-y-6">
              {/* Language Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  {t.language}
                </label>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setLanguage('ar')}
                    variant={language === 'ar' ? 'primary' : 'outline'}
                    size="sm"
                    fullWidth
                  >
                    العربية
                  </Button>
                  <Button
                    onClick={() => setLanguage('en')}
                    variant={language === 'en' ? 'primary' : 'outline'}
                    size="sm"
                    fullWidth
                  >
                    English
                  </Button>
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  {t.theme}
                </label>
                <div className="flex gap-3">
                  <Button
                    onClick={() => useSettingsStore.getState().setTheme('light')}
                    variant={theme === 'light' ? 'primary' : 'outline'}
                    size="sm"
                    fullWidth
                    icon={<Sun className="h-4 w-4" />}
                  >
                    {t.lightMode}
                  </Button>
                  <Button
                    onClick={() => useSettingsStore.getState().setTheme('dark')}
                    variant={theme === 'dark' ? 'primary' : 'outline'}
                    size="sm"
                    fullWidth
                    icon={<Moon className="h-4 w-4" />}
                  >
                    {t.darkMode}
                  </Button>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowSettings(false)}
              variant="outline"
              fullWidth
              className="mt-6"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
