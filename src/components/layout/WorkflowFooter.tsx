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
    <div className="mt-12 rounded-2xl border border-zinc-200/80 bg-white/85 backdrop-blur-md p-4 sm:p-5 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous Step */}
        <div className="flex-1">
          {prev ? (
            <Link
              to={prev.path}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-200/80 bg-white/90 hover:bg-white text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 hover:shadow-xs text-xs font-semibold transition-all duration-200 group w-full sm:w-auto"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-100/90 border border-zinc-200/60 flex items-center justify-center group-hover:bg-zinc-200/70 group-hover:border-zinc-300 transition-colors">
                <ArrowLeft
                  size={14}
                  className="text-zinc-500 group-hover:text-zinc-950 group-hover:-translate-x-0.5 transition-transform"
                />
              </div>
              <div className="text-left">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                  Previous Step
                </span>
                <span className="font-bold text-xs text-zinc-900 group-hover:text-zinc-950">
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
          <div className="hidden md:flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50/70 via-zinc-50 to-emerald-50/70 rounded-full border border-emerald-200/50 text-xs text-zinc-700 max-w-md text-center shadow-2xs">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="font-medium truncate">{flowHint}</span>
          </div>
        )}

        {/* Next Step */}
        <div className="flex-1 flex justify-end">
          {next ? (
            <Link
              to={next.path}
              className="inline-flex items-center justify-end gap-3 px-5 py-2.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-900 hover:shadow-sm ring-1 ring-zinc-800 text-xs font-semibold transition-all duration-200 group w-full sm:w-auto"
            >
              <div className="text-right">
                <span className="block text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                  Next Step
                </span>
                <span className="font-bold text-xs text-white">{next.label}</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <ArrowRight
                  size={14}
                  className="text-white group-hover:translate-x-0.5 transition-transform"
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
