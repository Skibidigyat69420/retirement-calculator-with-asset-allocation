import type React from 'react';
import { cn } from '../../lib/utils';

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** @deprecated Use `eyebrow`. Kept for compatibility. */
  badge?: string;
  className?: string;
  action?: React.ReactNode;
}

/** Eyebrow + title (+ optional description) with a right-side action and hairline rule. */
export const SectionTitle = ({
  title,
  subtitle,
  eyebrow,
  badge,
  className,
  action,
}: SectionTitleProps) => {
  const eyebrowText = eyebrow ?? badge;

  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-4 border-b border-border">
        <div className="min-w-0">
          {eyebrowText && <div className="eyebrow mb-2">{eyebrowText}</div>}
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-ink">{title}</h2>
          {subtitle && (
            <p className="mt-1.5 text-sm text-muted max-w-prose leading-relaxed">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
};
