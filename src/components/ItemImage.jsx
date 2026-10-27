import React, { useState } from 'react';

export const isImageUrl = (val) => {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim();
  if (/^(https?:\/\/|\/|\.\/|\.\.\/|data:image\/|blob:)/i.test(s)) return true;
  if (/\.(jpeg|jpg|gif|png|webp|svg|avif)($|\?)/i.test(s)) return true;
  return false;
};

export const ItemImage = ({ 
  src, 
  alt = 'เครื่องดื่ม', 
  size = 52, 
  borderRadius = 12, 
  className = '', 
  style = {} 
}) => {
  const [hasError, setHasError] = useState(false);
  const isImage = isImageUrl(src) && !hasError;
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={className}
      style={{
        width: pixelSize,
        height: pixelSize,
        minWidth: pixelSize,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--brown-pale, #fff6f0)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
        flexShrink: 0,
        ...style
      }}
    >
      {isImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ 
          fontSize: typeof size === 'number' ? `${Math.max(16, Math.round(size * 0.46))}px` : '1.8rem', 
          lineHeight: 1,
          userSelect: 'none'
        }}>
          {src || '🥤'}
        </span>
      )}
    </div>
  );
};
