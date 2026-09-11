import { Calculator, ArrowLeftRight } from 'lucide-react';

interface CalculatorShellProps {
  title: string;
  description?: string;
  inputs: React.ReactNode;
  results: React.ReactNode;
  children?: React.ReactNode;
  /** False when every input is 0/blank — the result panel shows a zero-state instead of a misleading ₹0 projection. */
  hasInput?: boolean;
}

export const CalculatorShell = ({
  title,
  description,
  inputs,
  results,
  children,
  hasInput = true,
}: CalculatorShellProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
      {/* Inputs — editorial left rail */}
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-6">
          <div className="pb-4 border-b border-border">
            <div className="eyebrow mb-1.5">Calculator</div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
            {description && (
              <p className="mt-1.5 text-[13px] text-muted leading-relaxed">{description}</p>
            )}
          </div>
          <div className="pt-5 space-y-5">{inputs}</div>
        </div>
      </div>

      {/* Results — hairline-bordered result panel */}
      <div className="lg:col-span-8 min-w-0">
        {hasInput ? (
          <>
            <div className="rounded-lg border border-border bg-surface">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
                <span className="eyebrow">Projection</span>
                <ArrowLeftRight size={14} strokeWidth={1.6} className="text-faint" aria-hidden="true" />
              </div>
              <div className="p-5">{results}</div>
            </div>
            {children}
          </>
        ) : (
          <div className="rounded-lg border border-border bg-surface">
            <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
              <span className="eyebrow">Projection</span>
            </div>
            <div className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-24 grid-motif opacity-60 pointer-events-none" aria-hidden="true" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-surface pointer-events-none" aria-hidden="true" />
              <div className="relative py-16 px-6 flex flex-col items-center text-center">
                <div className="mb-4 p-3 rounded-md border border-border bg-raised text-muted">
                  <Calculator size={22} strokeWidth={1.6} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-ink">
                  Enter the numbers to see the result.
                </h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed max-w-sm">
                  Adjust the inputs and the projection will appear here — never a placeholder zero.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
