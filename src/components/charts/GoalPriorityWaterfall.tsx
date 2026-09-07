import type { GoalConflictResult } from '../../lib/goalConflictEngine';
import { formatCurrencyCompact } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface GoalPriorityWaterfallProps {
  result: GoalConflictResult;
  ariaLabel?: string;
}

const STATUS_STYLES: Record<string, string> = {
  'Fully Funded': 'bg-positive-soft text-positive border-positive/40',
  'Partially Funded': 'bg-warning-soft text-warning border-warning/40',
  'Unfunded / At Risk': 'bg-negative-soft text-negative border-negative/40',
};

/**
 * Priority funding waterfall: goals ordered by priority rank, each showing the
 * share of its future cost covered by projected wealth (solid segment) versus
 * the shortfall (dashed segment). Retirement demand is funded first by the
 * conflict engine, so remaining wealth cascades down this list.
 */
export const GoalPriorityWaterfall = ({
  result,
  ariaLabel,
}: GoalPriorityWaterfallProps) => {
  const goals = result.evaluatedGoals;
  const maxCost = Math.max(1, ...goals.map((g) => g.futureCost));

  const fundedTotal = goals.reduce((sum, g) => sum + g.allocatedWealth, 0);
  const shortfallTotal = goals.reduce((sum, g) => sum + g.shortfall, 0);

  const description =
    goals.length === 0
      ? 'No goals configured.'
      : `Priority funding waterfall across ${goals.length} goals: ${formatCurrencyCompact(fundedTotal)} of ` +
        `${formatCurrencyCompact(fundedTotal + shortfallTotal)} total future cost is funded by projected wealth` +
        (shortfallTotal > 0 ? `, leaving ${formatCurrencyCompact(shortfallTotal)} unfunded.` : '.');

  if (goals.length === 0) {
    return (
      <div role="img" aria-label={ariaLabel ?? description}>
        <span className="sr-only">{description}</span>
        <p className="text-sm text-muted">Add goals to see the priority funding waterfall.</p>
      </div>
    );
  }

  return (
    <div role="img" aria-label={ariaLabel ?? description}>
      <span className="sr-only">{description}</span>

      <ol className="space-y-4">
        {goals.map((g, idx) => {
          const fundedPct = (g.allocatedWealth / maxCost) * 100;
          const shortfallPct = (g.shortfall / maxCost) * 100;
          return (
            <li key={g.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-faint shrink-0">#{idx + 1}</span>
                  <span className="font-semibold text-ink truncate">{g.name}</span>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0',
                      STATUS_STYLES[g.fundedStatus],
                    )}
                  >
                    {g.coveragePercent}%
                  </span>
                </span>
                <span className="font-mono text-muted shrink-0">
                  {formatCurrencyCompact(g.allocatedWealth)}
                  <span className="text-faint"> / {formatCurrencyCompact(g.futureCost)}</span>
                </span>
              </div>
              <div
                className="h-4 w-full bg-sunken rounded-md overflow-hidden flex border border-border"
                aria-hidden="true"
              >
                <div
                  className={cn(
                    'h-full',
                    g.allocatedWealth > 0 ? 'bg-positive' : 'bg-transparent',
                  )}
                  style={{ width: `${fundedPct}%` }}
                />
                {g.shortfall > 0 && (
                  <div
                    className="h-full bg-negative-soft border-l-2 border-dashed border-negative"
                    style={{ width: `${shortfallPct}%` }}
                  />
                )}
              </div>
              {g.shortfall > 0 && (
                <p className="text-[11px] text-negative font-medium">
                  Shortfall {formatCurrencyCompact(g.shortfall)} — raise SIP or extend the horizon.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-positive inline-block" aria-hidden="true" />
          Funded by projected wealth
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-negative-soft border border-dashed border-negative inline-block" aria-hidden="true" />
          Unfunded shortfall
        </span>
        <span className="ml-auto font-mono">
          Total demand {formatCurrencyCompact(fundedTotal + shortfallTotal)}
        </span>
      </div>
    </div>
  );
};
