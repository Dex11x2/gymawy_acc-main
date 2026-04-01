import React from 'react';
import { Trash2, AlertTriangle, Info, X } from 'lucide-react';
import Button from './ui/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  // TailAdmin-style type configurations
  const typeStyles = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-error-50 dark:bg-error-500/15',
      iconColor: 'text-error-500',
      buttonClass: 'bg-error-500 hover:bg-error-600 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-warning-50 dark:bg-warning-500/15',
      iconColor: 'text-warning-500',
      buttonClass: 'bg-warning-500 hover:bg-warning-600 text-white',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-light-50 dark:bg-blue-light-500/15',
      iconColor: 'text-blue-light-500',
      buttonClass: 'bg-brand-500 hover:bg-brand-600 text-white',
    }
  };

  const style = typeStyles[type];
  const IconComponent = style.icon;

  const handleConfirm = () => {
    console.log('🟢 ConfirmDialog - handleConfirm called');
    onConfirm();
    // Dialog will be closed by the parent component
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      {/* Dialog */}
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md relative animate-fadeInScale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="modal-close-btn"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Icon */}
          <div
            className={`
              mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full
              ${style.iconBg}
            `}
          >
            <IconComponent className={`h-8 w-8 ${style.iconColor}`} />
          </div>

          {/* Title */}
          <h3 className="mb-2 text-center text-xl font-semibold text-gray-800 dark:text-white/90">
            {title}
          </h3>

          {/* Message */}
          <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleConfirm}
              className={`flex-1 ${style.buttonClass}`}
              size="md"
            >
              {confirmText}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="md"
              className="flex-1"
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
