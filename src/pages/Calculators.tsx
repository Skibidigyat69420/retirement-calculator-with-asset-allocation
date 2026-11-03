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
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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

export type CalculatorCategory = 'all' | 'accumulation' | 'decumulation' | 'goals-debt';

interface CalculatorEntry {
  id: string;
  name: string;
  category: CalculatorCategory;
  tag: string;
  description: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

const CALCULATORS: CalculatorEntry[] = [
  {
    id: 'projection',
    name: 'Multi-Asset Projection',
    category: 'accumulation',
    tag: 'Macro Modeling',
    description: 'Model asset classes, return targets, and currency effects — nominal vs real purchasing power.',
    icon: Layers,
    component: PortfolioReturnProjectionCalculator,
  },
  {
    id: 'sip',
    name: 'SIP & Step-Up Calculator',
    category: 'accumulation',
    tag: 'Compounding',
    description: 'Monthly compounding with annual step-up — total invested, wealth gained, and future portfolio value.',
    icon: TrendingUp,
    component: SIPCalculator,
  },
  {
    id: 'lumpsum',
    name: 'Lumpsum Growth',
    category: 'accumulation',
    tag: 'One-Time Outlay',
    description: 'Compound growth of a one-time capital investment, with an option to add it to the active Master Plan.',
    icon: Wallet,
    component: LumpsumCalculator,
  },
  {
    id: 'swp',
    name: 'SWP & Drawdown',
    category: 'decumulation',
    tag: 'Retirement Inflows',
    description: 'Corpus longevity, sustainable decumulation rates, and year-by-year post-retirement withdrawal schedules.',
    icon: Umbrella,
    component: SWPCalculator,
  },
  {
    id: 'stp',
    name: 'Systematic Transfer (STP)',
    category: 'accumulation',
    tag: 'Gradual Deployment',
    description: 'Deploy a lumpsum from a liquid fund into a target portfolio gradually to mitigate timing risk.',
    icon: ArrowRightLeft,
    component: STPCalculator,
  },
  {
    id: 'retirement',
    name: 'Retirement Corpus Estimator',
    category: 'decumulation',
    tag: 'Longevity Need',
    description: 'The corpus needed to fund inflation-adjusted withdrawals through full retirement span.',
    icon: Calculator,
    component: RetirementCorpusCalculator,
  },
  {
    id: 'goal',
    name: 'Target Goal Corpus',
    category: 'goals-debt',
    tag: 'Reverse Goal Solver',
    description: 'Work backwards from a future milestone to today’s required lumpsum or SIP — linked to plan goals.',
    icon: Target,
    component: GoalCalculator,
  },
  {
    id: 'emi',
    name: 'Loan EMI & Amortization',
    category: 'goals-debt',
    tag: 'Debt Service',
    description: 'Loan EMI, total interest, and the principal-vs-interest amortisation split over tenure.',
    icon: Banknote,
    component: EMICalculator,
  },
];

export const Calculators = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCalc = searchParams.get('calc');
  const [activeId, setActiveIdState] = useState<string | null>(urlCalc);

  const setActiveId = (id: string | null) => {
    setActiveIdState(id);
    if (id) {
      setSearchParams({ calc: id });
    } else {
      setSearchParams({});
    }
  };

  const [category, setCategory] = useState<CalculatorCategory>('all');
  const [search, setSearch] = useState('');

  const active = CALCULATORS.find((c) => c.id === activeId) ?? null;
  const ActiveComponent = active?.component;

  const filteredCalculators = CALCULATORS.filter((calc) => {
    const matchesCategory = category === 'all' || calc.category === category;
    const matchesSearch =
      calc.name.toLowerCase().includes(search.toLowerCase()) ||
      calc.description.toLowerCase().includes(search.toLowerCase()) ||
      calc.tag.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-8">
      <PageHeader
        variant="compact"
        title="Calculators & Simulation Tools"
        description="Standalone, transparent calculators for every decision — quick what-if simulations before committing parameters to the master plan."
      />

      {ActiveComponent ? (
        <div className="mt-4">
          {/* Top Quick-Navigation Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-strong transition-colors cursor-pointer select-none"
            >
              <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
              <span>All Calculators</span>
            </button>

            {/* Quick Hop Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CALCULATORS.map((calc) => (
                <button
                  key={calc.id}
                  type="button"
                  onClick={() => setActiveId(calc.id)}
                  className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    activeId === calc.id
                      ? 'bg-accent text-white font-medium shadow-xs'
                      : 'bg-surface hover:bg-sunken text-muted hover:text-ink border border-border/50'
                  }`}
                >
                  {calc.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <ActiveComponent />
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-sunken p-1 rounded-lg border border-border/70 overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: 'All Utilities' },
                { id: 'accumulation', label: 'Accumulation (SIP & Growth)' },
                { id: 'decumulation', label: 'Decumulation & SWP' },
                { id: 'goals-debt', label: 'Goals & Loans (EMI)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id as CalculatorCategory)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    category === tab.id
                      ? 'bg-surface text-ink font-semibold shadow-xs border border-border/60'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search calculators..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface rounded-lg border border-border focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Calculator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredCalculators.map((calc) => {
              const Icon = calc.icon;
              return (
                <button
                  key={calc.id}
                  type="button"
                  onClick={() => setActiveId(calc.id)}
                  className="group relative flex flex-col justify-between p-5 rounded-xl border border-border bg-surface hover:bg-surface/80 hover:border-accent/40 hover:shadow-card-hover transition-all duration-150 text-left cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="p-2.5 rounded-lg border border-border bg-raised text-accent-strong group-hover:scale-105 group-hover:bg-accent-soft transition-all">
                        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-medium text-muted px-2 py-0.5 rounded-full bg-sunken border border-border/60">
                        {calc.tag}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-ink group-hover:text-accent-strong transition-colors">
                      {calc.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed line-clamp-3">
                      {calc.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-medium text-accent">
                    <span>Open Calculator</span>
                    <ArrowRight
                      size={14}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="text-accent group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <WorkflowFooter
        prev={{ path: '/ips', label: 'Investment Policy' }}
        next={{ path: '/angel-connect', label: 'SmartAPI Connect' }}
        stepIndicator="Financial Calculators & Modeling"
      />
    </div>
  );
};
