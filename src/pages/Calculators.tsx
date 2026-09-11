import { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Target,
  Umbrella,
  Banknote,
  Layers,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PortfolioReturnProjectionCalculator } from '../components/calculators/PortfolioReturnProjectionCalculator';
import { SIPCalculator } from '../components/calculators/SIPCalculator';
import { LumpsumCalculator } from '../components/calculators/LumpsumCalculator';
import { SWPCalculator } from '../components/calculators/SWPCalculator';
import { STPCalculator } from '../components/calculators/STPCalculator';
import { GoalCalculator } from '../components/calculators/GoalCalculator';
import { RetirementCorpusCalculator } from '../components/calculators/RetirementCorpusCalculator';
import { EMICalculator } from '../components/calculators/EMICalculator';

import { WorkflowFooter } from '../components/layout/WorkflowFooter';

interface CalculatorEntry {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

const CALCULATORS: CalculatorEntry[] = [
  {
    id: 'projection',
    name: 'Multi-Asset Projection',
    description: 'Model asset classes, return targets, and currency effects — nominal vs real purchasing power.',
    icon: Layers,
    component: PortfolioReturnProjectionCalculator,
  },
  {
    id: 'sip',
    name: 'SIP',
    description: 'Monthly compounding with annual step-up — total invested, wealth gained, future value.',
    icon: TrendingUp,
    component: SIPCalculator,
  },
  {
    id: 'lumpsum',
    name: 'Lumpsum',
    description: 'Compound growth of a one-time investment, with an option to add it to the Master Plan.',
    icon: Wallet,
    component: LumpsumCalculator,
  },
  {
    id: 'swp',
    name: 'SWP & Drawdown',
    description: 'Corpus longevity, sustainable decumulation rates, and year-by-year withdrawal schedules.',
    icon: Umbrella,
    component: SWPCalculator,
  },
  {
    id: 'stp',
    name: 'STP',
    description: 'Deploy a lumpsum from a liquid fund into a target portfolio gradually.',
    icon: ArrowRightLeft,
    component: STPCalculator,
  },
  {
    id: 'goal',
    name: 'Target Corpus',
    description: 'Work backwards from a future goal to today\u2019s required lumpsum or SIP — linked to plan goals.',
    icon: Target,
    component: GoalCalculator,
  },
  {
    id: 'retirement',
    name: 'Retirement Corpus',
    description: 'The corpus needed to fund inflation-adjusted withdrawals through retirement.',
    icon: Calculator,
    component: RetirementCorpusCalculator,
  },
  {
    id: 'emi',
    name: 'EMI',
    description: 'Loan EMI, total interest, and the principal-vs-interest amortisation split.',
    icon: Banknote,
    component: EMICalculator,
  },
];

export const Calculators = () => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = CALCULATORS.find((c) => c.id === activeId) ?? null;
  const ActiveComponent = active?.component;

  return (
    <div className="pb-8">
      <PageHeader
        variant="compact"
        eyebrow="Tools"
        title="Calculators"
        description="Standalone, transparent calculators for every decision — quick what-if simulations before committing parameters to the master plan."
      />

      {ActiveComponent ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer select-none"
          >
            <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
            All calculators
          </button>
          <ActiveComponent />
        </div>
      ) : (
        <div className="mt-2 border-t border-border">
          {CALCULATORS.map((calc) => {
            const Icon = calc.icon;
            return (
              <button
                key={calc.id}
                type="button"
                onClick={() => setActiveId(calc.id)}
                className="group w-full flex items-center gap-4 py-4 pr-2 border-b border-border text-left cursor-pointer transition-colors hover:bg-surface"
              >
                <span className="shrink-0 p-2 rounded-sm border border-border bg-raised text-muted group-hover:text-accent-strong group-hover:border-accent/40 transition-colors">
                  <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-tight text-ink">{calc.name}</span>
                  <span className="block mt-0.5 text-[13px] text-muted leading-relaxed">{calc.description}</span>
                </span>
                <ArrowRight
                  size={15}
                  strokeWidth={1.6}
                  aria-hidden="true"
                  className="shrink-0 text-faint group-hover:text-ink group-hover:translate-x-0.5 transition-all"
                />
              </button>
            );
          })}
        </div>
      )}

      <WorkflowFooter
        prev={{ path: '/ips', label: 'IPS' }}
        next={{ path: '/angel-connect', label: 'Angel Connect' }}
        flowHint="Standalone calculators allow quick what-if simulations before committing parameters to the master plan."
      />
    </div>
  );
};
