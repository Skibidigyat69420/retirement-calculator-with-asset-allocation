import { useState, useMemo } from 'react';
import {
  HelpCircle,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { PlanRecommendation } from '../../lib/recommendationEngine';
import { useCalculator } from '../../context/CalculatorContext';

interface RecommendationsListProps {
  recommendations: PlanRecommendation[];
}

export const RecommendationsList = ({ recommendations }: RecommendationsListProps) => {
  const { inputs, updateInputs, showToast, logDecision } = useCalculator();
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [appliedRecs, setAppliedRecs] = useState<Record<string, any>>({}); // recId -> previousState
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApply = (rec: PlanRecommendation) => {
    const prevState: any = {};

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
      showToast(`Applied: Strategic asset allocation targets rebalanced`, 'success');
    } else if (rec.actionType === 'build_emergency_reserve') {
      showToast(`Action recorded: Allocate ₹${rec.actionPayload.topUpAmount.toLocaleString('en-IN')} to Liquid Reserve`, 'info');
    } else {
      showToast(`Action recorded: ${rec.actionLabel}`, 'info');
    }

    logDecision({
      category: (rec.category.toLowerCase() === 'retirement'
        ? 'retirement'
        : rec.category.toLowerCase() === 'portfolio'
        ? 'allocation'
        : 'cashflow') as any,
      actionTitle: rec.title,
      summary: rec.reason,
      previousValue: rec.whyExplainer.current,
      newValue: rec.whyExplainer.target,
      rationale: `${rec.whyExplainer.driver}. Benefit: ${rec.whyExplainer.benefit}`,
      author: 'Advisor',
      revertPatch: prevState,
    });

    setAppliedRecs((prev) => ({ ...prev, [rec.id]: prevState }));
  };

  const handleUndo = (rec: PlanRecommendation) => {
    const prevState = appliedRecs[rec.id];
    if (prevState) {
      updateInputs(prevState);
      setAppliedRecs((prev) => {
        const next = { ...prev };
        delete next[rec.id];
        return next;
      });
      showToast(`Undone: Restored previous plan settings.`, 'info');
    }
  };

  const filteredRecs = useMemo(() => {
    if (selectedFilter === 'all') return recommendations;
    if (selectedFilter === 'high') return recommendations.filter((r) => r.priority === 1);
    return recommendations.filter((r) => r.category.toLowerCase() === selectedFilter.toLowerCase());
  }, [recommendations, selectedFilter]);

  if (recommendations.length === 0) {
    return (
      <Card className="p-6 bg-surface border border-border/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-positive/40 text-positive flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">Plan Fully Calibrated & Optimized</h4>
            <p className="text-xs text-muted mt-0.5">
              No critical funding gaps or strategic drift detected. All key advisory thresholds are currently satisfied.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const highPriorityCount = recommendations.filter((r) => r.priority === 1).length;

  return (
    <Card className="p-5 sm:p-6 bg-surface border border-border/90 shadow-2xs hover:shadow-card transition-all space-y-5">
      {/* Header with Title & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sunken text-ink flex items-center justify-center shadow-xs shrink-0">
            <Zap size={18} className="text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight font-sans">
                Prioritized Strategic Interventions
              </h3>
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-ink-soft border-border-strong">
                {recommendations.length} Available Action{recommendations.length > 1 ? 's' : ''}
              </Badge>
              {highPriorityCount > 0 && (
                <Badge variant="danger" className="text-[10px] font-bold uppercase tracking-wider">
                  {highPriorityCount} High Priority
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Actionable fiduciary adjustments to close funding gaps, improve tax efficiency, and eliminate risk drift
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
              selectedFilter === 'all'
                ? 'bg-sunken text-ink shadow-2xs'
                : 'bg-sunken text-muted hover:text-ink hover:bg-raised/70'
            }`}
          >
            All ({recommendations.length})
          </button>
          {highPriorityCount > 0 && (
            <button
              onClick={() => setSelectedFilter('high')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
                selectedFilter === 'high'
                  ? 'bg-rose-600 text-ink shadow-2xs'
                  : 'bg-negative-soft text-negative border border-negative/40 hover:bg-negative-soft'
              }`}
            >
              High ({highPriorityCount})
            </button>
          )}
          <button
            onClick={() => setSelectedFilter('retirement')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
              selectedFilter === 'retirement'
                ? 'bg-sunken text-ink shadow-2xs'
                : 'bg-sunken text-muted hover:text-ink hover:bg-raised/70'
            }`}
          >
            Retirement
          </button>
          <button
            onClick={() => setSelectedFilter('portfolio')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all ${
              selectedFilter === 'portfolio'
                ? 'bg-sunken text-ink shadow-2xs'
                : 'bg-sunken text-muted hover:text-ink hover:bg-raised/70'
            }`}
          >
            Portfolio
          </button>
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-3.5">
        {filteredRecs.map((rec) => {
          const isApplied = Boolean(appliedRecs[rec.id]);
          const isWhyOpen = Boolean(expandedWhy[rec.id]);

          // Priority badge formatting: High, Medium, Low
          let priorityLabel = 'Low';
          let priorityClass = 'bg-sunken text-ink-soft border-border-strong';
          let priorityDot = 'bg-zinc-400';

          if (rec.priority === 1) {
            priorityLabel = 'High';
            priorityClass = 'bg-rose-50 text-negative border-negative/40';
            priorityDot = 'bg-rose-600';
          } else if (rec.priority === 2) {
            priorityLabel = 'Medium';
            priorityClass = 'bg-warning-soft text-warning border-warning/40';
            priorityDot = 'bg-warning-soft0';
          }

          return (
            <div
              key={rec.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isApplied
                  ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                  : 'bg-surface border-border/90 hover:border-border-strong hover:shadow-2xs'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Priority Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityDot}`} />
                      {priorityLabel} Priority
                    </span>

                    {/* Category Badge */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sunken text-ink-soft border border-border uppercase tracking-wider">
                      {rec.category}
                    </span>

                    {/* Impact Highlight Pill */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-positive-soft text-positive border border-positive/40 shadow-2xs">
                      <TrendingUp size={12} className="text-positive" />
                      <span>Impact: {rec.impact}</span>
                    </span>
                  </div>

                  {/* Title and Reason */}
                  <div>
                    <h4 className="text-sm font-bold text-ink font-sans tracking-tight">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed max-w-3xl">
                      {rec.reason}
                    </p>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0 pt-2 lg:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWhy(rec.id)}
                    className="text-xs h-8 px-3 text-ink-soft border-border hover:bg-sunken hover:border-border-strong gap-1.5 rounded-xl"
                  >
                    <HelpCircle size={13} className="text-muted" />
                    {isWhyOpen ? 'Hide Rationale' : 'View Rationale'}
                  </Button>

                  {isApplied ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-positive bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                        <CheckCircle2 size={13} /> Applied
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndo(rec)}
                        className="text-xs h-8 px-2.5 text-ink-soft border-border-strong hover:bg-sunken gap-1 rounded-xl"
                        title="Revert to previous plan state"
                      >
                        <RotateCcw size={12} />
                        Undo
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApply(rec)}
                      className="text-xs h-8 px-3.5 bg-sunken text-ink hover:bg-raised font-semibold gap-1.5 rounded-xl shadow-2xs transition-all hover:scale-[1.02]"
                    >
                      <Sparkles size={13} className="text-amber-400" />
                      <span>{rec.actionLabel}</span>
                      <ArrowRight size={13} className="text-faint ml-0.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Rationale Drawer */}
              {isWhyOpen && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-sunken/80 border border-border/80 p-4 rounded-xl text-xs animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-faint tracking-wider block">
                      Current Parameter
                    </span>
                    <span className="font-semibold text-ink bg-surface px-2 py-1 rounded border border-border inline-block font-mono text-[11px]">
                      {rec.whyExplainer.current}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-faint tracking-wider block">
                      Target Benchmark
                    </span>
                    <span className="font-semibold text-positive bg-emerald-50 px-2 py-1 rounded border border-positive/40 inline-block font-mono text-[11px]">
                      {rec.whyExplainer.target}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-faint tracking-wider block">
                      Fiduciary Driver
                    </span>
                    <span className="text-ink-soft leading-snug block">
                      {rec.whyExplainer.driver}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-faint tracking-wider block">
                      Projected Benefit
                    </span>
                    <span className="font-semibold text-positive leading-snug block">
                      {rec.whyExplainer.benefit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
