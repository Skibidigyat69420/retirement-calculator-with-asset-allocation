import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';
import { Badge } from '../ui/Badge';
import { ASSET_LABELS } from '../../lib/constants';
import { formatPercent } from '../../lib/formatters';

interface QueueItem {
  id: string;
  severity: 'at-risk' | 'needs-review' | 'not-started' | 'in-progress';
  title: string;
  detail: string;
  to: string;
  meta?: string;
}

/**
 * PRIORITY QUEUE — a quiet, hairline-separated list of what needs the
 * adviser's attention next, ordered by severity. Built only from live
 * plan state; nothing here is presented when the underlying data is absent.
 */
export const PriorityQueue = () => {
  const { inputs, wealthResult, riskProfile, hasRiskAnswers } = useCalculator();
  const configured = wealthResult.isConfigured;

  const items: QueueItem[] = [];

  if (configured && !wealthResult.sustainable) {
    items.push({
      id: 'retirement-shortfall',
      severity: 'at-risk',
      title: 'Retirement corpus projected to fall short',
      detail: `Deterministic projection shows depletion around age ${wealthResult.depletionAge ?? '—'}. Increase SIP, extend the working horizon, or moderate withdrawals.`,
      to: '/retirement',
      meta: wealthResult.depletionAge ? `Depletes age ${wealthResult.depletionAge}` : undefined,
    });
  }

  if (configured) {
    const threshold = riskProfile.goalSuccessThreshold / 100;
    const essentialAtRisk = wealthResult.goalResults.filter(
      (g) => g.goal.priority === 'essential' && g.successRate < threshold,
    );
    if (essentialAtRisk.length > 0) {
      items.push({
        id: 'essential-goals',
        severity: 'at-risk',
        title: `${essentialAtRisk.length} essential goal${essentialAtRisk.length === 1 ? '' : 's'} below the confidence bar`,
        detail: `Success probability is under ${formatPercent(riskProfile.goalSuccessThreshold)} for: ${essentialAtRisk
          .map((g) => g.goal.name)
          .join(', ')}.`,
        to: '/goal',
        meta: `${essentialAtRisk.length} at risk`,
      });
    } else if (wealthResult.goalsAtRisk.length > 0) {
      items.push({
        id: 'goals-review',
        severity: 'needs-review',
        title: `${wealthResult.goalsAtRisk.length} goal${wealthResult.goalsAtRisk.length === 1 ? '' : 's'} need funding attention`,
        detail: `${wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')} sit below the ${formatPercent(riskProfile.goalSuccessThreshold)} confidence threshold.`,
        to: '/goal',
      });
    }

    let largest: { name: string; drift: number } | null = null;
    for (const [category, currentFrac] of Object.entries(wealthResult.currentAllocation)) {
      const driftPct =
        (currentFrac - (wealthResult.targetAllocation[category as keyof typeof wealthResult.targetAllocation] || 0)) * 100;
      if (Math.abs(driftPct) < 5) continue;
      if (!largest || Math.abs(driftPct) > Math.abs(largest.drift)) {
        largest = { name: category, drift: driftPct };
      }
    }
    if (largest) {
      items.push({
        id: 'allocation-drift',
        severity: 'needs-review',
        title: 'Strategic allocation has drifted',
        detail: `${ASSET_LABELS[largest.name as keyof typeof ASSET_LABELS] ?? largest.name} is ${largest.drift > 0 ? '+' : ''}${largest.drift.toFixed(1)} points from the ${riskProfile.label} target.`,
        to: '/allocation',
        meta: `${largest.drift > 0 ? '+' : ''}${largest.drift.toFixed(1)} pts`,
      });
    }
  }

  if (!hasRiskAnswers) {
    items.push({
      id: 'risk-pending',
      severity: 'not-started',
      title: 'Risk assessment pending',
      detail: 'Complete the questionnaire to calibrate allocation targets, drift limits and the goal confidence bar.',
      to: '/risk',
      meta: 'Step 1',
    });
  }

  if (inputs.assets.length === 0) {
    items.push({
      id: 'no-assets',
      severity: inputs.client.name.trim() ? 'in-progress' : 'not-started',
      title: 'No household assets recorded',
      detail: 'Add holdings across equity, debt, gold, real estate and liquid sleeves to build the balance sheet.',
      to: '/master-plan',
    });
  }

  if (inputs.annualIncome <= 0) {
    items.push({
      id: 'no-income',
      severity: 'in-progress',
      title: 'Income & cashflows not set',
      detail: 'Record annual income and living expenses so the savings engine and surplus waterfall can run.',
      to: '/master-plan',
    });
  }

  if (inputs.goals.length === 0) {
    items.push({
      id: 'no-goals',
      severity: 'in-progress',
      title: 'No goals mapped yet',
      detail: 'Define the family’s milestones — education, home, retirement — to activate goal funding analysis.',
      to: '/goal',
    });
  }

  const reviewDate = inputs.client?.reviewDate?.trim();
  const severityRank: Record<QueueItem['severity'], number> = {
    'at-risk': 0,
    'needs-review': 1,
    'not-started': 2,
    'in-progress': 3,
  };
  items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return (
    <div>
      <SectionHeader
        title="Priority queue"
        description="What needs attention next, ordered by severity."
        action={<Badge tone="neutral">{items.length} open</Badge>}
        hairline
      />

      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-4">
          <CheckCircle2 size={16} strokeWidth={1.6} className="text-positive shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted">
            Nothing needs attention — the plan is on track.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.to}
                className="group flex items-start gap-4 py-4 -mx-2 px-2 rounded-sm hover:bg-surface transition-colors"
              >
                <div className="pt-0.5 shrink-0">
                  <StatusBadge status={item.severity} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink tracking-tight">{item.title}</div>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{item.detail}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  {item.meta && (
                    <span className="font-mono text-[11px] text-faint tabular-nums hidden sm:block">
                      {item.meta}
                    </span>
                  )}
                  <ArrowRight
                    size={14}
                    strokeWidth={1.6}
                    className="text-faint group-hover:text-ink group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}

          {reviewDate && (
            <li className="flex items-start gap-4 py-4">
              <div className="pt-0.5 shrink-0">
                <Badge tone="info">Upcoming</Badge>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink tracking-tight">Scheduled client review</div>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  The next review with {inputs.client.advisor?.trim() || 'the adviser'} is set for {reviewDate}.
                </p>
              </div>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
