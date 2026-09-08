import { useState } from 'react';
import { Target, Info, Trash2, Plus } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { formatCurrencyCompact } from '../../lib/formatters';
import type { GoalPriority } from '../../types';

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'essential', label: 'Essential (Non-negotiable)' },
  { value: 'important', label: 'Important' },
  { value: 'aspirational', label: 'Aspirational' },
];

export const GoalConflictResolver = () => {
  const {
    inputs,
    updateGoal,
    addGoal,
    removeGoal,
    wealthResult,
    riskProfile,
    showToast,
  } = useCalculator();

  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(null);

  const handleDeleteGoal = (id: string) => {
    removeGoal(id);
    setConfirmDeleteGoalId(null);
    showToast('Removed goal', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            addGoal({
              name: 'Child Higher Education',
              targetAmount: 3500000,
              yearsToGoal: 8,
              inflation: 8,
              priority: 'essential',
              recurring: false,
            });
            showToast('Added Education goal', 'success');
          }}
        >
          + Higher Education
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            addGoal({
              name: 'Home Downpayment',
              targetAmount: 5000000,
              yearsToGoal: 5,
              inflation: 6,
              priority: 'essential',
              recurring: false,
            });
            showToast('Added Home Downpayment goal', 'success');
          }}
        >
          + Home Downpayment
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            addGoal({
              name: 'Vehicle Upgrade',
              targetAmount: 2000000,
              yearsToGoal: 3,
              inflation: 5,
              priority: 'important',
              recurring: false,
            });
            showToast('Added Vehicle Upgrade goal', 'success');
          }}
        >
          + Vehicle
        </Button>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            addGoal({
              name: 'Family Vacation',
              targetAmount: 1000000,
              yearsToGoal: 2,
              inflation: 5,
              priority: 'aspirational',
              recurring: false,
            });
            showToast('Added Vacation goal', 'success');
          }}
        >
          + Vacation
        </Button>
        <Button
          size="sm"
          type="button"
          onClick={() => {
            addGoal({
              name: `Goal ${inputs.goals.length + 1}`,
              targetAmount: 2500000,
              yearsToGoal: 5,
              priority: 'important',
              inflation: inputs.inflation || 5,
              recurring: false,
            });
            showToast('Added custom goal', 'success');
          }}
        >
          <Plus size={14} className="mr-1" /> Add Custom Goal
        </Button>
      </div>

      <div className="text-xs text-muted bg-sunken p-3.5 rounded-xl border border-border flex items-center gap-2">
        <Info size={16} className="text-muted shrink-0" />
        <span>
          <strong>Sequencing Rule:</strong> The engine allocates available savings to Essential milestones first.
          Surplus is then deployed to Important and Aspirational goals.
        </span>
      </div>

      {inputs.goals.length === 0 && (
        <div className="p-8 text-center bg-surface rounded-2xl border border-border">
          <Target size={28} className="mx-auto text-faint mb-2" />
          <h4 className="text-sm font-bold text-ink">No Goals Recorded</h4>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            Choose a preset template above or add a custom milestone to start planning.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {inputs.goals.map((goal) => {
          const goalRes = wealthResult.goalResults.find((g) => g.goal.id === goal.id);
          const inflationRate = goal.inflation ?? inputs.inflation ?? 5;
          const futureVal = goalRes?.futureValue ?? Math.round(goal.targetAmount * Math.pow(1 + inflationRate / 100, goal.yearsToGoal));
          const isFunded = goalRes ? goalRes.successRate >= riskProfile.goalSuccessThreshold / 100 : false;

          return (
            <Card key={goal.id} variant="subtle" className="border border-border hover:border-border-strong transition-colors bg-surface shadow-2xs">
              <div className="flex justify-between items-start mb-3 border-b border-border pb-2.5">
                <div className="flex items-center gap-2 w-2/3">
                  <input
                    type="text"
                    value={goal.name}
                    onChange={(e) => updateGoal(goal.id, { name: e.currentTarget.value })}
                    aria-label={`Goal name: ${goal.name}`}
                    className="bg-transparent text-sm font-bold text-ink focus:outline-none focus:border-b focus:border-border w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {goalRes && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isFunded
                          ? 'text-positive bg-emerald-50 border-positive/40'
                          : 'text-negative bg-rose-50 border-negative/40'
                      }`}
                    >
                      {isFunded ? 'Funded' : 'Shortfall Risk'}
                    </span>
                  )}
                  {confirmDeleteGoalId === goal.id ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-negative/40 px-2 py-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-ink rounded text-[11px] font-semibold transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteGoalId(null)}
                        className="px-1.5 py-0.5 bg-surface hover:bg-sunken text-ink-soft border border-border rounded text-[11px] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteGoalId(goal.id)}
                      className="p-1.5 text-faint hover:text-negative transition-colors rounded-lg focus:outline-none hover:bg-sunken cursor-pointer"
                      aria-label={`Remove goal ${goal.name}`}
                      title={`Remove goal ${goal.name}`}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 mb-3">
                <CurrencyInput
                  label="Target Today"
                  value={goal.targetAmount}
                  onChange={(v) => updateGoal(goal.id, { targetAmount: v })}
                />
                <NumberInput
                  label="Years to Goal"
                  value={goal.yearsToGoal}
                  onChange={(v) => updateGoal(goal.id, { yearsToGoal: v })}
                />
                <NumberInput
                  label="Goal Inflation"
                  value={goal.inflation ?? inputs.inflation ?? 5}
                  onChange={(v) => updateGoal(goal.id, { inflation: v })}
                  suffix="%"
                />
                <Select
                  label="Priority Category"
                  value={goal.priority}
                  onChange={(v) => updateGoal(goal.id, { priority: v as GoalPriority })}
                  options={priorityOptions}
                />
              </div>

              <div className="p-3 bg-sunken rounded-xl border border-border/80 flex items-center justify-between text-xs mb-3">
                <div>
                  <span className="text-muted">Future Cost: </span>
                  <span className="font-mono font-semibold text-ink">{formatCurrencyCompact(futureVal)}</span>
                </div>
                <div>
                  <span className="text-muted">Target Age: </span>
                  <span className="font-mono font-semibold text-ink">Age {inputs.currentAge + goal.yearsToGoal}</span>
                </div>
                {goalRes && goalRes.requiredSIP > 0 && (
                  <div>
                    <span className="text-muted">SIP Needed: </span>
                    <span className="font-mono font-semibold text-ink">{formatCurrencyCompact(goalRes.requiredSIP)}/mo</span>
                  </div>
                )}
              </div>

              <label className="flex items-center space-x-2 text-xs font-semibold text-ink cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(goal.recurring)}
                  onChange={(e) => updateGoal(goal.id, { recurring: e.currentTarget.checked })}
                  className="w-4 h-4 rounded border-border-strong text-ink focus:ring-focus-ring accent-ink"
                />
                <span>Recurring goal cycle</span>
              </label>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
