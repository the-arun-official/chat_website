import React from 'react';

interface UnreadGlowPulseProps {
  unreadCount?: number;
  children?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const UnreadGlowPulse: React.FC<UnreadGlowPulseProps> = ({
  unreadCount = 0,
  children,
  size = 'medium'
}) => {
  if (!unreadCount || unreadCount === 0) {
    return <>{children}</>;
  }

  const sizeMap = {
    small: 24,
    medium: 32,
    large: 40
  };

  const badgeSize = sizeMap[size];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}

      {/* Unread Badge - Static (no animation for performance) */}
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: 'linear-gradient(135deg, #FF6B6B, #FF8E72)',
          color: 'white',
          borderRadius: '50%',
          width: `${badgeSize}px`,
          height: `${badgeSize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${badgeSize * 0.5}px`,
          fontWeight: 'bold',
          zIndex: 10,
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </div>
    </div>
  );
};
