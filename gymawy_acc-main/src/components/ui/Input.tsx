import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      icon,
      iconPosition = 'left',
      fullWidth = true,
      disabled,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // State-based classes
    const getStateClasses = () => {
      if (disabled) {
        return 'text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      }
      if (error) {
        return 'border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500 dark:focus:border-error-800';
      }
      if (success) {
        return 'border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:border-success-500 dark:focus:border-success-800';
      }
      return 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800';
    };

    const baseClasses = `
      h-11 rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs
      placeholder:text-gray-400 focus:outline-none focus:ring-2
      bg-transparent text-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30
      transition-all duration-200
    `;

    const iconPaddingClasses = icon
      ? iconPosition === 'left'
        ? 'pr-4 pl-11'
        : 'pl-4 pr-11'
      : 'px-4';

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span
              className={`absolute top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 ${
                iconPosition === 'left' ? 'left-4' : 'right-4'
              }`}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              ${baseClasses}
              ${getStateClasses()}
              ${iconPaddingClasses}
              ${fullWidth ? 'w-full' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {(helperText || error) && (
          <p
            className={`mt-1.5 text-sm ${
              error
                ? 'text-error-500 dark:text-error-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
