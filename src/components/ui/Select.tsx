import { useId } from 'react';
import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export const Select = ({ label, value, onChange, options, className, id, 'aria-label': ariaLabel }: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          aria-label={ariaLabel || label}
          className={cn(
            'w-full appearance-none bg-white border border-stone-200 rounded-xl px-3 py-2.5 pr-9 text-sm font-medium text-navy',
            'focus:border-gold focus:ring-2 focus:ring-gold/10 focus:outline-none',
            'hover:border-stone-300 transition-all',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 text-xs">▼</span>
      </div>
    </div>
  );
};
