import { useMemo } from 'react';
import { TrendingUp, Layers } from 'lucide-react';
import { NominalRealChart } from '../charts/NominalRealChart';
import { AssetEvolutionChart } from '../charts/AssetEvolutionChart';
import { SWPDrawdownChart } from '../charts/SWPDrawdownChart';
import { DonutChart } from '../charts/DonutChart';
import { NetWorthInvestedChart } from '../charts/NetWorthInvestedChart';
import { CashFlowTimelineChart } from '../charts/CashFlowTimelineChart';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatCurrency } from '../../lib/formatters';
import type { MasterPlanInputs, AssetCategory } from '../../types';
import type { WealthEngineResult } from '../../lib/wealthEngine';

interface ResultsChartsProps {
  inputs: MasterPlanInputs;
  wealthResult: WealthEngineResult;
}

/**
 * Trajectory & evolution chart grid for the Outlook step. Consumes engine
 * output only — all simulation math lives in src/lib.
 */
export const ResultsCharts = ({ inputs, wealthResult }: ResultsChartsProps) => {
  const accData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'accumulation')
        .map((s) => ({ label: `Age ${s.age}`, nominal: s.total, real: s.realTotal })),
    [wealthResult.snapshots],
  );

  const swpData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'distribution')
        .map((s) => ({ label: `Age ${s.age}`, corpus: s.total })),
    [wealthResult.snapshots],
  );

  const netWorthData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        label: `Age ${s.age}`,
        netWorth: s.total,
        invested: s.invested,
      })),
    [wealthResult.snapshots],
  );

  const assetEvolutionAllData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        label: `Age ${s.age}`,
        equity: s.values.equity,
        debt: s.values.debt,
        gold: s.values.gold,
        realestate: s.values.realestate,
        liquid: s.values.liquid,
        other: s.values.other,
      })),
    [wealthResult.snapshots],
  );

  const terminalSnapshot = wealthResult.snapshots[wealthResult.snapshots.length - 1];
  const allocationData = useMemo(() => {
    if (!terminalSnapshot) return [];
    const total = terminalSnapshot.total;
    const alloc = wealthResult.projectedAllocation;
    return (['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as AssetCategory[])
      .map((cat) => ({ name: ASSET_LABELS[cat], value: total * alloc[cat], color: ASSET_COLORS[cat] }))
      .filter((d) => d.value > 0);
  }, [terminalSnapshot, wealthResult.projectedAllocation]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8">
        <figure className="border-t border-border pt-5">
          <figcaption className="flex items-center gap-2 text-sm font-semibold text-ink">
            <TrendingUp size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
            Accumulation trajectory
          </figcaption>
          <div className="mt-3 border border-border rounded-md bg-surface p-4">
            <NominalRealChart data={accData} xKey="label" />
          </div>
          <p className="mt-2.5 text-xs text-muted leading-relaxed">
            The gap between solid nominal and dashed real tracks cumulative {inputs.inflation}% inflation.
          </p>
        </figure>

        <figure className="border-t border-border pt-5">
          <figcaption className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Layers size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
            Asset class evolution
          </figcaption>
          <div className="mt-3 border border-border rounded-md bg-surface p-4">
            <AssetEvolutionChart data={assetEvolutionAllData} xKey="label" variant="area" />
          </div>
          <p className="mt-2.5 text-xs text-muted leading-relaxed">
            Equity expansion drives compounding in accumulation, transitioning to stable drawdown in retirement.
          </p>
        </figure>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8">
        <figure className="border-t border-border pt-5">
          <figcaption className="text-sm font-semibold text-ink">Net worth vs. capital invested</figcaption>
          <div className="mt-3 border border-border rounded-md bg-surface p-4">
            <NetWorthInvestedChart data={netWorthData} />
          </div>
          <p className="mt-2.5 text-xs text-muted leading-relaxed">
            {wealthResult.totalInvested > 0
              ? `Compounding creates ${formatCurrency(wealthResult.terminalValue)} from ${formatCurrency(wealthResult.totalInvested)} contributed.`
              : 'Add a monthly SIP in Step 03 to project capital contributions.'}
          </p>
        </figure>

        <figure className="border-t border-border pt-5">
          <figcaption className="text-sm font-semibold text-ink">Annual cash flows</figcaption>
          <div className="mt-3 border border-border rounded-md bg-surface p-4">
            <CashFlowTimelineChart snapshots={wealthResult.snapshots} />
          </div>
          <p className="mt-2.5 text-xs text-muted leading-relaxed">
            Green bars are SIP/STP savings; amber bars are milestone goals; red bars are SWP distributions.
          </p>
        </figure>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8">
        <figure className="border-t border-border pt-5">
          <figcaption className="text-sm font-semibold text-ink">SWP drawdown longevity</figcaption>
          <div className="mt-3 border border-border rounded-md bg-surface p-4">
            <SWPDrawdownChart data={swpData} xKey="label" />
          </div>
          <p className="mt-2.5 text-xs text-muted leading-relaxed">
            {wealthResult.sustainable
              ? `Retirement corpus sustains withdrawals through age ${inputs.lifeExpectancy}.`
              : `Corpus drops to zero at age ${wealthResult.depletionAge ?? '—'}.`}
          </p>
        </figure>

        <figure className="border-t border-border pt-5">
          <figcaption className="text-sm font-semibold text-ink">Terminal allocation</figcaption>
          <div className="mt-3 border border-border rounded-md bg-surface p-4">
            <DonutChart data={allocationData} />
          </div>
          <p className="mt-2.5 text-xs text-muted leading-relaxed">
            Residual asset-class distribution at the horizon end.
          </p>
        </figure>
      </div>
    </>
  );
};
