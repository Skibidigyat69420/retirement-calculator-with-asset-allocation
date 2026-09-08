import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  /** What is empty? One short sentence, human voice (§117). */
  title: string;
  /** Why does it matter / what should the user do? */
  description?: string;
  /** What should I do? — primary action slot (e.g. an <Button/>). */
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Empty state (§117): answers what is empty, why it matters, and what to do
 * next. Never a bare "No clients."
 */
export const EmptyState = ({
  title,
  description,
  action,
  secondaryAction,
  icon,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12 md:py-16',
        'rounded-2xl border border-dashed border-border-strong/70 bg-surface',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="size-12 rounded-2xl bg-sunken border border-border flex items-center justify-center text-muted mb-4"
      >
        {icon ?? <Inbox size={22} />}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted max-w-sm leading-relaxed">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
