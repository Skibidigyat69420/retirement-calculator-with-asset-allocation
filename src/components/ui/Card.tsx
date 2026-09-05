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
      'bg-white/90 backdrop-blur-sm border border-zinc-200/80 shadow-2xs hover:shadow-card hover:border-zinc-300 text-zinc-900',
    elevated:
      'bg-white/95 backdrop-blur-sm border border-zinc-200/80 shadow-card hover:shadow-card-hover hover:border-zinc-300/90 text-zinc-900',
    navy:
      'bg-zinc-950 text-white border border-zinc-900 shadow-xs selection:bg-zinc-800',
    gold:
      'bg-gradient-to-br from-amber-500/[0.04] via-white/90 to-zinc-50/80 backdrop-blur-sm border border-amber-200/60 shadow-2xs hover:border-amber-300/80 text-zinc-900',
    subtle:
      'bg-zinc-50/80 backdrop-blur-xs border border-zinc-200/70 text-zinc-800 hover:border-zinc-300/80',
  };

  return (
    <div
      {...props}
      className={cn(
        'rounded-2xl p-5 md:p-6 transition-all duration-200 print:break-inside-avoid',
        (variant === 'default' || variant === 'elevated') && 'hover:-translate-y-0.5',
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};

