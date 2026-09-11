import { useMemo } from 'react';
import { Grid3x3 } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { FinancialMetric } from '../ui/FinancialMetric';
import { EmptyState } from '../ui/EmptyState';
import { useCalculator } from '../../context/CalculatorContext';
import { evaluateGoalConflicts } from '../../lib/goalConflictEngine';
import { formatCurrencyCompact } from '../../lib/formatters';
import { guardNumber } from '../../lib/planState';
import { cn } from '../../lib/utils';
import type { EvaluatedGoalDemand } from '../../lib/goalConflictEngine';

interface MatrixMember {
  id: string;
  short: string;
  full: string;
  year: number;
  demand: number;
  shortfall: number;
}

type ConflictKind = 'horizon' | 'funding' | 'both';

const shortName = (name: string): string =>
  name.length > 12 ? `${name.slice(0, 11)}…` : name;

/**
 * Goal × goal conflict matrix. A pair conflicts when the milestones land within
 * a year of each other (same corpus, same year) or when both claims are
 * unfunded under projected wealth. Retirement sits as the anchor row/column —
 * it is always funded first, so any unfunded goal conflicts with it.
 */
export const GoalConflictMatrix = () => {
  const { inputs, wealthResult } = useCalculator();

  const conflictResult = useMemo(
    () => evaluateGoalConflicts(inputs, wealthResult),
    [inputs, wealthResult],
  );

  const configured = wealthResult.isConfigured;

  const members = useMemo((): MatrixMember[] => {
    const retirement: MatrixMember = {
      id: '__retirement',
      short: 'Retire',
      full: 'Core retirement corpus',
      year:
        inputs.currentAge > 0 && inputs.retirementAge > inputs.currentAge
          ? new Date().getFullYear() + (inputs.retirementAge - inputs.currentAge)
          : new Date().getFullYear(),
      demand: conflictResult.retirementDemand,
      shortfall: 0, // funded first by construction
    };
    const goals: MatrixMember[] = conflictResult.evaluatedGoals.map((g: EvaluatedGoalDemand) => ({
      id: g.id,
      short: shortName(g.name),
      full: g.name,
      year: g.targetYear,
      demand: g.futureCost,
      shortfall: g.shortfall,
    }));
    return [retirement, ...goals];
  }, [conflictResult, inputs.currentAge, inputs.retirementAge]);

  const conflicts = useMemo(() => {
    const map = new Map<string, ConflictKind>();
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i];
        const b = members[j];
        const horizon = Math.abs(a.year - b.year) <= 1;
        const funding = a.shortfall > 0 && b.shortfall > 0;
        const isRetirementPair = a.id === '__retirement' || b.id === '__retirement';
        // Retirement never misses funding; only same-year liquidity pressure
        // marks its cells. Goal pairs conflict on horizon, funding, or both.
        if (isRetirementPair ? horizon : horizon || funding) {
          map.set(`${a.id}|${b.id}`, horizon && funding ? 'both' : horizon ? 'horizon' : 'funding');
        }
      }
    }
    return map;
  }, [members]);

  const conflictCount = conflicts.size;
  const goalCount = members.length - 1;

  if (goalCount === 0) {
    return (
      <EmptyState
        title="No goals to compare"
        description="Add at least one goal to map how its capital claim interacts with the retirement corpus."
      />
    );
  }

  const demand = configured
    ? guardNumber(conflictResult.totalHouseholdDemand)
    : null;
  const surplus = configured
    ? guardNumber(conflictResult.netSurplusOrDeficit)
    : null;

  const cellKind = (rowId: string, colId: string): ConflictKind | null => {
    if (rowId === colId) return null;
    const key = rowId < colId ? `${rowId}|${colId}` : `${colId}|${rowId}`;
    return conflicts.get(key) ?? null;
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Conflict matrix"
        description="Goal × goal capital claims. Warning cells mark pairs competing for the same corpus."
        hairline
      />

      {/* Topline — guarded, hairline grid. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden">
        <div className="bg-surface px-4 py-3.5">
          <FinancialMetric
            size="sm"
            label="Household demand"
            value={demand}
            prefix="₹"
            hint="Retirement + all goals, inflation-adjusted"
          />
        </div>
        <div className="bg-surface px-4 py-3.5">
          <FinancialMetric
            size="sm"
            label="Projected wealth"
            value={configured ? guardNumber(conflictResult.projectedAvailableWealth) : null}
            prefix="₹"
            hint="Terminal net worth from the engine"
          />
        </div>
        <div className="bg-surface px-4 py-3.5">
          <FinancialMetric
            size="sm"
            label="Surplus / deficit"
            value={surplus}
            prefix="₹"
            deltaLabel={
              surplus === null
                ? 'Configure the plan to evaluate.'
                : surplus >= 0
                  ? 'All claims covered'
                  : 'Funding gap — see matrix'
            }
          />
        </div>
        <div className="bg-surface px-4 py-3.5">
          <FinancialMetric
            size="sm"
            label="Conflicting pairs"
            value={String(conflictCount)}
            hint={
              conflictCount === 0
                ? 'No competing claims detected'
                : `Across ${goalCount} goal${goalCount !== 1 ? 's' : ''} + retirement`
            }
          />
        </div>
      </div>

      {/* Dense matrix */}
      <div className="rounded-lg border border-border bg-surface overflow-x-auto">
        <table className="w-full border-collapse text-[10px] font-mono">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 bg-surface z-10 p-2.5 text-left font-medium uppercase tracking-[0.08em] text-faint border-b border-border min-w-24"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Grid3x3 size={12} strokeWidth={1.6} aria-hidden="true" />
                  Claim
                </span>
              </th>
              {members.map((m) => (
                <th
                  key={m.id}
                  scope="col"
                  title={m.full}
                  className="p-2 text-center font-medium uppercase tracking-[0.06em] text-muted border-b border-border min-w-14"
                >
                  {m.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((row) => (
              <tr key={row.id} className="border-b border-border-subtle last:border-b-0">
                <th
                  scope="row"
                  title={row.full}
                  className="sticky left-0 bg-surface z-10 p-2.5 text-left font-medium uppercase tracking-[0.06em] text-muted whitespace-nowrap"
                >
                  {row.short}
                  <span className="block normal-case tracking-normal text-faint">{row.year}</span>
                </th>
                {members.map((col) => {
                  const kind = cellKind(row.id, col.id);
                  if (row.id === col.id) {
                    return (
                      <td
                        key={col.id}
                        className="p-2 text-center tabular-nums text-ink-soft bg-sunken/60"
                        title={`${row.full} — demand ${formatCurrencyCompact(row.demand)}`}
                      >
                        {configured ? formatCurrencyCompact(row.demand) : '—'}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col.id}
                      title={
                        kind
                          ? `${row.full} × ${col.full} — ${
                              kind === 'horizon'
                                ? 'same-year liquidity pressure'
                                : kind === 'funding'
                                  ? 'both claims unfunded'
                                  : 'same year, both unfunded'
                            }`
                          : `${row.full} × ${col.full} — no conflict`
                      }
                      className={cn(
                        'p-2 text-center tabular-nums border-l border-border-subtle first:border-l-0',
                        kind === 'both' && 'bg-warning-soft text-warning font-semibold',
                        kind === 'horizon' && 'bg-warning-soft/70 text-warning',
                        kind === 'funding' && 'bg-warning-soft/70 text-warning',
                        !kind && 'text-border-strong',
                      )}
                    >
                      {kind ? (kind === 'both' ? 'Δt·₹' : kind === 'horizon' ? 'Δt' : '₹') : '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend + count summary */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-warning-soft border border-warning/40" aria-hidden="true" />
          Conflict
        </span>
        <span className="font-mono">
          Δt — milestones within a year of each other
        </span>
        <span className="font-mono">₹ — both claims unfunded under projected wealth</span>
        <span className="ml-auto font-mono tabular-nums">
          {conflictCount === 0
            ? 'No conflicting pairs'
            : `${conflictCount} conflicting pair${conflictCount !== 1 ? 's' : ''}`}
          {' · '}
          {goalCount} goal{goalCount !== 1 ? 's' : ''} + retirement
        </span>
      </div>

      {!configured && (
        <p className="text-xs text-faint leading-relaxed">
          Values appear once the plan is configured with income, assets and a SIP — until then
          the matrix shows structure only, not fabricated amounts.
        </p>
      )}
    </div>
  );
};
