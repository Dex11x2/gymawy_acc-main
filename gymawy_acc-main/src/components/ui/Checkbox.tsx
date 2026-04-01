import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  helperText?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, error, disabled, className = '', id, checked, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={className}>
        <label
          htmlFor={checkboxId}
          className={`
            flex items-center gap-3 cursor-pointer
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <div className="relative flex items-center">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              disabled={disabled}
              checked={checked}
              className="peer sr-only"
              {...props}
            />
            <div
              className={`
                flex h-5 w-5 items-center justify-center rounded border-[1.5px]
                transition-all duration-200
                ${
                  checked
                    ? 'border-brand-500 bg-brand-500'
                    : 'border-gray-300 bg-transparent dark:border-gray-600'
                }
                ${error ? 'border-error-500' : ''}
                peer-focus:ring-2 peer-focus:ring-brand-500/20
                peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
              `}
            >
              {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
            </div>
          </div>
          {label && (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
        </label>
        {(helperText || error) && (
          <p
            className={`mt-1.5 mr-8 text-sm ${
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

Checkbox.displayName = 'Checkbox';

export default Checkbox;
