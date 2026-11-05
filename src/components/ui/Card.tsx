import type React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle' | 'elevated' | 'bento';
}

export const Card = ({
  children,
  className,
  variant = 'default',
  ...props
}: CardProps) => {
  const variants = {
    default: 'glass-bento text-ink',
    elevated: 'glass-bento shadow-elevated text-ink',
    navy: 'bg-deep border border-deep text-on-inkfill rounded-xl',
    gold: 'bg-brass-soft border border-brass/30 text-ink rounded-xl',
    subtle: 'bg-surface border border-border-subtle text-ink-soft rounded-xl',
    bento: 'glass-bento text-ink',
  };

  return (
    <div
      {...props}
      className={cn('rounded-[10px] p-5 md:p-6 print:break-inside-avoid', variants[variant], className)}
    >
      {children}
    </div>
  );
};
