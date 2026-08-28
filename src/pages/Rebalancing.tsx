import { useState, useMemo } from 'react';
import { RefreshCcw, Target, AlertCircle } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { Alert } from '../components/ui/Alert';
import { useCalculator } from '../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatPercent } from '../lib/formatters';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const Rebalancing = () => {
  const { inputs, updateAsset } = useCalculator();
  const [driftBand, setDriftBand] = useState(5);
  const [targets, setTargets] = useState<Record<AssetCategory, number>>({
    equity: 55,
    debt: 20,
    gold: 10,
    realestate: 10,
    liquid: 4,
    other: 1,
  });

  const currentByCategory = useMemo(() => {
    const totals: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    inputs.assets.forEach((a) => {
      totals[a.category] += a.value;
    });
    return totals;
  }, [inputs.assets]);

  const totalValue = useMemo(() => Object.values(currentByCategory).reduce((a, b) => a + b, 0), [currentByCategory]);

  const rebalanceActions = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const current = currentByCategory[cat];
      const currentPct = totalValue > 0 ? (current / totalValue) * 100 : 0;
      const targetPct = targets[cat];
      const targetValue = totalValue * (targetPct / 100);
      const drift = currentPct - targetPct;
      return {
        category: cat,
        current,
        currentPct,
        targetPct,
        targetValue,
        drift,
        action: Math.abs(drift) > driftBand ? (drift > 0 ? 'Sell' : 'Buy') : 'Hold',
        tradeValue: targetValue - current,
      };
    });
  }, [currentByCategory, targets, totalValue, driftBand]);

  const needsRebalance = rebalanceActions.some((a) => a.action !== 'Hold');

  const applyRebalance = () => {
    inputs.assets.forEach((asset) => {
      const catAction = rebalanceActions.find((a) => a.category === asset.category);
      if (catAction && catAction.action !== 'Hold' && catAction.tradeValue !== 0) {
        const sameCatAssets = inputs.assets.filter((a) => a.category === asset.category);
        const proportion = sameCatAssets.length > 0 ? asset.value / currentByCategory[asset.category] : 1;
        const adjustment = catAction.tradeValue * proportion;
        updateAsset(asset.id, { value: Math.max(0, asset.value + adjustment) });
      }
    });
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Rebalancing Optimizer"
        subtitle="Drift-band rebalancing with tax-aware turnover estimates and trade recommendations."
        badge="Portfolio Management"
      />

      <Card className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Drift Band</label>
          <Slider label="Drift Band" value={driftBand} onChange={setDriftBand} suffix="%" />
          <p className="text-xs text-stone-400 mt-1">Rebalance when allocation drifts beyond ±{driftBand}% of target.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
              <span className="flex items-center gap-2 text-sm font-medium text-navy">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                {ASSET_LABELS[cat]} Target
              </span>
              <input
                type="number"
                value={targets[cat]}
                onChange={(e) => setTargets((prev) => ({ ...prev, [cat]: Number(e.target.value) }))}
                className="w-20 px-2 py-1 bg-white border border-stone-200 rounded-lg text-sm text-right"
              />
            </div>
          ))}
        </div>
      </Card>

      {needsRebalance && (
        <Alert variant="warning" icon={AlertCircle}>
          Allocation drift exceeds the {driftBand}% band. Review recommended trades below.
        </Alert>
      )}

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
          <Target size={18} className="text-gold" /> Rebalance Trades
        </h3>
        <DataTable
          data={rebalanceActions}
          columns={[
            { key: 'category', header: 'Asset Class', render: (r) => ASSET_LABELS[r.category] },
            { key: 'currentPct', header: 'Current %', align: 'right', render: (r) => formatPercent(r.currentPct) },
            { key: 'targetPct', header: 'Target %', align: 'right', render: (r) => formatPercent(r.targetPct) },
            { key: 'drift', header: 'Drift', align: 'right', render: (r) => formatPercent(r.drift) },
            { key: 'tradeValue', header: 'Trade Value', align: 'right', render: (r) => formatCurrency(r.tradeValue) },
            { key: 'action', header: 'Action', align: 'center', render: (r) => (
              <span className={`text-xs font-bold ${r.action === 'Buy' ? 'text-emerald-600' : r.action === 'Sell' ? 'text-rose-600' : 'text-stone-500'}`}>
                {r.action}
              </span>
            )},
          ]}
        />
        <Button onClick={applyRebalance} className="mt-4 w-full" disabled={!needsRebalance}>
          <RefreshCcw size={16} className="mr-1.5" /> Apply Rebalance to Plan
        </Button>
      </Card>
    </div>
  );
};
