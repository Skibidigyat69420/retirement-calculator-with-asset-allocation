import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Shows a spinner, disables the button and announces the busy state. */
  loading?: boolean;
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      className,
      type = 'button',
      disabled,
      ...props
    },
    ref,
  ) => {
    const variants = {
      // §107: PRIMARY EMERALD — the one saturated surface in the product
      primary:
        'bg-accent text-white shadow-2xs hover:bg-accent-strong border border-accent-strong/60 focus-visible:ring-accent/60 dark:text-midnight dark:border-transparent',
      secondary:
        'bg-raised text-ink border border-border-strong hover:bg-sunken hover:border-ink/25 shadow-2xs focus-visible:ring-accent/50',
      outline:
        'border border-border-strong bg-transparent text-ink-soft hover:border-ink/35 hover:text-ink shadow-2xs hover:shadow-xs focus-visible:ring-accent/60',
      ghost:
        'text-muted hover:text-ink hover:bg-raised border border-transparent focus-visible:ring-accent/40',
      danger:
        'bg-negative text-white shadow-2xs hover:brightness-110 border border-negative/70 focus-visible:ring-negative/60 dark:border-transparent',
    };

    const sizes = {
      sm: 'px-3 min-h-9 py-1.5 text-xs rounded-xl gap-1.5',
      md: 'px-4 min-h-11 py-2.5 text-sm rounded-xl gap-2',
      lg: 'px-6 min-h-12 py-3 text-base rounded-2xl gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-live={loading ? 'polite' : undefined}
        {...props}
        className={cn(
          'inline-flex items-center justify-center font-semibold cursor-pointer select-none',
          'active:scale-[0.98] transition-all duration-150 ease-out',
          'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 disabled:shadow-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          variants[variant],
          sizes[size],
          className,
        )}
      >
        {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" aria-hidden="true" />}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
