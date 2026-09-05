import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) => {
  const variants = {
    primary:
      'bg-gradient-to-b from-zinc-900 to-zinc-950 text-white shadow-2xs hover:shadow-xs hover:from-zinc-800 hover:to-zinc-900 border border-zinc-800/80 focus-visible:ring-zinc-950/20',
    secondary:
      'bg-zinc-100/90 text-zinc-900 border border-zinc-200/90 hover:bg-zinc-200/70 hover:border-zinc-300 shadow-2xs focus-visible:ring-zinc-400/30',
    outline:
      'border border-zinc-300/90 bg-white/90 backdrop-blur-xs text-zinc-800 hover:border-zinc-950 hover:bg-zinc-50/90 shadow-2xs hover:shadow-xs focus-visible:ring-zinc-950/20',
    ghost:
      'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80 border border-transparent focus-visible:ring-zinc-400/20',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-2xl gap-2.5',
  };

  return (
    <button
      type={type}
      {...props}
      className={cn(
        'inline-flex items-center justify-center font-semibold cursor-pointer select-none',
        'active:scale-[0.98] transition-all duration-150',
        'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 disabled:shadow-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
};

