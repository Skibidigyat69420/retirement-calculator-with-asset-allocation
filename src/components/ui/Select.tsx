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
          className="block text-[11px] font-semibold uppercase tracking-wider text-muted"
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
            'w-full appearance-none bg-surface border border-border rounded-xl px-3.5 py-2.5 pr-10 text-sm font-medium text-ink shadow-2xs',
            'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
            'hover:border-border-strong transition-all cursor-pointer',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-ink py-1">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  );
};

