import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. */
  value: number;
  tone?: 'neutral' | 'positive' | 'warning' | 'negative' | 'accent';
  size?: 'sm' | 'md';
  /** Visible percentage text at the trailing edge. */
  showValue?: boolean;
  label: string;
}

const fillTones = {
  neutral: 'bg-muted',
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
  accent: 'bg-accent',
};

/** Accessible progress bar (§116: role + aria). Never the only status cue. */
export const ProgressBar = ({
  value,
  tone = 'accent',
  size = 'md',
  showValue = false,
  label,
  className,
  ...props
}: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('flex items-center gap-2.5', className)} {...props}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'flex-1 overflow-hidden rounded-full bg-sunken border border-border',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-150 ease-out', fillTones[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-semibold tabular-nums text-muted w-10 text-right shrink-0">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
};
