import { useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { GoalConflictResolver } from '../analytics/GoalConflictResolver';
import { formatOrDash } from '../../lib/planState';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import type { MasterPlanInputs, Goal, GoalPriority } from '../../types';

interface GoalsStepProps {
  inputs: MasterPlanInputs;
  onAddGoal: (goal: Omit<Goal, 'id'>) => void;
  onUpdateGoal?: (id: string, updates: Partial<Goal>) => void;
  onRemoveGoal: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
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

export const GoalsStep = ({
  inputs,
  onAddGoal,
  onRemoveGoal,
  onNext,
  onBack,
}: GoalsStepProps) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [yearsToGoal, setYearsToGoal] = useState(0);
  const [priority, setPriority] = useState<GoalPriority>('important');
  const inflation = inputs.inflation || 0;

  const focusGoalForm = () => {
    document.getElementById('mp-goal-name')?.focus();
  };

  const handleAddGoal = () => {
    if (!name.trim()) return;
    onAddGoal({
      name: name.trim(),
      targetAmount,
      yearsToGoal: Math.max(1, yearsToGoal || 1),
      priority,
      inflation: inflation || 7,
      recurring: false,
    });
    setName('');
    setTargetAmount(0);
    setYearsToGoal(0);
  };

  const totalGoalsCost = inputs.goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Step 04 · Goals</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Goals & milestones</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Major family outlays — education, property, sabbaticals. Costs index by inflation and flow into the Goal Conflict Resolver.
        </p>
      </header>

      {/* Goals list */}
      <section className="border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
              <Target size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
              Milestone timeline
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Today's value:{' '}
              <span className="font-mono tabular-nums text-ink">
                {formatOrDash(totalGoalsCost > 0 ? totalGoalsCost : null, formatCurrency)}
              </span>
            </p>
          </div>
          <span className="font-mono text-[11px] text-faint tabular-nums">
            {inputs.goals.length} recorded
          </span>
        </div>

        {inputs.goals.length === 0 ? (
          <div className="flex items-center justify-between gap-4 py-4 border-t border-b border-border">
            <p className="text-sm text-faint">No goals yet — add the first goal.</p>
            <Button variant="ghost" size="sm" onClick={focusGoalForm} className="shrink-0">
              <Plus size={14} aria-hidden="true" />
              <span>Add goal</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {inputs.goals.map((g, idx) => {
              const targetYear = new Date().getFullYear() + (g.yearsToGoal ?? 0);
              const futureVal = Math.round(
                (g.targetAmount || 0) * Math.pow(1 + (g.inflation || 0) / 100, g.yearsToGoal ?? 0),
              );

              return (
                <div key={g.id} className="flex items-center gap-4 py-3">
                  <span className="font-mono text-[11px] text-faint tabular-nums w-5 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink truncate">{g.name}</span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.08em] font-mono ${PRIORITY_TONE[g.priority] ?? 'text-muted'}`}
                      >
                        {g.priority}
                      </span>
                    </div>
                    <span className="text-[11px] text-faint">
                      In {formatOrDash(g.yearsToGoal, (v) => `${v} yrs`)} (
                      {formatOrDash(g.yearsToGoal ? targetYear : null, String)}) · Inflation{' '}
                      {formatOrDash(g.inflation, (v) => `${v}%`)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm tabular-nums text-ink">
                      {formatCurrency(g.targetAmount)}
                    </div>
                    <span className="text-[11px] text-faint">
                      Future {formatCurrencyCompact(futureVal)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveGoal(g.id)}
                    className="p-1.5 rounded-md text-faint hover:text-negative hover:bg-negative-soft transition-colors cursor-pointer shrink-0"
                    title={`Remove ${g.name}`}
                  >
                    <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add goal form */}
        <div className="pt-6">
          <span className="eyebrow">Add goal</span>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-4 gap-y-4 mt-4">
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
              label="Target amount (today's ₹)"
              value={targetAmount}
              onChange={(val) => setTargetAmount(val)}
            />
            <NumberInput
              label="Years to goal"
              value={yearsToGoal}
              onChange={(val) => setYearsToGoal(val)}
              suffix="yrs"
              min={0}
              max={40}
            />
            <Select
              label="Priority tier"
              value={priority}
              onChange={(val) => setPriority(val as GoalPriority)}
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button size="sm" onClick={handleAddGoal} disabled={!name.trim()}>
              <Plus size={14} aria-hidden="true" />
              <span>Add goal</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Integrated Goal Conflict Resolver (owned by analytics group) */}
      <GoalConflictResolver />

      {/* Step navigation */}
      <div className="flex justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back · Cashflow</span>
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2">
          <span>Next · Risk</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
