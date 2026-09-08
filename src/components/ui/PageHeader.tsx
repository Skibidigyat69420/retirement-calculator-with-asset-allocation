import React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  /** §230 hierarchy: primary decision first. Page title (32–36px, §109). */
  title: React.ReactNode;
  /** One-line supporting context, e.g. the dashboard hero sentence (§231). */
  subtitle?: React.ReactNode;
  /** Supporting actions — keep to 1–2. */
  actions?: React.ReactNode;
  /** Breadcrumb slot above the title. */
  breadcrumb?: React.ReactNode;
  /** Status/metas slot beside the title (e.g. AutosaveIndicator, StatusPill). */
  meta?: React.ReactNode;
  className?: string;
}

/** Page header — enforces the information hierarchy (§229–231). */
export const PageHeader = ({
  title,
  subtitle,
  actions,
  breadcrumb,
  meta,
  className,
}: PageHeaderProps) => {
  return (
    <header className={cn('mb-6 md:mb-8', className)}>
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight text-ink leading-tight">
              {title}
            </h1>
            {meta}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-sm md:text-[15px] text-muted max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
      </div>
    </header>
  );
};
