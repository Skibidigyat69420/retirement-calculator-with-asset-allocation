import type React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  variant?: 'standard' | 'hero' | 'compact';
}

const titleStyles = {
  standard: 'text-2xl sm:text-3xl font-semibold tracking-tight text-ink',
  hero: 'font-display text-4xl sm:text-5xl text-ink',
  compact: 'text-lg font-semibold tracking-tight text-ink',
};

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  variant = 'standard',
}: PageHeaderProps) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        variant === 'compact' ? 'pb-4 mb-4' : 'pb-6 mb-6',
        variant === 'standard' && 'border-b border-border',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
          <h1 className={titleStyles[variant]}>{title}</h1>
          {description && (
            <p className="mt-2 text-sm sm:text-[15px] text-muted max-w-prose leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="shrink-0 flex items-center gap-2 sm:pb-0.5">{actions}</div>
        )}
      </div>
    </div>
  );
};
