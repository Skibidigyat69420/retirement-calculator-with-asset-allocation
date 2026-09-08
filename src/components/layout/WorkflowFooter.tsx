import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

interface WorkflowStep {
  path: string;
  label: string;
  description?: string;
}

interface WorkflowFooterProps {
  prev?: WorkflowStep;
  next?: WorkflowStep;
  flowHint?: string;
}

export const WorkflowFooter = ({ prev, next, flowHint }: WorkflowFooterProps) => {
  return (
    <div className="mt-12 rounded-2xl border border-border bg-surface p-4 sm:p-5 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-accent/25" />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous Step */}
        <div className="flex-1">
          {prev ? (
            <Link
              to={prev.path}
              className="inline-flex items-center gap-3 px-4 py-2.5 min-h-11 rounded-xl border border-border bg-raised hover:border-border-strong text-ink-soft hover:text-ink text-xs font-semibold transition-all duration-200 group w-full sm:w-auto"
            >
              <div className="w-7 h-7 rounded-lg bg-sunken border border-border flex items-center justify-center group-hover:border-border-strong transition-colors">
                <ArrowLeft
                  size={14}
                  className="text-muted group-hover:text-ink group-hover:-translate-x-0.5 transition-transform"
                />
              </div>
              <div className="text-left">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-faint">
                  Previous Step
                </span>
                <span className="font-bold text-xs text-ink">
                  {prev.label}
                </span>
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Middle Data Flow Hint */}
        {flowHint && (
          <div className="hidden md:flex items-center justify-center gap-2 px-4 py-2 bg-sunken rounded-full border border-border text-xs text-muted max-w-md text-center">
            <CheckCircle2 size={13} className="text-positive shrink-0" />
            <span className="font-medium truncate">{flowHint}</span>
          </div>
        )}

        {/* Next Step */}
        <div className="flex-1 flex justify-end">
          {next ? (
            <Link
              to={next.path}
              className="inline-flex items-center justify-end gap-3 px-5 py-2.5 min-h-11 rounded-xl bg-ink text-background hover:bg-ink-soft text-xs font-semibold transition-all duration-200 group w-full sm:w-auto"
            >
              <div className="text-right">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-background/50">
                  Next Step
                </span>
                <span className="font-bold text-xs text-background">{next.label}</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-background/10 flex items-center justify-center group-hover:bg-background/20 transition-colors">
                <ArrowRight
                  size={14}
                  className="text-background group-hover:translate-x-0.5 transition-transform"
                />
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};
