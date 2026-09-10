import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

export const ProgressBar = ({ value, max = 100, label, showValue = false }: ProgressBarProps) => {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div>
      {(label || showValue) && (
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          {label && <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>}
          {showValue && (
            <span className="text-xs text-ink font-mono tabular-nums">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1 rounded-full bg-sunken overflow-hidden"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', pct >= 100 ? 'bg-positive' : 'bg-accent')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
