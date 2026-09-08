import { Landmark, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';

export const MasterPlanSidebar = () => {
  const { inputs, wealthResult, riskScore } = useCalculator();

  const loans = inputs.loans || [];
  const totalLiabilities = loans.reduce((sum, loan) => sum + (Number(loan.principal) || 0), 0);
  const netBalanceSheet = wealthResult.netWorth - totalLiabilities;
  const debtToAssetRatio = wealthResult.netWorth > 0 ? (totalLiabilities / wealthResult.netWorth) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 border-b border-border pb-2">
          Plan Snapshot
        </h3>
        
        {inputs.client?.name && (
          <div className="mb-4 bg-sunken p-3 rounded-xl border border-border">
            <div className="text-xs text-muted mb-1 font-semibold uppercase">Client</div>
            <div className="font-bold text-ink truncate">{inputs.client.name}</div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="text-xs text-muted mb-1 flex items-center justify-between">
              <span>Gross Assets</span>
              <span className="font-mono">{inputs.assets.length} items</span>
            </div>
            <div className="text-xl font-black font-mono text-ink">
              {formatCurrency(wealthResult.netWorth)}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted mb-1 flex items-center justify-between">
              <span>Liabilities</span>
              <span className="font-mono">{loans.length} items</span>
            </div>
            <div className={cn("text-lg font-black font-mono", totalLiabilities > 0 ? "text-negative" : "text-ink")}>
              {formatCurrency(totalLiabilities)}
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="text-xs font-semibold text-faint mb-1 uppercase tracking-wider">
              Net Balance Sheet
            </div>
            <div className={cn("text-2xl font-black font-mono", netBalanceSheet >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {formatCurrency(netBalanceSheet)}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
          <Landmark size={14} /> Key Metrics
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted">Debt-to-Asset</span>
            <span className={cn("font-semibold font-mono", debtToAssetRatio > 50 ? "text-negative" : "text-ink")}>
              {formatPercent(debtToAssetRatio)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Savings Rate</span>
            <span className={cn("font-semibold font-mono", wealthResult.savingsRate >= 0 ? "text-positive" : "text-negative")}>
              {formatPercent(wealthResult.savingsRate)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Risk Score</span>
            <span className="font-semibold font-mono text-ink">
              {riskScore}/100
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Terminal Wealth</span>
            <span className="font-semibold font-mono text-ink">
              {formatCurrency(wealthResult.terminalValue)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        {wealthResult.sustainable ? (
          <div className="bg-emerald-50 border border-positive/40 rounded-xl p-3 flex flex-col gap-2 text-positive">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} />
              <span className="text-sm font-bold">Plan is Solvent</span>
            </div>
            <div className="text-xs">
              Projected to last through age {inputs.lifeExpectancy}.
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-negative/40 rounded-xl p-3 flex flex-col gap-2 text-negative">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span className="text-sm font-bold">Depletion Risk</span>
            </div>
            <div className="text-xs">
              Corpus depletes at age <span className="font-mono font-bold">{wealthResult.depletionAge}</span>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
