import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  helper?: string;
  /** Sentence-case error message. When set, renders in negative tone. */
  error?: string;
  /**
   * 'stack' (default): label above the control.
   * 'inline': small mono label left of the control — for dense grids of short fields.
   */
  layout?: 'stack' | 'inline';
}

export const Input = ({ label, suffix, helper, error, className, id, layout = 'stack', ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = !!error;
  const inline = layout === 'inline';

  return (
    <div className={cn(inline ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            inline
              ? 'w-24 sm:w-28 shrink-0 text-[10px] font-mono uppercase tracking-wider text-muted leading-tight'
              : 'field-label block text-xs font-medium tracking-normal text-ink-soft',
          )}
        >
          {label}
        </label>
      )}
      <div className={cn('relative', inline && 'flex-1 min-w-[8rem] basis-36')}>
        <input
          id={inputId}
          {...props}
          aria-invalid={hasError || undefined}
          className={cn(
            'w-full bg-surface border rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-faint transition-colors',
            inline && 'py-2',
            'focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none',
            'hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed',
            hasError
              ? 'border-negative focus:border-negative focus:ring-negative-soft'
              : 'border-border',
            suffix && 'pr-12',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted bg-sunken border border-border px-1.5 py-0.5 rounded-sm select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {(helper || error) && (
        <p
          className={cn(
            'text-xs leading-relaxed',
            inline && 'basis-full pl-[6.75rem] sm:pl-[7.75rem]',
            hasError ? 'text-negative' : 'text-faint',
          )}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  );
};
