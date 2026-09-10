import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Save,
  FileDown,
  Target,
  CreditCard,
  Building,
  Loader2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import type { MasterPlanInputs } from '../../types';
import type { WealthEngineResult } from '../../lib/wealthEngine';

interface MasterPlanSummaryProps {
  inputs: MasterPlanInputs;
  wealthResult: WealthEngineResult;
  totalLiabilities: number;
  netBalanceSheet: number;
  debtToAssetRatio: number;
  onSavePlan: () => Promise<void>;
}

export const MasterPlanSummary = ({
  inputs,
  wealthResult,
  totalLiabilities,
  netBalanceSheet,
  debtToAssetRatio,
  onSavePlan,
}: MasterPlanSummaryProps) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSavePlan();
    } finally {
      setSaving(false);
    }
  };

  const successRate = Math.round((wealthResult.monteCarlo?.successRate || (wealthResult.sustainable ? 0.9 : 0.45)) * 100);
  const totalGoalCost = inputs.goals.reduce((acc, g) => acc + (g.targetAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Plan Health & Solvency Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          wealthResult.sustainable
            ? 'bg-positive-soft border-positive/30 text-positive'
            : 'bg-negative-soft border-negative/30 text-negative'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {wealthResult.sustainable ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-positive" />
          ) : (
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-negative" />
          )}
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider">
              {wealthResult.sustainable ? 'Plan Is Fully Sustainable' : 'Depletion Risk Detected'}
            </div>
            <p className="text-[11px] leading-snug font-medium opacity-90">
              {wealthResult.sustainable
                ? `Lifetime withdrawals solvent through age ${inputs.lifeExpectancy}.`
                : `Corpus projected to deplete around age ${wealthResult.depletionAge || 72}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Core Wealth & Solvency Metrics */}
      <Card className="border border-border space-y-4 p-4">
        <div className="border-b border-border pb-2.5">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted block">
            Client Balance Sheet
          </span>
          <div className="text-xl font-mono font-bold text-ink mt-0.5">
            {formatCurrency(wealthResult.netWorth)}
          </div>
          <span className="text-[10px] text-faint">Gross Invested Assets</span>
        </div>

        {/* Liabilities & Net Worth */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted flex items-center gap-1">
              <CreditCard size={12} className="text-faint" />
              Total Liabilities:
            </span>
            <span className="font-mono font-semibold text-negative">
              {formatCurrency(totalLiabilities)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted flex items-center gap-1">
              <Building size={12} className="text-faint" />
              Net Balance Sheet:
            </span>
            <span className="font-mono font-bold text-ink">
              {formatCurrency(netBalanceSheet)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">Debt-to-Asset:</span>
            <span
              className={`font-mono font-bold ${
                debtToAssetRatio > 40 ? 'text-negative' : 'text-positive'
              }`}
            >
              {debtToAssetRatio.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Solvency Gauge */}
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Monte Carlo Solvency:</span>
            <span className="font-mono font-bold text-ink">{successRate}%</span>
          </div>
          <div className="w-full h-2 bg-sunken rounded-full overflow-hidden border border-border/60">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                successRate >= 80 ? 'bg-positive' : successRate >= 60 ? 'bg-warning' : 'bg-negative'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, successRate))}%` }}
            />
          </div>
        </div>

        {/* Goals & Savings Rate */}
        <div className="pt-2 border-t border-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted flex items-center gap-1">
              <Target size={12} className="text-accent" />
              Lifestyle Goals ({inputs.goals.length}):
            </span>
            <span className="font-mono font-semibold text-ink truncate max-w-[110px]">
              {formatCurrencyCompact(totalGoalCost)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted flex items-center gap-1">
              <TrendingUp size={12} className="text-positive" />
              Savings Rate:
            </span>
            <span className="font-mono font-semibold text-positive">
              {wealthResult.savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-border space-y-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-xs h-9"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saving ? 'Saving Plan...' : 'Save Plan to Cloud'}</span>
          </Button>

          <Link
            to="/dossier?autoPrint=true"
            className="w-full flex items-center justify-center gap-2 text-xs h-9 px-3 rounded-xl border border-border bg-sunken hover:bg-surface text-ink font-semibold transition-all shadow-2xs"
          >
            <FileDown size={13} />
            <span>Generate Full Dossier</span>
          </Link>
        </div>
      </Card>
    </div>
  );
};
