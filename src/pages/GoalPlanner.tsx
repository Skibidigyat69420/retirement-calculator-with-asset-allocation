import { useState, useMemo, useEffect } from 'react';
import { Target, TrendingUp, PieChart, Plus, AlertTriangle, CheckCircle2, BarChart3, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { useCalculator } from '../context/CalculatorContext';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { GoalConflictMatrix } from '../components/analytics/GoalConflictMatrix';
import type { GoalPriority } from '../types';
import type { GoalResult } from '../lib/wealthEngine';

const HISTOGRAM_MARGIN = { top: 10, right: 10, left: 0, bottom: 40 };
const HISTOGRAM_TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #e4e4e7',
  backgroundColor: '#ffffff',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  padding: '10px 14px',
};

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'essential', label: 'Essential (Non-negotiable)' },
  { value: 'important', label: 'Important (High Priority)' },
  { value: 'aspirational', label: 'Aspirational (Discretionary)' },
];

export const GoalPlanner = () => {
  const { inputs, riskProfile, wealthResult, updateGoal, addGoal, removeGoal, showToast } = useCalculator();
  const [selectedGoalId, setSelectedGoalId] = useState<string>(inputs.goals[0]?.id || '');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Synchronize selected goal if goals are added, removed, or switched externally
  useEffect(() => {
    if (inputs.goals.length > 0 && !inputs.goals.some((g) => g.id === selectedGoalId)) {
      setSelectedGoalId(inputs.goals[0].id);
    } else if (inputs.goals.length === 0 && selectedGoalId !== '') {
      setSelectedGoalId('');
    }
  }, [inputs.goals, selectedGoalId]);

  const selectedGoal = useMemo(
    () => inputs.goals.find((g) => g.id === selectedGoalId) || inputs.goals[0],
    [inputs.goals, selectedGoalId],
  );

  const simulation = useMemo((): GoalResult | null => {
    if (!selectedGoal) return null;
    const found = wealthResult.goalResults.find((g) => g.goal.id === selectedGoal.id);
    if (found) return found;

    // Instant fallback simulation while deferred Monte Carlo calculation runs
    const inflationRate = selectedGoal.inflation ?? inputs.inflation ?? 5;
    const fv = selectedGoal.targetAmount * Math.pow(1 + inflationRate / 100, selectedGoal.yearsToGoal);
    const expectedReturn = 0.11;
    const r = expectedReturn / 12;
    const n = Math.max(1, selectedGoal.yearsToGoal * 12);
    const requiredSIP = r === 0 ? fv / n : (fv * r) / (Math.pow(1 + r, n) - 1);
    const pvNeeded = fv / Math.pow(1 + expectedReturn, selectedGoal.yearsToGoal);

    return {
      goal: { ...selectedGoal, futureValue: Math.round(fv) },
      futureValue: Math.round(fv),
      pvNeeded: Math.round(pvNeeded),
      successRate: 0.85,
      requiredSIP: Math.round(requiredSIP),
      probabilityDistribution: [],
      shortfallProbability: 0.15,
      expectedShortfall: 0,
    };
  }, [wealthResult.goalResults, selectedGoal, inputs.inflation]);

  // Total required SIP across all configured goals
  const totalRequiredSIP = useMemo(() => {
    return inputs.goals.reduce((sum, goal) => {
      const g = wealthResult.goalResults.find((res) => res.goal.id === goal.id);
      if (g) return sum + g.requiredSIP;
      const inflationRate = goal.inflation ?? inputs.inflation ?? 5;
      const fv = goal.targetAmount * Math.pow(1 + inflationRate / 100, goal.yearsToGoal);
      const r = 0.11 / 12;
      const n = Math.max(1, goal.yearsToGoal * 12);
      const req = r === 0 ? fv / n : (fv * r) / (Math.pow(1 + r, n) - 1);
      return sum + Math.round(req);
    }, 0);
  }, [inputs.goals, inputs.inflation, wealthResult.goalResults]);

  // Allocate total portfolio SIP proportionally based on each goal's required SIP weight
  const allocatedSIP = useMemo(() => {
    if (!simulation || totalRequiredSIP <= 0) return 0;
    return (wealthResult.monthlySIP * simulation.requiredSIP) / totalRequiredSIP;
  }, [simulation, totalRequiredSIP, wealthResult.monthlySIP]);

  const histogramData = useMemo(() => {
    if (!simulation || !simulation.probabilityDistribution || simulation.probabilityDistribution.length === 0) return [];
    return simulation.probabilityDistribution.map((bin) => ({
      label: `${formatCurrency(bin.binStart)} - ${formatCurrency(bin.binEnd)}`,
      midpoint: (bin.binStart + bin.binEnd) / 2,
      probability: Number((bin.probability * 100).toFixed(1)),
      count: bin.count,
      isSuccess: bin.binStart >= simulation.futureValue,
    }));
  }, [simulation]);

  const handleAddGoal = () => {
    const newId = addGoal({
      name: `Goal ${inputs.goals.length + 1}`,
      targetAmount: 1500000,
      yearsToGoal: 5,
      priority: 'important',
      inflation: inputs.inflation || 5,
    });
    if (newId) {
      setSelectedGoalId(newId);
      showToast('New goal added', 'info');
    }
  };

  const handleDeleteGoal = (id: string) => {
    const remaining = inputs.goals.filter((g) => g.id !== id);
    removeGoal(id);
    setConfirmDeleteId(null);
    if (remaining.length > 0) {
      setSelectedGoalId(remaining[0].id);
    } else {
      setSelectedGoalId('');
    }
    showToast('Goal removed', 'info');
  };

  if (inputs.goals.length === 0 || !selectedGoal || !simulation) {
    return (
      <div className="space-y-6">
        <SectionTitle
          title="Goal Planner"
          subtitle="Monte Carlo goal feasibility, required SIP sizing, and cash flow priority analysis."
          badge="Monte Carlo"
        />
        <Card className="flex flex-col items-center justify-center py-16 text-center bg-white border border-zinc-200">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4 border border-zinc-200">
            <Target size={28} />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1.5">No Goals Configured</h3>
          <p className="text-zinc-600 mb-6 max-w-md text-sm">
            Add financial milestone goals to evaluate future capital requirements, simulated success rates, and required monthly SIP.
          </p>
          <Button type="button" onClick={handleAddGoal} className="flex items-center gap-2">
            <Plus size={16} /> Add Milestone Goal
          </Button>
        </Card>
      </div>
    );
  }

  const isSelectedGoalFullyFunded = simulation.successRate >= riskProfile.goalSuccessThreshold / 100;
  const isSelectedGoalModerate = simulation.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6;
  const sipGap = simulation.requiredSIP - allocatedSIP;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Goal Planner"
        subtitle="Monte Carlo goal feasibility, required SIP sizing, and cash flow priority analysis."
        badge="Monte Carlo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Goal Navigation & Selector */}
        <Card className="lg:col-span-1 bg-white border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-zinc-500" />
              <h3 className="text-base font-bold text-zinc-900">Milestones</h3>
              <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                {inputs.goals.length}
              </span>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={handleAddGoal} aria-label="Add goal" className="h-8 px-2.5">
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            {inputs.goals.map((goal) => {
              const g = wealthResult.goalResults.find((res) => res.goal.id === goal.id);
              const isSelected = selectedGoalId === goal.id;
              const successRate = g ? g.successRate : 0.85;
              const isFunded = g ? successRate >= riskProfile.goalSuccessThreshold / 100 : false;
              const isLow = g ? successRate < (riskProfile.goalSuccessThreshold / 100) * 0.6 : false;

              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoalId(goal.id)}
                  type="button"
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{goal.name}</span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
                        isSelected
                          ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                          : goal.priority === 'essential'
                            ? 'bg-zinc-900 text-white border-zinc-800'
                            : goal.priority === 'important'
                              ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                              : 'bg-white text-zinc-600 border-zinc-300'
                      }`}
                    >
                      {goal.priority}
                    </span>
                  </div>
                  <div className={`text-xs mt-1.5 flex items-center justify-between ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span
                      className={
                        isSelected
                          ? 'text-zinc-200 font-semibold'
                          : !g
                            ? 'text-zinc-500 font-medium'
                            : isFunded
                              ? 'text-emerald-700 font-semibold'
                              : isLow
                                ? 'text-rose-700 font-semibold'
                                : 'text-zinc-700 font-semibold'
                      }
                    >
                      {g ? `${formatPercent(successRate * 100)} success` : 'Simulating...'}
                    </span>
                    <span className="font-mono">{formatCurrencyCompact(goal.targetAmount)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right Columns: Active Goal Detail, Metrics, Histogram & Summary */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          {/* Top Section: Goal Form & Topline Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Goal Configuration Card */}
            <Card className="bg-white border border-zinc-200/90 shadow-2xs min-w-0">
              <div className="flex justify-between items-start gap-2 mb-3 pb-3 border-b border-zinc-100">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Selected Goal</div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={selectedGoal.name}
                      onChange={(e) => updateGoal(selectedGoal.id, { name: e.target.value })}
                      aria-label={`Goal name: ${selectedGoal.name}`}
                      className="text-lg font-bold text-zinc-950 bg-transparent border-b border-zinc-200 hover:border-zinc-400 focus:border-zinc-950 focus:outline-none transition-colors w-full min-w-0 py-0.5"
                    />
                    {confirmDeleteId === selectedGoal.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(selectedGoal.id)}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-700 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded-md text-xs font-medium hover:bg-zinc-200 border border-zinc-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(selectedGoal.id)}
                        className="text-zinc-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-50 shrink-0"
                        aria-label="Delete selected goal"
                        title="Delete goal"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <Badge
                  variant={selectedGoal.priority === 'essential' ? 'navy' : selectedGoal.priority === 'important' ? 'default' : 'outline'}
                >
                  {selectedGoal.priority}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CurrencyInput
                  label="Target Cost (Today's ₹)"
                  value={selectedGoal.targetAmount}
                  onChange={(v) => updateGoal(selectedGoal.id, { targetAmount: v })}
                />
                <NumberInput
                  label="Years to Goal"
                  value={selectedGoal.yearsToGoal}
                  onChange={(v) => updateGoal(selectedGoal.id, { yearsToGoal: v })}
                  min={1}
                  max={50}
                />
                <NumberInput
                  label="Category Inflation"
                  value={selectedGoal.inflation}
                  onChange={(v) => updateGoal(selectedGoal.id, { inflation: v })}
                  suffix="%"
                  min={0}
                  max={25}
                />
                <Select
                  label="Priority Tier"
                  value={selectedGoal.priority}
                  onChange={(v) => updateGoal(selectedGoal.id, { priority: v as GoalPriority })}
                  options={priorityOptions}
                />
                <div className="col-span-2 flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedGoal.recurring}
                      onChange={(e) => updateGoal(selectedGoal.id, { recurring: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-900"
                    />
                    <span>Recurring annual milestone (funds renew each horizon)</span>
                  </label>
                </div>
              </div>
            </Card>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <MetricCard
                label="Simulated Success Rate"
                value={formatPercent(simulation.successRate * 100)}
                subtext={`Target threshold: ≥${riskProfile.goalSuccessThreshold}%`}
                icon={<CheckCircle2 size={16} />}
                variant={
                  isSelectedGoalFullyFunded
                    ? 'success'
                    : isSelectedGoalModerate
                      ? 'default'
                      : 'danger'
                }
              />
              <MetricCard
                label="Future Value Demand"
                value={formatCurrencyCompact(simulation.futureValue)}
                subtext={`In ${selectedGoal.yearsToGoal}y (${formatCurrency(simulation.futureValue)})`}
                icon={<Target size={16} />}
                variant="navy"
              />
              <MetricCard
                label="PV Needed Today"
                value={formatCurrencyCompact(simulation.pvNeeded)}
                subtext={`Discounted lump sum (${formatCurrency(simulation.pvNeeded)})`}
                icon={<TrendingUp size={16} />}
                variant="default"
              />
              <MetricCard
                label="Required Monthly SIP"
                value={formatCurrencyCompact(simulation.requiredSIP)}
                subtext={`Targeted SIP (${formatCurrency(simulation.requiredSIP)})`}
                icon={<PieChart size={16} />}
                variant="default"
              />
            </div>
          </div>

          {/* Middle Section: Outcome Distribution Histogram & Goal Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outcome Distribution Histogram */}
            <Card className="bg-white border border-zinc-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-zinc-500" />
                  <h3 className="text-base font-bold text-zinc-900">Outcome Distribution</h3>
                </div>
                <div className="text-xs font-mono font-medium text-zinc-500">
                  {wealthResult.monteCarlo.outcomes.length.toLocaleString()} simulated paths
                </div>
              </div>

              <div className="h-72 w-full">
                {histogramData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData} margin={HISTOGRAM_MARGIN}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis
                        dataKey="midpoint"
                        tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        angle={-45}
                        textAnchor="end"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 11, fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value: any, _name: any, props: any) => {
                          const p = props?.payload;
                          return [`${formatPercent(Number(value))} chance`, `Range: ${formatCurrency(p?.midpoint)}`];
                        }}
                        contentStyle={HISTOGRAM_TOOLTIP_STYLE}
                      />
                      <ReferenceLine
                        x={simulation.futureValue}
                        stroke="#18181b"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        label={{ value: 'Target FV', position: 'top', fill: '#18181b', fontSize: 10, fontWeight: 600 }}
                      />
                      <Bar dataKey="probability" name="Probability" radius={[3, 3, 0, 0]}>
                        {histogramData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isSuccess ? '#18181b' : '#d4d4d8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
                    <BarChart3 size={24} className="animate-pulse text-zinc-300" />
                    <span>Running Monte Carlo simulation paths...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-6 mt-3 text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-zinc-900 inline-block" />
                  Funded region (≥ Target FV)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-zinc-300 inline-block" />
                  Shortfall region (&lt; Target FV)
                </span>
              </div>
            </Card>

            {/* Feasibility Breakdown & Cash Flow Allocation */}
            <Card className="bg-white border border-zinc-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-zinc-500" />
                  <h3 className="text-base font-bold text-zinc-900">Goal Feasibility & Cash Flow</h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* Feasibility Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    isSelectedGoalFullyFunded
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : isSelectedGoalModerate
                        ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  {isSelectedGoalFullyFunded ? (
                    <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  ) : isSelectedGoalModerate ? (
                    <AlertTriangle size={18} className="text-zinc-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-700 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-semibold">
                      {isSelectedGoalFullyFunded
                        ? 'Goal Fully Funded'
                        : isSelectedGoalModerate
                          ? 'Moderate Funding Gap'
                          : 'Significant Unfunded Gap'}
                    </div>
                    <p
                      className={`text-xs mt-0.5 leading-relaxed ${
                        isSelectedGoalFullyFunded
                          ? 'text-emerald-800'
                          : isSelectedGoalModerate
                            ? 'text-zinc-600'
                            : 'text-rose-800'
                      }`}
                    >
                      {isSelectedGoalFullyFunded
                        ? `${formatPercent(simulation.successRate * 100)} simulated probability of fully funding this goal with current allocation and SIP.`
                        : isSelectedGoalModerate
                          ? `${formatPercent(simulation.successRate * 100)} simulated probability. Consider raising monthly SIP or extending target horizon.`
                          : `${formatPercent(simulation.successRate * 100)} simulated probability. Substantial shortfall risk under current parameters.`}
                    </p>
                  </div>
                </div>

                {/* Quantitative Details */}
                <div className="space-y-2 text-xs border border-zinc-100 rounded-xl p-3.5 bg-zinc-50/50">
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Goal target (today's ₹)</span>
                    <span className="font-mono font-medium text-zinc-900">{formatCurrency(selectedGoal.targetAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Inflation-adjusted target FV</span>
                    <span className="font-mono font-medium text-zinc-900">{formatCurrency(simulation.futureValue)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Present value needed today</span>
                    <span className="font-mono font-medium text-zinc-900">{formatCurrency(simulation.pvNeeded)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Required monthly SIP</span>
                    <span className="font-mono font-semibold text-zinc-900">{formatCurrency(simulation.requiredSIP)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Total portfolio SIP</span>
                    <span className="font-mono font-medium text-zinc-900">{formatCurrency(wealthResult.monthlySIP)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Combined SIP demand (all goals)</span>
                    <span className="font-mono font-medium text-zinc-900">{formatCurrency(totalRequiredSIP)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Allocated monthly SIP (proportional)</span>
                    <span className="font-mono font-medium text-zinc-900">{formatCurrency(allocatedSIP)}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2 font-medium">
                    <span className="text-zinc-700">Monthly SIP gap / surplus</span>
                    <span
                      className={`font-mono font-bold ${
                        sipGap <= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {sipGap <= 0
                        ? `+${formatCurrency(Math.abs(sipGap))} surplus`
                        : `-${formatCurrency(sipGap)} gap`}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom Section: All Goals Summary Table */}
          <Card className="bg-white border border-zinc-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <PieChart size={18} className="text-zinc-500" />
                <h3 className="text-base font-bold text-zinc-900">All Goals Summary</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {inputs.goals.length} configured milestone{inputs.goals.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Goals summary table">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <th className="py-2.5 pr-4">Goal</th>
                    <th className="py-2.5 pr-4">Priority</th>
                    <th className="py-2.5 pr-4 text-right">Horizon</th>
                    <th className="py-2.5 pr-4 text-right">Future Value</th>
                    <th className="py-2.5 pr-4 text-right">PV Needed</th>
                    <th className="py-2.5 pr-4 text-right">Required SIP</th>
                    <th className="py-2.5 pr-4 text-right">Success Rate</th>
                    <th className="py-2.5 pr-4 text-right">Shortfall Risk</th>
                    <th className="py-2.5 pl-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {inputs.goals.map((goal) => {
                    const g = wealthResult.goalResults.find((res) => res.goal.id === goal.id);
                    const isSelected = selectedGoalId === goal.id;
                    const inflationRate = goal.inflation ?? inputs.inflation ?? 5;
                    const futureVal = g?.futureValue ?? Math.round(goal.targetAmount * Math.pow(1 + inflationRate / 100, goal.yearsToGoal));
                    const pvNeeded = g?.pvNeeded ?? Math.round(futureVal / Math.pow(1.11, goal.yearsToGoal));
                    const requiredSIP = g?.requiredSIP ?? 0;
                    const successRate = g?.successRate ?? 0.85;
                    const isFunded = g ? successRate >= riskProfile.goalSuccessThreshold / 100 : false;
                    const isLow = g ? successRate < (riskProfile.goalSuccessThreshold / 100) * 0.6 : false;

                    return (
                      <tr
                        key={goal.id}
                        onClick={() => setSelectedGoalId(goal.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-zinc-100/70 font-medium' : 'hover:bg-zinc-50/80'
                        }`}
                      >
                        <td className="py-2.5 pr-4 font-semibold text-zinc-950">
                          {goal.name}
                          {isSelected && <span className="ml-2 text-[10px] font-mono text-zinc-500">(Selected)</span>}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge
                            variant={
                              goal.priority === 'essential'
                                ? 'navy'
                                : goal.priority === 'important'
                                  ? 'default'
                                  : 'outline'
                            }
                          >
                            {goal.priority}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono text-zinc-600">
                          {goal.yearsToGoal}y
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono font-medium text-zinc-900">
                          {formatCurrencyCompact(futureVal)}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono text-zinc-600">
                          {formatCurrencyCompact(pvNeeded)}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono font-semibold text-zinc-900">
                          {requiredSIP > 0 ? formatCurrency(requiredSIP) : '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono font-bold">
                          {g ? (
                            <span
                              className={
                                isFunded
                                  ? 'text-emerald-700'
                                  : isLow
                                    ? 'text-rose-700'
                                    : 'text-zinc-800'
                              }
                            >
                              {formatPercent(successRate * 100)}
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-normal">Simulating...</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono text-zinc-600">
                          {g ? (
                            <span className={g.shortfallProbability > 0.3 ? 'text-rose-700 font-semibold' : ''}>
                              {formatPercent(g.shortfallProbability * 100)}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 text-center">
                          {!g ? (
                            <Badge variant="outline">Pending</Badge>
                          ) : isFunded ? (
                            <Badge variant="success">Funded</Badge>
                          ) : isLow ? (
                            <Badge variant="danger">Gap</Badge>
                          ) : (
                            <Badge variant="warning">At Risk</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Goal Conflict Matrix & Capital Waterfall */}
      <GoalConflictMatrix />

      <WorkflowFooter
        prev={{ path: '/master-plan', label: 'Master Plan' }}
        next={{ path: '/retirement', label: 'Retirement & SWP' }}
        flowHint="Milestones are funded in priority sequence (Essential first) by the wealth projection engine."
      />
    </div>
  );
};
