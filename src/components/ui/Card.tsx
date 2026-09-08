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
      'bg-[#0d1420] text-[#e8ecf2] border border-[#1c2940] shadow-card selection:bg-[#1c2940] hover:border-[#2a3d5f] hover:shadow-card-hover print:bg-white print:text-zinc-900 print:border-zinc-300',
    gold:
      'bg-[#1a1404] border border-[#40330f] text-[#fef3c7] shadow-card hover:shadow-card-hover hover:border-[#5a471a] print:bg-white print:text-zinc-900 print:border-zinc-300',
    subtle:
      'bg-sunken/70 border border-border text-ink-soft hover:border-border-strong',
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

