import { EnhancedNumberInput } from './EnhancedNumberInput';

export interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  prefix?: string;
  helper?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  presets?: { label: string; value: number }[];
  slider?: boolean | 'focus';
  disabled?: boolean;
  className?: string;
  id?: string;
  layout?: 'stack' | 'inline';
}

export const NumberInput = ({
  label,
  value,
  onChange,
  suffix,
  prefix,
  helper,
  error,
  min,
  max,
  step = 1,
  presets,
  slider,
  disabled,
  className,
  id,
  layout,
}: NumberInputProps) => {
  return (
    <EnhancedNumberInput
      label={label}
      value={value}
      onChange={onChange}
      suffix={suffix}
      prefix={prefix}
      helper={helper}
      error={error}
      min={min}
      max={max}
      step={step}
      presets={presets}
      slider={slider}
      disabled={disabled}
      className={className}
      id={id}
      layout={layout}
    />
  );
};

