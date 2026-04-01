import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  type?: AlertType;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  showIcon?: boolean;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  children,
  onClose,
  showIcon = true,
  className = '',
}) => {
  // Type-specific styles
  const typeStyles: Record<AlertType, { container: string; icon: string }> = {
    success: {
      container: 'border-success-500 bg-success-50 dark:border-success-500/30 dark:bg-success-500/15',
      icon: 'text-success-500',
    },
    error: {
      container: 'border-error-500 bg-error-50 dark:border-error-500/30 dark:bg-error-500/15',
      icon: 'text-error-500',
    },
    warning: {
      container: 'border-warning-500 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/15',
      icon: 'text-warning-500',
    },
    info: {
      container: 'border-blue-light-500 bg-blue-light-50 dark:border-blue-light-500/30 dark:bg-blue-light-500/15',
      icon: 'text-blue-light-500',
    },
  };

  // Icon component based on type
  const IconComponent: Record<AlertType, React.FC<{ className?: string }>> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = IconComponent[type];
  const styles = typeStyles[type];

  return (
    <div
      className={`
        rounded-xl border p-4 animate-fadeIn
        ${styles.container}
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className={`-mt-0.5 flex-shrink-0 ${styles.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          {title && (
            <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h4>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">{message || children}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
