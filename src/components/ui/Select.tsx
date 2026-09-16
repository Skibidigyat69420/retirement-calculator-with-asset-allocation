import { useId } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import { Field } from './Field';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
  id?: string;
  'aria-label'?: string;
  helper?: string;
  disabled?: boolean;
  /** 'stack' (default) label above; 'inline' small mono label left of the control. */
  layout?: 'stack' | 'inline';
}

export const Select = ({
  label,
  value,
  onChange,
  options,
  className,
  id,
  'aria-label': ariaLabel,
  helper,
  disabled,
  layout = 'stack',
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const inline = layout === 'inline';

  return (
    <Field
      label={label}
      htmlFor={selectId}
      layout={layout}
      helper={helper}
      labelClassName="block text-[11px] font-semibold uppercase tracking-wider text-muted"
      className={className}
    >
      <div className={cn('relative', inline && 'flex-1 min-w-[8rem] basis-36')}>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          aria-label={ariaLabel || label}
          disabled={disabled}
          className={cn('input appearance-none cursor-pointer', inline && 'py-2', 'pr-9')}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-ink py-1">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    </Field>
  );
};
