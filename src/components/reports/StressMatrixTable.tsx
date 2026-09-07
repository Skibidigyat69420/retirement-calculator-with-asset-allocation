import type { StressTestImpact } from '../../lib/stressTest';
import { ASSET_LABELS } from '../../lib/constants';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface StressMatrixTableProps {
  results: StressTestImpact[];
  className?: string;
}

const resilienceTone = (score: number) =>
  score >= 70 ? 'text-emerald-700' : score >= 45 ? 'text-amber-700' : 'text-rose-700';

/**
 * Side-by-side crisis scenario matrix. Rendered with plain tables + text so
 * every column prints cleanly in the A4 dossier.
 */
export const StressMatrixTable = ({ results, className }: StressMatrixTableProps) => {
  if (!results.length) return null;

  return (
    <div className={cn('overflow-x-auto avoid-break', className)}>
      <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
        <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider">
          <tr>
            <th className="p-3">Crisis Scenario</th>
            <th className="p-3 text-center">Resilience</th>
            <th className="p-3 text-right">Corpus Delta at Retirement</th>
            <th className="p-3 text-right">Shocked Corpus</th>
            <th className="p-3 text-right">Worst Category Hit</th>
            <th className="p-3">Top Mitigation Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {results.map((r) => {
            const worst = r.categoryImpacts.reduce((a, b) => (b.delta < a.delta ? b : a), r.categoryImpacts[0]);
            return (
              <tr key={r.scenario.id}>
                <td className="p-3">
                  <p className="font-semibold text-zinc-900">{r.scenario.name}</p>
                  <p className="text-[10px] text-zinc-500">{r.scenario.historicalPeriod}</p>
                </td>
                <td className="p-3 text-center">
                  <span className={cn('font-mono font-bold', resilienceTone(r.resilienceScore))}>
                    {r.resilienceScore}/100
                  </span>
                  <p className="text-[10px] text-zinc-500">
                    {r.shockedSustainable
                      ? (r.baselineDepletionAge !== null ? `Solvent to age ${r.baselineDepletionAge}` : 'Remains solvent')
                      : `Depletes at ${r.shockedDepletionAge ?? '—'}`}
                  </p>
                </td>
                <td className={cn('p-3 text-right font-mono font-semibold', r.corpusDelta < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                  {r.corpusDelta < 0 ? '−' : '+'}
                  {formatCurrencyCompact(Math.abs(r.corpusDelta))}
                </td>
                <td className="p-3 text-right font-mono text-zinc-800">
                  {formatCurrencyCompact(r.shockedCorpusAtRetirement)}
                </td>
                <td className="p-3 text-right">
                  <span className="font-mono font-semibold text-rose-600">
                    {ASSET_LABELS[worst.category]} {formatPercent(worst.shockPercent)}
                  </span>
                </td>
                <td className="p-3 text-zinc-600 leading-snug">{r.mitigationActions[0] ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
