import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import { Field } from './Field';

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
  const inline = layout === 'inline';

  return (
    <Field label={label} htmlFor={inputId} layout={layout} helper={helper} error={error} className={className}>
      <div className={cn('relative', inline && 'flex-1 min-w-[8rem] basis-36')}>
        <input
          id={inputId}
          {...props}
          aria-invalid={!!error || undefined}
          className={cn('input', inline && 'py-2', suffix && 'pr-12')}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted bg-sunken border border-border px-1.5 py-0.5 rounded-sm select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
};
