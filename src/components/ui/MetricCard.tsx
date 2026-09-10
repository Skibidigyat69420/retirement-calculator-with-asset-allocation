import type React from 'react';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  /** Signed change, e.g. 4.2 or -1.8. Rendered as a colored ▲/▼ delta. */
  delta?: number;
  variant?: 'default' | 'navy' | 'gold' | 'success' | 'danger';
  className?: string;
  icon?: React.ReactNode;
}

const variants = {
  default: 'bg-raised border border-border shadow-card text-ink',
  navy: 'bg-sunken border border-border-strong text-ink',
  gold: 'bg-raised border border-brass/30 text-ink',
  success: 'bg-raised border border-positive/30 text-ink',
  danger: 'bg-raised border border-negative/30 text-ink',
};

const labelColors = {
  default: '',
  navy: '',
  gold: 'text-brass-strong',
  success: 'text-positive',
  danger: 'text-negative',
};

const valueColors = {
  default: 'text-ink',
  navy: 'text-ink',
  gold: 'text-brass-strong',
  success: 'text-positive',
  danger: 'text-negative',
};

const iconStyles = {
  default: 'text-muted border-border',
  navy: 'text-muted border-border-strong',
  gold: 'text-brass border-brass/30',
  success: 'text-positive border-positive/30',
  danger: 'text-negative border-negative/30',
};

export const MetricCard = ({
  label,
  value,
  subtext,
  delta,
  variant = 'default',
  className,
  icon,
}: MetricCardProps) => {
  return (
    <div className={cn('rounded-lg p-4 sm:p-5 print:break-inside-avoid', variants[variant], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn('eyebrow truncate', labelColors[variant])}>{label}</div>
          <div
            className={cn(
              'mt-2 font-mono text-2xl leading-tight tracking-tight tabular-nums truncate',
              valueColors[variant],
            )}
          >
            {value}
          </div>
        </div>
        {icon && (
          <div
            className={cn(
              'shrink-0 p-1.5 rounded-sm border flex items-center justify-center',
              iconStyles[variant],
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(delta !== undefined || subtext) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted min-h-4">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center font-mono tabular-nums',
                delta >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {subtext && <span className="leading-relaxed line-clamp-2">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
