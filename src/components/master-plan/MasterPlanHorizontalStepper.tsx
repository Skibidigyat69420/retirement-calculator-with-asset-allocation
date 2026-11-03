import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MasterPlanInputs } from '../../types';
import { PLAN_STEPS } from './MasterPlanSidebar';

interface MasterPlanHorizontalStepperProps {
  activeStep: string;
  onSelectStep: (stepId: string) => void;
  inputs: MasterPlanInputs;
}

export function MasterPlanHorizontalStepper({
  activeStep,
  onSelectStep,
  inputs,
}: MasterPlanHorizontalStepperProps) {
  const isStepComplete = (stepId: string): boolean => {
    switch (stepId) {
      case 'profile':
        return Boolean(inputs.client?.name && inputs.currentAge && inputs.retirementAge);
      case 'financials':
        return inputs.assets.length > 0;
      case 'cashflows':
        return inputs.annualIncome > 0 && inputs.monthlyExpenditure > 0;
      case 'goals':
        return inputs.goals.length > 0;
      case 'risk':
        return true;
      case 'assumptions':
        return inputs.inflation > 0;
      case 'results':
        return true;
      default:
        return false;
    }
  };

  const completedCount = PLAN_STEPS.filter((s) => isStepComplete(s.id)).length;
  const progressPercent = Math.round((completedCount / PLAN_STEPS.length) * 100);
  const activeIndex = PLAN_STEPS.findIndex((s) => s.id === activeStep);

  return (
    <div className="w-full mb-8">
      {/* Top progress indicator bar */}
      <div className="flex items-center justify-between text-xs text-muted mb-2 px-1">
        <span className="font-medium">
          Step {activeIndex + 1} of {PLAN_STEPS.length}:{' '}
          <strong className="text-ink">{PLAN_STEPS[activeIndex]?.label}</strong>
        </span>
        <span className="font-mono text-xs font-medium text-muted">
          {completedCount}/{PLAN_STEPS.length} Completed ({progressPercent}%)
        </span>
      </div>

      {/* Thin continuous horizontal progress bar */}
      <div className="w-full h-1 bg-sunken rounded-full overflow-hidden mb-4 border border-border/50">
        <div
          className="h-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      {/* Horizontal step buttons */}
      <nav
        aria-label="Master Plan Progress"
        className="w-full overflow-x-auto pb-1 scrollbar-none border border-border rounded-xl bg-surface/90 shadow-card"
      >
        <ol className="flex items-stretch min-w-[760px] divide-x divide-border/70">
          {PLAN_STEPS.map((step) => {
            const isActive = activeStep === step.id;
            const complete = isStepComplete(step.id);
            const Icon = step.icon;

            return (
              <li key={step.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectStep(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'w-full h-full text-left p-3.5 flex flex-col justify-between transition-all duration-150 cursor-pointer group relative',
                    isActive
                      ? 'bg-accent-soft/40 text-ink shadow-inner'
                      : 'hover:bg-sunken text-muted hover:text-ink',
                  )}
                >
                  {/* Active top accent bar */}
                  {isActive && (
                    <span className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />
                  )}

                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-semibold border transition-colors',
                        complete && !isActive
                          ? 'bg-positive-soft border-positive/40 text-positive'
                          : isActive
                            ? 'bg-accent text-white border-accent shadow-xs'
                            : 'bg-sunken border-border text-muted group-hover:border-border-strong group-hover:text-ink',
                      )}
                    >
                      {complete && !isActive ? (
                        <Check size={11} strokeWidth={2.6} />
                      ) : (
                        step.stepNumber
                      )}
                    </span>
                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2 : 1.6}
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-accent-strong' : 'text-faint group-hover:text-muted',
                      )}
                    />
                  </div>

                  <div className="min-w-0">
                    <span
                      className={cn(
                        'block text-xs leading-tight truncate',
                        isActive ? 'font-semibold text-accent-strong' : 'font-medium text-ink/90',
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="block text-xs text-muted truncate mt-0.5">
                      {step.subtitle}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
