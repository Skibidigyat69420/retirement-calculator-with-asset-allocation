import { useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import { SectionTitle } from '../components/ui/SectionTitle';
import { DonutChart } from '../components/charts/DonutChart';
import { useCalculator } from '../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatPercent } from '../lib/formatters';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const Allocation = () => {
  const { inputs } = useCalculator();
  const [targets, setTargets] = useState<Record<AssetCategory, number>>({
    equity: 55,
    debt: 15,
    gold: 15,
    realestate: 10,
    liquid: 4,
    other: 1,
  });

  const currentByCategory = useMemo(() => {
    const totals: Record<AssetCategory, number> = {
      equity: 0,
      debt: 0,
      gold: 0,
      realestate: 0,
      liquid: 0,
      other: 0,
    };
    inputs.assets.forEach((a) => {
      totals[a.category] += a.value;
    });
    return totals;
  }, [inputs.assets]);

  const totalValue = useMemo(
    () => Object.values(currentByCategory).reduce((a, b) => a + b, 0),
    [currentByCategory],
  );

  const currentData = CATEGORIES.map((cat) => ({
    name: ASSET_LABELS[cat],
    value: currentByCategory[cat],
    color: ASSET_COLORS[cat],
  })).filter((d) => d.value > 0);

  const updateTarget = (cat: AssetCategory, value: number) => {
    setTargets((prev) => ({ ...prev, [cat]: value }));
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Asset Allocation"
        subtitle="Compare your current allocation against a strategic target and identify rebalancing gaps."
        badge="Standalone"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4">Current Allocation</h3>
          <DonutChart data={currentData} />
          <div className="mt-4 space-y-2">
            {CATEGORIES.map((cat) => {
              const value = currentByCategory[cat];
              const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
              if (value <= 0) return null;
              return (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                    {ASSET_LABELS[cat]}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(value)} ({formatPercent(percent)})
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4">Target Allocation</h3>
          <div className="space-y-5">
            {CATEGORIES.map((cat) => (
              <Slider
                key={cat}
                label={ASSET_LABELS[cat]}
                value={targets[cat]}
                onChange={(v) => updateTarget(cat, v)}
                suffix="%"
              />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4">Rebalancing Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                <th className="py-2 pr-4">Asset Class</th>
                <th className="py-2 pr-4 text-right">Current</th>
                <th className="py-2 pr-4 text-right">Current %</th>
                <th className="py-2 pr-4 text-right">Target %</th>
                <th className="py-2 pr-4 text-right">Gap (₹)</th>
                <th className="py-2 pr-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => {
                const current = currentByCategory[cat];
                const currentPct = totalValue > 0 ? (current / totalValue) * 100 : 0;
                const targetValue = totalValue * (targets[cat] / 100);
                const gap = targetValue - current;
                return (
                  <tr key={cat} className="border-b border-stone-100">
                    <td className="py-2 pr-4 flex items-center">
                      <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                      {ASSET_LABELS[cat]}
                    </td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(current)}</td>
                    <td className="py-2 pr-4 text-right">{formatPercent(currentPct)}</td>
                    <td className="py-2 pr-4 text-right">{formatPercent(targets[cat])}</td>
                    <td className="py-2 pr-4 text-right font-medium">{formatCurrency(gap)}</td>
                    <td className="py-2 pr-4 text-center">
                      {Math.abs(gap) < totalValue * 0.02 ? (
                        <span className="text-stone-500 text-xs">Hold</span>
                      ) : gap > 0 ? (
                        <span className="text-green-600 text-xs font-semibold">Buy</span>
                      ) : (
                        <span className="text-red-600 text-xs font-semibold">Sell</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
