import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Drawer } from '../components/ui/Drawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Status } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { NumberInput } from '../components/ui/NumberInput';
import { Select } from '../components/ui/Select';
import { FinancialMetric } from '../components/ui/FinancialMetric';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCalculator } from '../context/CalculatorContext';
import { evaluateGoalConflicts } from '../lib/goalConflictEngine';
import { formatCurrency, formatCurrencyCompact } from '../lib/formatters';
import { guardNumber } from '../lib/planState';
import { GoalConflictMatrix } from '../components/analytics/GoalConflictMatrix';
import { GoalSuccessChart } from '../components/charts/GoalSuccessChart';
import { GoalHorizonTimeline } from '../components/charts/GoalHorizonTimeline';
import { GoalPriorityWaterfall } from '../components/charts/GoalPriorityWaterfall';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { cn } from '../lib/utils';
import type { Goal, GoalPriority } from '../types';

const CURRENT_YEAR = new Date().getFullYear();

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'essential', label: 'Essential (non-negotiable)' },
  { value: 'important', label: 'Important (high priority)' },
  { value: 'aspirational', label: 'Aspirational (discretionary)' },
];

const priorityTone: Record<GoalPriority, 'negative' | 'accent' | 'brass'> = {
  essential: 'negative',
  important: 'accent',
  aspirational: 'brass',
};

interface TimelineRow {
  goal: Goal;
  year: number | null;
  yearsAway: number | null;
  futureCost: number | null;
  coverage: number | null;
  status: Status;
}

