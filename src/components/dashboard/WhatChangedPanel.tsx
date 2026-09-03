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

  return (
    <Card className="p-4 border border-slate-200/80 bg-gradient-to-r from-slate-50 to-indigo-50/20 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-indigo-600 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Portfolio Dynamics & Plan Status:
          </span>
          <Badge variant={wealthResult.sustainable ? 'success' : 'warning'} className="text-[10px]">
            {wealthResult.sustainable ? 'ON TRACK' : 'DEFICIT ALERT'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Net Worth:</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrencyCompact(netWorth)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Retirement Probability:</span>
            <span
              className={`font-mono font-bold ${
                successProb >= 85 ? 'text-emerald-700' : successProb >= 70 ? 'text-amber-700' : 'text-rose-700'
              }`}
            >
              {successProb}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Liquid Cash Buffer:</span>
            <span className="font-mono font-bold text-slate-800">{formatCurrencyCompact(liquidAssets)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Monthly SIP:</span>
            <span className="font-mono font-bold text-indigo-700">
              {formatCurrencyCompact(inputs.sip.amount)}/mo
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
