import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-[11px] font-semibold uppercase tracking-wider text-muted"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hintId}
          {...props}
          className={cn(
            'w-full min-h-24 bg-raised/50 border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-faint transition-all shadow-2xs',
            'focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none',
            'hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-negative focus:border-negative focus:ring-negative/25',
            className,
          )}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-negative font-medium leading-tight">
            {error}
          </p>
        ) : (
          hint && (
            <p id={hintId} className="text-xs text-muted leading-tight">
              {hint}
            </p>
          )
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
