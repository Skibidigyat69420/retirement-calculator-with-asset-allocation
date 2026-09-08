import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/design-tokens';

export type StatTone = 'positive' | 'negative' | 'neutral';

export interface StatSecondary {
  label: string;
  /** Pre-formatted value (use design-tokens formatters, e.g. formatCompactINR). */
  value: string;
  tone?: StatTone;
}

export interface StatCardProps {
  /** Micro-label above the metric, e.g. "Projected retirement corpus". */
  label: string;
  /** The primary number, visually dominant (§229). Pre-formatted. */
  value: string;
  /** Supporting figures, e.g. required corpus / surplus. Never equal weight. */
  secondary?: StatSecondary[];
  /** Optional trend chip: "+₹46L" with direction. */
  trend?: { value: string; direction: 'up' | 'down' | 'flat'; tone?: StatTone };
  caption?: string;
  icon?: React.ReactNode;
  /** `hero` is the dashboard/client-header treatment (§229, §231). */
  size?: 'md' | 'hero';
  className?: string;
  id?: string;
}

const toneText: Record<StatTone, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-muted',
};

/**
 * Primary metric treatment (§229): one dominant number, secondary figures
 * visually subordinated. Do not stack six of these with equal weight — use
 * MetricCard for secondary KPIs.
 */
export const StatCard = ({
  label,
  value,
  secondary,
  trend,
  caption,
  icon,
  size = 'md',
  className,
  id,
}: StatCardProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div
      id={id}
      className={cn(
        'bg-surface border border-border rounded-2xl shadow-card transition-all duration-150 hover:border-border-strong hover:shadow-card-hover',
        'flex flex-col justify-between print:break-inside-avoid',
        size === 'hero' ? 'p-6 md:p-8' : 'p-5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        {icon && <span className="text-muted shrink-0">{icon}</span>}
      </div>

      <div className="mt-2 flex items-end gap-3 flex-wrap">
        {/* Number transition micro-interaction (§113) */}
        <motion.span
          key={value}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: tokens.motion.durationEnter / 1000, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'tabular-nums font-semibold tracking-tight text-ink leading-none',
            size === 'hero' ? 'text-4xl md:text-5xl' : 'text-3xl',
          )}
        >
          {value}
        </motion.span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold tabular-nums pb-1',
              toneText[trend.tone ?? 'neutral'],
            )}
          >
            {trend.direction === 'up' && <TrendingUp size={13} aria-hidden="true" />}
            {trend.direction === 'down' && <TrendingDown size={13} aria-hidden="true" />}
            {trend.direction === 'flat' && <Minus size={13} aria-hidden="true" />}
            {trend.value}
          </span>
        )}
      </div>

      {secondary && secondary.length > 0 && (
        <dl className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-6 gap-y-1.5">
          {secondary.map((item) => (
            <div key={item.label} className="flex items-baseline gap-1.5 min-w-0">
              <dt className="text-xs text-muted">{item.label}</dt>
              <dd className={cn('text-sm font-semibold tabular-nums', toneText[item.tone ?? 'neutral'])}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {caption && <p className="mt-3 text-xs text-muted leading-relaxed">{caption}</p>}
    </div>
  );
};
