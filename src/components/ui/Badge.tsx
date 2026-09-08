import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'navy' | 'outline' | 'success' | 'danger' | 'warning';
  className?: string;
  dot?: boolean;
}

export const Badge = ({
  children,
  variant = 'default',
  className,
  dot = true,
}: BadgeProps) => {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 border border-zinc-200/90',
    gold: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    navy: 'bg-zinc-950 text-zinc-100 border border-zinc-800',
    outline: 'bg-white text-zinc-700 border border-zinc-300/90',
    success: 'bg-emerald-50 text-emerald-900 border border-emerald-200/80',
    danger: 'bg-rose-50 text-rose-900 border border-rose-200/80',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200/90',
  };

  const dotColors = {
    default: 'bg-zinc-400',
    gold: 'bg-amber-500',
    navy: 'bg-zinc-400',
    outline: 'bg-zinc-400',
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

