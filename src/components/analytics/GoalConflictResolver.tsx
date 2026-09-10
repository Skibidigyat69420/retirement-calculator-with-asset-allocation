import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  Scissors,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useCalculator } from '../../context/CalculatorContext';
import {
  evaluateGoalConflicts,
  type GoalConflictResult,
  type EvaluatedGoalDemand,
} from '../../lib/goalConflictEngine';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';

interface GoalConflictResolverProps {
  onNavigateToStep?: (step: string) => void;
}

export const GoalConflictResolver = ({ onNavigateToStep: _onNavigateToStep }: GoalConflictResolverProps) => {
  const { inputs, wealthResult, updateGoal, updateSIP, showToast } = useCalculator();

  const conflictResult: GoalConflictResult = useMemo(() => {
    return evaluateGoalConflicts(inputs, wealthResult);
  }, [inputs, wealthResult]);

  const [appliedRecommendations, setAppliedRecommendations] = useState<Record<string, boolean>>({});

  const atRiskGoals = useMemo(() => {
    return conflictResult.evaluatedGoals.filter(
      (g) => g.fundedStatus === 'Partially Funded' || g.fundedStatus === 'Unfunded / At Risk' || g.shortfall > 0,
    );
  }, [conflictResult.evaluatedGoals]);

  // Lever 1: Postpone goal by 2 years
  const handlePostponeGoal = (goal: EvaluatedGoalDemand, years = 2) => {
    const existing = inputs.goals.find((g) => g.id === goal.id);
    if (!existing) return;
    const currentYears = existing.yearsToGoal ?? 5;
    const updatedYears = currentYears + years;
    updateGoal(goal.id, { yearsToGoal: updatedYears });
    setAppliedRecommendations((prev) => ({ ...prev, [`postpone-${goal.id}`]: true }));
    showToast(`Postponed "${goal.name}" by ${years} years (Target Year: ${new Date().getFullYear() + updatedYears})`, 'success');
  };

  // Lever 2: Increase monthly SIP to cover goal shortfall
  const handleIncreaseSIP = (monthlyIncrease: number, goalName: string) => {
    const currentSip = inputs.sip.amount || 0;
    const newSip = Math.round(currentSip + monthlyIncrease);
    updateSIP({ amount: newSip });
    setAppliedRecommendations((prev) => ({ ...prev, [`sip-${goalName}`]: true }));
    showToast(`Increased Monthly SIP by ${formatCurrency(monthlyIncrease)}/mo to support "${goalName}"`, 'success');
  };

  // Lever 3: Trim target amount by 20%
  const handleTrimGoalAmount = (goal: EvaluatedGoalDemand, discountPercent = 0.2) => {
    const existing = inputs.goals.find((g) => g.id === goal.id);
    if (!existing) return;
    const newAmount = Math.round(existing.targetAmount * (1 - discountPercent));
    updateGoal(goal.id, { targetAmount: newAmount });
    setAppliedRecommendations((prev) => ({ ...prev, [`trim-${goal.id}`]: true }));
    showToast(`Calibrated "${goal.name}" target from ${formatCurrency(existing.targetAmount)} to ${formatCurrency(newAmount)}`, 'info');
  };

  if (!inputs.goals || inputs.goals.length === 0) {
    return null;
  }

  return (
    <Card className="border border-border space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-accent" />
            <h3 className="text-lg font-bold text-ink tracking-tight">
              Goal Conflict & Capital Allocation Matrix
            </h3>
            <Badge
              variant={conflictResult.isFullyFunded ? 'success' : 'danger'}
              className="text-[10px] tracking-wider uppercase font-semibold"
            >
              {conflictResult.isFullyFunded ? 'All Goals Solvent' : 'Shortfall Detected'}
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Deterministic liquidity waterfall evaluating competing capital claims between retirement corpus and lifestyle goals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted">
            Demand: <strong className="text-ink">{formatCurrencyCompact(conflictResult.totalHouseholdDemand)}</strong>
          </span>
          <span className="text-border">|</span>
          <span className="text-xs font-mono text-muted">
            Wealth: <strong className="text-ink">{formatCurrencyCompact(conflictResult.projectedAvailableWealth)}</strong>
          </span>
        </div>
      </div>

      {/* Overview Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
          conflictResult.isFullyFunded
            ? 'bg-positive-soft border-positive/30 text-positive'
            : 'bg-negative-soft border-negative/30 text-negative'
        }`}
      >
        {conflictResult.isFullyFunded ? (
          <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-positive" />
        ) : (
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-negative" />
        )}
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider">
            {conflictResult.isFullyFunded
              ? 'Portfolio Has Sufficient Capital Across All Milestones'
              : `Capital Shortfall of ${formatCurrency(Math.abs(conflictResult.netSurplusOrDeficit))} Identified`}
          </div>
          <p className="text-xs leading-relaxed font-medium opacity-90">
            {conflictResult.tradeOffSummary}
          </p>
        </div>
      </div>

      {/* Goal Funding Breakdown Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <Calendar size={14} className="text-accent" />
          Household Goal Demand Timeline & Funding Status
        </h4>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs text-left">
            <thead className="bg-sunken border-b border-border text-muted uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Priority & Goal</th>
                <th className="py-2.5 px-3 text-center">Horizon</th>
                <th className="py-2.5 px-3 text-right">Target Value</th>
                <th className="py-2.5 px-3 text-right">Inflation-Adjusted</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conflictResult.evaluatedGoals.map((g) => {
                const isShortfall = g.shortfall > 0 || g.fundedStatus !== 'Fully Funded';
                return (
                  <tr key={g.id} className="hover:bg-sunken/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sunken border border-border font-bold text-muted">
                          #{g.priorityRank}
                        </span>
                        <span className="font-semibold text-ink">{g.name}</span>
                        <span className="text-[10px] uppercase font-bold text-faint bg-raised px-1.5 py-0.5 rounded">
                          {g.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-muted">
                      {g.yearsAway} yrs ({g.targetYear})
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-ink">
                      {formatCurrency(g.costToday)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-ink">
                      {formatCurrency(g.futureCost)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        variant={
                          g.fundedStatus === 'Fully Funded'
                            ? 'success'
                            : g.fundedStatus === 'Partially Funded'
                              ? 'warning'
                              : 'danger'
                        }
                        className="text-[10px]"
                      >
                        {g.fundedStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span className={isShortfall ? 'text-negative' : 'text-positive'}>
                        {g.coveragePercent}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI & Quantitative Resolution Recommendations */}
      {atRiskGoals.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-warning" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
              Tactical Levers to Eliminate Deficit & Protect Retirement
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {atRiskGoals.map((goal) => {
              const shortfall = goal.shortfall || Math.round(goal.futureCost * 0.35);
              const monthsAway = Math.max(12, goal.yearsAway * 12);
              const monthlySipRequired = Math.round(shortfall / monthsAway);

              const postponeApplied = appliedRecommendations[`postpone-${goal.id}`];
              const sipApplied = appliedRecommendations[`sip-${goal.name}`];
              const trimApplied = appliedRecommendations[`trim-${goal.id}`];

              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-xl bg-sunken border border-border space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink text-sm flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-warning" />
                        {goal.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-negative bg-negative-soft px-2 py-0.5 rounded border border-negative/30">
                        Deficit: {formatCurrencyCompact(shortfall)}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Competing with baseline cashflows. Choose one or more levers below to rebalance the plan:
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Lever 1: Postpone */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-border">
                      <div className="flex items-center gap-2 text-xs text-ink">
                        <Clock size={13} className="text-accent" />
                        <span>Postpone goal by <strong>2 years</strong></span>
                      </div>
                      <Button
                        size="sm"
                        variant={postponeApplied ? 'secondary' : 'outline'}
                        disabled={postponeApplied}
                        onClick={() => handlePostponeGoal(goal, 2)}
                        className="text-xs h-7 px-2.5"
                      >
                        {postponeApplied ? 'Applied' : 'Apply +2 Yrs'}
                      </Button>
                    </div>

                    {/* Lever 2: Increase SIP */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-border">
                      <div className="flex items-center gap-2 text-xs text-ink">
                        <TrendingUp size={13} className="text-positive" />
                        <span>Add <strong>+{formatCurrency(monthlySipRequired)}/mo</strong> SIP</span>
                      </div>
                      <Button
                        size="sm"
                        variant={sipApplied ? 'secondary' : 'outline'}
                        disabled={sipApplied}
                        onClick={() => handleIncreaseSIP(monthlySipRequired, goal.name)}
                        className="text-xs h-7 px-2.5"
                      >
                        {sipApplied ? 'Added' : 'Boost SIP'}
                      </Button>
                    </div>

                    {/* Lever 3: Trim Target */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-border">
                      <div className="flex items-center gap-2 text-xs text-ink">
                        <Scissors size={13} className="text-warning" />
                        <span>Calibrate budget by <strong>-20%</strong></span>
                      </div>
                      <Button
                        size="sm"
                        variant={trimApplied ? 'secondary' : 'outline'}
                        disabled={trimApplied}
                        onClick={() => handleTrimGoalAmount(goal, 0.2)}
                        className="text-xs h-7 px-2.5"
                      >
                        {trimApplied ? 'Calibrated' : 'Trim 20%'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
