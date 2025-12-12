import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, isOpen, onClose, duration = 3000 }) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProgress(100);
      setIsExiting(false);

      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, duration - 300);

      const closeTimer = setTimeout(onClose, duration);

      const interval = setInterval(() => {
        setProgress((prev) => Math.max(0, prev - (100 / (duration / 50))));
      }, 50);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(closeTimer);
        clearInterval(interval);
      };
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    success: {
      bg: 'bg-success-50 dark:bg-success-500/10',
      border: 'border-success-200 dark:border-success-500/20',
      text: 'text-success-600 dark:text-success-400',
      progressBg: 'bg-success-500',
      iconBg: 'bg-success-100 dark:bg-success-500/20',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: {
      bg: 'bg-error-50 dark:bg-error-500/10',
      border: 'border-error-200 dark:border-error-500/20',
      text: 'text-error-600 dark:text-error-400',
      progressBg: 'bg-error-500',
      iconBg: 'bg-error-100 dark:bg-error-500/20',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    info: {
      bg: 'bg-blue-light-50 dark:bg-blue-light-500/10',
      border: 'border-blue-light-200 dark:border-blue-light-500/20',
      text: 'text-blue-light-600 dark:text-blue-light-400',
      progressBg: 'bg-blue-light-500',
      iconBg: 'bg-blue-light-100 dark:bg-blue-light-500/20',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-warning-50 dark:bg-warning-500/10',
      border: 'border-warning-200 dark:border-warning-500/20',
      text: 'text-warning-600 dark:text-warning-400',
      progressBg: 'bg-warning-500',
      iconBg: 'bg-warning-100 dark:bg-warning-500/20',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
  };

  const config = typeConfig[type];

  return (
    <div
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-99999 transition-all duration-300 ${
        isExiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0 animate-slideDown'
      }`}
    >
      <div
        className={`${config.bg} ${config.border} rounded-xl shadow-theme-lg overflow-hidden min-w-[320px] max-w-md border backdrop-blur-sm`}
      >
        <div className="px-4 py-3 flex items-start gap-3">
          {/* Icon */}
          <div className={`${config.iconBg} ${config.text} rounded-full p-2 flex-shrink-0`}>
            {config.icon}
          </div>

          {/* Message */}
          <p className={`flex-1 text-theme-sm font-medium ${config.text} pt-1.5`}>
            {message}
          </p>

          {/* Close button */}
          <button
            onClick={onClose}
            className={`${config.text} hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg p-1.5 transition-colors flex-shrink-0`}
            aria-label="إغلاق"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full ${config.progressBg} transition-all duration-50 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Toast;
