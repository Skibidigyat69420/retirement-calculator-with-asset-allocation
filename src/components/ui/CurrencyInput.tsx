import { useState, useCallback, useId } from 'react';
import { Plus, Minus, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CurrencyInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
  error?: string;
  presets?: { label: string; value: number }[];
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** en-IN grouping on blur; zero renders as a real "0", never a fake placeholder. */
const formatDisplay = (val: number): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);

const parseDisplay = (raw: string): number => {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const CurrencyInput = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1000,
  helper,
  error,
  presets,
  disabled,
  className,
  id: idProp,
}: CurrencyInputProps) => {
  const [localValue, setLocalValue] = useState(formatDisplay(value));
  const [isEditing, setIsEditing] = useState(false);
  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  const displayValue = isEditing ? localValue : formatDisplay(value);

  const clamp = useCallback(
    (val: number) => {
      if (min !== undefined && val < min) return min;
      if (max !== undefined && val > max) return max;
      return val;
    },
    [min, max],
  );

  const commit = useCallback(
    (raw: string) => {
      onChange(clamp(parseDisplay(raw)));
      setIsEditing(false);
    },
    [onChange, clamp],
  );

  const adjust = (delta: number) => {
    const newVal = clamp(value + delta);
    onChange(newVal);
    setLocalValue(formatDisplay(newVal));
  };

  const outOfRange = (min !== undefined && value < min) || (max !== undefined && value > max);
  const hasError = !!error || outOfRange;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold uppercase tracking-wider text-muted"
        >
          {label}
        </label>
      )}

      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint select-none pointer-events-none tabular-nums">
          ₹
        </span>

        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={displayValue}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          onFocus={() => {
            setIsEditing(true);
            setLocalValue(formatDisplay(value));
          }}
          onBlur={(e) => commit(e.currentTarget.value)}
          onChange={(e) => setLocalValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value);
            if (e.key === 'ArrowUp') { e.preventDefault(); adjust(step); }
            if (e.key === 'ArrowDown') { e.preventDefault(); adjust(-step); }
          }}
          className={cn(
            'w-full bg-surface border rounded-md pl-8 pr-10 py-2.5 text-sm text-ink tabular-nums placeholder:text-faint transition-colors',
            'focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none',
            'hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed',
            hasError
              ? 'border-negative focus:border-negative focus:ring-negative-soft'
              : 'border-border',
          )}
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => adjust(step)}
            disabled={disabled || (max !== undefined && value >= max)}
            className="p-1 rounded-sm text-faint hover:text-ink hover:bg-sunken transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            tabIndex={-1}
            aria-label={`Increase ${label || 'value'}`}
          >
            <Plus size={11} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => adjust(-step)}
            disabled={disabled || (min !== undefined && value <= min)}
            className="p-1 rounded-sm text-faint hover:text-ink hover:bg-sunken transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            tabIndex={-1}
            aria-label={`Decrease ${label || 'value'}`}
          >
            <Minus size={11} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(clamp(p.value))}
              disabled={disabled}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium tracking-wide rounded-sm border transition-colors cursor-pointer select-none',
                value === p.value
                  ? 'bg-accent-soft text-accent-strong border-accent/40'
                  : 'bg-surface text-muted border-border hover:border-border-strong hover:text-ink',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {(helper || error || outOfRange) && (
        <div className="flex items-start gap-1.5 pt-0.5">
          {hasError && <AlertCircle size={13} strokeWidth={1.8} className="text-negative mt-0.5 shrink-0" />}
          <p className={cn('text-xs leading-relaxed', hasError ? 'text-negative' : 'text-faint')}>
            {error ||
              (outOfRange
                ? `Value must be between ₹${formatDisplay(min ?? 0)}${max !== undefined ? ` and ₹${formatDisplay(max)}` : ' or more'}`
                : helper)}
          </p>
        </div>
      )}
    </div>
  );
};
