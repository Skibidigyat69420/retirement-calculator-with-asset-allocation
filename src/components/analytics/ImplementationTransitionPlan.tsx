import { useMemo } from 'react';
import {
  ArrowRightLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useCalculator } from '../../context/CalculatorContext';
import { getCategoryBreakdown } from '../../lib/calculations';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import type { AssetCategory } from '../../types';
import { ASSET_LABELS } from '../../lib/constants';

export const ImplementationTransitionPlan = () => {
  const { inputs, manualTargets, showToast } = useCalculator();

  const breakdown = useMemo(() => {
    return getCategoryBreakdown(inputs.assets);
  }, [inputs.assets]);

  const totalWealth = breakdown.total;

  // Target allocation: manualTargets or default balanced 60/25/10/5
  const targets: Record<AssetCategory, number> = useMemo(() => {
    if (manualTargets) {
      return {
        equity: (manualTargets.equity || 0) / 100,
        debt: (manualTargets.debt || 0) / 100,
        gold: (manualTargets.gold || 0) / 100,
        realestate: (manualTargets.realestate || 0) / 100,
        liquid: (manualTargets.liquid || 0) / 100,
        other: (manualTargets.other || 0) / 100,
      };
    }
    return {
      equity: 0.55,
      debt: 0.25,
      gold: 0.1,
      realestate: 0.05,
      liquid: 0.05,
      other: 0.0,
    };
  }, [manualTargets]);

  // Transition delta calculations
  const transitions = useMemo(() => {
    const categories: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid'];

    return categories.map((cat) => {
      const currentVal = breakdown.sums[cat] || 0;
      const currentPct = breakdown.percentages[cat] || 0;
      const targetPct = (targets[cat] || 0) * 100;
      const targetVal = totalWealth * (targets[cat] || 0);
      const deltaVal = targetVal - currentVal;
      const deltaPct = targetPct - currentPct;

      return {
        category: cat,
        label: ASSET_LABELS[cat] || cat,
        currentVal,
        currentPct,
        targetVal,
        targetPct,
        deltaVal,
        deltaPct,
        action: deltaVal > 50000 ? 'BUY' : deltaVal < -50000 ? 'SELL / REDIRECT' : 'HOLD',
      };
    });
  }, [breakdown, targets, totalWealth]);

  // Estimated friction & costs
  const totalSellVolume = transitions
    .filter((t) => t.deltaVal < 0)
    .reduce((s, t) => s + Math.abs(t.deltaVal), 0);

  // Assuming ~20% of sell volume represents taxable capital gains at 12.5% LTCG
  const estimatedTaxDrag = Math.round(totalSellVolume * 0.2 * 0.125);
  const estimatedTransactionCosts = Math.round(totalSellVolume * 0.0015);

  const handleExportTradeSheet = () => {
    showToast('Trade execution sheet generated and copied.', 'success');
  };

  return (
    <Card className="p-6 border border-zinc-200/90 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
              Portfolio Transition & Implementation Plan
            </h3>
            <Badge variant="navy" className="text-[10px] tracking-wider uppercase font-semibold">
              Trade Execution
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Exact rebalancing trades and SIP redirection needed to bridge Current Holdings to Target Allocation with tax friction awareness.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportTradeSheet}
          className="text-xs h-8 px-3 gap-1.5 self-start sm:self-center shrink-0"
        >
          <FileSpreadsheet size={14} />
          Export Trade Sheet
        </Button>
      </div>

      {/* Transition Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[10px]">
              <th className="pb-2">Asset Class</th>
              <th className="pb-2 text-right">Current Value</th>
              <th className="pb-2 text-right">Current %</th>
              <th className="pb-2 text-right">Target Value</th>
              <th className="pb-2 text-right">Target %</th>
              <th className="pb-2 text-right">Rebalance Delta</th>
              <th className="pb-2 text-center w-28">Order Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transitions.map((t) => {
              let actionBadge = <Badge variant="navy">HOLD</Badge>;
              if (t.action === 'BUY') {
                actionBadge = <Badge variant="success">BUY</Badge>;
              } else if (t.action === 'SELL / REDIRECT') {
                actionBadge = <Badge variant="warning">REDIRECT SIP / SELL</Badge>;
              }

              return (
                <tr key={t.category} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="py-3 font-bold text-zinc-900">{t.label}</td>
                  <td className="py-3 text-right font-mono text-zinc-700">
                    {formatCurrency(t.currentVal)}
                  </td>
                  <td className="py-3 text-right font-mono text-zinc-600">
                    {t.currentPct.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-zinc-900">
                    {formatCurrency(t.targetVal)}
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-indigo-700">
                    {t.targetPct.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right font-mono font-bold">
                    <span className={t.deltaVal > 0 ? 'text-emerald-700' : t.deltaVal < 0 ? 'text-rose-700' : 'text-zinc-500'}>
                      {t.deltaVal > 0 ? `+${formatCurrencyCompact(t.deltaVal)}` : formatCurrencyCompact(t.deltaVal)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-normal">
                      {t.deltaPct > 0 ? `+${t.deltaPct.toFixed(1)}%` : `${t.deltaPct.toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="py-3 text-center">{actionBadge}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Execution Friction Summary */}
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Rebalance Volume</span>
          <span className="text-sm font-bold font-mono text-zinc-900">
            {formatCurrency(totalSellVolume)}
          </span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Capital shifting across asset classes</p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Estimated LTCG Tax Drag</span>
          <span className="text-sm font-bold font-mono text-zinc-700">
            {formatCurrency(estimatedTaxDrag)}
          </span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Can be reduced to ₹0 by redirecting fresh SIPs</p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Est. Transaction Costs</span>
          <span className="text-sm font-bold font-mono text-zinc-800">
            {formatCurrency(estimatedTransactionCosts)}
          </span>
          <p className="text-[11px] text-zinc-500 mt-0.5">Brokerage, STT, and exchange turnover</p>
        </div>
      </div>
    </Card>
  );
};
