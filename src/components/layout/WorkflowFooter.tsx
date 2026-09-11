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
    <div className="mt-12 rounded-2xl border border-border/80 bg-raised/85 backdrop-blur-md p-4 sm:p-5 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous Step */}
        <div className="flex-1">
          {prev ? (
            <Link
              to={prev.path}
              className="inline-flex items-center gap-3 px-4 py-2.5 min-h-11 rounded-xl border border-border/80 bg-raised/90 hover:bg-raised text-ink-soft hover:text-ink hover:border-border hover:shadow-xs text-xs font-semibold transition-all duration-200 group w-full sm:w-auto"
            >
              <div className="w-7 h-7 rounded-lg bg-sunken/90 border border-border/60 flex items-center justify-center group-hover:bg-sunken/70 group-hover:border-border transition-colors">
                <ArrowLeft
                  size={14}
                  className="text-muted group-hover:text-ink group-hover:-translate-x-0.5 transition-transform"
                />
              </div>
              <div className="text-left">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-faint">
                  Previous Step
                </span>
                <span className="font-bold text-xs text-ink group-hover:text-ink">
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
          <div className="hidden md:flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50/70 via-zinc-50 to-emerald-50/70 rounded-full border border-accent-soft/50 text-xs text-ink-soft max-w-md text-center shadow-2xs">
            <CheckCircle2 size={13} className="text-accent-strong shrink-0" />
            <span className="font-medium truncate">{flowHint}</span>
          </div>
        )}

        {/* Next Step */}
        <div className="flex-1 flex justify-end">
          {next ? (
            <Link
              to={next.path}
              className="inline-flex items-center justify-end gap-3 px-5 py-2.5 min-h-11 rounded-xl bg-deep text-deep hover:bg-deep hover:shadow-sm ring-1 ring-zinc-800 text-xs font-semibold transition-all duration-200 group w-full sm:w-auto"
            >
              <div className="text-right">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-faint">
                  Next Step
                </span>
                <span className="font-bold text-xs text-deep">{next.label}</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-raised/10 flex items-center justify-center group-hover:bg-raised/20 transition-colors">
                <ArrowRight
                  size={14}
                  className="text-deep group-hover:translate-x-0.5 transition-transform"
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
