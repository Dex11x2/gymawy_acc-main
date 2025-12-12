import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

// Card Component
const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({
  children,
  className = '',
  hover = false,
  padding = 'none',
  onClick,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border border-gray-200 bg-brand-50
        dark:border-gray-800 dark:bg-white/[0.03]
        ${hover ? 'transition-all duration-300 hover:shadow-theme-xl hover:-translate-y-1 cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Card Header
const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
}) => {
  // If using title/subtitle/action pattern
  if (title || action) {
    return (
      <div
        className={`
          px-6 py-5 border-b border-gray-100 dark:border-gray-800
          ${className}
        `}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        {children}
      </div>
    );
  }

  // If using children directly
  return (
    <div
      className={`
        px-6 py-5 border-b border-gray-100 dark:border-gray-800
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Card Body
const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
};

// Card Footer
const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        px-6 py-4 border-t border-gray-100 dark:border-gray-800
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Attach sub-components
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
