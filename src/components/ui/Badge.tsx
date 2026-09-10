import type React from 'react';
import { cn } from '../../lib/utils';

export type BadgeTone =
  | 'positive'
  | 'warning'
  | 'negative'
  | 'info'
  | 'neutral'
  | 'accent'
  | 'brass';

export interface BadgeProps {
  children: React.ReactNode;
  /** Editorial tone. Preferred over the legacy `variant` names. */
  tone?: BadgeTone;
  /** Legacy variant names — mapped onto tones for backwards compatibility. */
  variant?: 'default' | 'gold' | 'navy' | 'outline' | 'success' | 'danger' | 'warning';
  className?: string;
  dot?: boolean;
}

const toneStyles: Record<BadgeTone, string> = {
  positive: 'bg-positive-soft text-positive border-positive/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  negative: 'bg-negative-soft text-negative border-negative/25',
  info: 'bg-info-soft text-info border-info/25',
  neutral: 'bg-sunken text-ink-soft border-border',
  accent: 'bg-accent-soft text-accent-strong border-accent/25',
  brass: 'bg-brass-soft text-brass-strong border-brass/25',
};

const toneDot: Record<BadgeTone, string> = {
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
  info: 'bg-info',
  neutral: 'bg-faint',
  accent: 'bg-accent',
  brass: 'bg-brass',
};

const legacyVariantToTone: Record<NonNullable<BadgeProps['variant']>, BadgeTone> = {
  default: 'neutral',
  gold: 'brass',
  navy: 'accent',
  outline: 'neutral',
  success: 'positive',
  danger: 'negative',
  warning: 'warning',
};

export const Badge = ({
  children,
  tone,
  variant = 'default',
  className,
  dot = true,
}: BadgeProps) => {
  const resolvedTone = tone ?? legacyVariantToTone[variant];
  const isOutline = variant === 'outline' && !tone;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-[3px] rounded-sm border font-mono text-[10px] font-medium uppercase tracking-[0.08em] leading-none transition-colors',
        toneStyles[resolvedTone],
        isOutline && 'bg-transparent',
        className,
      )}
    >
      {dot && (
        <span
          className={cn('w-1 h-1 rounded-full shrink-0', toneDot[resolvedTone])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
