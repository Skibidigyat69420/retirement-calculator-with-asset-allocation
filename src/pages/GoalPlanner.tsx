import { useState, useMemo } from 'react';
import { Target, TrendingUp, PieChart, Plus, AlertTriangle, CheckCircle2, BarChart3, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { useCalculator } from '../context/CalculatorContext';
import { ASSET_COLORS } from '../lib/constants';
import type { GoalPriority } from '../types';

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'essential', label: 'Essential' },
  { value: 'important', label: 'Important' },
  { value: 'aspirational', label: 'Aspirational' },
];

export const GoalPlanner = () => {
  const { inputs, riskProfile, wealthResult, updateGoal, addGoal, removeGoal } = useCalculator();
  const [selectedGoalId, setSelectedGoalId] = useState<string>(inputs.goals[0]?.id || '');

  const selectedGoal = useMemo(
    () => inputs.goals.find((g) => g.id === selectedGoalId) || inputs.goals[0],
    [inputs.goals, selectedGoalId],
  );

  const simulation = useMemo(
    () => wealthResult.goalResults.find((g) => g.goal.id === selectedGoal?.id) || wealthResult.goalResults[0],
    [wealthResult.goalResults, selectedGoal],
  );

  const histogramData = useMemo(() => {
    if (!simulation) return [];
    return simulation.probabilityDistribution.map((bin) => ({
      label: `${formatCurrency(bin.binStart)} - ${formatCurrency(bin.binEnd)}`,
      midpoint: (bin.binStart + bin.binEnd) / 2,
      probability: bin.probability * 100,
      count: bin.count,
      isSuccess: bin.binStart >= simulation.futureValue,
    }));
  }, [simulation]);

  if (inputs.goals.length === 0 || !selectedGoal || !simulation) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Goal Planner" subtitle="Probability-based goal planning with PV, success rate, and distribution analysis." badge="Monte Carlo" />
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Target size={48} className="text-stone-200 mb-4" />
          <h3 className="text-lg font-serif text-navy mb-2">No Goals Defined</h3>
          <p className="text-stone-500 mb-6 max-w-md">Create your first financial goal to see Monte Carlo simulations, success probabilities, and required SIP amounts.</p>
          <Button onClick={() => addGoal()} className="flex items-center gap-2">
            <Plus size={16} /> Create your first goal
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Goal Planner"
        subtitle="Probability-based goal planning: future value, present value required, probability of success, and the SIP needed to get there."
        badge="Monte Carlo"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <Target size={18} className="text-gold" /> Goals
            </h3>
            <Button variant="outline" size="sm" onClick={() => addGoal()}>
              <Plus size={14} />
            </Button>
          </div>
          <div className="space-y-2">
            {wealthResult.goalResults.map((g) => (
              <button
                key={g.goal.id}
                onClick={() => setSelectedGoalId(g.goal.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selectedGoalId === g.goal.id ? 'bg-navy text-white border-navy' : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate pr-2">{g.goal.name}</span>
                  <Badge
                    variant={g.goal.priority === 'essential' ? 'danger' : g.goal.priority === 'important' ? 'default' : 'outline'}
                    className={selectedGoalId === g.goal.id ? 'border-white/30 text-white' : ''}
                  >
                    {g.goal.priority}
                  </Badge>
                </div>
                <div className={`text-xs mt-1 ${selectedGoalId === g.goal.id ? 'text-white/70' : 'text-stone-500'}`}>
                  {formatPercent(g.successRate * 100)} success · {formatCurrency(g.goal.targetAmount)}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="subtle">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Selected Goal</div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={selectedGoal.name}
                      onChange={(e) => updateGoal(selectedGoal.id, { name: e.target.value })}
                      className="text-xl font-serif text-navy bg-transparent border-b border-transparent hover:border-stone-300 focus:border-gold focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => { if (confirm('Delete this goal?')) removeGoal(selectedGoal.id); }}
                      className="text-stone-400 hover:text-red-600 transition-colors p-1"
                      title="Delete goal"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <Badge variant={selectedGoal.priority === 'essential' ? 'danger' : selectedGoal.priority === 'important' ? 'default' : 'outline'}>
                  {selectedGoal.priority}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <NumberInput label="Target Amount" value={selectedGoal.targetAmount} onChange={(v) => updateGoal(selectedGoal.id, { targetAmount: v })} />
                <NumberInput label="Years to Goal" value={selectedGoal.yearsToGoal} onChange={(v) => updateGoal(selectedGoal.id, { yearsToGoal: v })} />
                <NumberInput label="Inflation" value={selectedGoal.inflation} onChange={(v) => updateGoal(selectedGoal.id, { inflation: v })} suffix="%" />
                <Select label="Priority" value={selectedGoal.priority} onChange={(v) => updateGoal(selectedGoal.id, { priority: v as GoalPriority })} options={priorityOptions} />
                <div className="col-span-2 flex justify-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedGoal.recurring}
                      onChange={(e) => updateGoal(selectedGoal.id, { recurring: e.target.checked })}
                      className="accent-gold"
                    />
                    Recurring goal
                  </label>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard
                label="Probability of Success"
                value={formatPercent(simulation.successRate * 100)}
                subtext="Monte Carlo simulation"
                variant={
                  simulation.successRate >= riskProfile.goalSuccessThreshold / 100
                    ? 'success'
                    : simulation.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6
                      ? 'default'
                      : 'danger'
                }
              />
              <MetricCard label="Future Value Needed" value={formatCurrency(simulation.futureValue)} subtext={`In ${selectedGoal.yearsToGoal} years`} variant="navy" />
              <MetricCard label="PV Needed Today" value={formatCurrency(simulation.pvNeeded)} subtext="Discounted at portfolio mean" variant="gold" />
              <MetricCard label="Required SIP" value={formatCurrency(simulation.requiredSIP)} subtext="Per month, real terms" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif text-navy flex items-center gap-2">
                  <BarChart3 size={18} className="text-gold" /> Outcome Distribution
                </h3>
                <div className="text-xs text-stone-500">{wealthResult.monteCarlo.outcomes.length.toLocaleString()} paths</div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                    <XAxis
                      dataKey="midpoint"
                      tickFormatter={(v) => {
                        const n = Number(v);
                        if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
                        if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
                        return '₹' + (n / 1000).toFixed(0) + 'K';
                      }}
                      tick={{ fontSize: 10, fill: '#78716c' }}
                      angle={-45}
                      textAnchor="end"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value: any, _name: any, props: any) => {
                        const p = props?.payload;
                        return [`${formatPercent(Number(value))} chance`, `Range: ${formatCurrency(p?.midpoint)}`];
                      }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <ReferenceLine x={simulation.futureValue} stroke="#B68B40" strokeDasharray="4 4" label={{ value: 'Target', position: 'top', fill: '#B68B40', fontSize: 10 }} />
                    <Bar dataKey="probability" name="Probability">
                      {histogramData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isSuccess ? ASSET_COLORS.equity : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-stone-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ASSET_COLORS.equity }} /> Success region</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-400" /> Shortfall region</span>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-gold" /> Goal Insights
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-start gap-3">
                    {simulation.successRate >= riskProfile.goalSuccessThreshold / 100 ? (
                      <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                    ) : (
                      <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-navy">
                        {simulation.successRate >= riskProfile.goalSuccessThreshold / 100
                          ? 'On track to meet this goal'
                          : simulation.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6
                            ? 'Needs attention — consider increasing SIP or extending horizon'
                            : 'Significant shortfall risk — revise plan'}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        With the current portfolio and SIP, the model estimates a {formatPercent(simulation.successRate * 100)} probability of fully funding this goal.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-stone-500">Goal target (today's ₹)</span><span className="font-medium text-navy">{formatCurrency(selectedGoal.targetAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Inflation-adjusted target</span><span className="font-medium text-navy">{formatCurrency(simulation.futureValue)}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">PV needed today</span><span className="font-medium text-navy">{formatCurrency(simulation.pvNeeded)}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Required monthly SIP</span><span className="font-medium text-navy">{formatCurrency(simulation.requiredSIP)}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Total Portfolio SIP</span><span className="font-medium text-navy">{formatCurrency(wealthResult.monthlySIP)}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Allocated SIP (Avg)</span><span className="font-medium text-navy">{formatCurrency(wealthResult.monthlySIP / Math.max(1, inputs.goals.length))}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">SIP gap / surplus (vs Avg)</span><span className={`font-medium ${simulation.requiredSIP > (wealthResult.monthlySIP / Math.max(1, inputs.goals.length)) ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(simulation.requiredSIP - (wealthResult.monthlySIP / Math.max(1, inputs.goals.length)))}</span></div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-gold" /> All Goals Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                    <th className="py-2 pr-4">Goal</th>
                    <th className="py-2 pr-4">Priority</th>
                    <th className="py-2 pr-4 text-right">Future Value</th>
                    <th className="py-2 pr-4 text-right">PV Needed</th>
                    <th className="py-2 pr-4 text-right">Success Rate</th>
                    <th className="py-2 pr-4 text-right">Required SIP</th>
                    <th className="py-2 pr-4 text-right">Shortfall Prob</th>
                  </tr>
                </thead>
                <tbody>
                  {wealthResult.goalResults.map((g) => (
                    <tr key={g.goal.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-2 pr-4 font-medium text-navy">{g.goal.name}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={g.goal.priority === 'essential' ? 'danger' : g.goal.priority === 'important' ? 'default' : 'outline'}>{g.goal.priority}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(g.futureValue)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(g.pvNeeded)}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className={g.successRate >= riskProfile.goalSuccessThreshold / 100 ? 'text-green-600' : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6 ? 'text-amber-600' : 'text-red-600'}>
                          {formatPercent(g.successRate * 100)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(g.requiredSIP)}</td>
                      <td className="py-2 pr-4 text-right">{formatPercent(g.shortfallProbability * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
