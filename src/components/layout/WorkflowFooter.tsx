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
    <div className="mt-12 pt-6 border-t border-stone-200/80 bg-white/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 rounded-b-2xl">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Previous Step */}
        <div className="flex-1">
          {prev ? (
            <Link
              to={prev.path}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 hover:text-navy hover:border-navy/40 hover:shadow-sm text-sm font-medium transition-all group"
            >
              <ArrowLeft size={16} className="text-stone-400 group-hover:text-navy group-hover:-translate-x-0.5 transition-transform" />
              <div className="text-left">
                <span className="block text-[10px] uppercase font-semibold text-stone-400">Previous Step</span>
                <span>{prev.label}</span>
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Middle Data Flow Hint */}
        {flowHint && (
          <div className="hidden lg:flex items-center justify-center gap-2 px-4 py-1.5 bg-paper rounded-full border border-stone-200/70 text-xs text-stone-500 max-w-md text-center">
            <CheckCircle2 size={13} className="text-gold shrink-0" />
            <span className="truncate">{flowHint}</span>
          </div>
        )}

        {/* Next Step */}
        <div className="flex-1 flex justify-end">
          {next ? (
            <Link
              to={next.path}
              className="inline-flex items-center justify-end gap-2 px-5 py-2.5 rounded-xl bg-navy text-white hover:bg-navy/90 hover:shadow-md text-sm font-medium transition-all group w-full sm:w-auto"
            >
              <div className="text-right">
                <span className="block text-[10px] uppercase font-semibold text-gold/90">Next Step</span>
                <span>{next.label}</span>
              </div>
              <ArrowRight size={16} className="text-gold group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};
