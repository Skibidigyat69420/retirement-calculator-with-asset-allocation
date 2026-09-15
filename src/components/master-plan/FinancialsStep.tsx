import { useState, useMemo } from 'react';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { FormSection } from '../ui/FormSection';
import { Repeater } from '../ui/Repeater';
import { calculateEMI } from '../../lib/calculators';
import { guardNumber, formatOrDash } from '../../lib/planState';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { ASSET_LABELS, ASSET_COLORS } from '../../lib/constants';
import type { MasterPlanInputs, Asset, AssetCategory, Liability } from '../../types';
import { useCalculator } from '../../context/CalculatorContext';

interface FinancialsStepProps {
  inputs: MasterPlanInputs;
  liabilities: Liability[];
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  updateLiability: (id: string, patch: Partial<Liability>) => void;
  onAddLiability: (liability?: Partial<Liability>) => void;
  onRemoveLiability: (id: string) => void;
  onAddAsset: (asset: Omit<Asset, 'id'>) => void;
  onRemoveAsset: (id: string) => void;
}

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = (
  ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as AssetCategory[]
).map((cat) => ({ value: cat, label: ASSET_LABELS[cat] }));

export const FinancialsStep = ({
  inputs,
  liabilities,
  updateAsset,
  updateLiability,
  onAddLiability,
  onRemoveLiability,
  onAddAsset,
  onRemoveAsset,
}: FinancialsStepProps) => {
  const { assumptions } = useCalculator();

  // New Asset Form State — zero defaults, never pre-seeded demo amounts
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<AssetCategory>('equity');
  const [newAssetValue, setNewAssetValue] = useState(0);
  const [newAssetReturn, setNewAssetReturn] = useState(0);
  const [newAssetCurrency, setNewAssetCurrency] = useState('INR');

  // New Loan Form State
  const [newLoanName, setNewLoanName] = useState('');
  const [newLoanPrincipal, setNewLoanPrincipal] = useState(0);
  const [newLoanRate, setNewLoanRate] = useState(0);
  const [newLoanTenure, setNewLoanTenure] = useState(0);
  const [newLoanCurrency, setNewLoanCurrency] = useState('INR');

  const totalAssets = useMemo(() => {
    return inputs.assets.reduce((sum, a) => {
      const spotRate = assumptions?.fx[a.currency || 'INR']?.spotRate || 1.0;
      return sum + (Number(a.value) * spotRate || 0);
    }, 0);
  }, [inputs.assets, assumptions?.fx]);

  const activeLoansWithEMI = useMemo(() => {
    return liabilities.map((loan) => {
      const p = Math.max(0, Number(loan.principal) || 0);
      const r = Math.max(0, Number(loan.rate) || 0);
      const t = Math.max(1, Number(loan.tenureYears) || 1);
      const spotRate = assumptions?.fx[loan.currency || 'INR']?.spotRate || 1.0;

      const res = p > 0 ? calculateEMI(p * spotRate, r, t) : { emi: 0, totalPayment: 0, totalInterest: 0, principal: 0, yearlyData: [] };
      return {
        ...loan,
        emi: res.emi,
        totalPayment: res.totalPayment,
        totalInterest: res.totalInterest,
      };
    });
  }, [liabilities, assumptions?.fx]);

  const totalLiabilities = useMemo(() => {
    return liabilities.reduce((sum, l) => {
      const spotRate = assumptions?.fx[l.currency || 'INR']?.spotRate || 1.0;
      return sum + (Number(l.principal) * spotRate || 0);
    }, 0);
  }, [liabilities, assumptions?.fx]);

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
      currency: newAssetCurrency,
      liquidateAtRetirement: true,
    });
    setNewAssetName('');
    setNewAssetValue(0);
    setNewAssetReturn(0);
    setNewAssetCurrency('INR');
  };

  const handleAddLoan = () => {
    if (!newLoanName.trim()) return;
    const newLoan: Liability = {
      id: `loan-${Date.now()}`,
      name: newLoanName.trim(),
      principal: newLoanPrincipal,
      rate: newLoanRate,
      tenureYears: Math.max(1, newLoanTenure || 1),
      includeInExpenses: true,
      currency: newLoanCurrency,
    };
    onAddLiability(newLoan);
    setNewLoanName('');
    setNewLoanPrincipal(0);
    setNewLoanRate(0);
    setNewLoanTenure(0);
    setNewLoanCurrency('INR');
  };

  const summaryRows = [
    {
      label: 'Gross assets',
      value: formatOrDash(totalAssets > 0 ? totalAssets : null, formatCurrency),
      note: `${inputs.assets.length} item${inputs.assets.length === 1 ? '' : 's'} recorded`,
    },
    {
      label: 'Liabilities',
      value: formatOrDash(totalLiabilities > 0 ? totalLiabilities : null, formatCurrency),
      note: `${liabilities.length} active loan${liabilities.length === 1 ? '' : 's'}`,
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
    <div className="border-t border-border">
      <header className="py-4">
        <div className="eyebrow">Step 02 · Balance sheet</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Household balance sheet</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Investable assets, properties, and outstanding loans. EMIs amortize automatically and feed the household net balance sheet.
        </p>
      </header>

      {/* Balance sheet summary — horizontal metric strip */}
      <div className="metric-strip rounded-xl px-4 py-4 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        {summaryRows.map((row) => (
          <div key={row.label} className="min-w-0">
            <span className="eyebrow block">{row.label}</span>
            <span className="block mt-1 font-mono text-sm tabular-nums text-ink truncate">{row.value}</span>
            {row.note && <span className="block mt-0.5 text-[11px] text-faint">{row.note}</span>}
          </div>
        ))}
      </div>

      <FormSection
        index="01"
        title="Assets"
        description="Holdings that compound toward net worth."
        meta={`${inputs.assets.length} recorded`}
        className="mt-8"
      >
        <Repeater<Asset>
          items={inputs.assets}
          getKey={(asset) => asset.id}
          emptyLabel="No assets yet — add the first asset below."
          addLabel="Add asset"
          addCommitLabel="Add asset"
          onAdd={() => {}}
          onAddCommit={handleAddAsset}
          addCommitDisabled={!newAssetName.trim()}
          onRemove={(asset) => onRemoveAsset(asset.id)}
          renderSummary={(asset) => (
            <span className="flex items-center gap-3 min-w-0 text-sm">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: ASSET_COLORS[asset.category] }}
                aria-hidden="true"
              />
              <span className="truncate font-medium text-ink">{asset.name || 'Unnamed asset'}</span>
              <span className="truncate text-xs text-muted">{ASSET_LABELS[asset.category]}</span>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted">
                {formatCurrency(asset.value, 0, asset.currency || 'INR')}
              </span>
            </span>
          )}
          renderEditor={(asset) => (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
              <Input layout="inline" label="Asset name" value={asset.name} onChange={(e) => updateAsset(asset.id, { name: e.target.value })} placeholder="e.g. Parag Parikh Flexi Cap" />
              <Select layout="inline" label="Category" value={asset.category} onChange={(value) => updateAsset(asset.id, { category: value as AssetCategory })} options={CATEGORY_OPTIONS} />
              <CurrencyInput layout="inline" label="Current value" value={asset.value} onChange={(value) => updateAsset(asset.id, { value })} currency={asset.currency} onCurrencyChange={(currency) => updateAsset(asset.id, { currency })} />
              <NumberInput layout="inline" label="Expected return" value={asset.returnRate} onChange={(value) => updateAsset(asset.id, { returnRate: value })} suffix="%" step={0.5} min={0} max={30} slider="focus" />
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none md:col-span-2">
                <input
                  type="checkbox"
                  checked={asset.liquidateAtRetirement}
                  onChange={(e) => updateAsset(asset.id, { liquidateAtRetirement: e.target.checked })}
                  className="accent-accent"
                />
                Liquidate at retirement
              </label>
            </div>
          )}
          renderAddEditor={(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4">
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
                currency={newAssetCurrency}
                onCurrencyChange={setNewAssetCurrency}
                presets={[
                  { label: '₹1L', value: 100000 },
                  { label: '₹10L', value: 1000000 },
                  { label: '₹50L', value: 5000000 },
                ]}
              />
              <NumberInput
                label="Expected return"
                value={newAssetReturn}
                onChange={(val) => setNewAssetReturn(val)}
                suffix="%"
                step={0.5}
                min={0}
                max={30}
                slider
              />
            </div>
          )}
        />
      </FormSection>

      <FormSection
        index="02"
        title="Loans & liabilities"
        description="Amortized obligations with recurring EMI."
        meta={`${liabilities.length} recorded · ${formatCurrency(totalMonthlyEMI)}/mo EMI`}
        className="mt-8"
      >
        <Repeater<Liability & { emi: number; totalPayment: number; totalInterest: number }>
          items={activeLoansWithEMI}
          getKey={(loan) => loan.id}
          emptyLabel="No debt recorded — add a loan below if the household carries EMIs."
          addLabel="Add loan"
          addCommitLabel="Add loan"
          onAdd={() => {}}
          onAddCommit={handleAddLoan}
          addCommitDisabled={!newLoanName.trim()}
          onRemove={(loan) => onRemoveLiability(loan.id)}
          renderSummary={(loan) => (
            <span className="flex items-baseline gap-3 min-w-0 text-sm">
              <span className="truncate font-medium text-ink">{loan.name || 'Unnamed loan'}</span>
              <span className="truncate text-xs text-muted">
                {formatOrDash(loan.tenureYears, (v) => `${v} yrs`)} · EMI {formatOrDash(loan.emi > 0 ? loan.emi : null, formatCurrency)}
              </span>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted">
                {formatCurrency(loan.principal, 0, loan.currency || 'INR')}
              </span>
            </span>
          )}
          renderEditor={(loan) => (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
              <Input layout="inline" label="Loan name" value={loan.name} onChange={(e) => updateLiability(loan.id, { name: e.target.value })} placeholder="e.g. HDFC Home Loan" />
              <CurrencyInput layout="inline" label="Principal" value={loan.principal} onChange={(value) => updateLiability(loan.id, { principal: value })} currency={loan.currency || 'INR'} onCurrencyChange={(currency) => updateLiability(loan.id, { currency })} />
              <NumberInput layout="inline" label="Interest rate" value={loan.rate} onChange={(value) => updateLiability(loan.id, { rate: value })} suffix="%" step={0.25} min={0} max={30} slider="focus" />
              <NumberInput layout="inline" label="Remaining tenure" value={loan.tenureYears} onChange={(value) => updateLiability(loan.id, { tenureYears: value })} suffix="yrs" step={1} min={1} max={40} />
              <div className="flex items-center gap-4 md:col-span-2">
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={loan.includeInExpenses}
                    onChange={(e) => updateLiability(loan.id, { includeInExpenses: e.target.checked })}
                    className="accent-accent"
                  />
                  Include EMI in monthly expenses
                </label>
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  Interest {formatCurrencyCompact(loan.totalInterest)}
                </span>
              </div>
            </div>
          )}
          renderAddEditor={(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4">
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
                currency={newLoanCurrency}
                onCurrencyChange={setNewLoanCurrency}
                presets={[
                  { label: '₹10L', value: 1000000 },
                  { label: '₹50L', value: 5000000 },
                  { label: '₹1Cr', value: 10000000 },
                ]}
              />
              <NumberInput
                label="Interest rate"
                value={newLoanRate}
                onChange={(val) => setNewLoanRate(val)}
                suffix="%"
                step={0.25}
                min={0}
                max={30}
                slider
              />
              <NumberInput
                label="Remaining tenure"
                value={newLoanTenure}
                onChange={(val) => setNewLoanTenure(val)}
                suffix="yrs"
                step={1}
                min={0}
                max={40}
                slider
              />
            </div>
          )}
        />
      </FormSection>
    </div>
  );
};
