import type { StressTestImpact } from '../../lib/stressTest';
import { formatCurrencyCompact } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface StressImpactBarsProps {
  results: StressTestImpact[];
  /** Accessible name for the visual (announced by screen readers). */
  ariaLabel: string;
  className?: string;
}

/**
 * Per-scenario corpus impact at retirement as magnitude-scaled horizontal
 * bars rendered with pure divs. Bars extend left (negative, red) or right
 * (positive, green) from a central zero line; every bar carries its exact
 * value in text so colour is never the only encoder. Pairs with the full
 * StressMatrixTable, which remains the tabular representation.
 */
export const StressImpactBars = ({ results, ariaLabel, className }: StressImpactBarsProps) => {
  if (!results.length) return null;

  const maxAbs = Math.max(1, ...results.map((r) => Math.abs(r.corpusDelta)));
  const scale = (delta: number) => Math.max(1.5, (Math.abs(delta) / maxAbs) * 50);

  return (
    <div className={cn('space-y-2.5', className)} aria-label={ariaLabel}>
      {results.map((r) => {
        const negative = r.corpusDelta < 0;
        const widthPct = scale(r.corpusDelta);
        return (
          <div key={r.scenario.id} className="flex items-center gap-3 text-xs">
            <span className="w-44 shrink-0 text-ink leading-snug">
              <span className="block font-semibold">{r.scenario.name}</span>
              <span className="block text-[10px] text-muted">{r.scenario.historicalPeriod}</span>
            </span>
            <div className="flex-1 relative h-5" role="img" aria-label={`${r.scenario.name}: corpus impact at retirement ${negative ? '−' : '+'}${formatCurrencyCompact(Math.abs(r.corpusDelta))}`}>
              {/* zero line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong" />
              {negative ? (
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-l bg-negative"
                  style={{ right: '50%', width: `calc(${widthPct}% - 1px)` }}
                />
              ) : (
                <div
                  className={cn('absolute top-0.5 bottom-0.5 rounded-r', r.corpusDelta === 0 ? 'bg-border-strong' : 'bg-positive')}
                  style={{ left: '50%', width: `calc(${widthPct}% - 1px)` }}
                />
              )}
            </div>
            <span
              className={cn(
                'w-20 shrink-0 text-right font-mono font-semibold',
                negative ? 'text-negative' : r.corpusDelta === 0 ? 'text-muted' : 'text-positive',
              )}
            >
              {r.corpusDelta === 0 ? '—' : `${negative ? '−' : '+'}${formatCurrencyCompact(Math.abs(r.corpusDelta))}`}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between text-[9px] uppercase tracking-wider text-muted pl-47">
        <span>← Corpus reduction vs baseline</span>
        <span>Increase →</span>
      </div>
    </div>
  );
};
