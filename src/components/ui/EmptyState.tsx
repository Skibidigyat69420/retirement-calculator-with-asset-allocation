import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  /** Serif display title, for hero moments. */
  display?: boolean;
  className?: string;
}

export const EmptyState = ({
  eyebrow,
  title,
  description,
  action,
  icon: Icon,
  display = false,
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-surface', className)}>
      {/* Faint contained grid motif accent */}
      <div className="absolute inset-x-0 top-0 h-28 grid-motif opacity-60 pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent to-surface pointer-events-none" aria-hidden="true" />

      <div className="relative py-16 sm:py-24 px-6 flex flex-col items-center text-center">
        {Icon && (
          <div className="mb-5 p-3 rounded-md border border-border bg-raised text-muted">
            <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
        )}
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h2
          className={cn(
            'text-ink',
            display ? 'font-display text-3xl' : 'text-xl font-semibold tracking-tight',
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-muted leading-relaxed max-w-md mx-auto">{description}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
};
