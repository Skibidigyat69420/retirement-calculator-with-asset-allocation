import { useMemo, useState, useEffect, useRef } from 'react';
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

  const lastLoadedGoalIdRef = useRef<string | null>(selectedGoalId);

  // Synchronize inputs when selected goal changes or when a selected goal is deleted externally
  useEffect(() => {
    if (selectedGoalId !== 'scratchpad') {
      const found = inputs.goals.find((g) => g.id === selectedGoalId);
      if (found) {
        if (lastLoadedGoalIdRef.current !== selectedGoalId) {
          lastLoadedGoalIdRef.current = selectedGoalId;
          setName(found.name);
          setTarget(found.targetAmount);
          setYears(found.yearsToGoal);
          setInflation(found.inflation ?? (inputs.inflation || 5));
        }
      } else if (inputs.goals.length > 0) {
        const fallback = inputs.goals[0];
        lastLoadedGoalIdRef.current = fallback.id;
        setSelectedGoalId(fallback.id);
        setName(fallback.name);
        setTarget(fallback.targetAmount);
        setYears(fallback.yearsToGoal);
        setInflation(fallback.inflation ?? (inputs.inflation || 5));
      } else {
        lastLoadedGoalIdRef.current = 'scratchpad';
        setSelectedGoalId('scratchpad');
      }
    } else {
      lastLoadedGoalIdRef.current = 'scratchpad';
    }
  }, [inputs.goals, inputs.inflation, selectedGoalId]);

  const result = useMemo(
    () => calculateGoal(target, years, returnRate, inflation, stepUp),
    [target, years, returnRate, inflation, stepUp],
  );

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    lastLoadedGoalIdRef.current = goalId;
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
      lastLoadedGoalIdRef.current = newId;
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
          <div className="space-y-2 pb-3 mb-1 border-b border-zinc-100">
            <Select
              label="Connected Plan Goal"
              value={selectedGoalId}
              onChange={handleSelectGoal}
              options={goalOptions}
            />
            <div className="flex items-center justify-between text-xs pt-1">
              {activePlanGoal ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 size={14} />
                  <span>Linked: {activePlanGoal.name}</span>
                </div>
              ) : (
                <span className="text-zinc-500 font-medium">Scratchpad (Unlinked)</span>
              )}
              {activePlanGoal && (
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700 select-none">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950"
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

          <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-zinc-100">
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
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] font-medium text-rose-700">Delete this goal?</span>
                      <button
                        type="button"
                        onClick={handleDeleteGoal}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-1.5 py-0.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded text-[11px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1 font-medium"
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
              <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
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
                <span className="text-zinc-700">Target (today's value)</span>
                <span className="font-medium">{formatCurrency(result.target)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">Inflation-adjusted target</span>
                <span className="font-medium">{formatCurrency(result.futureValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">Invest lumpsum today</span>
                <span className="font-medium">{formatCurrency(result.requiredLumpsum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">OR monthly SIP</span>
                <span className="font-medium">{formatCurrency(result.requiredSIP)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">OR step-up SIP (growing {stepUp}%/yr)</span>
                <span className="font-medium">{formatCurrency(result.requiredSIPWithStepUp)}</span>
              </div>
            </div>
          </Card>
        </>
      }
    />
  );
};
