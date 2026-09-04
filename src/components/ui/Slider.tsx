interface SliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  formatValue?: (val: number) => string;
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
}: SliderProps) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          {label}
        </label>
        <span className="text-sm font-semibold text-navy bg-indigo-50 px-2 py-0.5 rounded-md">
          {formatValue ? formatValue(value) : `${value}${suffix}`}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-navy to-navy-dark rounded-full"
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
        className="w-full -mt-2.5 relative z-10 bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-navy [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-navy [&::-moz-range-thumb]:cursor-pointer focus:outline-none"
      />
    </div>
  );
};
