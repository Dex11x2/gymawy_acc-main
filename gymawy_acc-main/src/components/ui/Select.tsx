import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  isRTL?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  label,
  helperText,
  error,
  disabled = false,
  fullWidth = true,
  className = '',
  isRTL = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && !options[highlightedIndex].disabled) {
            onChange?.(options[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('li');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const getStateClasses = () => {
    if (disabled) {
      return 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800';
    }
    if (error) {
      return 'border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:border-error-500';
    }
    return 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600';
  };

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          {label}
        </label>
      )}

      {/* Select Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          h-11 w-full appearance-none rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs
          text-gray-800 dark:bg-gray-900 dark:text-white/90
          focus:outline-none focus:ring-2 transition-all duration-200
          flex items-center justify-between gap-2
          ${getStateClasses()}
          ${className}
        `}
      >
        <span className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-gray-400 dark:text-white/30' : ''}`}>
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listRef}
          className={`
            dropdown absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl
            border border-gray-200 bg-brand-50 shadow-theme-lg
            dark:border-gray-800 dark:bg-gray-900
            animate-fadeIn custom-scrollbar
            ${isRTL ? 'right-0' : 'left-0'}
          `}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              onClick={() => !option.disabled && handleSelect(option.value)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                flex items-center justify-between gap-2 px-4 py-2.5 text-sm cursor-pointer
                transition-colors duration-150
                ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${highlightedIndex === index ? 'bg-gray-100 dark:bg-white/5' : ''}
                ${option.value === value ? 'text-brand-500 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}
                ${!option.disabled && 'hover:bg-gray-100 dark:hover:bg-white/5'}
              `}
            >
              <span className="flex items-center gap-2 truncate">
                {option.icon}
                {option.label}
              </span>
              {option.value === value && (
                <Check className="h-4 w-4 text-brand-500 dark:text-brand-400 flex-shrink-0" />
              )}
            </li>
          ))}
          {options.length === 0 && (
            <li className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 text-center">
              لا توجد خيارات
            </li>
          )}
        </ul>
      )}

      {/* Helper/Error Text */}
      {(helperText || error) && (
        <p
          className={`mt-1.5 text-sm ${
            error ? 'text-error-500 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Select;
