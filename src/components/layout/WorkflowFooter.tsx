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
    <div className="mt-12 pt-6 border-t border-slate-200/80 bg-white/60 backdrop-blur-xs -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 rounded-b-2xl shadow-2xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous Step */}
        <div className="flex-1">
          {prev ? (
            <Link
              to={prev.path}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white/90 text-slate-700 hover:text-navy hover:border-navy/40 hover:shadow-xs text-sm font-medium transition-all group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                <ArrowLeft size={14} className="text-slate-500 group-hover:text-navy group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Previous Step</span>
                <span className="font-semibold text-slate-800 group-hover:text-navy">{prev.label}</span>
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Middle Data Flow Hint */}
        {flowHint && (
          <div className="hidden lg:flex items-center justify-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-xs rounded-full border border-slate-200/80 text-xs text-slate-600 max-w-md text-center shadow-2xs">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span className="truncate font-medium">{flowHint}</span>
          </div>
        )}

        {/* Next Step */}
        <div className="flex-1 flex justify-end">
          {next ? (
            <Link
              to={next.path}
              className="inline-flex items-center justify-end gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-navy via-navy to-navy-dark text-white hover:shadow-md hover:-translate-y-0.5 text-sm font-medium transition-all group w-full sm:w-auto"
            >
              <div className="text-right">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-indigo-200">Next Step</span>
                <span className="font-semibold text-white">{next.label}</span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
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
