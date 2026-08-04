import React from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';

// حالات موحّدة للصفحات: تحميل / خطأ / فاضي — عشان المستخدم مايشوفش شاشة فاضية غامضة

export const LoadingState: React.FC<{ label?: string; className?: string }> = ({ label = 'جارٍ التحميل...', className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 ${className}`} role="status" aria-live="polite">
    <Loader2 className="h-8 w-8 animate-spin text-brand-500 mb-3" />
    <p className="text-sm">{label}</p>
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void; className?: string }> = ({
  message = 'تعذّر تحميل البيانات',
  onRetry,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 text-center px-6 ${className}`}>
    <div className="w-14 h-14 rounded-full bg-error-50 dark:bg-error-500/15 flex items-center justify-center mb-3">
      <AlertCircle className="h-7 w-7 text-error-500" />
    </div>
    <p className="text-gray-700 dark:text-gray-200 font-medium mb-1">{message}</p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">تأكد من الاتصال وحاول تاني</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        <RefreshCw className="h-4 w-4" /> إعادة المحاولة
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ title?: string; hint?: string; icon?: React.ReactNode; className?: string }> = ({
  title = 'لا توجد بيانات',
  hint,
  icon,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 text-center px-6 ${className}`}>
    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700/60 flex items-center justify-center mb-3 text-gray-400">
      {icon || <Inbox className="h-8 w-8" />}
    </div>
    <p className="text-gray-600 dark:text-gray-300 font-medium">{title}</p>
    {hint && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
  </div>
);
