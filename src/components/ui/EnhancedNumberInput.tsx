import { useState, useCallback, useId } from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Field } from './Field';
import { Slider } from './Slider';
import { getCurrencySymbol } from '../../lib/formatters';

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
  /**
   * 'number' (default) plain numeric field; 'currency' adds the currency
   * select/symbol adornment and currency grouping on blur.
   */
  kind?: 'number' | 'currency';
  currency?: string;
  onCurrencyChange?: (currency: string) => void;
  /** ISO currency codes offered by the live backend FX catalogue. */
  currencyOptions?: string[];
}

const formatValue = (val: number): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val);

/** en-IN grouping on blur; zero renders as a real "0", never a fake placeholder. */
const formatCurrencyValue = (val: number, currency: string = 'INR'): string => {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(val);
};

/** Strip grouping separators and stray characters; NaN means "keep the prior value". */
const parseRaw = (raw: string): number | null => {
  const parsed = Number(raw.replace(/[^0-9.-]/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
};

const DEFAULT_CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'JPY', 'AUD', 'CAD', 'CHF'];

export const EnhancedNumberInput = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
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
  kind = 'number',
  currency = 'INR',
  onCurrencyChange,
  currencyOptions,
}: EnhancedNumberInputProps) => {
  const isCurrency = kind === 'currency';
  const effectiveMin = isCurrency ? (min ?? 0) : min;
  const effectiveStep = step ?? (isCurrency ? 1000 : 1);
  const format = useCallback(
    (val: number) => (isCurrency ? formatCurrencyValue(val, currency) : formatValue(val)),
    [isCurrency, currency],
  );

  const [localValue, setLocalValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const availableCurrencies = Array.from(new Set([
    currency,
    ...(currencyOptions?.length ? currencyOptions : DEFAULT_CURRENCY_OPTIONS),
  ])).sort((a, b) => (a === 'INR' ? -1 : b === 'INR' ? 1 : a.localeCompare(b)));

  const displayValue = isEditing ? localValue : format(value);

  const clamp = useCallback(
    (val: number) => {
      if (effectiveMin !== undefined && val < effectiveMin) return effectiveMin;
      if (max !== undefined && val > max) return max;
      return val;
    },
    [effectiveMin, max],
  );

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseRaw(raw);
      if (parsed !== null) {
        onChange(clamp(parsed));
      } else {
        setLocalValue(format(value));
      }
      setIsEditing(false);
    },
    [onChange, clamp, value, format],
  );

  const adjust = (delta: number) => {
    const newVal = clamp(value + delta);
    onChange(newVal);
    setLocalValue(String(newVal));
  };

  const outOfRange = (effectiveMin !== undefined && value < effectiveMin) || (max !== undefined && value > max);
  const hasError = !!error || outOfRange;
  const inline = layout === 'inline';

  const rangeMessage = isCurrency
    ? `Value must be between ${currency} ${formatCurrencyValue(effectiveMin ?? 0, currency)}${max !== undefined ? ` and ${currency} ${formatCurrencyValue(max, currency)}` : ' or more'}`
    : `Value must be between ${effectiveMin} and ${max}`;

  return (
    <Field
      label={label}
      htmlFor={inputId}
      layout={layout}
      helper={helper}
      error={hasError ? (error ?? rangeMessage) : undefined}
      className={cn(slider === 'focus' && 'group', className)}
    >
      <div className={cn('relative group', inline && 'flex-1 min-w-[8rem] basis-36')}>
        {isCurrency &&
          (onCurrencyChange ? (
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              disabled={disabled}
              className="absolute left-1 top-1/2 -translate-y-1/2 h-7 rounded-sm border-none bg-transparent py-0 pl-2 pr-6 text-xs text-faint hover:text-ink focus:ring-0 focus:outline-none cursor-pointer appearance-none z-10"
            >
              {availableCurrencies.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          ) : (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint select-none pointer-events-none tabular-nums">
              {getCurrencySymbol(currency)}
            </span>
          ))}
        {!isCurrency && prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint select-none pointer-events-none tabular-nums">
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          type="text"
          inputMode={isCurrency ? 'numeric' : 'decimal'}
          value={displayValue}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          onFocus={() => {
            setIsEditing(true);
            setLocalValue(String(value));
          }}
          onBlur={(e) => commit(e.currentTarget.value)}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value);
            if (e.key === 'ArrowUp') { e.preventDefault(); adjust(effectiveStep); }
            if (e.key === 'ArrowDown') { e.preventDefault(); adjust(-effectiveStep); }
          }}
          className={cn(
            'input',
            inline && 'py-2',
            isCurrency ? 'pl-12 pr-10' : cn(prefix && 'pl-8', suffix ? 'pr-16' : 'pr-9'),
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
            onClick={() => adjust(effectiveStep)}
            disabled={disabled || (max !== undefined && value >= max)}
            className="p-1 rounded-sm text-faint hover:text-ink hover:bg-sunken transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            tabIndex={-1}
            aria-label={`Increase ${label || 'value'}`}
          >
            <Plus size={11} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => adjust(-effectiveStep)}
            disabled={disabled || (effectiveMin !== undefined && value <= effectiveMin)}
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
          <Slider
            size="sm"
            label={label || 'value'}
            min={effectiveMin ?? 0}
            max={max}
            step={effectiveStep}
            value={value}
            onChange={(val) => {
              onChange(val);
              setLocalValue(String(val));
            }}
            formatValue={format}
            className="flex-1"
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
    </Field>
  );
};
