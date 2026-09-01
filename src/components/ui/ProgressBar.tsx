import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

export const ProgressBar = ({ value, max = 100, variant = 'default', size = 'md', className, label }: ProgressBarProps) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const variants = {
    default: 'bg-navy',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-600',
  };
  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
  };

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-xs text-stone-500 mb-1">
          <span>{label}</span>
          <span>{pct.toFixed(1)}%</span>
        </div>
      )}
      <div
        className={cn('w-full bg-stone-200 rounded-full overflow-hidden', heights[size])}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full transition-all duration-500 rounded-full', variants[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
