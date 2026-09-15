import { useState } from 'react';
import { Target } from 'lucide-react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { FormSection } from '../ui/FormSection';
import { Repeater } from '../ui/Repeater';
import { GoalConflictResolver } from '../analytics/GoalConflictResolver';
import { GoalProbabilityLab } from './GoalProbabilityLab';
import { formatOrDash } from '../../lib/planState';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import type { MasterPlanInputs, Goal, GoalPriority } from '../../types';

interface GoalsStepProps {
  inputs: MasterPlanInputs;
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal?: (id: string, updates: Partial<Goal>) => void;
  onRemoveGoal: (id: string) => void;
}

const PRIORITY_OPTIONS: { value: GoalPriority; label: string }[] = [
  { value: 'essential', label: 'Essential (non-negotiable)' },
  { value: 'important', label: 'Important (high priority)' },
  { value: 'aspirational', label: 'Aspirational (discretionary)' },
];

const PRIORITY_TONE: Record<GoalPriority, string> = {
  essential: 'text-negative',
  important: 'text-info',
  aspirational: 'text-muted',
};

import { useCalculator } from '../../context/CalculatorContext';

export const GoalsStep = ({
  inputs,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
}: GoalsStepProps) => {
  const { assumptions } = useCalculator();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [yearsToGoal, setYearsToGoal] = useState(0);
  const [priority, setPriority] = useState<GoalPriority>('important');
  const [currency, setCurrency] = useState('INR');
  const inflation = inputs.inflation || 0;

  const handleAddGoal = () => {
    if (!name.trim()) return;
    onAddGoal({
      name: name.trim(),
      targetAmount,
      yearsToGoal: Math.max(1, yearsToGoal || 1),
      priority,
      inflation: inflation || 7,
      recurring: false,
      currency,
    });
    setName('');
    setTargetAmount(0);
    setYearsToGoal(0);
    setCurrency('INR');
  };

  const totalGoalsCost = inputs.goals.reduce((sum, g) => {
    const spotRate = assumptions?.fx[g.currency || 'INR']?.spotRate || 1.0;
    return sum + (g.targetAmount * spotRate || 0);
  }, 0);

  return (
    <div className="border-t border-border">
      <header className="py-4">
        <div className="eyebrow">Step 04 · Goals</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Goals & milestones</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Major family outlays — education, property, sabbaticals. Costs index by inflation and flow into the Goal Conflict Resolver.
        </p>
      </header>

      <FormSection
        index="01"
        title="Milestone timeline"
        description="Each goal carries a target, horizon, and priority tier."
        meta={`${inputs.goals.length} recorded · today ${formatOrDash(totalGoalsCost > 0 ? totalGoalsCost : null, formatCurrency)}`}
      >
        <div className="flex items-center gap-2 text-muted mb-4">
          <Target size={14} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
          <span className="text-xs">Goals</span>
        </div>
        <Repeater<Goal>
          items={inputs.goals}
          getKey={(goal) => goal.id}
          emptyLabel="No goals yet — add the first goal below."
          addLabel="Add goal"
          addCommitLabel="Add goal"
          onAdd={() => {}}
          onAddCommit={handleAddGoal}
          addCommitDisabled={!name.trim()}
          onRemove={(goal) => onRemoveGoal(goal.id)}
          renderSummary={(goal) => (
            <span className="flex items-baseline gap-3 min-w-0 text-sm">
              <span className="truncate font-medium text-ink">{goal.name || 'Unnamed goal'}</span>
              <span className={`text-[10px] uppercase tracking-[0.08em] font-mono shrink-0 ${PRIORITY_TONE[goal.priority] ?? 'text-muted'}`}>
                {goal.priority}
              </span>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted">
                {formatCurrency(goal.targetAmount, 0, goal.currency || 'INR')} ·{' '}
                {formatOrDash(goal.yearsToGoal, (v) => `${v}y`)}
              </span>
            </span>
          )}
          renderEditor={(goal) => {
            const targetYear = new Date().getFullYear() + (goal.yearsToGoal ?? 0);
            const futureVal = Math.round(
              (goal.targetAmount || 0) * Math.pow(1 + (goal.inflation || 0) / 100, goal.yearsToGoal ?? 0),
            );
            return onUpdateGoal ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                <Input layout="inline" label="Milestone name" value={goal.name} onChange={(e) => onUpdateGoal(goal.id, { name: e.target.value })} />
                <CurrencyInput
                  layout="inline"
                  label="Target amount"
                  value={goal.targetAmount}
                  onChange={(val) => onUpdateGoal(goal.id, { targetAmount: val })}
                  currency={goal.currency || 'INR'}
                  onCurrencyChange={(curr) => onUpdateGoal(goal.id, { currency: curr })}
                  helper={`Future ${formatCurrencyCompact(futureVal, goal.currency || 'INR')} in ${formatOrDash(goal.yearsToGoal ? targetYear : null, String)}`}
                />
                <NumberInput layout="inline" label="Years to goal" value={goal.yearsToGoal} onChange={(val) => onUpdateGoal(goal.id, { yearsToGoal: val })} suffix="yrs" min={0} max={40} slider="focus" />
                <Select layout="inline" label="Priority tier" value={goal.priority} onChange={(val) => onUpdateGoal(goal.id, { priority: val as GoalPriority })} options={PRIORITY_OPTIONS} />
                <NumberInput layout="inline" label="Inflation" value={goal.inflation} onChange={(val) => onUpdateGoal(goal.id, { inflation: val })} suffix="%" step={0.5} min={0} max={15} />
              </div>
            ) : (
              <p className="text-sm text-muted">
                {goal.name} — {formatCurrency(goal.targetAmount, 0, goal.currency || 'INR')} in {formatOrDash(goal.yearsToGoal, (v) => `${v} yrs`)}.
              </p>
            );
          }}
          renderAddEditor={(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-4">
              <div className="sm:col-span-2">
                <Input
                  id="mp-goal-name"
                  label="Milestone name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Children higher education"
                />
              </div>
              <CurrencyInput
                label="Target amount (today's value)"
                value={targetAmount}
                onChange={(val) => setTargetAmount(val)}
                currency={currency}
                onCurrencyChange={setCurrency}
                presets={[
                  { label: '₹10L', value: 1000000 },
                  { label: '₹50L', value: 5000000 },
                  { label: '₹1Cr', value: 10000000 },
                ]}
              />
              <NumberInput
                label="Years to goal"
                value={yearsToGoal}
                onChange={(val) => setYearsToGoal(val)}
                suffix="yrs"
                min={0}
                max={40}
                slider
              />
              <Select
                label="Priority tier"
                value={priority}
                onChange={(val) => setPriority(val as GoalPriority)}
                options={PRIORITY_OPTIONS}
              />
            </div>
          )}
        />
      </FormSection>

      <div className="mt-8">
        <GoalProbabilityLab />
      </div>

      {/* Integrated Goal Conflict Resolver (owned by analytics group) */}
      <div className="mt-8">
        <GoalConflictResolver />
      </div>
    </div>
  );
};
