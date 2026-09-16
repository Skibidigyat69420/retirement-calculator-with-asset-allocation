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
  /**
   * 'md' (default): labelled block with the value above the track.
   * 'sm': compact track with a live value readout beside it — for inline
   * field sliders where the label is owned by the surrounding field.
   */
  size?: 'sm' | 'md';
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
  size = 'md',
  className,
}: SliderProps) => {
  const formatted = formatValue ? formatValue(value) : `${value}${suffix}`;

  if (size === 'sm') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <input
          type="range"
          className="flex-1 min-w-0"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          aria-label={label}
        />
        <span className="text-xs font-mono tabular-nums text-muted shrink-0">{formatted}</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-baseline gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
        <span className="text-xs text-ink tabular-nums font-mono shrink-0">
          {formatted}
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
