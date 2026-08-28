import { Input } from './Input';

interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  helper?: string;
  min?: number;
  max?: number;
  step?: number;
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
  step,
  className,
}: NumberInputProps) => {
  return (
    <Input
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
      suffix={suffix}
      helper={helper}
      min={min}
      max={max}
      step={step}
      className={className}
    />
  );
};
