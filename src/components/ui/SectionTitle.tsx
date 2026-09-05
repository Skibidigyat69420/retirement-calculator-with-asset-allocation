import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  badge?: string;
  className?: string;
  action?: React.ReactNode;
}

export const SectionTitle = ({
  title,
  subtitle,
  badge,
  className,
  action,
}: SectionTitleProps) => {
  return (
    <div className={cn('mb-8', className)}>
      {badge && (
        <div className="mb-3">
          <Badge variant="navy">{badge}</Badge>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl font-sans font-bold text-zinc-950 tracking-tight truncate">
            {title}
          </h2>
          <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-zinc-300/80 via-zinc-200/40 to-transparent" />
        </div>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>
      {subtitle && (
        <p className="mt-2 text-zinc-600 max-w-3xl text-sm md:text-base leading-relaxed font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
};

