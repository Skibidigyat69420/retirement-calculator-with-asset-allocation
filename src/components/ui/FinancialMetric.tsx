import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FinancialMetricProps {
  label: string;
  value: number | string | null;
  prefix?: string;
  suffix?: string;
  delta?: number;
  deltaLabel?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

const valueStyles = {
  sm: 'text-base font-medium',
  md: 'text-2xl font-semibold tracking-tight',
  lg: 'text-3xl font-semibold tracking-tight',
  hero: 'num-hero text-5xl sm:text-6xl',
};

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export const FinancialMetric = ({
  label,
  value,
  prefix,
  suffix,
  delta,
  deltaLabel,
  hint,
  size = 'md',
}: FinancialMetricProps) => {
  const formatted =
    value === null || value === undefined
      ? null
      : typeof value === 'number'
        ? inr.format(value)
        : value;

  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          'mt-1.5 text-ink tabular-nums leading-tight flex items-baseline gap-1 flex-wrap',
          valueStyles[size],
          size === 'hero' && 'mt-3',
        )}
      >
        {formatted === null ? (
          <span className="text-faint">—</span>
        ) : (
          <>
            {prefix && <span className={cn(size === 'hero' && 'text-[0.5em] text-muted align-baseline')}>{prefix}</span>}
            <span className={size !== 'hero' ? 'font-mono' : undefined}>{formatted}</span>
            {suffix && <span className="text-[0.6em] text-muted font-normal">{suffix}</span>}
          </>
        )}
      </div>
      {(delta !== undefined || deltaLabel || hint) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted min-h-4">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono tabular-nums',
                delta >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {delta >= 0 ? (
                <TrendingUp size={13} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <TrendingDown size={13} strokeWidth={1.8} aria-hidden="true" />
              )}
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)}%{deltaLabel && <span className="font-sans normal-case tracking-normal">{deltaLabel}</span>}
            </span>
          )}
          {delta === undefined && deltaLabel && <span>{deltaLabel}</span>}
          {hint && <span className="text-faint leading-relaxed">{hint}</span>}
        </div>
      )}
    </div>
  );
};
