import type React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  variant?: 'standard' | 'hero' | 'compact';
}

const titleStyles = {
  standard: 'text-[clamp(1.5rem,2vw,2rem)] leading-[1.15] font-semibold tracking-tight text-ink',
  hero: 'font-display text-[clamp(2rem,3.4vw,3.5rem)] leading-[1.04] text-ink',
  compact: 'text-lg font-semibold tracking-tight text-ink',
};

export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
  variant = 'standard',
}: PageHeaderProps) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        variant === 'compact' ? 'pb-4 mb-4' : 'pb-7 mb-8',
        variant === 'standard' && 'border-b border-border',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
          <h1 className={titleStyles[variant]}>{title}</h1>
          {description && (
          <p className="mt-2 max-w-[68ch] text-sm sm:text-[15px] text-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 sm:pb-0.5">{actions}</div>
        )}
      </div>
    </div>
  );
};
