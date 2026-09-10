import { useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { GoalConflictResolver } from '../analytics/GoalConflictResolver';
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
  { value: 'essential', label: 'Essential (Non-negotiable)' },
  { value: 'important', label: 'Important (High Priority)' },
  { value: 'aspirational', label: 'Aspirational (Discretionary)' },
];

export const GoalsStep = ({
  inputs,
  onAddGoal,
  onUpdateGoal: _onUpdateGoal,
  onRemoveGoal,
  onNext,
  onBack,
}: GoalsStepProps) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(2500000);
  const [yearsToGoal, setYearsToGoal] = useState(5);
  const [priority, setPriority] = useState<GoalPriority>('important');
  const inflation = inputs.inflation || 7;

  const handleAddGoal = () => {
    if (!name.trim()) return;
    onAddGoal({
      name: name.trim(),
      targetAmount,
      yearsToGoal,
      priority,
      inflation,
      recurring: false,
    });
    setName('');
    setTargetAmount(2000000);
    setYearsToGoal(5);
  };

  const totalGoalsCost = inputs.goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <Card className="border border-border space-y-2">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-accent" />
          <h3 className="text-lg font-bold text-ink">Lifestyle Goals, Capital Outlays & Milestones</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Record major family life goals (e.g. Higher Education, Wedding, Real Estate Upgrade, Sabbatical). The engine indexes costs by inflation and runs an integrated Goal Conflict Resolver.
        </p>
      </Card>

      {/* Goals List Card */}
      <Card className="border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <Calendar size={16} className="text-accent" />
              Household Milestones Timeline
            </h4>
            <span className="text-xs text-muted">
              Cumulative Today's Value: <strong className="text-ink font-mono">{formatCurrency(totalGoalsCost)}</strong>
            </span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {inputs.goals.length} Goals
          </Badge>
        </div>

        {/* Existing Goals */}
        {inputs.goals.length === 0 ? (
          <div className="p-4 rounded-xl bg-sunken border border-border text-center text-xs text-muted">
            No lifestyle goals added yet. Use the form below to add education, property, or family milestones.
          </div>
        ) : (
          <div className="space-y-3">
            {inputs.goals.map((g, idx) => {
              const targetYear = new Date().getFullYear() + (g.yearsToGoal ?? 5);
              const futureVal = Math.round(
                (g.targetAmount || 0) * Math.pow(1 + (g.inflation || 7) / 100, g.yearsToGoal ?? 5),
              );

              return (
                <div
                  key={g.id}
                  className="p-3.5 rounded-xl bg-sunken border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border font-bold text-muted">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm text-ink truncate">{g.name}</span>
                      <Badge
                        variant={
                          g.priority === 'essential'
                            ? 'danger'
                            : g.priority === 'important'
                              ? 'navy'
                              : 'outline'
                        }
                        className="text-[10px] capitalize"
                      >
                        {g.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>Timeline: <strong className="text-ink font-mono">{g.yearsToGoal} Yrs ({targetYear})</strong></span>
                      <span>•</span>
                      <span>Inflation: <strong className="text-ink font-mono">{g.inflation}%</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-bold text-base text-ink">
                        {formatCurrency(g.targetAmount)}
                      </div>
                      <span className="text-[10px] text-faint">
                        Future Value: {formatCurrencyCompact(futureVal)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveGoal(g.id)}
                      className="p-2 rounded-lg text-muted hover:text-negative hover:bg-negative-soft transition-colors"
                      title="Remove Goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Goal Form */}
        <div className="pt-3 border-t border-border space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            Add New Lifestyle Milestone
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Milestone Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Children Higher Education"
              />
            </div>
            <CurrencyInput
              label="Target Amount (Today's ₹)"
              value={targetAmount}
              onChange={(val) => setTargetAmount(val)}
            />
            <NumberInput
              label="Years to Goal"
              value={yearsToGoal}
              onChange={(val) => setYearsToGoal(val)}
              suffix="yrs"
              min={1}
              max={40}
            />
            <Select
              label="Priority Tier"
              value={priority}
              onChange={(val) => setPriority(val as GoalPriority)}
              options={PRIORITY_OPTIONS}
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddGoal} className="flex items-center gap-1.5 text-xs">
              <Plus size={14} />
              <span>Add Goal</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Integrated Goal Conflict Resolver */}
      <GoalConflictResolver />

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={15} />
          <span>Back: Cashflows</span>
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2">
          <span>Next: Risk & Asset Allocation</span>
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
};
