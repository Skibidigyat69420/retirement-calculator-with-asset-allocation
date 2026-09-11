import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Scissors,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { useCalculator } from '../../context/CalculatorContext';
import {
  evaluateGoalConflicts,
  type EvaluatedGoalDemand,
  type GoalConflictResult,
} from '../../lib/goalConflictEngine';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';

interface GoalConflictResolverProps {
  onNavigateToStep?: (step: string) => void;
}

/**
 * Step-through resolver for goal funding conflicts. Walks the at-risk goals
 * one at a time; each step offers three levers — postpone the horizon, add a
 * dedicated SIP, or trim the target — all of which write back to the plan.
 */
export const GoalConflictResolver = ({ onNavigateToStep: _onNavigateToStep }: GoalConflictResolverProps) => {
  const { inputs, wealthResult, updateGoal, updateSIP, showToast } = useCalculator();

  const conflictResult: GoalConflictResult = useMemo(
    () => evaluateGoalConflicts(inputs, wealthResult),
    [inputs, wealthResult],
  );

  const configured = wealthResult.isConfigured;
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [stepIdx, setStepIdx] = useState(0);

  const atRiskGoals = useMemo(
    () =>
      conflictResult.evaluatedGoals.filter(
        (g) => g.fundedStatus === 'Partially Funded' || g.fundedStatus === 'Unfunded / At Risk' || g.shortfall > 0,
      ),
    [conflictResult.evaluatedGoals],
  );

  const clampedIdx = atRiskGoals.length > 0 ? Math.min(stepIdx, atRiskGoals.length - 1) : 0;
  const current: EvaluatedGoalDemand | null = atRiskGoals[clampedIdx] ?? null;

  // Lever 1: postpone the horizon — always available, edits goal input only.
  const handlePostponeGoal = (goal: EvaluatedGoalDemand, years = 2) => {
    const existing = inputs.goals.find((g) => g.id === goal.id);
    if (!existing) return;
    const updatedYears = (existing.yearsToGoal ?? 0) + years;
    updateGoal(goal.id, { yearsToGoal: updatedYears });
    setApplied((prev) => ({ ...prev, [`postpone-${goal.id}`]: true }));
    showToast(`Postponed "${goal.name}" by ${years} years (target year ${new Date().getFullYear() + updatedYears})`, 'success');
  };

  // Lever 2: raise the portfolio SIP by the straight-line monthly shortfall.
  const handleIncreaseSIP = (monthlyIncrease: number, goalName: string) => {
    updateSIP({ amount: Math.round((inputs.sip.amount || 0) + monthlyIncrease) });
    setApplied((prev) => ({ ...prev, [`sip-${goalName}`]: true }));
    showToast(`Increased monthly SIP by ${formatCurrency(monthlyIncrease)}/mo to support "${goalName}"`, 'success');
  };

  // Lever 3: trim the target — always available, edits goal input only.
  const handleTrimGoalAmount = (goal: EvaluatedGoalDemand, discountPercent = 0.2) => {
    const existing = inputs.goals.find((g) => g.id === goal.id);
    if (!existing) return;
    const newAmount = Math.round(existing.targetAmount * (1 - discountPercent));
    updateGoal(goal.id, { targetAmount: newAmount });
    setApplied((prev) => ({ ...prev, [`trim-${goal.id}`]: true }));
    showToast(`Calibrated "${goal.name}" target from ${formatCurrency(existing.targetAmount)} to ${formatCurrency(newAmount)}`, 'info');
  };

  if (!inputs.goals || inputs.goals.length === 0) return null;

  const demandLabel = configured ? formatCurrencyCompact(conflictResult.totalHouseholdDemand) : '—';
  const wealthLabel = configured ? formatCurrencyCompact(conflictResult.projectedAvailableWealth) : '—';

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="eyebrow mb-1.5">Conflict resolver</div>
            <h3 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-2">
              <Layers size={17} strokeWidth={1.6} className="text-accent" aria-hidden="true" />
              Resolving competing capital claims
            </h3>
          </div>
          <div className="font-mono text-xs text-muted tabular-nums">
            Demand <span className="text-ink">{demandLabel}</span>
            <span className="mx-2 text-border-strong">/</span>
            Wealth <span className="text-ink">{wealthLabel}</span>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5">
        {!configured ? (
          <p className="text-sm text-muted leading-relaxed max-w-prose">
            Add income, assets and a SIP to size the shortfall. The levers below stay available —
            they edit the goals directly — but no deficit can be quoted until the plan is
            configured.
          </p>
        ) : atRiskGoals.length === 0 ? (
          <div className="flex items-start gap-3 py-1">
            <CheckCircle2 size={18} strokeWidth={1.6} className="text-positive shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-ink">No conflicting claims.</p>
              <p className="text-xs text-muted mt-1 leading-relaxed max-w-prose">
                {conflictResult.tradeOffSummary}
              </p>
            </div>
          </div>
        ) : current ? (
          <div className="space-y-5">
            {/* Step indicator */}
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
                  Goal {clampedIdx + 1} of {atRiskGoals.length}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted">
                  {atRiskGoals.length - clampedIdx - 1 > 0
                    ? `${atRiskGoals.length - clampedIdx - 1} remaining after this`
                    : 'Last unresolved goal'}
                </span>
              </div>
              <ProgressBar value={clampedIdx + 1} max={atRiskGoals.length} />
            </div>

            {/* Current goal facts */}
            <div className="border-t border-b border-border-subtle py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h4 className="font-display text-2xl text-ink">{current.name}</h4>
                <span className="font-mono text-xs uppercase tracking-[0.08em] text-warning">
                  {configured
                    ? `Shortfall ${formatCurrencyCompact(current.shortfall)}`
                    : 'Shortfall —'}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-subtle border border-border-subtle rounded-md overflow-hidden text-xs">
                {[
                  { label: 'Target year', value: String(current.targetYear) },
                  { label: 'Future cost', value: formatCurrencyCompact(current.futureCost) },
                  { label: 'Coverage', value: configured ? `${current.coveragePercent}%` : '—' },
                  { label: 'Priority', value: `#${current.priorityRank}` },
                ].map((fact) => (
                  <div key={fact.label} className="bg-surface px-3 py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.08em] text-faint">{fact.label}</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Levers */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Levers — apply one or more
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-canvas px-3.5 py-2.5">
                <span className="flex items-center gap-2.5 text-sm text-ink">
                  <Clock size={14} strokeWidth={1.6} className="text-accent shrink-0" aria-hidden="true" />
                  Postpone the goal by two years
                </span>
                <Button
                  size="sm"
                  variant={applied[`postpone-${current.id}`] ? 'secondary' : 'outline'}
                  disabled={applied[`postpone-${current.id}`]}
                  onClick={() => handlePostponeGoal(current, 2)}
                >
                  {applied[`postpone-${current.id}`] ? 'Applied' : 'Apply +2 yrs'}
                </Button>
              </div>

              {configured && (() => {
                const shortfall = current.shortfall || Math.round(current.futureCost * 0.35);
                const monthlySipRequired = Math.round(shortfall / Math.max(12, current.yearsAway * 12));
                return (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-canvas px-3.5 py-2.5">
                    <span className="flex items-center gap-2.5 text-sm text-ink">
                      <TrendingUp size={14} strokeWidth={1.6} className="text-positive shrink-0" aria-hidden="true" />
                      Add <span className="font-mono tabular-nums">{formatCurrency(monthlySipRequired)}/mo</span> to the SIP
                    </span>
                    <Button
                      size="sm"
                      variant={applied[`sip-${current.name}`] ? 'secondary' : 'outline'}
                      disabled={applied[`sip-${current.name}`]}
                      onClick={() => handleIncreaseSIP(monthlySipRequired, current.name)}
                    >
                      {applied[`sip-${current.name}`] ? 'Added' : 'Boost SIP'}
                    </Button>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-canvas px-3.5 py-2.5">
                <span className="flex items-center gap-2.5 text-sm text-ink">
                  <Scissors size={14} strokeWidth={1.6} className="text-warning shrink-0" aria-hidden="true" />
                  Calibrate the target down by 20%
                </span>
                <Button
                  size="sm"
                  variant={applied[`trim-${current.id}`] ? 'secondary' : 'outline'}
                  disabled={applied[`trim-${current.id}`]}
                  onClick={() => handleTrimGoalAmount(current, 0.2)}
                >
                  {applied[`trim-${current.id}`] ? 'Calibrated' : 'Trim 20%'}
                </Button>
              </div>
            </div>

            {/* Step controls */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={clampedIdx === 0}
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft size={14} strokeWidth={1.6} aria-hidden="true" />
                Previous
              </Button>
              <span className="font-mono text-[11px] tabular-nums text-faint">
                {clampedIdx + 1} / {atRiskGoals.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={clampedIdx >= atRiskGoals.length - 1}
                onClick={() => setStepIdx((i) => Math.min(atRiskGoals.length - 1, i + 1))}
              >
                Next
                <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {!configured && (
        <div className="px-5 sm:px-6 pb-5">
          <p className="flex items-start gap-2 text-xs text-faint leading-relaxed">
            <AlertTriangle size={13} strokeWidth={1.6} className="shrink-0 mt-0.5" aria-hidden="true" />
            Funding status is shown only once the plan is configured — a zero plan is 'not
            started', never '0% funded'.
          </p>
        </div>
      )}
    </div>
  );
};
