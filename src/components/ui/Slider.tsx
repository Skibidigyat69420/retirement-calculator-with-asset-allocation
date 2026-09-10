import { cn } from '../../lib/utils';

export interface SliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  formatValue?: (val: number) => string;
  className?: string;
}

/**
 * Thin-track slider. The track/thumb appearance comes from the global
 * `input[type="range"]` base styles in index.css.
 */
export const Slider = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '%',
  formatValue,
  className,
}: SliderProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-baseline gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
        <span className="text-xs text-ink tabular-nums font-mono shrink-0">
          {formatValue ? formatValue(value) : `${value}${suffix}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        aria-label={label}
      />
    </div>
  );
};