export const GoalPlanner = () => {
  const { inputs, riskProfile, wealthResult, addGoal, updateGoal, removeGoal, updateSIP, showToast } = useCalculator();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('timeline');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const conflictResult = useMemo(
    () => evaluateGoalConflicts(inputs, wealthResult),
    [inputs, wealthResult],
  );
  const fundingById = useMemo(
    () => new Map(conflictResult.evaluatedGoals.map((g) => [g.id, g])),
    [conflictResult],
  );
  const successById = useMemo(
    () => new Map(wealthResult.goalResults.map((g) => [g.goal.id, g])),
    [wealthResult.goalResults],
  );

  // Timeline rows sorted by horizon; every derived number is guarded so
  // NaN/Infinity and engine fallbacks never render as results.
  const timelineRows = useMemo((): TimelineRow[] => {
    return [...inputs.goals]
      .sort((a, b) => (a.yearsToGoal || 0) - (b.yearsToGoal || 0))
      .map((goal) => {
        const funding = fundingById.get(goal.id);
        const sim = successById.get(goal.id);
        const usable = wealthResult.isConfigured && goal.targetAmount > 0 && goal.yearsToGoal > 0;

        const coverageRaw = funding ? funding.coveragePercent : sim ? sim.successRate * 100 : null;
        const coverage =
          usable && guardNumber(coverageRaw) !== null
            ? Math.min(100, Math.max(0, coverageRaw as number))
            : null;

        let status: Status = 'incomplete';
        if (usable && coverage !== null) {
          status = coverage >= 100 ? 'on-track' : coverage >= 60 ? 'needs-review' : 'at-risk';
        }

        const futureCost = usable
          ? guardNumber(sim?.futureValue ?? funding?.futureCost ?? null)
          : null;

        return {
          goal,
          year: goal.yearsToGoal > 0 ? CURRENT_YEAR + goal.yearsToGoal : null,
          yearsAway: goal.yearsToGoal > 0 ? goal.yearsToGoal : null,
          futureCost,
          coverage,
          status,
        };
      });
  }, [inputs.goals, wealthResult.isConfigured, fundingById, successById]);

  // Portfolio-level summary across fully-specified goals only.
  const summary = useMemo(() => {
    if (!wealthResult.isConfigured) return { demand: null, coverage: null, passRate: null };
    const usable = inputs.goals.filter((g) => g.targetAmount > 0 && g.yearsToGoal > 0);
    if (usable.length === 0) return { demand: null, coverage: null, passRate: null };
    let demand = 0;
    let allocated = 0;
    usable.forEach((g) => {
      const f = fundingById.get(g.id);
      if (!f) return;
      demand += f.futureCost;
      allocated += f.allocatedWealth;
    });
    const passRate = guardNumber(wealthResult.overallGoalSuccessRate);
    return {
      demand: demand > 0 ? demand : null,
      coverage: demand > 0 ? Math.min(100, Math.round((allocated / demand) * 100)) : null,
      passRate,
    };
  }, [wealthResult.isConfigured, wealthResult.overallGoalSuccessRate, inputs.goals, fundingById]);

  const goalSuccessData = useMemo(
    () =>
      wealthResult.goalResults.map((g) => ({
        name: g.goal.name,
        successRate: Math.round(g.successRate * 1000) / 10,
      })),
    [wealthResult.goalResults],
  );

  const horizonGoals = useMemo(
    () =>
      inputs.goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        yearsToGoal: goal.yearsToGoal,
        priority: goal.priority,
        futureValue: successById.get(goal.id)?.futureValue,
      })),
    [inputs.goals, successById],
  );

  // Combined required SIP across goals vs the current portfolio SIP.
  const sipGap = useMemo(() => {
    if (!wealthResult.isConfigured) return null;
    const required = wealthResult.goalResults.reduce((sum, g) => {
      const v = guardNumber(g.requiredSIP);
      return v === null ? sum : sum + v;
    }, 0);
    const current = guardNumber(wealthResult.monthlySIP) ?? 0;
    return required > 0 && required > current ? Math.ceil(required - current) : null;
  }, [wealthResult.isConfigured, wealthResult.goalResults, wealthResult.monthlySIP]);

  const editingGoal = editingId ? inputs.goals.find((g) => g.id === editingId) ?? null : null;
  const pendingDeleteGoal = pendingDeleteId
    ? inputs.goals.find((g) => g.id === pendingDeleteId) ?? null
    : null;

  const handleAddGoal = () => {
    // addGoal defaults to a blank goal (0 amount, 0 years); the edit drawer
    // opens immediately so the target and horizon are set explicitly.
    const id = addGoal();
    setEditingId(id);
  };

  const handleDeleteGoal = () => {
    if (!pendingDeleteGoal) return;
    removeGoal(pendingDeleteGoal.id);
    showToast(`Removed "${pendingDeleteGoal.name}"`, 'info');
    if (editingId === pendingDeleteGoal.id) setEditingId(null);
    setPendingDeleteId(null);
  };

  // One-click top-up preserved from the previous planner: raises the portfolio
  // SIP by the exact combined gap across goals.
  const handleFundGap = () => {
    if (sipGap === null) return;
    updateSIP({ amount: Math.round((wealthResult.monthlySIP || 0) + sipGap) });
    showToast(`Increased portfolio SIP by ${formatCurrency(sipGap)}/mo to close the goal funding gap`, 'success');
  };

  return (
    <div className="pb-10">
      <PageHeader
        variant="hero"
        eyebrow="Goals"
        title="Every milestone, on one timeline."
        description="Lay each financial goal on the horizon, fund it in priority order, and see where the capital claims collide."
        actions={
          <Button onClick={handleAddGoal}>
            <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
            Add goal
          </Button>
        }
      />

      {inputs.goals.length === 0 ? (
        <EmptyState
          icon={Plus}
          eyebrow="Goals"
          title="No goals yet"
          description="Add the first financial goal for this client."
          action={
            <Button onClick={handleAddGoal}>
              <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
              Add goal
            </Button>
          }
        />
      ) : (
        <>
          {/* Portfolio summary strip — hairline grid, all values guarded. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden mb-8">
            <div className="bg-surface px-4 py-3.5">
              <FinancialMetric
                size="sm"
                label="Goals on the horizon"
                value={String(inputs.goals.length)}
              />
            </div>
            <div className="bg-surface px-4 py-3.5">
              <FinancialMetric
                size="sm"
                label="Total future demand"
                value={summary.demand}
                prefix="₹"
                hint={summary.demand === null ? 'Configure the plan to evaluate demand.' : 'Inflation-adjusted, all goals'}
              />
            </div>
            <div className="bg-surface px-4 py-3.5">
              <FinancialMetric
                size="sm"
                label="Funded by projected wealth"
                value={summary.coverage}
                suffix="%"
                hint={
                  summary.coverage === null
                    ? undefined
                    : summary.coverage >= 100
                      ? 'All goals fully funded'
                      : 'Retirement is funded first'
                }
              />
            </div>
            <div className="bg-surface px-4 py-3.5">
              <FinancialMetric
                size="sm"
                label="Monte Carlo pass rate"
                value={summary.passRate}
                suffix="%"
                hint={`Threshold ≥${riskProfile.goalSuccessThreshold}%`}
              />
            </div>
          </div>

          {sipGap !== null && (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
              <p className="text-sm text-ink leading-relaxed">
                The goals need a combined SIP above the current portfolio contribution — shortfall{' '}
                <span className="font-mono tabular-nums font-medium">{formatCurrency(sipGap)}/mo</span>.
              </p>
              <Button variant="outline" size="sm" onClick={handleFundGap} className="shrink-0">
                Fund gap (+{formatCurrency(sipGap)}/mo)
              </Button>
            </div>
          )}

          <Tabs
            className="mb-8"
            ariaLabel="Goal planner views"
            active={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'timeline', label: 'Timeline' },
              { id: 'conflicts', label: 'Conflicts' },
              { id: 'feasibility', label: 'Feasibility' },
            ]}
          />

          {activeTab === 'timeline' && (
            <motion.section
              key="timeline"
              initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              aria-label="Goal timeline"
            >
              <SectionHeader
                title="Horizon"
                description="Earliest milestone first. Markers turn moss when a goal is fully funded."
                hairline
              />

              <ol className="relative mt-6">
                {/* Vertical rail */}
                <div
                  aria-hidden="true"
                  className="absolute left-[5.05rem] sm:left-[6.3rem] top-2 bottom-8 w-px bg-border"
                />
                {timelineRows.map((row) => (
                  <li key={row.goal.id} className="relative flex gap-3 sm:gap-4 pb-8">
                    {/* Year column */}
                    <div className="w-16 sm:w-20 shrink-0 text-right pt-0.5">
                      <div className="font-mono tabular-nums text-sm text-ink">
                        {row.year ?? '—'}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint mt-0.5">
                        {row.yearsAway !== null ? `${row.yearsAway}y out` : 'Set horizon'}
                      </div>
                    </div>

                    {/* Marker */}
                    <div className="relative shrink-0 pt-2" aria-hidden="true">
                      <span
                        className={cn(
                          'block w-2.5 h-2.5 rounded-full border-2 border-surface shadow-card',
                          row.status === 'on-track' ? 'bg-positive' : 'bg-brass',
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 border-b border-border-subtle pb-6">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-semibold tracking-tight text-ink truncate">
                              {row.goal.name}
                            </h3>
                            <Badge tone={priorityTone[row.goal.priority]}>{row.goal.priority}</Badge>
                            <StatusBadge status={row.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {row.futureCost !== null ? (
                              <>
                                Future cost{' '}
                                <span className="font-mono tabular-nums text-ink-soft">
                                  {formatCurrencyCompact(row.futureCost)}
                                </span>{' '}
                                after inflation
                              </>
                            ) : (
                              'Add a target amount and horizon to evaluate funding.'
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums text-base text-ink">
                            {row.goal.targetAmount > 0 ? formatCurrencyCompact(row.goal.targetAmount) : '—'}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.08em] text-faint">
                            Target (today's ₹)
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                        <div className="w-full max-w-xs">
                          {row.coverage !== null ? (
                            <ProgressBar value={row.coverage} label="Funded" showValue />
                          ) : (
                            <p className="text-xs text-faint">Funding —</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(row.goal.id)}>
                            <Pencil size={13} strokeWidth={1.6} aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:text-negative"
                            onClick={() => setPendingDeleteId(row.goal.id)}
                            aria-label={`Delete ${row.goal.name}`}
                          >
                            <Trash2 size={13} strokeWidth={1.6} aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.section>
          )}

          {activeTab === 'conflicts' && (
            <motion.section
              key="conflicts"
              initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-10"
              aria-label="Goal conflicts"
            >
              <GoalConflictMatrix />
              <div>
                <SectionHeader
                  title="Priority funding waterfall"
                  description="Projected wealth cascades down the priority list — retirement first, then each goal in rank order."
                  hairline
                />
                <div className="mt-4 rounded-lg border border-border bg-surface p-5">
                  <GoalPriorityWaterfall result={conflictResult} />
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'feasibility' && (
            <motion.section
              key="feasibility"
              initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-10"
              aria-label="Goal feasibility"
            >
              {!wealthResult.isConfigured ? (
                <div className="rounded-lg border border-border bg-surface px-5 py-10 text-center">
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Feasibility is evaluated once the plan has income, assets and a SIP. Until
                    then, every probability would be a placeholder — not a result.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <SectionHeader
                      title="Monte Carlo feasibility by goal"
                      description={`Simulated probability of fully funding each goal against the ${riskProfile.goalSuccessThreshold}% threshold.`}
                      hairline
                    />
                    <div className="mt-4 rounded-lg border border-border bg-surface p-5">
                      <GoalSuccessChart
                        data={goalSuccessData}
                        threshold={riskProfile.goalSuccessThreshold}
                      />
                    </div>
                  </div>
                  <div>
                    <SectionHeader
                      title="Goal horizon"
                      description="All milestones on one axis — clustered markers reveal cash-flow crunches."
                      hairline
                    />
                    <div className="mt-4 rounded-lg border border-border bg-surface p-5">
                      <GoalHorizonTimeline goals={horizonGoals} currentAge={inputs.currentAge} />
                    </div>
                  </div>
                </>
              )}
            </motion.section>
          )}
        </>
      )}

      {/* Edit drawer — also the immediate destination of the add flow. */}
      <Drawer
        open={editingGoal !== null}
        onClose={() => setEditingId(null)}
        title={editingGoal ? `Edit goal — ${editingGoal.name}` : 'Edit goal'}
        width={460}
      >
        {editingGoal && (
          <div className="space-y-5">
            <Input
              label="Goal name"
              value={editingGoal.name}
              onChange={(e) => updateGoal(editingGoal.id, { name: e.target.value })}
              placeholder="e.g. Child higher education"
            />
            <CurrencyInput
              label="Target amount"
              value={editingGoal.targetAmount}
              onChange={(v) => updateGoal(editingGoal.id, { targetAmount: v })}
              helper="What this goal should cost in today's rupees."
            />
            <NumberInput
              label="Years to goal"
              value={editingGoal.yearsToGoal}
              onChange={(v) => updateGoal(editingGoal.id, { yearsToGoal: v })}
              min={0}
              max={50}
              helper="Years from now until the money is needed."
            />
            <NumberInput
              label="Inflation"
              value={editingGoal.inflation}
              onChange={(v) => updateGoal(editingGoal.id, { inflation: v })}
              suffix="%"
              min={0}
              max={25}
              helper="Expected annual price rise for this goal."
            />
            <Select
              label="Priority"
              value={editingGoal.priority}
              onChange={(v) => updateGoal(editingGoal.id, { priority: v as GoalPriority })}
              options={priorityOptions}
              helper="Essential goals are funded first when capital is scarce."
            />
            <label className="flex items-start gap-2.5 text-sm text-ink-soft cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editingGoal.recurring}
                onChange={(e) => updateGoal(editingGoal.id, { recurring: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-border accent-accent"
              />
              <span>Recurring milestone — the goal renews each horizon.</span>
            </label>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <Button variant="danger" size="sm" onClick={() => setPendingDeleteId(editingGoal.id)}>
                <Trash2 size={13} strokeWidth={1.6} aria-hidden="true" />
                Delete goal
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={pendingDeleteGoal !== null}
        onConfirm={handleDeleteGoal}
        onCancel={() => setPendingDeleteId(null)}
        title={`Delete ${pendingDeleteGoal?.name ?? 'goal'}?`}
        description="This removes the goal and its funding evaluation from the plan. You can add it again at any time."
        confirmLabel="Delete goal"
        danger
      />

      <WorkflowFooter
        prev={{ path: '/master-plan', label: 'Master Plan' }}
        next={{ path: '/retirement', label: 'Retirement & SWP' }}
        flowHint="Milestones are funded in priority sequence (Essential first) by the wealth projection engine."
      />
    </div>
  );
};
