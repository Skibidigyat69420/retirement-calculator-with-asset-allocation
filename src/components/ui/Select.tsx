import { useId } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export const Select = ({
  label,
  value,
  onChange,
  options,
  className,
  id,
  'aria-label': ariaLabel,
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600"
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
            'w-full appearance-none bg-white/95 border border-zinc-200/80 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-medium text-zinc-950 shadow-2xs',
            'focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 focus:outline-none',
            'hover:border-zinc-300 transition-all cursor-pointer',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-zinc-900 py-1">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
      </div>
    </div>
  );
};

