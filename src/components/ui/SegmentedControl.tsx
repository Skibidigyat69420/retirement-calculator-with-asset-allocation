import { useId, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
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
  const layoutId = useId();
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
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-sunken',
        className,
      )}
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
              'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer select-none',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${layoutId}`}
                className="absolute inset-0 rounded-md bg-raised shadow-card border border-border-subtle"
                transition={{ type: 'spring', stiffness: 500, damping: 42, mass: 0.7 }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && <Icon size={13} strokeWidth={1.6} aria-hidden="true" />}
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
