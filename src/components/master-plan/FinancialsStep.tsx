import { useState, useMemo } from 'react';
import { Building2, CreditCard, Trash2, ShieldCheck, Plus, ArrowRight } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SectionTitle } from '../ui/SectionTitle';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import type { AssetCategory } from '../../types';
import { calculateEMI } from '../../lib/calculators';

const categoryOptions: { value: AssetCategory; label: string }[] = (
  ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as AssetCategory[]
).map((cat) => ({ value: cat, label: ASSET_LABELS[cat] }));

const currencyOptions = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const strategyOptions = [
  { value: 'true', label: 'Liquidate & Fund Retirement' },
  { value: 'false', label: 'Retain & Keep Invested' },
];

export const FinancialsStep = ({ onNext }: { onNext: () => void }) => {
  const {
    inputs,
    updateAsset,
    addAsset,
    removeAsset,
    addLoan,
    updateLoan,
    removeLoan,
    wealthResult,
    showToast,
  } = useCalculator();

  const loans = inputs.loans || [];

  const [confirmDeleteAssetId, setConfirmDeleteAssetId] = useState<string | null>(null);
  const [confirmDeleteLoanId, setConfirmDeleteLoanId] = useState<string | null>(null);

  const handleDeleteAsset = (id: string) => {
    const assetToRemove = inputs.assets.find((a) => a.id === id);
    removeAsset(id);
    setConfirmDeleteAssetId(null);
    showToast(`Removed asset "${assetToRemove?.name || 'Asset'}"`, 'info');
  };

  const handleDeleteLoan = (id: string) => {
    const loanToRemove = loans.find((l) => l.id === id);
    removeLoan(id);
    setConfirmDeleteLoanId(null);
    showToast(`Removed liability "${loanToRemove?.name || 'Liability'}"`, 'info');
  };

  const activeLoansWithEMI = useMemo(() => {
    return loans.map((loan) => {
      const p = Math.max(0, Number(loan.principal) || 0);
      const r = Math.max(0, Number(loan.rate) || 0);
      const t = Math.max(1, Number(loan.tenureYears) || 1);
      const res = p > 0 ? calculateEMI(p, r, t) : { emi: 0, totalPayment: 0, totalInterest: 0, principal: 0, yearlyData: [] };
      return {
        ...loan,
        emi: res.emi,
        totalPayment: res.totalPayment,
        totalInterest: res.totalInterest,
      };
    });
  }, [loans]);

  const totalLiabilities = loans.reduce((sum, loan) => sum + (Number(loan.principal) || 0), 0);
  

  const netWorth = wealthResult.netWorth;
  const netBalanceSheet = netWorth - totalLiabilities;
  const debtToAssetRatio = netWorth > 0 ? (totalLiabilities / netWorth) * 100 : (totalLiabilities > 0 ? 100 : 0);


  return (
    <div className="space-y-8">
      <SectionTitle
        title="Financials: Balance Sheet"
        subtitle="Manage asset holdings, liabilities, and debt-to-asset metrics."
        badge="Step 2"
      />

      {/* Balance Sheet Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Gross Portfolio Assets"
          value={formatCurrency(netWorth)}
          subtext={`${inputs.assets.length} active holdings`}
        />
        <MetricCard
          label="Outstanding Liabilities"
          value={formatCurrency(totalLiabilities)}
          subtext={loans.length > 0 ? `${loans.length} recorded debt obligations` : 'Zero reported liabilities'}
          variant={totalLiabilities > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label="Net Balance Sheet"
          value={formatCurrency(netBalanceSheet)}
          subtext="Assets minus liabilities"
          variant={netBalanceSheet >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          label="Debt-to-Asset Ratio"
          value={formatPercent(debtToAssetRatio)}
          subtext={debtToAssetRatio === 0 ? 'Fully solvent' : debtToAssetRatio < 30 ? 'Conservative debt' : 'Elevated leverage'}
          variant={debtToAssetRatio > 50 ? 'danger' : 'default'}
        />
      </div>

      {/* Assets Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-2">
          <div>
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Building2 size={18} className="text-ink" /> Asset Holdings Inventory
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                addAsset({
                  name: 'Diversified Equity MF',
                  category: 'equity',
                  value: 1000000,
                  returnRate: 12,
                  currency: 'INR',
                  liquidateAtRetirement: true,
                });
                showToast('Added Equity Mutual Fund holding', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-surface hover:bg-sunken hover:border-border-strong text-ink-soft transition-all shadow-2xs cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: ASSET_COLORS.equity }} />
              + Equity
            </button>
            <button
              type="button"
              onClick={() => {
                addAsset({
                  name: 'Fixed Deposit / Corporate Bond',
                  category: 'debt',
                  value: 500000,
                  returnRate: 7,
                  currency: 'INR',
                  liquidateAtRetirement: true,
                });
                showToast('Added Fixed Income holding', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-surface hover:bg-sunken hover:border-border-strong text-ink-soft transition-all shadow-2xs cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: ASSET_COLORS.debt }} />
              + Debt
            </button>
            <button
              type="button"
              onClick={() => addAsset()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-sunken hover:bg-raised text-ink transition-all shadow-2xs cursor-pointer"
            >
              <Plus size={14} /> Custom Asset
            </button>
          </div>
        </div>

        {inputs.assets.length === 0 && (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border shadow-2xs">
            <Building2 size={28} className="mx-auto text-faint mb-2" />
            <h4 className="text-sm font-bold text-ink">No Assets Recorded</h4>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              No asset holdings documented yet. Use the quick-add preset buttons above to add diversified holdings.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {inputs.assets.map((asset) => {
            const share = netWorth > 0 ? (asset.value / netWorth) * 100 : 0;
            return (
              <Card key={asset.id} variant="subtle" className="border border-border/90 hover:border-border-strong transition-colors shadow-2xs bg-surface">
                <div className="flex justify-between items-start mb-3 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-2 ring-surface" style={{ backgroundColor: ASSET_COLORS[asset.category] }} />
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAsset(asset.id, { name: e.currentTarget.value })}
                      aria-label={`Asset name: ${asset.name}`}
                      className="bg-transparent text-sm font-bold text-ink focus:outline-none focus:border-b focus:border-border w-full"
                    />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sunken text-ink-soft border border-border shrink-0 font-semibold">
                      {formatPercent(share)}
                    </span>
                  </div>
                  {confirmDeleteAssetId === asset.id ? (
                    <div className="flex items-center gap-1.5 shrink-0 bg-rose-50 border border-negative/40 px-2 py-1 rounded-lg">
                      <button type="button" onClick={() => handleDeleteAsset(asset.id)} className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-ink rounded text-[11px] font-semibold transition-colors cursor-pointer">Confirm</button>
                      <button type="button" onClick={() => setConfirmDeleteAssetId(null)} className="px-1.5 py-0.5 bg-surface hover:bg-sunken text-ink-soft border border-border rounded text-[11px] transition-colors cursor-pointer">Cancel</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteAssetId(asset.id)} className="p-1.5 text-faint hover:text-negative transition-colors rounded-lg hover:bg-sunken cursor-pointer shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <CurrencyInput label="Valuation" value={asset.value} onChange={(v) => updateAsset(asset.id, { value: v })} />
                  <NumberInput label="Expected Return" value={asset.returnRate} onChange={(v) => updateAsset(asset.id, { returnRate: v })} suffix="%" />
                  <Select label="Category" value={asset.category} onChange={(v) => updateAsset(asset.id, { category: v as AssetCategory })} options={categoryOptions} />
                  <Select label="Denomination" value={asset.currency || 'INR'} onChange={(v) => updateAsset(asset.id, { currency: v })} options={currencyOptions} />
                  <Select label="At Retirement Treatment" value={asset.liquidateAtRetirement ? 'true' : 'false'} onChange={(v) => updateAsset(asset.id, { liquidateAtRetirement: v === 'true' })} options={strategyOptions} className="col-span-2" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Liabilities Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-2">
          <div>
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <CreditCard size={18} className="text-ink" /> Recorded Loan Liabilities & EMI
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => addLoan({ name: 'Home Loan', principal: 5000000, rate: 8.5, tenureYears: 20, includeInExpenses: true })}>+ Home Loan</Button>
            <Button variant="outline" size="sm" onClick={() => addLoan({ name: 'Vehicle Loan', principal: 1000000, rate: 9.0, tenureYears: 5, includeInExpenses: true })}>+ Vehicle Loan</Button>
            <Button size="sm" onClick={() => addLoan()}><Plus size={14} className="mr-1" /> Add Custom Liability</Button>
          </div>
        </div>

        {loans.length === 0 && (
          <div className="p-8 text-center bg-surface rounded-2xl border border-border">
            <ShieldCheck size={28} className="mx-auto text-positive mb-2" />
            <h4 className="text-sm font-bold text-ink">No Liabilities Reported</h4>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              Household balance sheet reports zero high-cost debt.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {activeLoansWithEMI.map((loan) => (
            <Card key={loan.id} variant="subtle" className="border border-border/90 hover:border-border-strong transition-all shadow-2xs bg-surface border-l-4 border-l-rose-500">
              <div className="flex justify-between items-start mb-3 border-b border-border pb-2.5">
                <div className="flex items-center gap-2 w-3/4">
                  <input type="text" value={loan.name} onChange={(e) => updateLoan(loan.id, { name: e.currentTarget.value })} className="bg-transparent text-sm font-bold text-ink focus:outline-none focus:border-b focus:border-border w-full" />
                  <Badge variant="danger">Liability</Badge>
                </div>
                {confirmDeleteLoanId === loan.id ? (
                  <div className="flex items-center gap-1.5 shrink-0 bg-rose-50 border border-negative/40 px-2 py-1 rounded-lg">
                    <button type="button" onClick={() => handleDeleteLoan(loan.id)} className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-ink rounded text-[11px] font-semibold transition-colors cursor-pointer">Confirm</button>
                    <button type="button" onClick={() => setConfirmDeleteLoanId(null)} className="px-1.5 py-0.5 bg-surface hover:bg-sunken text-ink-soft border border-border rounded text-[11px] transition-colors cursor-pointer">Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDeleteLoanId(loan.id)} className="p-1.5 text-faint hover:text-negative transition-colors rounded-lg hover:bg-sunken cursor-pointer shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-negative/40/80 rounded-xl flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-negative">Amortized Monthly EMI</span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-negative tracking-tight mt-0.5">
                    {formatCurrency(loan.emi)}<span className="text-xs font-normal text-rose-500 font-sans ml-1.5">/mo</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-4">
                <CurrencyInput label="Outstanding Principal" value={loan.principal} onChange={(v) => updateLoan(loan.id, { principal: v })} />
                <NumberInput label="Interest Rate" value={loan.rate} onChange={(v) => updateLoan(loan.id, { rate: v })} suffix="%" />
                <NumberInput label="Tenure Remaining" value={loan.tenureYears} onChange={(v) => updateLoan(loan.id, { tenureYears: v })} suffix="yrs" />
              </div>

              <label className="flex items-center space-x-2 text-xs font-semibold text-ink cursor-pointer select-none">
                <input type="checkbox" checked={loan.includeInExpenses} onChange={(e) => updateLoan(loan.id, { includeInExpenses: e.currentTarget.checked })} className="w-4 h-4 rounded border-border-strong text-ink focus:ring-focus-ring accent-ink" />
                <span>Factor EMI into household monthly expenditure</span>
              </label>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <button type="button" onClick={() => window.history.back()} className="flex items-center gap-2 py-2.5 px-6 bg-sunken text-ink rounded-xl text-sm font-semibold hover:bg-raised transition-colors">
          Back
        </button>
        <button type="button" onClick={onNext} className="flex items-center gap-2 py-2.5 px-6 bg-ink text-surface rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <span>Save & Continue to Cashflows</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
