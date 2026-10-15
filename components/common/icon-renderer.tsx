'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export function IconRenderer({ name, className = 'w-5 h-5', size }: IconRendererProps) {
  // @ts-expect-error - dynamic Lucide icon resolution
  const IconComponent = LucideIcons[name] || LucideIcons[name.charAt(0).toUpperCase() + name.slice(1)] || LucideIcons.CircleDot;

  return <IconComponent className={className} size={size} />;
}
