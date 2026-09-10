import {
  User,
  Building2,
  Wallet,
  Target,
  ShieldCheck,
  Sliders,
  BarChart2,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MasterPlanInputs } from '../../types';

export interface PlanStepItem {
  id: string;
  stepNumber: string;
  label: string;
  subtitle: string;
  icon: typeof User;
}

export const PLAN_STEPS: PlanStepItem[] = [
  {
    id: 'profile',
    stepNumber: '01',
    label: 'Client Profile',
    subtitle: 'Demographics & Horizon',
    icon: User,
  },
  {
    id: 'financials',
    stepNumber: '02',
    label: 'Financials & Debt',
    subtitle: 'Assets & Liabilities',
    icon: Building2,
  },
  {
    id: 'cashflows',
    stepNumber: '03',
    label: 'Cashflow Dynamics',
    subtitle: 'Income, Spend & SIP',
    icon: Wallet,
  },
  {
    id: 'goals',
    stepNumber: '04',
    label: 'Goals & Milestones',
    subtitle: 'Demand & Conflicts',
    icon: Target,
  },
  {
    id: 'risk',
    stepNumber: '05',
    label: 'Risk & Allocation',
    subtitle: 'Targets & Glidepath',
    icon: ShieldCheck,
  },
  {
    id: 'assumptions',
    stepNumber: '06',
    label: 'Market Assumptions',
    subtitle: 'Returns & Inflation',
    icon: Sliders,
  },
  {
    id: 'results',
    stepNumber: '07',
    label: 'Projections & Lab',
    subtitle: 'Solvency & Scenarios',
    icon: BarChart2,
  },
];

interface MasterPlanSidebarProps {
  activeStep: string;
  onSelectStep: (stepId: string) => void;
  inputs: MasterPlanInputs;
}

export const MasterPlanSidebar = ({
  activeStep,
  onSelectStep,
  inputs,
}: MasterPlanSidebarProps) => {
  // Determine completed steps based on plan inputs
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

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Plan Formulation
          </span>
          <span className="font-mono font-bold text-ink text-[11px]">
            {completedCount}/{PLAN_STEPS.length} Completed
          </span>
        </div>

        <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden border border-border/60">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Progressive Step Navigation Rail */}
      <nav className="space-y-1" aria-label="Master Plan Steps">
        {PLAN_STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const complete = isStepComplete(step.id);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.id)}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer group select-none',
                isActive
                  ? 'bg-accent text-white shadow-sm ring-1 ring-accent/40 font-semibold'
                  : 'bg-surface/50 hover:bg-surface text-muted hover:text-ink border border-transparent hover:border-border',
              )}
            >
              {/* Step indicator */}
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors',
                  isActive
                    ? 'bg-accent-strong text-white'
                    : complete
                      ? 'bg-positive-soft text-positive border border-positive/30'
                      : 'bg-sunken text-faint border border-border group-hover:text-ink',
                )}
              >
                {complete && !isActive ? (
                  <CheckCircle2 size={15} className="text-positive" />
                ) : (
                  step.stepNumber
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="min-w-0 flex-1">
                <div className="text-xs truncate flex items-center gap-1.5">
                  <Icon size={13} className={isActive ? 'text-white' : 'text-accent'} />
                  <span className={isActive ? 'text-white' : 'text-ink font-semibold'}>
                    {step.label}
                  </span>
                </div>
                <div
                  className={cn(
                    'text-[10px] truncate',
                    isActive ? 'text-white/80' : 'text-faint',
                  )}
                >
                  {step.subtitle}
                </div>
              </div>

              {/* Chevron */}
              <ChevronRight
                size={14}
                className={cn(
                  'shrink-0 transition-transform',
                  isActive ? 'text-white translate-x-0.5' : 'text-muted/40 group-hover:text-muted',
                )}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
