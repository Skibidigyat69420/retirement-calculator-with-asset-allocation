import React from 'react';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'default' | 'navy' | 'gold' | 'success' | 'danger';
  className?: string;
  icon?: React.ReactNode;
}

export const MetricCard = ({
  label,
  value,
  subtext,
  variant = 'default',
  className,
  icon,
}: MetricCardProps) => {
  const variants = {
    default:
      'bg-surface border border-border shadow-2xs hover:shadow-card hover:border-border-strong text-ink',
    navy:
      'bg-sunken border border-border-strong text-ink shadow-xs hover:border-accent/50',
    gold:
      'bg-surface border border-warning/40 shadow-2xs hover:shadow-card hover:border-warning/70 text-ink',
    success:
      'bg-surface border border-positive/40 shadow-2xs hover:shadow-card hover:border-positive/70 text-ink',
    danger:
      'bg-surface border border-negative/40 shadow-2xs hover:shadow-card hover:border-negative/70 text-ink',
  };

  const glowColors = {
    default: 'bg-accent/5',
    navy: 'bg-ink/5',
    gold: 'bg-warning/10',
    success: 'bg-positive/10',
    danger: 'bg-negative/10',
  };

  const mutedColors = {
    default: 'text-muted',
    navy: 'text-muted',
    gold: 'text-warning/80',
    success: 'text-positive/80',
    danger: 'text-negative/80',
  };

  const valueColors = {
    default: 'text-ink',
    navy: 'text-ink',
    gold: 'text-warning',
    success: 'text-positive',
    danger: 'text-negative',
  };

  const iconColors = {
    default: 'text-ink bg-sunken border border-border shadow-2xs',
    navy: 'text-ink bg-surface border border-border-strong shadow-2xs',
    gold: 'text-warning bg-warning-soft border border-warning/40 shadow-2xs',
    success: 'text-positive bg-positive-soft border border-positive/40 shadow-2xs',
    danger: 'text-negative bg-negative-soft border border-negative/40 shadow-2xs',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 print:break-inside-avoid',
        variants[variant],
        className,
      )}
    >
      {/* Subtle indicator glow */}
      <div
        className={cn(
          'pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl transition-opacity duration-300',
          glowColors[variant],
        )}
        aria-hidden="true"
      />

      {/* Top row: uppercase label and sleek pill icon container */}
      <div className="flex items-center justify-between gap-2.5 mb-2.5 relative z-10">
        <div
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wider leading-tight truncate',
            mutedColors[variant],
          )}
        >
          {label}
        </div>
        {icon && (
          <div
            className={cn(
              'shrink-0 p-1.5 rounded-xl transition-all duration-150 flex items-center justify-center',
              iconColors[variant],
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Numerical value: large bold monospace tabular numeral */}
      <div
        className={cn(
          'font-mono text-2xl font-bold tracking-tight tabular-nums truncate leading-tight relative z-10',
          valueColors[variant],
        )}
      >
        {value}
      </div>

      {/* Formatted subtext */}
      {subtext && (
        <div
          className={cn(
            'text-xs mt-2 leading-relaxed line-clamp-2 font-medium relative z-10',
            mutedColors[variant],
          )}
        >
          {subtext}
        </div>
      )}
    </div>
  );
};

