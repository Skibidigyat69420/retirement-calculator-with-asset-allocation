import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Section title (20–24px scale, §109). */
  title?: React.ReactNode;
  /** One-line context under the title. */
  description?: React.ReactNode;
  /** Trailing header slot — filters, tabs, export actions. */
  action?: React.ReactNode;
  /** Removes default padding for table/chart fillings. */
  flush?: boolean;
  children: React.ReactNode;
}

/** Standard content section: header row + body, border-only chrome (§112). */
export const SectionCard = ({
  title,
  description,
  action,
  flush = false,
  children,
  className,
  ...props
}: SectionCardProps) => {
  return (
    <section
      {...props}
      className={cn(
        'bg-surface border border-border rounded-2xl shadow-card transition-colors duration-150 hover:border-border-strong',
        'print:break-inside-avoid',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 md:px-6 pt-4 md:pt-5 pb-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-ink">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-sm text-muted leading-relaxed">{description}</p>}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(flush ? 'pb-2' : 'px-5 md:px-6 pb-5 md:pb-6', !title && !action && 'pt-5 md:pt-6')}>
        {children}
      </div>
    </section>
  );
};
