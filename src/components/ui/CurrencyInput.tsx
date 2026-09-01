import { useState, useEffect, useCallback, useId } from 'react';
import { Plus, Minus, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CurrencyInputProps {
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
}

const formatDisplay = (val: number): string => {
  if (val === 0) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
};

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
}: CurrencyInputProps) => {
  const [localValue, setLocalValue] = useState(formatDisplay(value));
  const [isEditing, setIsEditing] = useState(false);
  const inputId = useId();

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(formatDisplay(value));
    }
  }, [value, isEditing]);

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
      const parsed = parseDisplay(raw);
      onChange(clamp(parsed));
      setIsEditing(false);
    },
    [onChange, clamp],
  );

  const adjust = (delta: number) => {
    const newVal = clamp(value + delta);
    onChange(newVal);
    setLocalValue(formatDisplay(newVal));
  };

  const hasError = !!error || (min !== undefined && value < min) || (max !== undefined && value > max);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">₹</span>

        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={localValue}
          disabled={disabled}
          onFocus={() => setIsEditing(true)}
          onBlur={(e) => commit(e.currentTarget.value)}
          onChange={(e) => setLocalValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value);
            if (e.key === 'ArrowUp') { e.preventDefault(); adjust(step); }
            if (e.key === 'ArrowDown') { e.preventDefault(); adjust(-step); }
          }}
          className={cn(
            'w-full bg-white border rounded-xl pl-8 pr-10 py-2.5 text-sm font-medium text-navy placeholder:text-stone-400 transition-all',
            'focus:border-gold focus:ring-2 focus:ring-gold/10 focus:outline-none',
            'hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed',
            hasError ? 'border-rose-300' : 'border-stone-200',
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 focus-within:opacity-100 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => adjust(step)}
            disabled={disabled || (max !== undefined && value >= max)}
            className="p-0.5 text-stone-400 hover:text-navy disabled:opacity-30"
            tabIndex={-1}
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            onClick={() => adjust(-step)}
            disabled={disabled || (min !== undefined && value <= min)}
            className="p-0.5 text-stone-400 hover:text-navy disabled:opacity-30"
            tabIndex={-1}
          >
            <Minus size={12} />
          </button>
        </div>
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(clamp(p.value))}
              disabled={disabled}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded-md border transition-colors',
                value === p.value
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-navy',
                'disabled:opacity-50',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {(helper || error || hasError) && (
        <div className="flex items-start gap-1">
          {hasError && <AlertCircle size={12} className="text-rose-500 mt-0.5 shrink-0" />}
          <p className={cn('text-[10px]', hasError ? 'text-rose-500' : 'text-stone-400')}>
            {error || (hasError ? `Value must be between ₹${formatDisplay(min || 0)} and ₹${formatDisplay(max || 0)}` : helper)}
          </p>
        </div>
      )}
    </div>
  );
};
