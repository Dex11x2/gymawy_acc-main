import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export type StatIconColor = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'red' | 'success' | 'warning' | 'error' | 'info';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconColor?: StatIconColor;
  subtitle?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'مقارنة بالشهر الماضي',
  icon,
  iconColor = 'blue',
  subtitle,
  className = '',
}) => {
  const isPositive = change !== undefined && change >= 0;

  // Icon background colors
  const iconColorClasses: Record<StatIconColor, string> = {
    blue: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15',
    green: 'bg-success-50 text-success-500 dark:bg-success-500/15',
    orange: 'bg-orange-50 text-orange-500 dark:bg-orange-500/15',
    purple: 'bg-purple-50 text-purple-500 dark:bg-purple-500/15',
    pink: 'bg-pink-50 text-pink-500 dark:bg-pink-500/15',
    red: 'bg-error-50 text-error-500 dark:bg-error-500/15',
    success: 'bg-success-50 text-success-500 dark:bg-success-500/15',
    warning: 'bg-warning-50 text-warning-500 dark:bg-warning-500/15',
    error: 'bg-error-50 text-error-500 dark:bg-error-500/15',
    info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15',
  };

  return (
    <div
      className={`
        rounded-2xl border border-gray-200 bg-brand-50 p-5
        dark:border-gray-800 dark:bg-white/[0.03]
        md:p-6
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* Title */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {title}
          </span>

          {/* Value and Change */}
          <div className="mt-2 flex items-end gap-2 flex-wrap">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {value}
            </h3>

            {/* Change Badge */}
            {change !== undefined && (
              <span
                className={`
                  flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                  ${
                    isPositive
                      ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
                      : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'
                  }
                `}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(change)}%
              </span>
            )}
          </div>

          {/* Change Label */}
          {change !== undefined && changeLabel && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {changeLabel}
            </p>
          )}

          {/* Subtitle */}
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            className={`
              flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0
              ${iconColorClasses[iconColor]}
            `}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
