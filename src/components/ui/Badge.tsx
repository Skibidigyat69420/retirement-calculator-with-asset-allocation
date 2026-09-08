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
    default: 'bg-raised text-ink-soft border border-border',
    gold: 'bg-warning/10 text-warning border border-warning/25',
    navy: 'bg-[#0d1420] text-ink border border-[#1c2940] print:bg-white print:text-zinc-900 print:border-zinc-300',
    outline: 'bg-transparent text-muted border border-border-strong',
    success: 'bg-positive/10 text-positive border border-positive/25',
    danger: 'bg-negative/10 text-negative border border-negative/25',
    warning: 'bg-warning/10 text-warning border border-warning/25',
  };

  const dotColors = {
    default: 'bg-muted',
    gold: 'bg-warning',
    navy: 'bg-muted',
    outline: 'bg-muted',
    success: 'bg-positive',
    danger: 'bg-negative',
    warning: 'bg-warning',
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

