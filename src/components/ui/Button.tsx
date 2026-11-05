import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary:
    'bg-accent text-on-inkfill border border-accent hover:bg-accent-strong hover:border-accent-strong shadow-none transition-colors',
  secondary:
    'bg-raised text-ink border border-border hover:border-border-strong hover:bg-sunken transition-colors',
  outline:
    'bg-transparent text-ink border border-border hover:border-accent hover:bg-accent-soft transition-colors',
  ghost:
    'bg-transparent text-ink-soft border border-transparent hover:text-ink hover:bg-sunken transition-colors',
  danger:
    'bg-negative text-white border border-transparent hover:bg-negative/90 shadow-xs transition-colors',
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
          'rounded-md transition-all duration-150 active:translate-y-px',
          'disabled:opacity-50 disabled:pointer-events-none disabled:active:translate-y-0',
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
