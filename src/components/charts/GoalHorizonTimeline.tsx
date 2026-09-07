import type { GoalPriority } from '../../types';
import { formatCurrencyCompact } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface HorizonGoal {
  id: string;
  name: string;
  yearsToGoal: number;
  priority: GoalPriority;
  futureValue?: number;
}

interface GoalHorizonTimelineProps {
  goals: HorizonGoal[];
  currentAge: number;
  ariaLabel?: string;
}

const PRIORITY_DOT: Record<GoalPriority, string> = {
  essential: 'bg-negative',
  important: 'bg-info',
  aspirational: 'bg-warning',
};

const PRIORITY_TEXT: Record<GoalPriority, string> = {
  essential: 'text-negative',
  important: 'text-info',
  aspirational: 'text-warning',
};

/**
 * All goals plotted on a single horizontal horizon axis (years from now),
 * color-coded by priority tier. Div-based for reliable printing.
 */
export const GoalHorizonTimeline = ({
  goals,
  currentAge,
  ariaLabel,
}: GoalHorizonTimelineProps) => {
  const sorted = [...goals].sort((a, b) => a.yearsToGoal - b.yearsToGoal);
  const maxYears = Math.max(5, ...sorted.map((g) => g.yearsToGoal));
  const ticks = Array.from({ length: Math.floor(maxYears / 5) + 1 }, (_, i) => i * 5);

  const description =
    sorted.length === 0
      ? 'No goals on the horizon.'
      : `Goals on a ${maxYears}-year horizon: ` +
        sorted
          .map(
            (g) =>
              `${g.name} in ${g.yearsToGoal} years at age ${currentAge + g.yearsToGoal} (${g.priority})`,
          )
          .join('; ') +
        '.';

  if (sorted.length === 0) {
    return (
      <div role="img" aria-label={ariaLabel ?? description}>
        <span className="sr-only">{description}</span>
        <p className="text-sm text-muted">Add goals to build the horizon timeline.</p>
      </div>
    );
  }

  return (
    <div role="img" aria-label={ariaLabel ?? description}>
      <span className="sr-only">{description}</span>

      <div className="relative">
        {/* Marker + axis region with fixed height so labels never overlap */}
        <div className="relative h-28">
          {/* Axis track */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-sunken rounded-full border border-border">
            {sorted.map((g) => (
              <span
                key={`tick-${g.id}`}
                className={cn('absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2', PRIORITY_DOT[g.priority])}
                style={{ left: `calc(${Math.min(98, Math.max(2, (g.yearsToGoal / maxYears) * 100))}% - 3px)` }}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* Goal markers (alternated above / below the axis) */}
          {sorted.map((g, idx) => {
            const left = Math.min(98, Math.max(2, (g.yearsToGoal / maxYears) * 100));
            const above = idx % 2 === 0;
            return (
              <div
                key={g.id}
                className={cn(
                  'absolute flex flex-col items-center pointer-events-none transform -translate-x-1/2',
                  above ? 'bottom-1/2 mb-2.5' : 'top-1/2 mt-2.5',
                )}
                style={{ left: `${left}%` }}
              >
                {above && (
                  <span className={cn('text-[10px] font-semibold whitespace-nowrap mb-1', PRIORITY_TEXT[g.priority])}>
                    {g.name} · {g.yearsToGoal}y
                  </span>
                )}
                <span
                  className={cn('w-3 h-3 rounded-full border-2 border-surface shadow-xs shrink-0', PRIORITY_DOT[g.priority])}
                  aria-hidden="true"
                />
                {!above && (
                  <span className={cn('text-[10px] font-semibold whitespace-nowrap mt-1', PRIORITY_TEXT[g.priority])}>
                    {g.name} · {g.yearsToGoal}y
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Year ticks */}
        <div className="relative h-4 mt-1 text-[10px] font-mono text-faint">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute transform -translate-x-1/2"
              style={{ left: `${(t / maxYears) * 100}%` }}
            >
              {t === 0 ? 'Now' : `${t}y`}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 pt-3 border-t border-border text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-full inline-block', PRIORITY_DOT.essential)} aria-hidden="true" />
          Essential
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-full inline-block', PRIORITY_DOT.important)} aria-hidden="true" />
          Important
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-full inline-block', PRIORITY_DOT.aspirational)} aria-hidden="true" />
          Aspirational
        </span>
        <span className="ml-auto font-mono">
          Next milestone: {sorted[0].name} in {sorted[0].yearsToGoal}y
          {sorted[0].futureValue ? ` (${formatCurrencyCompact(sorted[0].futureValue)})` : ''}
        </span>
      </div>
    </div>
  );
};
