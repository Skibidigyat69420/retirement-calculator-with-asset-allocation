import { useState, useMemo } from 'react';
import { CheckCircle2, RotateCcw, TrendingUp } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { PlanRecommendation } from '../../lib/recommendationEngine';
import { useCalculator } from '../../context/CalculatorContext';

interface RecommendationsListProps {
  recommendations: PlanRecommendation[];
}

const priorityTone = (priority: number): { tone: 'negative' | 'warning' | 'neutral'; label: string } =>
  priority === 1
    ? { tone: 'negative', label: 'High priority' }
    : priority === 2
      ? { tone: 'warning', label: 'Medium' }
      : { tone: 'neutral', label: 'Low' };

/**
 * RECOMMENDATIONS — an editorial numbered list, hairline-separated. Every
 * action (apply / undo / decision log / rationale) is preserved from the
 * original engine wiring.
 */
export const RecommendationsList = ({ recommendations }: RecommendationsListProps) => {
  const { inputs, updateInputs, showToast, logDecision } = useCalculator();
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [appliedRecs, setAppliedRecs] = useState<Record<string, unknown>>({});
  const [filter, setFilter] = useState<string>('all');

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApply = (rec: PlanRecommendation) => {
    const prevState: Record<string, unknown> = {};

    if (rec.actionType === 'increase_sip') {
      prevState.sip = { ...inputs.sip };
      updateInputs({
        sip: {
          ...inputs.sip,
          amount: rec.actionPayload.newSipAmount,
        },
      });
      showToast(`Applied: Monthly SIP increased to ₹${rec.actionPayload.newSipAmount.toLocaleString('en-IN')}`, 'success');
    } else if (rec.actionType === 'adjust_retirement_age') {
      prevState.retirementAge = inputs.retirementAge;
      updateInputs({
        retirementAge: rec.actionPayload.newRetirementAge,
      });
      showToast(`Applied: Retirement age adjusted to ${rec.actionPayload.newRetirementAge}`, 'success');
    } else if (rec.actionType === 'rebalance_allocation') {
      prevState.manualTargets = null;
      showToast('Applied: Strategic asset allocation targets rebalanced', 'success');
    } else if (rec.actionType === 'build_emergency_reserve') {
      showToast(`Action recorded: Allocate ₹${rec.actionPayload.topUpAmount.toLocaleString('en-IN')} to Liquid Reserve`, 'info');
    } else {
      showToast(`Action recorded: ${rec.actionLabel}`, 'info');
    }

    const decisionCategory: 'retirement' | 'allocation' | 'goal' | 'sip' =
      rec.category.toLowerCase() === 'retirement'
        ? 'retirement'
        : rec.category.toLowerCase() === 'portfolio'
          ? 'allocation'
          : rec.category.toLowerCase() === 'goals'
            ? 'goal'
            : 'sip';

    logDecision({
      category: decisionCategory,
      actionTitle: rec.title,
      summary: rec.reason,
      previousValue: rec.whyExplainer.current,
      newValue: rec.whyExplainer.target,
      rationale: `${rec.whyExplainer.driver}. Benefit: ${rec.whyExplainer.benefit}`,
      author: 'Advisor',
      revertPatch: prevState as Partial<typeof inputs>,
    });

    setAppliedRecs((prev) => ({ ...prev, [rec.id]: prevState }));
  };

  const handleUndo = (rec: PlanRecommendation) => {
    const prevState = appliedRecs[rec.id] as Partial<typeof inputs> | undefined;
    if (prevState) {
      updateInputs(prevState);
      setAppliedRecs((prev) => {
        const next = { ...prev };
        delete next[rec.id];
        return next;
      });
      showToast('Undone: Restored previous plan settings.', 'info');
    }
  };

  const filteredRecs = useMemo(() => {
    if (filter === 'all') return recommendations;
    if (filter === 'high') return recommendations.filter((r) => r.priority === 1);
    return recommendations.filter((r) => r.category.toLowerCase() === filter.toLowerCase());
  }, [recommendations, filter]);

  if (recommendations.length === 0) {
    return (
      <div>
        <SectionHeader title="Recommendations" hairline />
        <div className="flex items-center gap-3 py-4">
          <CheckCircle2 size={16} strokeWidth={1.6} className="text-positive shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted">
            No funding gaps or strategic drift detected — all key advisory thresholds are satisfied.
          </p>
        </div>
      </div>
    );
  }

  const highPriorityCount = recommendations.filter((r) => r.priority === 1).length;

  return (
    <div>
      <SectionHeader
        title="Recommendations"
        description="Numbered interventions from the plan audit, ordered by priority."
        hairline
        action={
          <div className="flex items-center gap-3">
            {highPriorityCount > 0 && <Badge tone="negative">{highPriorityCount} high priority</Badge>}
            <SegmentedControl
              ariaLabel="Filter recommendations"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All ${recommendations.length}` },
                ...(highPriorityCount > 0 ? [{ value: 'high', label: 'High' }] : []),
                { value: 'retirement', label: 'Retirement' },
                { value: 'portfolio', label: 'Portfolio' },
              ]}
            />
          </div>
        }
      />

      <ol className="divide-y divide-border-subtle">
        {filteredRecs.map((rec, index) => {
          const isApplied = Boolean(appliedRecs[rec.id]);
          const isWhyOpen = Boolean(expandedWhy[rec.id]);
          const priority = priorityTone(rec.priority);

          return (
            <li key={rec.id} className="py-5 first:pt-1 last:pb-0">
              <div className="flex gap-4 sm:gap-6">
                <span className="font-mono text-xs text-faint tabular-nums pt-1 w-6 shrink-0" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={priority.tone}>{priority.label}</Badge>
                    <Badge tone="neutral" dot={false}>{rec.category}</Badge>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-positive tabular-nums">
                      <TrendingUp size={12} strokeWidth={1.8} aria-hidden="true" />
                      {rec.impact}
                    </span>
                  </div>

                  <h4 className="mt-2 text-[15px] font-semibold text-ink tracking-tight">{rec.title}</h4>
                  <p className="mt-1 text-sm text-muted leading-relaxed max-w-3xl">{rec.reason}</p>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {isApplied ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-positive">
                          <CheckCircle2 size={13} strokeWidth={1.8} aria-hidden="true" />
                          Applied
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleUndo(rec)}>
                          <RotateCcw size={12} strokeWidth={1.6} aria-hidden="true" />
                          Undo
                        </Button>
                      </>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => handleApply(rec)}>
                        {rec.actionLabel}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toggleWhy(rec.id)}>
                      {isWhyOpen ? 'Hide rationale' : 'View rationale'}
                    </Button>
                  </div>

                  {isWhyOpen && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-md border border-border-subtle bg-sunken p-4 text-xs">
                      <div className="space-y-1">
                        <span className="eyebrow">Current</span>
                        <span className="block font-mono tabular-nums text-ink bg-raised border border-border rounded-sm px-2 py-1">
                          {rec.whyExplainer.current}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="eyebrow">Target</span>
                        <span className="block font-mono tabular-nums text-positive bg-positive-soft border border-positive/25 rounded-sm px-2 py-1">
                          {rec.whyExplainer.target}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="eyebrow">Driver</span>
                        <span className="block text-ink-soft leading-relaxed">{rec.whyExplainer.driver}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="eyebrow">Benefit</span>
                        <span className="block text-positive leading-relaxed">{rec.whyExplainer.benefit}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
