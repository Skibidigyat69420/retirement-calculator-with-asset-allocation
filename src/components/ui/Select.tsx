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
  helper?: string;
  disabled?: boolean;
  /** 'stack' (default) label above; 'inline' small mono label left of the control. */
  layout?: 'stack' | 'inline';
}

export const Select = ({
  label,
  value,
  onChange,
  options,
  className,
  id,
  'aria-label': ariaLabel,
  helper,
  disabled,
  layout = 'stack',
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const inline = layout === 'inline';

  return (
    <div className={cn(inline ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            inline
              ? 'w-24 sm:w-28 shrink-0 text-[10px] font-mono uppercase tracking-wider text-muted leading-tight'
              : 'block text-[11px] font-semibold uppercase tracking-wider text-muted',
          )}
        >
          {label}
        </label>
      )}
      <div className={cn('relative', inline && 'flex-1 min-w-[8rem] basis-36')}>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          aria-label={ariaLabel || label}
          disabled={disabled}
          className={cn(
            'w-full appearance-none bg-surface border border-border rounded-md px-3 py-2.5 pr-9 text-sm text-ink',
            inline && 'py-2',
            'focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none',
            'hover:border-border-strong transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-ink py-1">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
      {helper && (
        <p className={cn('text-xs text-faint leading-relaxed', inline && 'basis-full pl-[6.75rem] sm:pl-[7.75rem]')}>
          {helper}
        </p>
      )}
    </div>
  );
};
