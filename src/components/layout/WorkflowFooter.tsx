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
    <div className="mt-12 pt-6 border-t border-zinc-200/80 bg-white/70 backdrop-blur-xs -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5 rounded-b-2xl shadow-2xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous Step */}
        <div className="flex-1">
          {prev ? (
            <Link
              to={prev.path}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-950 hover:border-zinc-400 hover:shadow-xs text-sm font-medium transition-all group"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                <ArrowLeft size={14} className="text-zinc-500 group-hover:text-zinc-950 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400">Previous</span>
                <span className="font-semibold text-zinc-900 group-hover:text-zinc-950">{prev.label}</span>
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Middle Data Flow Hint */}
        {flowHint && (
          <div className="hidden lg:flex items-center justify-center gap-2 px-4 py-2 bg-zinc-50 rounded-full border border-zinc-200 text-xs text-zinc-600 max-w-md text-center">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate font-medium">{flowHint}</span>
          </div>
        )}

        {/* Next Step */}
        <div className="flex-1 flex justify-end">
          {next ? (
            <Link
              to={next.path}
              className="inline-flex items-center justify-end gap-3 px-5 py-2.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 hover:shadow-xs text-sm font-medium transition-all group w-full sm:w-auto"
            >
              <div className="text-right">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400">Next</span>
                <span className="font-semibold text-white">{next.label}</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <ArrowRight size={14} className="text-white group-hover:translate-x-0.5 transition-transform" />
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
