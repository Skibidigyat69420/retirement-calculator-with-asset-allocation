import type React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle' | 'elevated';
}

export const Card = ({
  children,
  className,
  variant = 'default',
  ...props
}: CardProps) => {
  const variants = {
    default: 'bg-raised border border-border shadow-card text-ink',
    elevated: 'bg-raised border border-border shadow-elevated text-ink',
    navy: 'bg-sunken border border-border-strong text-ink',
    gold: 'bg-brass-soft border border-brass/30 text-ink',
    subtle: 'bg-surface border border-border-subtle text-ink-soft',
  };

  return (
    <div
      {...props}
      className={cn('rounded-lg p-5 md:p-6 print:break-inside-avoid', variants[variant], className)}
    >
      {children}
    </div>
  );
};
