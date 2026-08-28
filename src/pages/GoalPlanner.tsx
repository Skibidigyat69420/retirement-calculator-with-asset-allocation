import { useMemo, useState } from 'react';
import { Target, TrendingUp, PieChart, Plus, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
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
import { simulateGoal, calculateGoalPV, requiredMonthlySIPForGoal } from '../lib/goals';
import type { AssetCategory, GoalPriority } from '../types';
import { ASSET_COLORS } from '../lib/constants';

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'essential', label: 'Essential' },
  { value: 'important', label: 'Important' },
  { value: 'aspirational', label: 'Aspirational' },
];

export const GoalPlanner = () => {
  const { inputs, assumptions, updateGoal, addGoal } = useCalculator();
  const [selectedGoalId, setSelectedGoalId] = useState<string>(inputs.goals[0]?.id || '');

  const selectedGoal = useMemo(
    () => inputs.goals.find((g) => g.id === selectedGoalId) || inputs.goals[0],
    [inputs.goals, selectedGoalId],
  );

  const portfolioWeights: Record<AssetCategory, number> = useMemo(
    () => ({
      equity: inputs.sip.equitySplit / 100,
      debt: inputs.sip.debtSplit / 100,
      gold: 0,
      realestate: 0,
      liquid: 0,
      other: 0,
    }),
    [inputs.sip.equitySplit, inputs.sip.debtSplit],
  );

  const netWorth = useMemo(() => inputs.assets.reduce((sum, a) => sum + a.value, 0), [inputs.assets]);

  const simulation = useMemo(() => {
    if (!selectedGoal) return null;
    return simulateGoal(selectedGoal, assumptions, netWorth, inputs.sip.amount, portfolioWeights, 2000);
  }, [selectedGoal, assumptions, netWorth, inputs.sip.amount, portfolioWeights]);

  const allGoalSimulations = useMemo(() => {
    return inputs.goals.map((g) => simulateGoal(g, assumptions, netWorth, inputs.sip.amount, portfolioWeights, 1000));
  }, [inputs.goals, assumptions, netWorth, inputs.sip.amount, portfolioWeights]);

  const standaloneRequiredSIP = useMemo(() => {
    if (!selectedGoal) return 0;
    const portfolioMean = assumptions.categories.equity.mean * portfolioWeights.equity + assumptions.categories.debt.mean * portfolioWeights.debt;
    return requiredMonthlySIPForGoal(simulation?.futureValue || selectedGoal.targetAmount, selectedGoal.yearsToGoal, portfolioMean * 100, selectedGoal.inflation);
  }, [selectedGoal, assumptions, portfolioWeights, simulation]);

  const standalonePV = useMemo(() => {
    if (!selectedGoal) return 0;
    return calculateGoalPV(selectedGoal, (assumptions.categories.equity.mean * portfolioWeights.equity + assumptions.categories.debt.mean * portfolioWeights.debt) * 100);
  }, [selectedGoal, assumptions, portfolioWeights]);

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

  if (!selectedGoal) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Goal Planner" subtitle="Probability-based goal planning with PV, success rate, and distribution analysis." badge="Monte Carlo" />
        <Card>
          <p className="text-stone-500">No goals defined yet. Go to Master Plan &gt; Goals to add one.</p>
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
            {inputs.goals.map((goal) => {
              const sim = allGoalSimulations.find((s) => s.goal.id === goal.id);
              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoalId(goal.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedGoalId === goal.id ? 'bg-navy text-white border-navy' : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate pr-2">{goal.name}</span>
                    <Badge variant={goal.priority === 'essential' ? 'danger' : goal.priority === 'important' ? 'default' : 'outline'} className={selectedGoalId === goal.id ? 'border-white/30 text-white' : ''}>
                      {goal.priority}
                    </Badge>
                  </div>
                  <div className={`text-xs mt-1 ${selectedGoalId === goal.id ? 'text-white/70' : 'text-stone-500'}`}>
                    {sim ? formatPercent(sim.successRate * 100) : '—'} success · {formatCurrency(goal.targetAmount)}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="subtle">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Selected Goal</div>
                  <div className="text-xl font-serif text-navy mt-1">{selectedGoal.name}</div>
                </div>
                <Badge variant={selectedGoal.priority === 'essential' ? 'danger' : selectedGoal.priority === 'important' ? 'default' : 'outline'}>{selectedGoal.priority}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <NumberInput label="Target Amount" value={selectedGoal.targetAmount} onChange={(v) => updateGoal(selectedGoal.id, { targetAmount: v })} />
                <NumberInput label="Years to Goal" value={selectedGoal.yearsToGoal} onChange={(v) => updateGoal(selectedGoal.id, { yearsToGoal: v })} />
                <NumberInput label="Inflation" value={selectedGoal.inflation} onChange={(v) => updateGoal(selectedGoal.id, { inflation: v })} suffix="%" />
                <Select label="Priority" value={selectedGoal.priority} onChange={(v) => updateGoal(selectedGoal.id, { priority: v as GoalPriority })} options={priorityOptions} />
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard
                label="Probability of Success"
                value={simulation ? formatPercent(simulation.successRate * 100) : '—'}
                subtext="Monte Carlo simulation"
                variant={simulation && simulation.successRate >= 0.7 ? 'success' : simulation && simulation.successRate >= 0.4 ? 'default' : 'danger'}
              />
              <MetricCard label="Future Value Needed" value={formatCurrency(simulation?.futureValue || 0)} subtext={`In ${selectedGoal.yearsToGoal} years`} variant="navy" />
              <MetricCard label="PV Needed Today" value={formatCurrency(standalonePV)} subtext="Discounted at portfolio mean" variant="gold" />
              <MetricCard label="Required SIP" value={formatCurrency(standaloneRequiredSIP)} subtext="Per month, real terms" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif text-navy flex items-center gap-2">
                  <BarChart3 size={18} className="text-gold" /> Outcome Distribution
                </h3>
                <div className="text-xs text-stone-500">{simulation?.outcomes.length.toLocaleString()} simulations</div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                    <XAxis
                      dataKey="midpoint"
                      tickFormatter={(v) => `₹${(Number(v) / 100000).toFixed(1)}L`}
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
                    <ReferenceLine x={simulation?.futureValue} stroke="#B68B40" strokeDasharray="4 4" label={{ value: 'Target', position: 'top', fill: '#B68B40', fontSize: 10 }} />
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
                    {simulation && simulation.successRate >= 0.7 ? <CheckCircle2 size={20} className="text-green-600 shrink-0" /> : <AlertTriangle size={20} className="text-amber-500 shrink-0" />}
                    <div>
                      <div className="text-sm font-medium text-navy">
                        {simulation && simulation.successRate >= 0.7
                          ? 'On track to meet this goal'
                          : simulation && simulation.successRate >= 0.4
                            ? 'Needs attention — consider increasing SIP or extending horizon'
                            : 'Significant shortfall risk — revise plan'}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        With the current portfolio and SIP, the model estimates a {simulation ? formatPercent(simulation.successRate * 100) : '—'} probability of fully funding this goal.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Goal target (today's ₹)</span>
                    <span className="font-medium text-navy">{formatCurrency(selectedGoal.targetAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Inflation-adjusted target</span>
                    <span className="font-medium text-navy">{formatCurrency(simulation?.futureValue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">PV needed today</span>
                    <span className="font-medium text-navy">{formatCurrency(standalonePV)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Required monthly SIP</span>
                    <span className="font-medium text-navy">{formatCurrency(standaloneRequiredSIP)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Current monthly SIP</span>
                    <span className="font-medium text-navy">{formatCurrency(inputs.sip.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">SIP gap / surplus</span>
                    <span className={`font-medium ${standaloneRequiredSIP > inputs.sip.amount ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(standaloneRequiredSIP - inputs.sip.amount)}
                    </span>
                  </div>
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
                  </tr>
                </thead>
                <tbody>
                  {allGoalSimulations.map((g) => (
                    <tr key={g.goal.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-2 pr-4 font-medium text-navy">{g.goal.name}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={g.goal.priority === 'essential' ? 'danger' : g.goal.priority === 'important' ? 'default' : 'outline'}>{g.goal.priority}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(g.futureValue)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(g.pvNeeded)}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className={g.successRate >= 0.7 ? 'text-green-600' : g.successRate >= 0.4 ? 'text-amber-600' : 'text-red-600'}>
                          {formatPercent(g.successRate * 100)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(g.requiredSIP)}</td>
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
