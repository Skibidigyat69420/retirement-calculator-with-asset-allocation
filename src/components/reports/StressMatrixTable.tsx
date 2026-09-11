import type { StressTestImpact } from '../../lib/stressTest';
import { ASSET_LABELS } from '../../lib/constants';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface StressMatrixTableProps {
  results: StressTestImpact[];
  className?: string;
}

const resilienceTone = (score: number) =>
  score >= 70 ? 'text-positive' : score >= 45 ? 'text-warning' : 'text-negative';

/**
 * Side-by-side crisis scenario matrix. Rendered with plain tables + text so
 * every column prints cleanly in the A4 dossier.
 */
export const StressMatrixTable = ({ results, className }: StressMatrixTableProps) => {
  if (!results.length) return null;

  return (
    <div className={cn('overflow-x-auto avoid-break', className)}>
      <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
        <thead className="bg-sunken text-muted font-semibold border-b border-border uppercase tracking-wider">
          <tr>
            <th className="p-3">Crisis Scenario</th>
            <th className="p-3 text-center">Resilience</th>
            <th className="p-3 text-right">Corpus Delta at Retirement</th>
            <th className="p-3 text-right">Shocked Corpus</th>
            <th className="p-3 text-right">Worst Category Hit</th>
            <th className="p-3">Top Mitigation Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {results.map((r) => {
            const worst = r.categoryImpacts.reduce((a, b) => (b.delta < a.delta ? b : a), r.categoryImpacts[0]);
            return (
              <tr key={r.scenario.id}>
                <td className="p-3">
                  <p className="font-semibold text-ink">{r.scenario.name}</p>
                  <p className="text-[10px] text-faint">{r.scenario.historicalPeriod}</p>
                </td>
                <td className="p-3 text-center">
                  <span className={cn('font-mono tabular-nums font-semibold', resilienceTone(r.resilienceScore))}>
                    {r.resilienceScore}/100
                  </span>
                  <p className="text-[10px] text-faint">
                    {r.shockedSustainable
                      ? (r.baselineDepletionAge !== null ? `Solvent to age ${r.baselineDepletionAge}` : 'Remains solvent')
                      : `Depletes at ${r.shockedDepletionAge ?? '—'}`}
                  </p>
                </td>
                <td className={cn('p-3 text-right font-mono tabular-nums font-semibold', r.corpusDelta < 0 ? 'text-negative' : 'text-positive')}>
                  {r.corpusDelta < 0 ? '−' : '+'}
                  {formatCurrencyCompact(Math.abs(r.corpusDelta))}
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-ink-soft">
                  {formatCurrencyCompact(r.shockedCorpusAtRetirement)}
                </td>
                <td className="p-3 text-right">
                  <span className="font-mono tabular-nums font-semibold text-negative">
                    {ASSET_LABELS[worst.category]} {formatPercent(worst.shockPercent)}
                  </span>
                </td>
                <td className="p-3 text-muted leading-snug">{r.mitigationActions[0] ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
