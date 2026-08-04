import React, { useEffect } from 'react';
import { useToastStore, ToastItem } from '../store/toastStore';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const config: Record<string, { icon: React.ReactNode; cls: string }> = {
  success: { icon: <CheckCircle className="h-5 w-5" />, cls: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-500/15 dark:text-success-300 dark:border-success-500/30' },
  error:   { icon: <XCircle className="h-5 w-5" />,     cls: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-500/15 dark:text-error-300 dark:border-error-500/30' },
  warning: { icon: <AlertTriangle className="h-5 w-5" />, cls: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-500/15 dark:text-warning-300 dark:border-warning-500/30' },
  info:    { icon: <Info className="h-5 w-5" />,        cls: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30' },
};

const ToastRow: React.FC<{ item: ToastItem; onClose: () => void }> = ({ item, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, item.duration);
    return () => clearTimeout(t);
  }, [item.duration, onClose]);

  const c = config[item.type] || config.info;
  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 w-[22rem] max-w-[calc(100vw-2rem)] px-4 py-3 rounded-xl border shadow-lg animate-[slideIn_0.2s_ease-out] ${c.cls}`}
    >
      <span className="shrink-0 mt-0.5">{c.icon}</span>
      <p className="flex-1 text-sm font-medium break-words leading-relaxed">{item.message}</p>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="إغلاق">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const GlobalToaster: React.FC = () => {
  const { toasts, remove } = useToastStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} onClose={() => remove(t.id)} />
      ))}
      <style>{'@keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}'}</style>
    </div>
  );
};

export default GlobalToaster;
