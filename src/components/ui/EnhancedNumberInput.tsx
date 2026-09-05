import { useState, useCallback, useId } from 'react';
import { Plus, Minus, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EnhancedNumberInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  helper?: string;
  error?: string;
  presets?: { label: string; value: number }[];
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const EnhancedNumberInput = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  prefix,
  helper,
  error,
  presets,
  disabled,
  className,
  id: idProp,
}: EnhancedNumberInputProps) => {
  const [localValue, setLocalValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  const displayValue = isEditing ? localValue : String(value);

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
      const parsed = Number(raw.replace(/,/g, ''));
      if (!Number.isNaN(parsed)) {
        onChange(clamp(parsed));
      } else {
        setLocalValue(String(value));
      }
      setIsEditing(false);
    },
    [onChange, clamp, value],
  );

  const adjust = (delta: number) => {
    const newVal = clamp(value + delta);
    onChange(newVal);
    setLocalValue(String(newVal));
  };

  const hasError = !!error || (min !== undefined && value < min) || (max !== undefined && value > max);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          {label}
        </label>
      )}

      <div className="relative group">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 select-none pointer-events-none">
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          disabled={disabled}
          onFocus={() => {
            setIsEditing(true);
            setLocalValue(String(value));
          }}
          onBlur={(e) => commit(e.currentTarget.value)}
          onChange={(e) => setLocalValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value);
            if (e.key === 'ArrowUp') { e.preventDefault(); adjust(step); }
            if (e.key === 'ArrowDown') { e.preventDefault(); adjust(-step); }
          }}
          className={cn(
            'w-full bg-white/95 border rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 transition-all shadow-2xs',
            'focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 focus:outline-none',
            'hover:border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed',
            prefix && 'pl-8',
            suffix ? 'pr-16' : 'pr-9',
            hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-zinc-200/80',
          )}
        />

        {suffix && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 bg-zinc-100/90 border border-zinc-200/60 px-1.5 py-0.5 rounded select-none pointer-events-none">
            {suffix}
          </span>
        )}

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => adjust(step)}
            disabled={disabled || (max !== undefined && value >= max)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-30 cursor-pointer"
            tabIndex={-1}
            aria-label={`Increase ${label || 'value'}`}
          >
            <Plus size={11} />
          </button>
          <button
            type="button"
            onClick={() => adjust(-step)}
            disabled={disabled || (min !== undefined && value <= min)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-30 cursor-pointer"
            tabIndex={-1}
            aria-label={`Decrease ${label || 'value'}`}
          >
            <Minus size={11} />
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
                'px-2.5 py-0.5 text-[10px] font-semibold tracking-wide rounded-md border transition-all cursor-pointer select-none active:scale-95',
                value === p.value
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-2xs'
                  : 'bg-white text-zinc-600 border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {(helper || error || hasError) && (
        <div className="flex items-start gap-1.5 pt-0.5">
          {hasError && <AlertCircle size={13} className="text-rose-500 mt-0.5 shrink-0" />}
          <p className={cn('text-[11px] leading-tight', hasError ? 'text-rose-600 font-medium' : 'text-zinc-500')}>
            {error || (hasError ? `Value must be between ${min} and ${max}` : helper)}
          </p>
        </div>
      )}
    </div>
  );
};
