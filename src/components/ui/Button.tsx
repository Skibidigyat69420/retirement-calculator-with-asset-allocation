import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:
    'bg-accent text-white border border-accent shadow-card hover:bg-accent-strong hover:border-accent-strong',
  secondary:
    'bg-raised text-ink border border-border hover:border-border-strong hover:bg-surface',
  outline:
    'bg-transparent text-ink border border-border-strong hover:border-ink hover:bg-surface',
  ghost:
    'bg-transparent text-ink-soft border border-transparent hover:text-ink hover:bg-sunken',
  danger:
    'bg-negative-soft text-negative border border-negative/30 hover:bg-negative hover:text-white',
};

const sizes = {
  sm: 'px-3 min-h-8 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 min-h-10 py-2 text-sm rounded-md gap-2',
  lg: 'px-5 min-h-11 py-2.5 text-[15px] rounded-md gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        {...props}
        className={cn(
          'inline-flex items-center justify-center font-medium cursor-pointer select-none',
          'rounded-md transition-colors duration-150 active:scale-[0.98]',
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
