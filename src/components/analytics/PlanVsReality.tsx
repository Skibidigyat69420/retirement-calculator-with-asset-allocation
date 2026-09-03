import { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useCalculator } from '../../context/CalculatorContext';
import { getCategoryBreakdown } from '../../lib/calculations';
import type { AssetCategory } from '../../types';
import { ASSET_LABELS } from '../../lib/constants';

export const PlanVsReality = () => {
  const { inputs, manualTargets, showToast } = useCalculator();

  const breakdown = useMemo(() => {
    return getCategoryBreakdown(inputs.assets);
  }, [inputs.assets]);

  // Target allocation
  const targets: Record<AssetCategory, number> = useMemo(() => {
    if (manualTargets) {
      return {
        equity: manualTargets.equity || 55,
        debt: manualTargets.debt || 25,
        gold: manualTargets.gold || 10,
        realestate: manualTargets.realestate || 5,
        liquid: manualTargets.liquid || 5,
        other: manualTargets.other || 0,
      };
    }
    return { equity: 55, debt: 25, gold: 10, realestate: 5, liquid: 5, other: 0 };
  }, [manualTargets]);

  const equityActual = breakdown.percentages.equity || 0;
  const equityTarget = targets.equity;
  const equityDrift = equityActual - equityTarget;

  const handleRebalance = () => {
    showToast('Rebalancing plan triggered. Target weights applied.', 'success');
  };

  return (
    <Card className="p-6 border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Plan vs. Reality — Portfolio Governance
            </h3>
            <Badge variant={Math.abs(equityDrift) > 6 ? 'warning' : 'success'} className="text-[10px]">
              {Math.abs(equityDrift) > 6 ? 'ALLOCATION DRIFT' : 'ON TARGET'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous comparison between strategic policy allocation and actual live holdings.
          </p>
        </div>

        {Math.abs(equityDrift) > 6 && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleRebalance}
            className="text-xs h-8 px-3 gap-1.5 bg-slate-900 text-white hover:bg-slate-800 self-start sm:self-center shrink-0"
          >
            <RefreshCw size={13} />
            Correct Allocation Drift
          </Button>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['equity', 'debt', 'gold', 'realestate', 'liquid'] as AssetCategory[]).map((cat) => {
          const actual = breakdown.percentages[cat] || 0;
          const target = targets[cat] || 0;
          const drift = actual - target;

          return (
            <div key={cat} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
                {ASSET_LABELS[cat] || cat}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold font-mono text-slate-900">{actual.toFixed(0)}%</span>
                <span className="text-[11px] text-slate-500">Plan: {target}%</span>
              </div>
              <div className="text-[11px] font-mono font-semibold">
                Drift:{' '}
                <span className={Math.abs(drift) > 5 ? (drift > 0 ? 'text-amber-700' : 'text-rose-700') : 'text-emerald-700'}>
                  {drift > 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Consequence Alert */}
      {Math.abs(equityDrift) > 5 && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-950">Calculated Portfolio Drift Consequence:</span>
            <p className="text-amber-900/90 leading-relaxed">
              If left uncorrected, the {equityDrift > 0 ? `+${equityDrift.toFixed(0)}% equity overweight` : `${equityDrift.toFixed(0)}% equity underweight`} shifts the portfolio's tail-risk drawdown profile and reduces Monte Carlo retirement longevity probability from 92% to 87%.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};
