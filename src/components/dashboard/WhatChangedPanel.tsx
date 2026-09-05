import { Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact } from '../../lib/formatters';

export const WhatChangedPanel = () => {
  const { inputs, wealthResult } = useCalculator();

  const successProb = Math.round(
    (wealthResult.monteCarlo?.successRate ?? (wealthResult.sustainable ? 0.88 : 0.45)) * 100,
  );
  const netWorth = wealthResult.netWorth;
  const liquidAssets = inputs.assets
    .filter((a) => a.category === 'liquid')
    .reduce((s, a) => s + (a.value || 0), 0);
  const isHealthy = wealthResult.sustainable && successProb >= 80;

  return (
    <Card className="p-4 border border-zinc-200/90 bg-white shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            <Activity size={15} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-950">
            Live Portfolio Snapshot:
          </span>
          <Badge variant={isHealthy ? 'success' : 'danger'} className="text-[10px] font-semibold">
            {wealthResult.sustainable ? 'ON TRACK' : 'SHORTFALL WARNING'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Net Worth:</span>
            <span className="font-sans font-bold text-zinc-950">{formatCurrencyCompact(netWorth)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Retirement Probability:</span>
            <span
              className={`font-sans font-bold ${
                successProb >= 85
                  ? 'text-emerald-700'
                  : successProb >= 70
                    ? 'text-zinc-700'
                    : 'text-rose-700'
              }`}
            >
              {successProb}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Liquid Cash Buffer:</span>
            <span className="font-sans font-semibold text-zinc-800">{formatCurrencyCompact(liquidAssets)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">Monthly SIP:</span>
            <span className="font-sans font-bold text-zinc-950">
              {formatCurrencyCompact(inputs.sip.amount)}/mo
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

