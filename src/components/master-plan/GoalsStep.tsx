import { useEffect, useMemo } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { FormSection } from '../ui/FormSection';
import { GoalConflictResolver } from '../analytics/GoalConflictResolver';
import { GoalProbabilityLab } from './GoalProbabilityLab';
import { formatOrDash } from '../../lib/planState';
import { formatReportingCurrency } from '../../lib/formatters';
import type { MasterPlanInputs, Goal, GoalPriority } from '../../types';
import { useCalculator } from '../../context/CalculatorContext';

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

const advanceCell = (
  event: React.KeyboardEvent<HTMLTableSectionElement | HTMLDivElement>,
  onAddRow?: () => void,
) => {
  if (event.key !== 'Enter' || event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (!target || !target.matches('input, select, textarea, button')) return;

  const container = event.currentTarget;
  const cells = Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type="checkbox"]), select:not([disabled]), input[type="checkbox"]:not([disabled])',
    ),
  );
  const currentIndex = cells.indexOf(target);
  if (currentIndex === -1) return;

  event.preventDefault();
  if (event.shiftKey) {
    const previous = cells[currentIndex - 1];
    previous?.focus();
    if (previous instanceof HTMLInputElement && previous.type !== 'checkbox') previous.select?.();
    return;
  }

  const next = cells[currentIndex + 1];
  if (next) {
    next.focus();
    if (next instanceof HTMLInputElement && next.type !== 'checkbox') next.select?.();
  } else if (onAddRow) {
    onAddRow();
  }
};

