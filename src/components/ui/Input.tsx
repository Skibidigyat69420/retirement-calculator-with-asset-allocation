import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  helper?: string;
}

export const Input = ({ label, suffix, helper, className, id, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold uppercase tracking-wider text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          {...props}
          className={cn(
            'w-full bg-raised/50 border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-faint transition-all shadow-2xs',
            'focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none',
            'hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed',
            suffix && 'pr-12',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted bg-sunken border border-border px-1.5 py-0.5 rounded select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-[11px] text-muted leading-tight">{helper}</p>}
    </div>
  );
};

