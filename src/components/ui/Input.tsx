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
          className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          {...props}
          className={cn(
            'w-full bg-white/95 border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 transition-all shadow-2xs',
            'focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 focus:outline-none',
            'hover:border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed',
            suffix && 'pr-12',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 bg-zinc-100/90 border border-zinc-200/60 px-1.5 py-0.5 rounded select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-[11px] text-zinc-500 leading-tight">{helper}</p>}
    </div>
  );
};

