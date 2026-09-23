import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:
    'bg-accent text-on-inkfill border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.12),0_6px_16px_-4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-accent-strong hover:shadow-[0_2px_4px_rgba(0,0,0,0.14),0_10px_22px_-4px_rgba(0,0,0,0.3)]',
  secondary:
    'bg-raised text-ink border border-border shadow-card hover:border-border-strong hover:bg-surface',
  outline:
    'bg-transparent text-ink border border-border-strong hover:border-accent/50 hover:bg-accent-softer',
  ghost:
    'bg-transparent text-ink-soft border border-transparent hover:text-ink hover:bg-sunken',
  danger:
    'bg-negative text-white border border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-negative/90',
};

const sizes = {
  sm: 'px-3 min-h-8 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-3.5 min-h-9 py-2 text-[13px] rounded-md gap-2',
  lg: 'px-5 min-h-11 py-2.5 text-sm rounded-md gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        {...props}
        className={cn(
          'inline-flex items-center justify-center font-semibold cursor-pointer select-none',
          'rounded-md transition-all duration-150 active:scale-[0.97]',
          'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          variants[variant],
          sizes[size],
          className,
        )}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
