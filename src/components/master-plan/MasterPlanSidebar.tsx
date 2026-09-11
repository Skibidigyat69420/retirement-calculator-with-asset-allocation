import {
  User,
  Building2,
  Wallet,
  Target,
  ShieldCheck,
  Sliders,
  BarChart2,
  Check,
  ArrowRight,
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
    label: 'Profile',
    subtitle: 'Client & horizon',
    icon: User,
  },
  {
    id: 'financials',
    stepNumber: '02',
    label: 'Financials',
    subtitle: 'Assets & liabilities',
    icon: Building2,
  },
  {
    id: 'cashflows',
    stepNumber: '03',
    label: 'Cashflow',
    subtitle: 'Income, spend & SIP',
    icon: Wallet,
  },
  {
    id: 'goals',
    stepNumber: '04',
    label: 'Goals',
    subtitle: 'Milestones & conflicts',
    icon: Target,
  },
  {
    id: 'risk',
    stepNumber: '05',
    label: 'Risk',
    subtitle: 'Profile & targets',
    icon: ShieldCheck,
  },
  {
    id: 'assumptions',
    stepNumber: '06',
    label: 'Assumptions',
    subtitle: 'Returns & inflation',
    icon: Sliders,
  },
  {
    id: 'results',
    stepNumber: '07',
    label: 'Outlook',
    subtitle: 'Projections & lab',
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

  return (
    <nav aria-label="Master Plan Steps" className="relative">
      {/* Vertical hairline threading the step markers */}
      <div
        className="absolute left-[11px] top-4 bottom-4 w-px bg-border"
        aria-hidden="true"
      />

      <ol className="relative space-y-0.5">
        {PLAN_STEPS.map((step) => {
          const isActive = activeStep === step.id;
          const complete = isStepComplete(step.id);

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelectStep(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'group w-full flex items-center gap-3.5 py-2.5 pr-2 rounded-md text-left transition-colors duration-150 cursor-pointer select-none',
                  isActive ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {/* Step marker */}
                <span
                  className={cn(
                    'relative z-10 w-[23px] h-[23px] rounded-full flex items-center justify-center shrink-0 border transition-colors duration-150',
                    complete && !isActive
                      ? 'bg-positive-soft border-positive/40 text-positive'
                      : isActive
                        ? 'bg-raised border-accent text-accent'
                        : 'bg-raised border-border-strong text-faint group-hover:border-muted',
                  )}
                >
                  {complete && !isActive ? (
                    <Check size={12} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <span className="font-mono text-[9px] tabular-nums leading-none">
                      {step.stepNumber}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[13px] leading-tight truncate',
                      isActive ? 'font-semibold text-ink' : 'font-medium',
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      'block text-[11px] leading-tight truncate mt-0.5',
                      isActive ? 'text-muted' : 'text-faint',
                    )}
                  >
                    {step.subtitle}
                  </span>
                </span>

                {/* Current-step arrow */}
                <ArrowRight
                  size={14}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 transition-opacity duration-150 text-accent',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
