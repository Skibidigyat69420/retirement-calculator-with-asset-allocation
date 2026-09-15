import { useState, useCallback, useId } from 'react';
import { Plus, Minus, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EnhancedNumberInputProps {
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
  /** `true` always shows the slider track; `'focus'` reveals it on hover/focus only. */
  slider?: boolean | 'focus';
  disabled?: boolean;
  className?: string;
  id?: string;
  /** 'stack' (default) label above; 'inline' small mono label left of the control. */
  layout?: 'stack' | 'inline';
}

const formatValue = (val: number): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val);

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
  slider,
  disabled,
  className,
  id: idProp,
  layout = 'stack',
}: EnhancedNumberInputProps) => {
  const [localValue, setLocalValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  const displayValue = isEditing ? localValue : formatValue(value);

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

  const outOfRange = (min !== undefined && value < min) || (max !== undefined && value > max);
  const hasError = !!error || outOfRange;
  const inline = layout === 'inline';

  return (
    <div
      className={cn(
        inline ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'space-y-1.5',
        slider === 'focus' && 'group',
        className,
      )}
    >
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            inline
              ? 'w-24 sm:w-28 shrink-0 pt-0 text-[10px] font-mono uppercase tracking-wider text-muted leading-tight'
              : 'field-label block text-xs font-medium tracking-normal text-ink-soft',
          )}
        >
          {label}
        </label>
      )}

      <div className={cn('relative group', inline && 'flex-1 min-w-[8rem] basis-36')}>
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint select-none pointer-events-none tabular-nums">
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          disabled={disabled}
          aria-invalid={hasError || undefined}
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
            'w-full bg-surface border rounded-md px-3 py-2.5 text-sm text-ink tabular-nums placeholder:text-faint transition-colors',
            inline && 'py-2',
            'focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none',
            'hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed',
            prefix && 'pl-8',
            suffix ? 'pr-16' : 'pr-9',
            hasError
              ? 'border-negative focus:border-negative focus:ring-negative-soft'
              : 'border-border',
          )}
        />

        {suffix && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs font-medium text-muted bg-sunken border border-border px-1.5 py-0.5 rounded-sm select-none pointer-events-none">
            {suffix}
          </span>
        )}

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

      {slider && max !== undefined && (
        <div
          className={cn(
            'pt-2 pb-1',
            inline && 'basis-full pl-[6.75rem] sm:pl-[7.75rem]',
            slider === 'focus' && 'hidden group-hover:block group-focus-within:block',
          )}
        >
          <input
            type="range"
            min={min ?? 0}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = Number(e.target.value);
              onChange(val);
              setLocalValue(String(val));
            }}
            disabled={disabled}
            className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>
      )}

      {presets && presets.length > 0 && (
        <div className={cn('flex flex-wrap gap-1.5 pt-0.5', inline && 'basis-full pl-[6.75rem] sm:pl-[7.75rem]')}>
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
        <div
          className={cn(
            'flex items-start gap-1.5 pt-0.5',
            inline && 'basis-full pl-[6.75rem] sm:pl-[7.75rem]',
          )}
        >
          {hasError && <AlertCircle size={13} strokeWidth={1.8} className="text-negative mt-0.5 shrink-0" />}
          <p className={cn('text-xs leading-relaxed', hasError ? 'text-negative' : 'text-faint')}>
            {error || (outOfRange ? `Value must be between ${min} and ${max}` : helper)}
          </p>
        </div>
      )}
    </div>
  );
};
