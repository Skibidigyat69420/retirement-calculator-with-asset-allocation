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
      'bg-white/90 backdrop-blur-sm border border-zinc-200/80 shadow-2xs hover:shadow-card hover:border-zinc-300 text-zinc-900',
    navy:
      'bg-zinc-950 border border-zinc-900 text-white shadow-xs hover:border-zinc-800 hover:shadow-sm',
    gold:
      'bg-white/90 backdrop-blur-sm border border-amber-200/70 shadow-2xs hover:shadow-card hover:border-amber-300/80 text-zinc-900',
    success:
      'bg-white/90 backdrop-blur-sm border border-emerald-200/80 shadow-2xs hover:shadow-card hover:border-emerald-300/90 text-zinc-900',
    danger:
      'bg-white/90 backdrop-blur-sm border border-rose-200/80 shadow-2xs hover:shadow-card hover:border-rose-300/90 text-zinc-900',
  };

  const glowColors = {
    default: 'bg-zinc-400/[0.04]',
    navy: 'bg-white/[0.04]',
    gold: 'bg-amber-500/[0.08]',
    success: 'bg-emerald-500/[0.08]',
    danger: 'bg-rose-500/[0.08]',
  };

  const mutedColors = {
    default: 'text-zinc-500',
    navy: 'text-zinc-400',
    gold: 'text-amber-800/80',
    success: 'text-emerald-800/80',
    danger: 'text-rose-800/80',
  };

  const valueColors = {
    default: 'text-zinc-950',
    navy: 'text-white',
    gold: 'text-zinc-950',
    success: 'text-emerald-700',
    danger: 'text-rose-700',
  };

  const iconColors = {
    default: 'text-zinc-700 bg-zinc-100/90 border border-zinc-200/60 shadow-2xs',
    navy: 'text-zinc-200 bg-zinc-900/90 border border-zinc-800 shadow-2xs',
    gold: 'text-amber-800 bg-amber-50 border border-amber-200/60 shadow-2xs',
    success: 'text-emerald-800 bg-emerald-50 border border-emerald-200/60 shadow-2xs',
    danger: 'text-rose-800 bg-rose-50 border border-rose-200/60 shadow-2xs',
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

