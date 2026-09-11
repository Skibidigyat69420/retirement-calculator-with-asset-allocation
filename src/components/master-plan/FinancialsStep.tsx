import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Coins,
  CreditCard,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { calculateEMI } from '../../lib/calculators';
import { guardNumber, formatOrDash } from '../../lib/planState';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { ASSET_LABELS, ASSET_COLORS } from '../../lib/constants';
import type { MasterPlanInputs, Asset, AssetCategory } from '../../types';

export interface LoanLiability {
  id: string;
  name: string;
  principal: number;
  rate: number;
  tenureYears: number;
  includeInExpenses: boolean;
}

interface FinancialsStepProps {
  inputs: MasterPlanInputs;
  loans: LoanLiability[];
  onUpdateLoans: (loans: LoanLiability[]) => void;
  onAddAsset: (asset: Omit<Asset, 'id'>) => void;
  onRemoveAsset: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = (
  ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as AssetCategory[]
).map((cat) => ({ value: cat, label: ASSET_LABELS[cat] }));

export const FinancialsStep = ({
  inputs,
  loans,
  onUpdateLoans,
  onAddAsset,
  onRemoveAsset,
  onNext,
  onBack,
}: FinancialsStepProps) => {
  // New Asset Form State — zero defaults, never pre-seeded demo amounts
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<AssetCategory>('equity');
  const [newAssetValue, setNewAssetValue] = useState(0);
  const [newAssetReturn, setNewAssetReturn] = useState(0);

  // New Loan Form State
  const [newLoanName, setNewLoanName] = useState('');
  const [newLoanPrincipal, setNewLoanPrincipal] = useState(0);
  const [newLoanRate, setNewLoanRate] = useState(0);
  const [newLoanTenure, setNewLoanTenure] = useState(0);

  const focusAssetForm = () => {
    document.getElementById('mp-asset-name')?.focus();
  };

  const totalAssets = useMemo(() => {
    return inputs.assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [inputs.assets]);

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

  const totalLiabilities = useMemo(() => {
    return loans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);
  }, [loans]);

  const totalMonthlyEMI = useMemo(() => {
    return activeLoansWithEMI
      .filter((l) => l.includeInExpenses)
      .reduce((sum, l) => sum + l.emi, 0);
  }, [activeLoansWithEMI]);

  const netBalanceSheet = totalAssets - totalLiabilities;
  const debtToAsset = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const handleAddAsset = () => {
    if (!newAssetName.trim()) return;
    onAddAsset({
      name: newAssetName.trim(),
      category: newAssetCategory,
      value: newAssetValue,
      returnRate: newAssetReturn,
      currency: 'INR',
      liquidateAtRetirement: true,
    });
    setNewAssetName('');
    setNewAssetValue(0);
    setNewAssetReturn(0);
  };

  const handleAddLoan = () => {
    if (!newLoanName.trim()) return;
    const newLoan: LoanLiability = {
      id: `loan-${Date.now()}`,
      name: newLoanName.trim(),
      principal: newLoanPrincipal,
      rate: newLoanRate,
      tenureYears: Math.max(1, newLoanTenure || 1),
      includeInExpenses: true,
    };
    onUpdateLoans([...loans, newLoan]);
    setNewLoanName('');
    setNewLoanPrincipal(0);
    setNewLoanRate(0);
    setNewLoanTenure(0);
  };

  const handleRemoveLoan = (id: string) => {
    onUpdateLoans(loans.filter((l) => l.id !== id));
  };

  const summaryRows = [
    {
      label: 'Gross assets',
      value: formatOrDash(totalAssets > 0 ? totalAssets : null, formatCurrency),
      note: `${inputs.assets.length} item${inputs.assets.length === 1 ? '' : 's'} recorded`,
    },
    {
      label: 'Total liabilities',
      value: formatOrDash(totalLiabilities > 0 ? totalLiabilities : null, formatCurrency),
      note: `${loans.length} active loan${loans.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Net balance sheet',
      value: formatOrDash(
        totalAssets > 0 || totalLiabilities > 0 ? guardNumber(netBalanceSheet) : null,
        formatCurrency,
      ),
      note: 'Net household equity',
    },
    {
      label: 'Monthly EMI',
      value: formatOrDash(totalMonthlyEMI > 0 ? totalMonthlyEMI : null, (v) => `${formatCurrency(v)}/mo`),
      note: totalAssets > 0 ? `Debt-to-asset ${debtToAsset.toFixed(1)}%` : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Step 02 · Financials</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Balance sheet & liabilities</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Investable assets, properties, and outstanding loans. EMIs amortize automatically and feed the household net balance sheet.
        </p>
      </header>

      {/* Balance sheet summary — hairline rows */}
      <section className="border-t border-b border-border divide-y divide-border">
        {summaryRows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
            <div className="min-w-0">
              <span className="text-xs text-muted">{row.label}</span>
              {row.note && <span className="block text-[11px] text-faint mt-0.5">{row.note}</span>}
            </div>
            <span className="font-mono text-sm tabular-nums text-ink text-right">{row.value}</span>
          </div>
        ))}
      </section>

      {/* Assets */}
      <section className="border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
              <Coins size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
              Portfolio assets
            </h3>
            <p className="mt-0.5 text-xs text-muted">Holdings that compound toward net worth.</p>
          </div>
          <span className="font-mono text-[11px] text-faint tabular-nums">
            {inputs.assets.length} recorded
          </span>
        </div>

        {inputs.assets.length === 0 ? (
          <div className="flex items-center justify-between gap-4 py-4 border-t border-b border-border">
            <p className="text-sm text-faint">No assets yet — add the first asset.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={focusAssetForm}
              className="shrink-0"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add asset</span>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {inputs.assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-4 py-3">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ASSET_COLORS[asset.category] }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink truncate">{asset.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.08em] font-mono text-muted">
                      {ASSET_LABELS[asset.category]}
                    </span>
                  </div>
                  <span className="text-[11px] text-faint">
                    Return {formatOrDash(asset.returnRate, (v) => `${v}%`)} ·{' '}
                    {asset.liquidateAtRetirement ? 'Liquidated at retirement' : 'Retained in corpus'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm tabular-nums text-ink">
                    {formatCurrency(asset.value)}
                  </div>
                  <span className="text-[11px] text-faint">
                    {totalAssets > 0 ? `${((asset.value / totalAssets) * 100).toFixed(1)}% of portfolio` : '—'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveAsset(asset.id)}
                  className="p-1.5 rounded-md text-faint hover:text-negative hover:bg-negative-soft transition-colors cursor-pointer shrink-0"
                  title={`Remove ${asset.name}`}
                >
                  <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add asset form */}
        <div className="pt-6">
          <span className="eyebrow">Add asset</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-4 mt-4">
            <Input
              id="mp-asset-name"
              label="Asset name"
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              placeholder="e.g. Parag Parikh Flexi Cap"
            />
            <Select
              label="Category"
              value={newAssetCategory}
              onChange={(val) => setNewAssetCategory(val as AssetCategory)}
              options={CATEGORY_OPTIONS}
            />
            <CurrencyInput
              label="Current value"
              value={newAssetValue}
              onChange={(val) => setNewAssetValue(val)}
            />
            <NumberInput
              label="Expected return"
              value={newAssetReturn}
              onChange={(val) => setNewAssetReturn(val)}
              suffix="%"
              step={0.5}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button size="sm" onClick={handleAddAsset} disabled={!newAssetName.trim()}>
              <Plus size={14} aria-hidden="true" />
              <span>Add asset</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Loans */}
      <section className="border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
              <CreditCard size={15} strokeWidth={1.7} className="text-muted" aria-hidden="true" />
              Loans & liabilities
            </h3>
            <p className="mt-0.5 text-xs text-muted">Amortized obligations with recurring EMI.</p>
          </div>
          <span className="font-mono text-[11px] text-faint tabular-nums">
            {loans.length} recorded
          </span>
        </div>

        {loans.length === 0 ? (
          <p className="text-sm text-faint py-3 border-t border-b border-border">
            No debt recorded — add a loan below if the household carries EMIs.
          </p>
        ) : (
          <div className="divide-y divide-border border-t border-b border-border">
            {activeLoansWithEMI.map((loan) => (
              <div key={loan.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink truncate">{loan.name}</span>
                    <span className="font-mono text-[11px] text-muted tabular-nums">
                      {formatOrDash(loan.rate, (v) => `${v}%`)} rate
                    </span>
                  </div>
                  <span className="text-[11px] text-faint">
                    Tenure {formatOrDash(loan.tenureYears, (v) => `${v} yrs`)} · EMI{' '}
                    {formatOrDash(loan.emi > 0 ? loan.emi : null, formatCurrency)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm tabular-nums text-ink">
                    {formatCurrency(loan.principal)}
                  </div>
                  <span className="text-[11px] text-faint">
                    Interest {formatCurrencyCompact(loan.totalInterest)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLoan(loan.id)}
                  className="p-1.5 rounded-md text-faint hover:text-negative hover:bg-negative-soft transition-colors cursor-pointer shrink-0"
                  title={`Remove ${loan.name}`}
                >
                  <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add loan form */}
        <div className="pt-6">
          <span className="eyebrow">Add loan</span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-4 mt-4">
            <Input
              label="Loan name"
              value={newLoanName}
              onChange={(e) => setNewLoanName(e.target.value)}
              placeholder="e.g. HDFC Home Loan"
            />
            <CurrencyInput
              label="Principal outstanding"
              value={newLoanPrincipal}
              onChange={(val) => setNewLoanPrincipal(val)}
            />
            <NumberInput
              label="Interest rate"
              value={newLoanRate}
              onChange={(val) => setNewLoanRate(val)}
              suffix="%"
              step={0.25}
            />
            <NumberInput
              label="Remaining tenure"
              value={newLoanTenure}
              onChange={(val) => setNewLoanTenure(val)}
              suffix="yrs"
              step={1}
              min={0}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button size="sm" variant="outline" onClick={handleAddLoan} disabled={!newLoanName.trim()}>
              <Plus size={14} aria-hidden="true" />
              <span>Add loan</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Step navigation */}
      <div className="flex justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back · Profile</span>
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2">
          <span>Next · Cashflow</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
