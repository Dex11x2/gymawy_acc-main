import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark' | 'secondary';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  solid?: boolean;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  solid = false,
  size = 'md',
  icon,
  className = '',
}) => {
  // Light variant classes (default)
  const lightVariants: Record<BadgeVariant, string> = {
    primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
    info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
    light: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
    dark: 'bg-gray-500 text-white dark:bg-white/5 dark:text-white',
    secondary: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };

  // Solid variant classes
  const solidVariants: Record<BadgeVariant, string> = {
    primary: 'bg-brand-500 text-white',
    success: 'bg-success-500 text-white',
    error: 'bg-error-500 text-white',
    warning: 'bg-warning-500 text-white',
    info: 'bg-blue-light-500 text-white',
    light: 'bg-gray-400 text-white dark:bg-white/5 dark:text-white/80',
    dark: 'bg-gray-700 text-white',
    secondary: 'bg-gray-500 text-white',
  };

  // Size classes
  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  const variantClasses = solid ? solidVariants[variant] : lightVariants[variant];

  return (
    <span
      className={`
        inline-flex items-center justify-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${variantClasses}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
