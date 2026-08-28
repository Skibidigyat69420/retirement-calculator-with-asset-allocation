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
            'w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-medium text-navy placeholder:text-stone-400 transition-all',
            'focus:border-gold focus:ring-2 focus:ring-gold/10 focus:outline-none',
            'hover:border-stone-300',
            suffix && 'pr-10',
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-[10px] text-stone-400">{helper}</p>}
    </div>
  );
};
