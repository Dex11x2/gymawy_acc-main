import React, { useState } from 'react';

type LogoVariant = 'wordmark' | 'mark';

interface LogoProps {
  variant?: LogoVariant;
  height?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ variant = 'wordmark', height = 36, className }) => {
  const [broken, setBroken] = useState(false);
  const src = variant === 'wordmark' ? '/branding/gymmawy-wordmark.png' : '/branding/gymmawy-logo.png';

  if (broken) {
    return (
      <div
        className={`font-extrabold select-none ${className || ''}`}
        style={{
          fontSize: height * 0.8,
          lineHeight: `${height}px`,
          color: '#f59e0b',
          textShadow: '2px 2px 0 #000'
        }}
        aria-label="Gymmawy"
      >
        جيماوي
      </div>
    );
  }

  return (
    <img
      src={src}
      height={height}
      style={{ height, width: 'auto' }}
      alt="Gymmawy Logo"
      className={className}
      onError={() => setBroken(true)}
      loading="eager"
    />
  );
};

export default Logo;

