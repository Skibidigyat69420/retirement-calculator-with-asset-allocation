import { EnhancedNumberInput } from './EnhancedNumberInput';

interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  helper?: string;
  min?: number;
  max?: number;
  step?: number;
  presets?: { label: string; value: number }[];
  disabled?: boolean;
  className?: string;
}

export const NumberInput = ({
  label,
  value,
  onChange,
  suffix,
  helper,
  min,
  max,
  step = 1,
  presets,
  disabled,
  className,
}: NumberInputProps) => {
  return (
    <EnhancedNumberInput
      label={label}
      value={value}
      onChange={onChange}
      suffix={suffix}
      helper={helper}
      min={min}
      max={max}
      step={step}
      presets={presets}
      disabled={disabled}
      className={className}
    />
  );
};
