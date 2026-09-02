import { useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
          className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          {...props}
          className={cn(
            'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-ink placeholder:text-slate-400 transition-all',
            'focus:border-navy focus:ring-2 focus:ring-navy/10 focus:outline-none',
            'hover:border-slate-300',
            suffix && 'pr-10',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-[10px] text-slate-500">{helper}</p>}
    </div>
  );
};
