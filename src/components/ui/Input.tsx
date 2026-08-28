import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  helper?: string;
}

export const Input = ({ label, suffix, helper, className, ...props }: InputProps) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          className={cn(
            'w-full bg-transparent border-b border-stone-300 py-2 text-sm font-medium text-navy transition-colors focus:border-gold focus:outline-none',
            suffix && 'pr-8',
          )}
        />
        {suffix && (
          <span className="absolute right-0 top-2 text-xs text-stone-400">{suffix}</span>
        )}
      </div>
      {helper && <p className="text-[10px] text-stone-400">{helper}</p>}
    </div>
  );
};
