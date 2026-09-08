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
      'bg-surface border border-border text-ink shadow-2xs hover:border-border-strong hover:shadow-card',
    navy:
      'bg-[#0d1420] border border-[#1c2940] text-[#e8ecf2] shadow-2xs hover:border-[#2a3d5f] hover:shadow-card print:bg-white print:border-zinc-300 print:text-zinc-900',
    gold:
      'bg-[#1a1404] border border-[#40330f] text-[#fef3c7] shadow-2xs hover:border-[#5a471a] hover:shadow-card print:bg-white print:border-zinc-300 print:text-zinc-900',
    success:
      'bg-surface border border-positive/30 text-ink shadow-2xs hover:border-positive/50 hover:shadow-card',
    danger:
      'bg-surface border border-negative/30 text-ink shadow-2xs hover:border-negative/50 hover:shadow-card',
  };

  const glowColors = {
    default: 'bg-ink/[0.05]',
    navy: 'bg-info/[0.08]',
    gold: 'bg-warning/10',
    success: 'bg-positive/10',
    danger: 'bg-negative/10',
  };

  const mutedColors = {
    default: 'text-muted',
    navy: 'text-[#8b95a5]',
    gold: 'text-warning/90',
    success: 'text-positive',
    danger: 'text-negative',
  };

  const valueColors = {
    default: 'text-ink',
    navy: 'text-[#e8ecf2]',
    gold: 'text-[#fde68a]',
    success: 'text-positive',
    danger: 'text-negative',
  };

  const iconColors = {
    default: 'text-ink bg-raised border border-border shadow-2xs',
    navy: 'text-[#e8ecf2] bg-[#16233a] border border-[#1c2940] shadow-2xs',
    gold: 'text-[#fde68a] bg-warning/10 border border-warning/25 shadow-2xs',
    success: 'text-positive bg-positive/10 border border-positive/25 shadow-2xs',
    danger: 'text-negative bg-negative/10 border border-negative/25 shadow-2xs',
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

