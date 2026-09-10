import React from 'react';
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
    default:
      'bg-surface border border-border shadow-card hover:shadow-card-hover hover:border-border-strong text-ink',
    elevated:
      'bg-raised border border-border shadow-card hover:shadow-card-hover hover:border-border-strong text-ink',
    navy:
      'bg-sunken text-ink border border-border-strong shadow-card selection:bg-border hover:border-accent/60 hover:shadow-card-hover',
    gold:
      'bg-surface border border-warning/40 text-ink shadow-card hover:shadow-card-hover hover:border-warning/70',
    subtle:
      'bg-sunken/60 border border-border text-ink-soft hover:border-border-strong',
  };

  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl p-5 md:p-6 transition-all duration-200 ease-out print:break-inside-avoid',
        (variant === 'default' || variant === 'elevated') && 'hover:-translate-y-0.5',
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};

