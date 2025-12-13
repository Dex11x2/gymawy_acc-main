import React from 'react';

export type AvatarSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  showStatus?: boolean;
  initials?: string;
  className?: string;
  onClick?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'medium',
  status,
  showStatus = false,
  initials,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Size classes for the avatar
  const sizeClasses: Record<AvatarSize, string> = {
    xsmall: 'h-6 w-6',
    xs: 'h-6 w-6',
    small: 'h-8 w-8',
    sm: 'h-8 w-8',
    medium: 'h-10 w-10',
    md: 'h-10 w-10',
    large: 'h-12 w-12',
    lg: 'h-12 w-12',
    xlarge: 'h-14 w-14',
    xl: 'h-14 w-14',
    xxlarge: 'h-16 w-16',
    '2xl': 'h-16 w-16',
  };

  // Size classes for the status indicator
  const statusSizeClasses: Record<AvatarSize, string> = {
    xsmall: 'h-1.5 w-1.5 border',
    xs: 'h-1.5 w-1.5 border',
    small: 'h-2 w-2 border',
    sm: 'h-2 w-2 border',
    medium: 'h-2.5 w-2.5 border-[1.5px]',
    md: 'h-2.5 w-2.5 border-[1.5px]',
    large: 'h-3 w-3 border-2',
    lg: 'h-3 w-3 border-2',
    xlarge: 'h-3.5 w-3.5 border-2',
    xl: 'h-3.5 w-3.5 border-2',
    xxlarge: 'h-4 w-4 border-2',
    '2xl': 'h-4 w-4 border-2',
  };

  // Status color classes
  const statusColors: Record<AvatarStatus, string> = {
    online: 'bg-success-500',
    offline: 'bg-gray-400',
    busy: 'bg-error-500',
    away: 'bg-warning-500',
  };

  // Text size for initials
  const initialsSizeClasses: Record<AvatarSize, string> = {
    xsmall: 'text-xs',
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
    xlarge: 'text-lg',
    xxlarge: 'text-xl',
  };

  // Get initials from alt text if not provided
  const getInitials = () => {
    if (initials) return initials.toUpperCase().slice(0, 2);
    if (alt) {
      const words = alt.split(' ').filter(Boolean);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return words[0]?.slice(0, 2).toUpperCase() || '?';
    }
    return '?';
  };

  const showImage = src && !imageError;

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className={`
            rounded-full object-cover
            ${sizeClasses[size]}
          `}
        />
      ) : (
        <div
          className={`
            rounded-full flex items-center justify-center
            bg-brand-100 text-brand-600 font-medium
            dark:bg-brand-500/20 dark:text-brand-400
            ${sizeClasses[size]}
            ${initialsSizeClasses[size]}
          `}
        >
          {getInitials()}
        </div>
      )}

      {/* Status Indicator */}
      {showStatus && status && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full border-white dark:border-gray-900
            ${statusSizeClasses[size]}
            ${statusColors[status]}
          `}
        />
      )}
    </div>
  );
};

export default Avatar;
