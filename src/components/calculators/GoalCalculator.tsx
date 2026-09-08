import { useMemo, useState } from 'react';
import { Target, Coins, TrendingUp, CheckCircle2, Sparkles, RefreshCw, Trash2 } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateGoal } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { COLORS } from '../../lib/constants';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export const GoalCalculator = () => {
  const { inputs, updateGoal, addGoal, removeGoal, showToast } = useCalculator();

  const [selectedGoalId, setSelectedGoalId] = useState<string>(
    inputs.goals[0]?.id || 'scratchpad',
  );
  const [autoSync, setAutoSync] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goalOptions = useMemo(() => {
    return [
      { value: 'scratchpad', label: '-- Scratchpad / Unlinked --' },
      ...inputs.goals.map((g) => ({
        value: g.id,
        label: `${g.name} (${formatCurrencyCompact(g.targetAmount)} in ${g.yearsToGoal}y)`,
      })),
    ];
  }, [inputs.goals]);

  const activePlanGoal = useMemo(
    () => inputs.goals.find((g) => g.id === selectedGoalId),
    [inputs.goals, selectedGoalId],
  );

  const [name, setName] = useState(activePlanGoal ? activePlanGoal.name : '');
  const [target, setTarget] = useState(activePlanGoal ? activePlanGoal.targetAmount : 1_00_00_000);
  const [years, setYears] = useState(activePlanGoal ? activePlanGoal.yearsToGoal : 15);
  const [returnRate, setReturnRate] = useState(12);
  const [inflation, setInflation] = useState(
    activePlanGoal ? activePlanGoal.inflation : (inputs.inflation || 5),
  );
  const [stepUp, setStepUp] = useState(5);

  // Tracks which goal the name/target/years/inflation fields were last loaded from
  const [lastLoadedGoalId, setLastLoadedGoalId] = useState<string | null>(selectedGoalId);

  // Synchronize inputs when selected goal changes or when a selected goal is
  // deleted externally — adjusted during render (derived-state pattern)
  // instead of in an effect.
  const [prevSnapshot, setPrevSnapshot] = useState({
    goals: inputs.goals,
    inflation: inputs.inflation,
    selectedId: selectedGoalId,
  });
  if (
    prevSnapshot.goals !== inputs.goals ||
    prevSnapshot.inflation !== inputs.inflation ||
    prevSnapshot.selectedId !== selectedGoalId
  ) {
    setPrevSnapshot({
      goals: inputs.goals,
      inflation: inputs.inflation,
      selectedId: selectedGoalId,
    });
    if (selectedGoalId !== 'scratchpad') {
      const found = inputs.goals.find((g) => g.id === selectedGoalId);
      if (found) {
        if (lastLoadedGoalId !== selectedGoalId) {
          setLastLoadedGoalId(selectedGoalId);
          setName(found.name);
          setTarget(found.targetAmount);
          setYears(found.yearsToGoal);
          setInflation(found.inflation ?? (inputs.inflation || 5));
        }
      } else if (inputs.goals.length > 0) {
        const fallback = inputs.goals[0];
        setLastLoadedGoalId(fallback.id);
        setSelectedGoalId(fallback.id);
        setName(fallback.name);
        setTarget(fallback.targetAmount);
        setYears(fallback.yearsToGoal);
        setInflation(fallback.inflation ?? (inputs.inflation || 5));
      } else {
        setLastLoadedGoalId("scratchpad");
        setSelectedGoalId('scratchpad');
      }
    } else {
      setLastLoadedGoalId("scratchpad");
    }
  }

  const result = useMemo(
    () => calculateGoal(target, years, returnRate, inflation, stepUp),
    [target, years, returnRate, inflation, stepUp],
  );

  // Corpus accumulation of the required flat SIP versus the inflation-adjusted target.
  const fundingCurve = useMemo(() => {
    const r = returnRate / 100 / 12;
    const monthly = result.requiredSIP;
    const points: { year: string; corpus: number }[] = [];
    for (let y = 1; y <= years; y++) {
      const fv = monthly <= 0 ? 0 : monthly * ((Math.pow(1 + r, y * 12) - 1) / r) * (1 + r);
      points.push({ year: `Y${y}`, corpus: Math.round(fv) });
    }
    return points;
  }, [result.requiredSIP, years, returnRate]);

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setLastLoadedGoalId(goalId);
    setConfirmDelete(false);
    if (goalId === 'scratchpad') {
      showToast('Switched to scratchpad mode.', 'info');
      return;
    }
    const found = inputs.goals.find((g) => g.id === goalId);
    if (found) {
      setName(found.name);
      setTarget(found.targetAmount);
      setYears(found.yearsToGoal);
      setInflation(found.inflation ?? (inputs.inflation || 5));
      showToast(`Connected to "${found.name}" from Master Plan.`, 'info');
    }
  };

  const handleDeleteGoal = () => {
    if (activePlanGoal) {
      const goalName = activePlanGoal.name;
      removeGoal(activePlanGoal.id);
      setSelectedGoalId('scratchpad');
      setConfirmDelete(false);
      showToast(`Removed goal "${goalName}" from plan.`, 'info');
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (autoSync && activePlanGoal) {
      updateGoal(activePlanGoal.id, { name: val });
    }
  };

  const handleTargetChange = (val: number) => {
    setTarget(val);
    if (autoSync && activePlanGoal) {
      updateGoal(activePlanGoal.id, { targetAmount: val });
    }
  };

  const handleYearsChange = (val: number) => {
    setYears(val);
    if (autoSync && activePlanGoal) {
      updateGoal(activePlanGoal.id, { yearsToGoal: val });
    }
  };

  const handleInflationChange = (val: number) => {
    setInflation(val);
    if (autoSync && activePlanGoal) {
      updateGoal(activePlanGoal.id, { inflation: val });
    }
  };

  const handleUpdatePlanGoal = () => {
    if (activePlanGoal) {
      const goalName = name.trim() || activePlanGoal.name;
      updateGoal(activePlanGoal.id, {
        name: goalName,
        targetAmount: target,
        yearsToGoal: years,
        inflation,
      });
      showToast(`Updated goal "${goalName}" in Master Plan.`, 'success');
    }
  };

  const handleSaveAsNewGoal = () => {
    const goalName = name.trim() || 'New Goal';
    const newId = addGoal({
      name: goalName,
      targetAmount: target,
      yearsToGoal: years,
      inflation,
    });
    if (newId) {
      setLastLoadedGoalId(newId);
      setSelectedGoalId(newId);
    }
    showToast(`Added goal "${goalName}" to Master Plan and connected.`, 'success');
  };

  const handleReloadFromPlan = () => {
    if (activePlanGoal) {
      setName(activePlanGoal.name);
      setTarget(activePlanGoal.targetAmount);
      setYears(activePlanGoal.yearsToGoal);
      setInflation(activePlanGoal.inflation ?? (inputs.inflation || 5));
      showToast(`Reloaded "${activePlanGoal.name}" values from Master Plan.`, 'info');
    }
  };

  return (
    <CalculatorShell
      title="Target Corpus Calculator"
      description="Work backwards from a future goal to today's required investment — now connected directly with your Master Plan."
      inputs={
        <>
          <div className="space-y-2 pb-3 mb-1 border-b border-border">
            <Select
              label="Connected Plan Goal"
              value={selectedGoalId}
              onChange={handleSelectGoal}
              options={goalOptions}
            />
            <div className="flex items-center justify-between text-xs pt-1">
              {activePlanGoal ? (
                <div className="flex items-center gap-1.5 text-positive font-semibold">
                  <CheckCircle2 size={14} />
                  <span>Linked: {activePlanGoal.name}</span>
                </div>
              ) : (
                <span className="text-muted font-medium">Scratchpad (Unlinked)</span>
              )}
              {activePlanGoal && (
                <label className="flex items-center gap-1.5 cursor-pointer text-ink-soft select-none">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border-strong text-ink focus:ring-focus-ring accent-ink"
                  />
                  <span>Auto-sync with Plan</span>
                </label>
              )}
            </div>
          </div>

          <Input
            label="Goal Name"
            value={name}
            onChange={(e) => handleNameChange(e.currentTarget.value)}
            placeholder="e.g. Child Higher Education"
          />
          <NumberInput
            label="Target Amount (today's ₹)"
            value={target}
            onChange={handleTargetChange}
          />
          <NumberInput
            label="Time Horizon"
            value={years}
            onChange={handleYearsChange}
            suffix="years"
          />
          <NumberInput
            label="Expected Return"
            value={returnRate}
            onChange={setReturnRate}
            suffix="%"
          />
          <NumberInput
            label="Goal Inflation"
            value={inflation}
            onChange={handleInflationChange}
            suffix="%"
          />
          <NumberInput
            label="Annual SIP Step-up"
            value={stepUp}
            onChange={setStepUp}
            suffix="%"
          />

          <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-border">
            {activePlanGoal ? (
              <>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    onClick={handleUpdatePlanGoal}
                    className="flex-1 text-xs"
                    variant="primary"
                  >
                    Update Plan Goal
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReloadFromPlan}
                    className="text-xs"
                    variant="ghost"
                    title="Reload original goal values from plan"
                  >
                    <RefreshCw size={13} className="mr-1" /> Revert
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveAsNewGoal}
                    className="flex-1 text-xs"
                    variant="outline"
                  >
                    Save as New Goal
                  </Button>
                </div>
                <div className="flex justify-end pt-1">
                  {confirmDelete ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-negative/40 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-medium text-negative">Delete this goal?</span>
                      <button
                        type="button"
                        onClick={handleDeleteGoal}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-ink rounded text-[11px] font-semibold transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-1.5 py-0.5 bg-surface hover:bg-sunken text-ink-soft border border-border rounded text-[11px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-negative hover:text-negative hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1 font-medium"
                      title="Delete this goal from the plan"
                    >
                      <Trash2 size={13} /> Delete Goal
                    </button>
                  )}
                </div>
              </>
            ) : (
              <Button
                type="button"
                onClick={handleSaveAsNewGoal}
                className="w-full text-xs"
                variant="primary"
              >
                <Sparkles size={14} className="mr-1.5" /> Add to Plan Goals
              </Button>
            )}
          </div>
        </>
      }
      results={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Future Value Needed"
              value={formatCurrency(result.futureValue)}
              icon={<Target size={18} />}
              variant="navy"
            />
            <MetricCard
              label="Required Lumpsum Today"
              value={formatCurrency(result.requiredLumpsum)}
              icon={<Coins size={18} />}
              variant="gold"
            />
            <MetricCard
              label="Required Monthly SIP"
              value={formatCurrency(result.requiredSIP)}
              icon={<TrendingUp size={18} />}
              variant="success"
            />
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
                Goal Funding Options
              </h4>
              {activePlanGoal && (
                <Badge variant="success">
                  Connected to {activePlanGoal.name}
                </Badge>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Target (today's value)</span>
                <span className="font-medium">{formatCurrency(result.target)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Inflation-adjusted target</span>
                <span className="font-medium">{formatCurrency(result.futureValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Invest lumpsum today</span>
                <span className="font-medium">{formatCurrency(result.requiredLumpsum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">OR monthly SIP</span>
                <span className="font-medium">{formatCurrency(result.requiredSIP)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">OR step-up SIP (growing {stepUp}%/yr)</span>
                <span className="font-medium">{formatCurrency(result.requiredSIPWithStepUp)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-4">Funding Trajectory</h4>
            <p className="text-xs text-muted mb-3">
              Investing {formatCurrency(result.requiredSIP)}/mo at {returnRate}% compounds to exactly {formatCurrency(result.futureValue)} in {years} years — the corpus crosses the inflation-adjusted target only in the final years, so starting early matters most.
            </p>
            <div className="h-64" role="img" aria-label={`Area chart of SIP corpus growth over ${years} years versus the inflation-adjusted goal of ${formatCurrencyCompact(result.futureValue)}. The corpus reaches the target at year ${years}.`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fundingCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goalFunding" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.ink} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLORS.ink} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatCurrencyCompact}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Projected corpus']}
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      padding: '10px 14px',
                    }}
                  />
                  <ReferenceLine
                    y={result.futureValue}
                    stroke={COLORS.red}
                    strokeDasharray="6 4"
                    label={{ value: `Goal ${formatCurrencyCompact(result.futureValue)}`, position: 'insideTopRight', fill: COLORS.red, fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="corpus"
                    name="Projected Corpus"
                    stroke={COLORS.ink}
                    strokeWidth={2}
                    fill="url(#goalFunding)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Projected SIP corpus at the end of each year versus the goal</caption>
              <thead>
                <tr><th>Year</th><th>Projected corpus</th><th>Goal</th></tr>
              </thead>
              <tbody>
                {fundingCurve.map((d) => (
                  <tr key={d.year}>
                    <td>{d.year}</td>
                    <td>{formatCurrency(d.corpus)}</td>
                    <td>{formatCurrency(result.futureValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      }
    />
  );
};
