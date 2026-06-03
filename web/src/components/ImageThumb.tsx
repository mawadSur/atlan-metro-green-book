'use client';

import { useState } from 'react';
import type { Location } from '@/lib/types';
import { typeStyle } from '@/lib/display';

interface ImageThumbProps {
  loc: Location;
  className?: string;
}

export default function ImageThumb({ loc, className = '' }: ImageThumbProps) {
  const [showFallback, setShowFallback] = useState(false);
  const hasImage = loc.image_url && loc.image_url.trim().length > 0;
  const style = typeStyle(loc.type);

  if (!hasImage || showFallback) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${className}`}
        style={{
          backgroundImage: `linear-gradient(135deg, ${style.from} 0%, ${style.to} 100%)`,
        }}
      >
        <span className="text-4xl opacity-90">{style.icon}</span>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.2) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)`
        }}></div>
      </div>
    );
  }

  return (
    <img
      src={loc.image_url}
      alt={loc.name_en}
      className={`object-cover ${className}`}
      onError={() => setShowFallback(true)}
    />
  );
}
