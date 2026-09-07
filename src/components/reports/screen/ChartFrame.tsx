import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '../../ui/Card';

interface ChartFrameProps {
  title: string;
  icon?: ReactNode;
  caption: string;
  /** Screen-reader-only textual summary of the underlying data. */
  summary: string;
  table: ReactNode;
  detailsLabel?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Standard container for a report visual: Card + heading + written insight
 * caption + chart + screen-reader data summary + collapsible detail table.
 */
export const ChartFrame = ({
  title,
  icon,
  caption,
  summary,
  table,
  detailsLabel = 'View underlying data',
  className,
  children,
}: ChartFrameProps) => {
  const id = useId().replace(/:/g, '');
  const titleId = `chart-title-${id}`;
  const summaryId = `chart-summary-${id}`;

  return (
    <Card className={`border border-border shadow-card ${className ?? ''}`}>
      <section aria-labelledby={titleId} aria-describedby={summaryId}>
        <h3 id={titleId} className="text-lg font-sans text-ink font-bold mb-1 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <p className="text-xs text-muted leading-relaxed mb-4">{caption}</p>
        <p id={summaryId} className="sr-only">
          {summary}
        </p>
        {children}
        <details className="mt-4 group">
          <summary className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink cursor-pointer select-none rounded px-1.5 py-1 -ml-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden">
            <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" />
            {detailsLabel}
          </summary>
          <div className="mt-3 overflow-x-auto">{table}</div>
        </details>
      </section>
    </Card>
  );
};

/** Compact styled table used inside ChartFrame detail drawers. */
export const DetailTable = ({ head, children }: { head: ReactNode; children: ReactNode }) => (
  <table className="w-full text-sm min-w-[480px]">
    <thead>
      <tr className="border-b-2 border-ink text-left text-[11px] uppercase tracking-wider text-ink font-bold">
        {head}
      </tr>
    </thead>
    <tbody className="divide-y divide-border">{children}</tbody>
  </table>
);
