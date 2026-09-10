import { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  CreditCard,
  Coins,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { calculateEMI } from '../../lib/calculators';
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
  // New Asset Form State
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<AssetCategory>('equity');
  const [newAssetValue, setNewAssetValue] = useState(1000000);
  const [newAssetReturn, setNewAssetReturn] = useState(12);

  // New Loan Form State
  const [newLoanName, setNewLoanName] = useState('');
  const [newLoanPrincipal, setNewLoanPrincipal] = useState(3000000);
  const [newLoanRate, setNewLoanRate] = useState(8.5);
  const [newLoanTenure, setNewLoanTenure] = useState(15);

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
    setNewAssetValue(500000);
  };

  const handleAddLoan = () => {
    if (!newLoanName.trim()) return;
    const newLoan: LoanLiability = {
      id: `loan-${Date.now()}`,
      name: newLoanName.trim(),
      principal: newLoanPrincipal,
      rate: newLoanRate,
      tenureYears: newLoanTenure,
      includeInExpenses: true,
    };
    onUpdateLoans([...loans, newLoan]);
    setNewLoanName('');
  };

  const handleRemoveLoan = (id: string) => {
    onUpdateLoans(loans.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <Card className="border border-border space-y-2">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-accent" />
          <h3 className="text-lg font-bold text-ink">Financial Balance Sheet & Liabilities</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Record all investable portfolio assets, properties, and outstanding loan obligations. The engine dynamically calculates amortized EMIs and computes the household net balance sheet.
        </p>
      </Card>

      {/* Balance Sheet Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Gross Assets</span>
          <div className="text-lg font-mono font-bold text-ink truncate">
            {formatCurrency(totalAssets)}
          </div>
          <span className="text-[10px] text-faint">{inputs.assets.length} items recorded</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Total Liabilities</span>
          <div className="text-lg font-mono font-bold text-negative truncate">
            {formatCurrency(totalLiabilities)}
          </div>
          <span className="text-[10px] text-faint">{loans.length} active loans</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Net Balance Sheet</span>
          <div className="text-lg font-mono font-bold text-ink truncate">
            {formatCurrency(netBalanceSheet)}
          </div>
          <span className="text-[10px] text-positive font-semibold">Net Household Equity</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Total Monthly EMI</span>
          <div className="text-lg font-mono font-bold text-warning truncate">
            {formatCurrency(totalMonthlyEMI)}/mo
          </div>
          <span className="text-[10px] text-faint font-mono">D/A: {debtToAsset.toFixed(1)}%</span>
        </div>
      </div>

      {/* SECTION 1: Investable Assets */}
      <Card className="border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <Coins size={16} className="text-accent" />
              Portfolio Assets & Capital Holdings
            </h4>
            <span className="text-xs text-muted">Active investments contributing to net worth compounding.</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {inputs.assets.length} Assets
          </Badge>
        </div>

        {/* Existing Assets List */}
        <div className="space-y-3">
          {inputs.assets.map((asset) => (
            <div
              key={asset.id}
              className="p-3.5 rounded-xl bg-sunken border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink truncate">{asset.name}</span>
                  <span
                    className="text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${ASSET_COLORS[asset.category]}20`,
                      color: ASSET_COLORS[asset.category],
                    }}
                  >
                    {ASSET_LABELS[asset.category]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>Expected Return: <strong className="text-ink font-mono">{asset.returnRate}%</strong></span>
                  <span>•</span>
                  <span>{asset.liquidateAtRetirement ? 'Liquidated at Retirement' : 'Retained in Corpus'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-mono font-bold text-base text-ink">
                    {formatCurrency(asset.value)}
                  </div>
                  <span className="text-[10px] text-faint">
                    {totalAssets > 0 ? ((asset.value / totalAssets) * 100).toFixed(1) : 0}% of portfolio
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveAsset(asset.id)}
                  className="p-2 rounded-lg text-muted hover:text-negative hover:bg-negative-soft transition-colors"
                  title="Remove Asset"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Asset Mini Form */}
        <div className="pt-3 border-t border-border space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            Add New Asset Holding
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input
              label="Asset Name"
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
              label="Current Value (₹)"
              value={newAssetValue}
              onChange={(val) => setNewAssetValue(val)}
            />
            <NumberInput
              label="Expected Return (%)"
              value={newAssetReturn}
              onChange={(val) => setNewAssetReturn(val)}
              suffix="%"
              step={0.5}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddAsset} className="flex items-center gap-1.5 text-xs">
              <Plus size={14} />
              <span>Add Asset to Portfolio</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* SECTION 2: Liabilities & Loans */}
      <Card className="border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <CreditCard size={16} className="text-negative" />
              Outstanding Loans & Financial Liabilities
            </h4>
            <span className="text-xs text-muted">Amortized liabilities that generate recurring monthly EMI obligations.</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono text-negative">
            {loans.length} Loans
          </Badge>
        </div>

        {/* Existing Loans List */}
        {loans.length === 0 ? (
          <div className="p-4 rounded-xl bg-sunken border border-border text-center text-xs text-muted">
            No debt or loan liabilities recorded. The household is completely debt-free.
          </div>
        ) : (
          <div className="space-y-3">
            {activeLoansWithEMI.map((loan) => (
              <div
                key={loan.id}
                className="p-3.5 rounded-xl bg-sunken border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-ink truncate">{loan.name}</span>
                    <Badge variant="danger" className="text-[10px]">
                      {loan.rate}% Rate
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>Tenure: <strong className="text-ink font-mono">{loan.tenureYears} Yrs</strong></span>
                    <span>•</span>
                    <span>Monthly EMI: <strong className="text-warning font-mono">{formatCurrency(loan.emi)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-bold text-base text-negative">
                      {formatCurrency(loan.principal)}
                    </div>
                    <span className="text-[10px] text-faint">
                      Total Interest: {formatCurrencyCompact(loan.totalInterest)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveLoan(loan.id)}
                    className="p-2 rounded-lg text-muted hover:text-negative hover:bg-negative-soft transition-colors"
                    title="Remove Loan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Loan Mini Form */}
        <div className="pt-3 border-t border-border space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            Add New Liability / Loan
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input
              label="Loan Name"
              value={newLoanName}
              onChange={(e) => setNewLoanName(e.target.value)}
              placeholder="e.g. HDFC Home Loan"
            />
            <CurrencyInput
              label="Principal Outstanding (₹)"
              value={newLoanPrincipal}
              onChange={(val) => setNewLoanPrincipal(val)}
            />
            <NumberInput
              label="Interest Rate (%)"
              value={newLoanRate}
              onChange={(val) => setNewLoanRate(val)}
              suffix="%"
              step={0.25}
            />
            <NumberInput
              label="Remaining Tenure"
              value={newLoanTenure}
              onChange={(val) => setNewLoanTenure(val)}
              suffix="yrs"
              step={1}
              min={1}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleAddLoan} className="flex items-center gap-1.5 text-xs">
              <Plus size={14} />
              <span>Add Loan to Liabilities</span>
            </Button>
          </div>
        </div>

        {/* Step Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft size={15} />
            <span>Back: Profile</span>
          </Button>
          <Button onClick={onNext} className="flex items-center gap-2">
            <span>Next: Cashflows & Savings</span>
            <ArrowRight size={15} />
          </Button>
        </div>
      </Card>
    </div>
  );
};
