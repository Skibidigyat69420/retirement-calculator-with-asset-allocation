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
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          {label}
        </label>
        <span className="text-xs font-mono font-bold text-zinc-900 bg-zinc-100 border border-zinc-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs tabular-nums">
          {formatValue ? formatValue(value) : `${value}${suffix}`}
        </span>
      </div>
      <div className="relative pt-1 pb-1">
        <div className="relative h-2 rounded-full bg-zinc-200/80 overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-zinc-950 rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          aria-label={label}
          style={{ background: 'transparent' }}
          className={cn(
            'w-full -mt-2 relative z-10 bg-transparent appearance-none cursor-pointer focus:outline-none',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4.5 [&::-webkit-slider-thumb]:h-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-950 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95',
            '[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4.5 [&::-moz-range-thumb]:h-4.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-950 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150 hover:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-95 [&::-moz-range-thumb]:border-none',
          )}
        />
      </div>
    </div>
  );
};