export const GoalsStep = ({
  inputs,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
}: GoalsStepProps) => {
  const { assumptions } = useCalculator();
  const currencyOptions = useMemo(
    () =>
      Object.keys(assumptions.fx || {}).sort((a, b) =>
        a === 'INR' ? -1 : b === 'INR' ? 1 : a.localeCompare(b),
      ),
    [assumptions.fx],
  );
  const inflation = inputs.inflation || 7;
  const currentYear = new Date().getFullYear();

  const handleQuickAddGoal = () => {
    onAddGoal({
      name: '',
      targetAmount: 0,
      yearsToGoal: 5,
      priority: 'important',
      inflation: inflation || 7,
      recurring: false,
      currency: inputs.reportingCurrency || 'INR',
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        handleQuickAddGoal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputs.reportingCurrency, inflation]);

  const totalGoalsCost = inputs.goals.reduce((sum, g) => {
    const spotRate = assumptions?.fx[g.currency || 'INR']?.spotRate || 1.0;
    return sum + (g.targetAmount * spotRate || 0);
  }, 0);
  const formatOutput = (amountInInr: number, compact = false) =>
    formatReportingCurrency(amountInInr, inputs.reportingCurrency, assumptions.fx, compact);

  return (
    <div>
      <div className="py-2.5 pb-4 flex items-center justify-between gap-4 flex-wrap border-b border-border/60 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Goals, Milestones & Capital Outlays</h2>
          <p className="text-xs text-muted max-w-prose mt-0.5">
            Major family outlays — education, property, sabbaticals. Costs index by inflation and flow into the Goal Conflict Resolver.
          </p>
        </div>
      </div>

      <FormSection
        index="01"
        title="Milestone timeline"
        description="Each goal carries a target, horizon, and priority tier. Fill in directly like a spreadsheet."
        meta={`${inputs.goals.length} recorded · today ${formatOrDash(totalGoalsCost > 0 ? totalGoalsCost : null, formatOutput)}`}
      >
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2 text-muted">
            <Target size={14} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
            <span className="text-xs">Milestones</span>
          </div>
          <button
            type="button"
            onClick={handleQuickAddGoal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill hover:bg-accent-strong transition-colors cursor-pointer"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add milestone</span>
            <kbd className="ml-1 text-[10px] font-mono opacity-80">Alt+G</kbd>
          </button>
        </div>

        <div className="spreadsheet-wrap" tabIndex={0} role="region" aria-label="Goals spreadsheet table">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th className="spreadsheet-th w-10 text-center">#</th>
                <th className="spreadsheet-th min-w-[200px]">Milestone Name</th>
                <th className="spreadsheet-th min-w-[140px]">Priority Tier</th>
                <th className="spreadsheet-th w-24">Currency</th>
                <th className="spreadsheet-th min-w-[130px] text-right">Target (Today)</th>
                <th className="spreadsheet-th min-w-[120px] text-right">Plan Eq.</th>
                <th className="spreadsheet-th w-28 text-right">Horizon (Yrs)</th>
                <th className="spreadsheet-th w-24 text-right">Inflation</th>
                <th className="spreadsheet-th min-w-[140px] text-right">Est. Future Cost</th>
                <th className="spreadsheet-th w-12 text-center" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody onKeyDown={(e) => advanceCell(e, handleQuickAddGoal)}>
              {inputs.goals.map((goal, index) => {
                const spotRate = assumptions?.fx?.[goal.currency || 'INR']?.spotRate || 1.0;
                const inrTarget = (Number(goal.targetAmount) || 0) * spotRate;
                const horizonYears = Math.max(0, Number(goal.yearsToGoal) || 0);
                const goalInflation = Number(goal.inflation) || 0;
                const futureInr = inrTarget * Math.pow(1 + goalInflation / 100, horizonYears);
                const targetYear = currentYear + horizonYears;

                return (
                  <tr key={goal.id} className="spreadsheet-tr">
                    <td className="spreadsheet-td text-center font-mono text-xs text-muted">
                      {index + 1}
                    </td>
                    <td className="spreadsheet-td">
                      <input
                        id={index === 0 ? 'mp-goal-name' : undefined}
                        type="text"
                        className="spreadsheet-control font-medium"
                        value={goal.name}
                        onChange={(e) => onUpdateGoal?.(goal.id, { name: e.target.value })}
                        placeholder="e.g. Children Higher Education"
                        aria-label={`Goal ${index + 1} name`}
                      />
                    </td>
                    <td className="spreadsheet-td">
                      <select
                        className={`spreadsheet-control font-medium ${PRIORITY_TONE[goal.priority] ?? 'text-ink'}`}
                        value={goal.priority}
                        onChange={(e) =>
                          onUpdateGoal?.(goal.id, { priority: e.target.value as GoalPriority })
                        }
                        aria-label={`Goal ${index + 1} priority`}
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-raised text-ink">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="spreadsheet-td">
                      <select
                        className="spreadsheet-control font-mono font-semibold text-xs"
                        value={goal.currency || 'INR'}
                        onChange={(e) => onUpdateGoal?.(goal.id, { currency: e.target.value })}
                        aria-label={`Goal ${index + 1} currency`}
                      >
                        {currencyOptions.map((curr) => (
                          <option key={curr} value={curr} className="bg-raised text-ink">
                            {curr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="spreadsheet-td text-right">
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        className="spreadsheet-control text-right font-mono tabular-nums"
                        value={goal.targetAmount === 0 ? '' : goal.targetAmount}
                        onChange={(e) =>
                          onUpdateGoal?.(goal.id, {
                            targetAmount: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        placeholder="0"
                        aria-label={`Goal ${index + 1} target amount`}
                      />
                    </td>
                    <td className="spreadsheet-td text-right">
                      <span className="spreadsheet-pill font-mono tabular-nums">
                        {formatOutput(inrTarget)}
                      </span>
                    </td>
                    <td className="spreadsheet-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          step={1}
                          className="spreadsheet-control text-right font-mono tabular-nums w-14"
                          value={goal.yearsToGoal}
                          onChange={(e) =>
                            onUpdateGoal?.(goal.id, {
                              yearsToGoal: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          aria-label={`Goal ${index + 1} years to goal`}
                        />
                        <span className="text-xs text-muted font-mono">y</span>
                      </div>
                    </td>
                    <td className="spreadsheet-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          className="spreadsheet-control text-right font-mono tabular-nums w-14"
                          value={goal.inflation}
                          onChange={(e) =>
                            onUpdateGoal?.(goal.id, {
                              inflation: Number(e.target.value) || 0,
                            })
                          }
                          aria-label={`Goal ${index + 1} inflation rate`}
                        />
                        <span className="text-xs text-muted font-mono">%</span>
                      </div>
                    </td>
                    <td className="spreadsheet-td text-right">
                      <span
                        className="spreadsheet-pill font-mono tabular-nums font-semibold text-ink"
                        title={`Cost in ${targetYear} after ${horizonYears} years of ${goalInflation}% inflation`}
                      >
                        {formatOutput(futureInr, true)}
                        <span className="text-[10px] text-faint ml-1">('{targetYear.toString().slice(-2)})</span>
                      </span>
                    </td>
                    <td className="spreadsheet-td text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveGoal(goal.id)}
                        className="spreadsheet-delete-btn"
                        title="Remove goal"
                        aria-label={`Remove goal ${goal.name || index + 1}`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {inputs.goals.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-muted">
                    No milestone goals recorded yet.{' '}
                    <button
                      type="button"
                      onClick={handleQuickAddGoal}
                      className="text-accent underline font-medium cursor-pointer"
                    >
                      Add a milestone goal
                    </button>{' '}
                    or press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-sunken border border-border text-[10px] font-mono">
                      Alt+G
                    </kbd>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="identity-sheet-shortcuts mt-3">
          <span>Fast entry</span>
          <span>
            <kbd>Enter</kbd> next cell <i>·</i> <kbd>Shift</kbd> + <kbd>Enter</kbd> previous <i>·</i>{' '}
            <kbd>Enter</kbd> on last cell auto-adds goal <i>·</i> <kbd>Alt</kbd> + <kbd>G</kbd> add goal <i>·</i>{' '}
            <kbd>Tab</kbd> navigate <i>·</i> <kbd>Ctrl/⌘</kbd> + <kbd>S</kbd> save
          </span>
        </p>
      </FormSection>

      <div className="mt-8">
        <GoalProbabilityLab index="02" />
      </div>

      {/* Integrated Goal Conflict Resolver (owned by analytics group) */}
      <div className="mt-8">
        <GoalConflictResolver />
      </div>
    </div>
  );
};
