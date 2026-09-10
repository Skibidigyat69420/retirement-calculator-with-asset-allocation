import type { KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  className?: string;
}

export const SegmentedControl = ({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps) => {
  const currentIndex = options.findIndex((o) => o.value === value);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (options.length === 0) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (currentIndex + 1) % options.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (currentIndex - 1 + options.length) % options.length;
    if (next >= 0) {
      e.preventDefault();
      onChange(options[next].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn('inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-sunken', className)}
    >
      {options.map(({ value: optValue, label, icon: Icon }) => {
        const active = optValue === value;
        return (
          <button
            key={optValue}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(optValue)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] text-xs font-medium transition-colors cursor-pointer select-none',
              active ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {Icon && <Icon size={13} strokeWidth={1.6} aria-hidden="true" />}
            {label}
          </button>
        );
      })}
    </div>
  );
};
