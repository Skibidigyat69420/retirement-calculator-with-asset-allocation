import type React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Render the hairline rule below the header row. */
  hairline?: boolean;
}

export const SectionHeader = ({
  title,
  description,
  action,
  className,
  hairline = false,
}: SectionHeaderProps) => {
  return (
    <div className={cn('mb-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted leading-relaxed">{description}</p>}
        </div>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>
      {hairline && <div className="mt-3 border-b border-border" />}
    </div>
  );
};
