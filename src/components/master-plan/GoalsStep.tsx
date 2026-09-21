import { Target } from 'lucide-react';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { FieldGrid } from '../ui/Field';
import { FormSection } from '../ui/FormSection';
import { Repeater } from '../ui/Repeater';
import { GoalConflictResolver } from '../analytics/GoalConflictResolver';
import { GoalProbabilityLab } from './GoalProbabilityLab';
import { formatOrDash } from '../../lib/planState';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { useDraft } from '../../hooks/useDraft';
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

interface GoalDraft {
  name: string;
  targetAmount: number;
  yearsToGoal: number;
  priority: GoalPriority;
  currency: string;
}

const INITIAL_GOAL_DRAFT: GoalDraft = {
  name: '',
  targetAmount: 0,
  yearsToGoal: 0,
  priority: 'important',
  currency: 'INR',
};

export const GoalsStep = ({
  inputs,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
}: GoalsStepProps) => {
  const { assumptions } = useCalculator();
  const currencyOptions = Object.keys(assumptions.fx);
  const draft = useDraft(INITIAL_GOAL_DRAFT, { validate: (d) => !!d.name.trim() });
  const { name, targetAmount, yearsToGoal, priority, currency } = draft.values;
  const inflation = inputs.inflation || 0;

  const handleAddGoal = () => {
    if (!draft.isValid) return;
    onAddGoal({
      name: name.trim(),
      targetAmount,
      yearsToGoal: Math.max(1, yearsToGoal || 1),
      priority,
      inflation: inflation || 7,
      recurring: false,
      currency,
    });
    draft.reset();
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
          addCommitDisabled={!draft.isValid}
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
              <FieldGrid cols={{ md: 3 }}>
                <Input layout="inline" label="Milestone name" value={goal.name} onChange={(e) => onUpdateGoal(goal.id, { name: e.target.value })} />
                <NumberInput
                  kind="currency"
                  layout="inline"
                  label="Target amount"
                  value={goal.targetAmount}
                  onChange={(val) => onUpdateGoal(goal.id, { targetAmount: val })}
                  currency={goal.currency || 'INR'}
                  currencyOptions={currencyOptions}
                  onCurrencyChange={(curr) => onUpdateGoal(goal.id, { currency: curr })}
                  helper={`Future ${formatCurrencyCompact(futureVal, goal.currency || 'INR')} in ${formatOrDash(goal.yearsToGoal ? targetYear : null, String)}`}
                />
                <NumberInput layout="inline" label="Years to goal" value={goal.yearsToGoal} onChange={(val) => onUpdateGoal(goal.id, { yearsToGoal: val })} suffix="yrs" min={0} max={40} slider="focus" />
                <Select layout="inline" label="Priority tier" value={goal.priority} onChange={(val) => onUpdateGoal(goal.id, { priority: val as GoalPriority })} options={PRIORITY_OPTIONS} />
                <NumberInput layout="inline" label="Inflation" value={goal.inflation} onChange={(val) => onUpdateGoal(goal.id, { inflation: val })} suffix="%" step={0.5} min={0} max={15} />
              </FieldGrid>
            ) : (
              <p className="text-sm text-muted">
                {goal.name} — {formatCurrency(goal.targetAmount, 0, goal.currency || 'INR')} in {formatOrDash(goal.yearsToGoal, (v) => `${v} yrs`)}.
              </p>
            );
          }}
          renderAddEditor={(
            <FieldGrid cols={{ sm: 2, lg: 5 }} className="gap-x-4">
              <div className="sm:col-span-2">
                <Input
                  id="mp-goal-name"
                  label="Milestone name"
                  value={name}
                  onChange={(e) => draft.set('name', e.target.value)}
                  placeholder="e.g. Children higher education"
                />
              </div>
              <NumberInput
                kind="currency"
                label="Target amount (today's value)"
                value={targetAmount}
                onChange={(val) => draft.set('targetAmount', val)}
                currency={currency}
                currencyOptions={currencyOptions}
                onCurrencyChange={(curr) => draft.set('currency', curr)}
                presets={[
                  { label: '₹10L', value: 1000000 },
                  { label: '₹50L', value: 5000000 },
                  { label: '₹1Cr', value: 10000000 },
                ]}
              />
              <NumberInput
                label="Years to goal"
                value={yearsToGoal}
                onChange={(val) => draft.set('yearsToGoal', val)}
                suffix="yrs"
                min={0}
                max={40}
                slider
              />
              <Select
                label="Priority tier"
                value={priority}
                onChange={(val) => draft.set('priority', val as GoalPriority)}
                options={PRIORITY_OPTIONS}
              />
            </FieldGrid>
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
