import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkflowStep {
  path: string;
  label: string;
  description?: string;
}

interface WorkflowFooterProps {
  prev?: WorkflowStep;
  next?: WorkflowStep;
  /** @deprecated No longer rendered — kept for call-site compatibility. */
  flowHint?: string;
  /** Center indicator, e.g. "Step 3 / 7 — Cashflows". Hidden below sm. */
  stepIndicator?: string;
}

/**
 * Slim sticky bottom action bar — the single nav system for the wizard.
 * Replaces the old link-card footer.
 */
export const WorkflowFooter = ({ prev, next, stepIndicator }: WorkflowFooterProps) => {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 mt-10 h-14 flex items-center gap-3 border-t border-border bg-surface/90 backdrop-blur">
      <div className="max-w-[1440px] mx-auto w-full flex items-center gap-3">
        <div className="flex-1 flex items-center">
          {prev && (
            <Link
              to={prev.path}
              className="inline-flex items-center gap-1 px-3 min-h-8 py-1.5 text-xs font-medium rounded-md text-ink-soft hover:text-ink hover:bg-sunken transition-colors"
            >
              <ChevronLeft size={14} aria-hidden="true" />
              <span>Back{prev.label ? ` · ${prev.label}` : ''}</span>
            </Link>
          )}
        </div>

        {stepIndicator && (
          <span className="hidden sm:block font-mono text-[11px] tabular-nums text-muted whitespace-nowrap">
            {stepIndicator}
          </span>
        )}

        <div className="flex-1 flex items-center justify-end">
          {next && (
            <Link
              to={next.path}
              className="inline-flex items-center gap-1 px-4 min-h-8 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill border border-accent hover:bg-accent-strong hover:border-accent-strong transition-colors"
            >
              <span>{next.label}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
