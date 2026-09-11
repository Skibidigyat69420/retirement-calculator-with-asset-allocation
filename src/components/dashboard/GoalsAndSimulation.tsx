import { useMemo } from 'react';
import { useCalculator } from '../../context/CalculatorContext';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { FinancialMetric } from '../ui/FinancialMetric';
import { Target } from 'lucide-react';
import { formatPercent } from '../../lib/formatters';

export const GoalsAndSimulation = () => {
  const { inputs, wealthResult } = useCalculator();

  const goals = useMemo(() => {
    if (!inputs.goals?.length) return [];
    return inputs.goals.map((g) => ({
      name: g.name || 'Unnamed goal',
      targetYear: inputs.currentAge + (g.yearsToGoal ?? 0),
      targetAmount: g.targetAmount ?? 0,
      priority: g.priority ?? 'important',
    }));
  }, [inputs.goals, inputs.currentAge]);

  if (!goals.length) {
    return (
      <section>
        <SectionHeader title="Goals" description="Define financial milestones to anchor the planning process." />
        <EmptyState
          icon={Target}
          eyebrow="No goals"
          title="No goals defined"
          description="Add goals in the Master Plan to track funding status and timeline."
        />
      </section>
    );
  }

  const probability = wealthResult.isConfigured ? wealthResult.monteCarlo.successRate * 100 : null;

  return (
    <section>
      <SectionHeader
        title="Goals & Simulation"
        description={probability != null ? `Plan probability: ${formatPercent(probability)}` : 'Configure the plan to see simulation results.'}
      />
      <div className="mt-4 border-t border-border">
        {goals.map((g, i) => (
          <div key={i} className="py-3 border-b border-border-subtle flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink truncate">{g.name}</div>
              <div className="text-xs text-muted mt-0.5">
                {g.targetYear > 0 ? `Target ${g.targetYear}` : 'No target year'} · {g.priority}
              </div>
            </div>
            <FinancialMetric value={g.targetAmount} label="" size="sm" />
          </div>
        ))}
      </div>
    </section>
  );
};
