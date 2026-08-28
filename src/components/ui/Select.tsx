import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
}

export const Select = ({ label, value, onChange, options, className }: SelectProps) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="w-full bg-transparent border-b border-stone-300 py-2 text-sm font-medium text-navy focus:border-gold focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
