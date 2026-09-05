import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Building2,
  Landmark,
  PieChart,
  Wallet,
  BarChart2,
  User,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Globe,
  WalletMinimal,
  Banknote,
  CreditCard,
  ArrowRight,
  Info,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Slider } from '../components/ui/Slider';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Tabs } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { PlanningAssumptionsModal } from '../components/analytics/PlanningAssumptionsModal';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { AssetEvolutionChart } from '../components/charts/AssetEvolutionChart';
import { SWPDrawdownChart } from '../components/charts/SWPDrawdownChart';
import { DonutChart } from '../components/charts/DonutChart';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { calculateEMI } from '../lib/calculators';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import type { AssetCategory, GoalPriority } from '../types';

export interface LoanLiability {
  id: string;
  name: string;
  principal: number;
  rate: number;
  tenureYears: number;
  includeInExpenses: boolean;
}

const LOANS_STORAGE_KEY = 'soundthesis_master_plan_loans';

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'equity', label: 'Equity' },
  { value: 'debt', label: 'Debt' },
  { value: 'gold', label: 'Gold' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'other', label: 'Other' },
];

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

const priorityOptions: { value: GoalPriority; label: string }[] = [
  { value: 'essential', label: 'Essential' },
  { value: 'important', label: 'Important' },
  { value: 'aspirational', label: 'Aspirational' },
];

export const MasterPlan = () => {
  const {
    inputs,
    updateInputs,
    updateClient,
    updateAsset,
    addAsset,
    removeAsset,
    updateSIP,
    updateSTP,
    updateSWP,
    addGoal,
    updateGoal,
    removeGoal,
    wealthResult,
    riskProfile,
    showToast,
    assumptionMode,
    activeAssumptionSourceLabel,
  } = useCalculator();

  const [activeTab, setActiveTab] = useState('profile');
  const [isAssumptionsModalOpen, setIsAssumptionsModalOpen] = useState(false);

  // Dedicated Loan Liabilities state, synced reactively with monthly expenditure and localStorage
  const [loans, setLoans] = useState<LoanLiability[]>(() => {
    try {
      const saved = localStorage.getItem(LOANS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
    } catch {
      // ignore
    }
  }, [loans]);

  // Compute amortized values for each loan
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
    return loans.reduce((sum, loan) => sum + (Number(loan.principal) || 0), 0);
  }, [loans]);

  const totalMonthlyLoanEMI = useMemo(() => {
    return activeLoansWithEMI
      .filter((l) => l.includeInExpenses)
      .reduce((sum, l) => sum + l.emi, 0);
  }, [activeLoansWithEMI]);

  const totalInterestPayable = useMemo(() => {
    return activeLoansWithEMI.reduce((sum, l) => sum + l.totalInterest, 0);
  }, [activeLoansWithEMI]);

  // Base living spend separated from active loan EMI
  const baseLivingSpend = useMemo(() => {
    return Math.max(0, inputs.monthlyExpenditure - Math.round(totalMonthlyLoanEMI));
  }, [inputs.monthlyExpenditure, totalMonthlyLoanEMI]);

  const netBalanceSheet = useMemo(() => {
    return wealthResult.netWorth - totalLiabilities;
  }, [wealthResult.netWorth, totalLiabilities]);

  const debtToAssetRatio = useMemo(() => {
    if (wealthResult.netWorth <= 0) return totalLiabilities > 0 ? 100 : 0;
    return (totalLiabilities / wealthResult.netWorth) * 100;
  }, [totalLiabilities, wealthResult.netWorth]);

  const dtiRatio = useMemo(() => {
    const monthlyIncome = inputs.annualIncome / 12;
    if (monthlyIncome <= 0) return 0;
    return (totalMonthlyLoanEMI / monthlyIncome) * 100;
  }, [totalMonthlyLoanEMI, inputs.annualIncome]);

  // Loan mutation handlers
  const addLoan = (preset?: Partial<LoanLiability>) => {
    const newLoan: LoanLiability = {
      id: `loan-${Date.now()}`,
      name: preset?.name || 'Home Loan',
      principal: preset?.principal ?? 2500000,
      rate: preset?.rate ?? 8.5,
      tenureYears: preset?.tenureYears ?? 15,
      includeInExpenses: preset?.includeInExpenses ?? true,
    };
    const updated = [...loans, newLoan];
    setLoans(updated);

    if (newLoan.includeInExpenses) {
      const emi = calculateEMI(newLoan.principal, newLoan.rate, newLoan.tenureYears).emi;
      updateInputs({ monthlyExpenditure: inputs.monthlyExpenditure + Math.round(emi) });
    }
    showToast(`Added liability: ${newLoan.name}`, 'success');
  };

  const updateLoan = (id: string, patch: Partial<LoanLiability>) => {
    const oldActiveEMI = activeLoansWithEMI.filter((l) => l.includeInExpenses).reduce((s, l) => s + l.emi, 0);
    const updated = loans.map((l) => (l.id === id ? { ...l, ...patch } : l));
    setLoans(updated);

    const newActiveEMI = updated
      .filter((l) => l.includeInExpenses)
      .reduce((s, l) => s + calculateEMI(l.principal, l.rate, l.tenureYears).emi, 0);
    const currentBase = Math.max(0, inputs.monthlyExpenditure - Math.round(oldActiveEMI));
    updateInputs({ monthlyExpenditure: currentBase + Math.round(newActiveEMI) });
  };

  const removeLoan = (id: string) => {
    const loanToRemove = loans.find((l) => l.id === id);
    const updated = loans.filter((l) => l.id !== id);
    setLoans(updated);

    if (loanToRemove && loanToRemove.includeInExpenses) {
      const emi = calculateEMI(loanToRemove.principal, loanToRemove.rate, loanToRemove.tenureYears).emi;
      updateInputs({ monthlyExpenditure: Math.max(0, inputs.monthlyExpenditure - Math.round(emi)) });
    }
    showToast('Removed liability', 'info');
  };

  // Asset breakdown by category
  const assetCategoryTotals = useMemo(() => {
    const totals: Record<AssetCategory, number> = {
      equity: 0,
      debt: 0,
      gold: 0,
      realestate: 0,
      liquid: 0,
      other: 0,
    };
    inputs.assets.forEach((a) => {
      totals[a.category] = (totals[a.category] || 0) + a.value;
    });
    return totals;
  }, [inputs.assets]);

  const tabs = [
    { id: 'profile', label: 'Client Profile', icon: <User size={15} /> },
    { id: 'assets', label: 'Assets & Balance Sheet', icon: <Building2 size={15} /> },
    { id: 'cashflows', label: 'Cashflows & Savings', icon: <TrendingUp size={15} /> },
    { id: 'loans', label: 'Loans & EMI', icon: <CreditCard size={15} /> },
    { id: 'goals', label: 'Goals & Milestones', icon: <Target size={15} /> },
    { id: 'results', label: 'Projections & Results', icon: <BarChart2 size={15} /> },
  ];

  const accData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'accumulation')
        .map((s) => ({ label: `Age ${s.age}`, nominal: s.total, real: s.realTotal })),
    [wealthResult.snapshots],
  );

  const assetEvolutionData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'accumulation')
        .map((s) => ({
          label: `Age ${s.age}`,
          equity: s.values.equity,
          debt: s.values.debt,
          gold: s.values.gold,
          realestate: s.values.realestate,
          liquid: s.values.liquid,
          other: s.values.other,
        })),
    [wealthResult.snapshots],
  );

  const swpData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'distribution')
        .map((s) => ({ label: `Age ${s.age}`, corpus: s.total })),
    [wealthResult.snapshots],
  );

  const terminalSnapshot = wealthResult.snapshots[wealthResult.snapshots.length - 1];
  const allocationData = useMemo(() => {
    if (!terminalSnapshot) return [];
    const total = terminalSnapshot.total;
    const alloc = wealthResult.projectedAllocation;
    return [
      { name: 'Equity', value: total * alloc.equity, color: ASSET_COLORS.equity },
      { name: 'Debt', value: total * alloc.debt, color: ASSET_COLORS.debt },
      { name: 'Gold', value: total * alloc.gold, color: ASSET_COLORS.gold },
      { name: 'Real Estate', value: total * alloc.realestate, color: ASSET_COLORS.realestate },
      { name: 'Liquid', value: total * alloc.liquid, color: ASSET_COLORS.liquid },
      { name: 'Other', value: total * alloc.other, color: ASSET_COLORS.other },
    ].filter((d) => d.value > 0);
  }, [terminalSnapshot, wealthResult.projectedAllocation]);

  const monthlyNeedAtRetirement = useMemo(() => {
    const years = Math.max(0, inputs.retirementAge - inputs.currentAge);
    return inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, years);
  }, [inputs.swp.monthlyNeedToday, inputs.inflation, inputs.retirementAge, inputs.currentAge]);

  const distributionMonthlyNeed = (year: number) => {
    const accYears = Math.max(0, inputs.retirementAge - inputs.currentAge);
    return inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, accYears + year);
  };

  const netWorth = wealthResult.netWorth;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Master Plan"
        subtitle="Client profile, asset balance sheet, household cashflows, and long-term projection model."
        badge="Step 1 · Planning Foundation"
      />

      <div className="flex items-center justify-between overflow-x-auto pb-1">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* TAB 1: CLIENT PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex items-center space-x-2.5 mb-6 border-b border-zinc-100 pb-4">
                <User size={18} className="text-zinc-950" />
                <h3 className="text-lg font-bold text-zinc-950 tracking-tight">Client & Mandate Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Input
                  label="Client Name"
                  value={inputs.client?.name || ''}
                  onChange={(e) => updateClient({ name: e.target.value })}
                  placeholder="e.g. Vikram & Ananya Sharma"
                />
                <Input
                  label="Client Email"
                  type="email"
                  value={inputs.client?.email || ''}
                  onChange={(e) => updateClient({ email: e.target.value })}
                  placeholder="e.g. client@example.com"
                />
                <Input
                  label="Wealth Advisor / Firm"
                  value={inputs.client?.advisor || ''}
                  onChange={(e) => updateClient({ advisor: e.target.value })}
                  placeholder="e.g. Sound Thesis Advisory"
                />
                <Input
                  label="Mandate Review Date"
                  type="date"
                  value={inputs.client?.reviewDate || ''}
                  onChange={(e) => updateClient({ reviewDate: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Primary Planning Mandate"
                    value={inputs.client?.notes || ''}
                    onChange={(e) => updateClient({ notes: e.target.value })}
                    placeholder="Key priorities, time horizons, and family objectives"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar size={16} className="text-zinc-950" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Life Horizon & Economic Drivers</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <NumberInput
                    label="Current Age"
                    value={inputs.currentAge}
                    onChange={(v) => updateInputs({ currentAge: v })}
                  />
                  <NumberInput
                    label="Retirement Age"
                    value={inputs.retirementAge}
                    onChange={(v) => updateInputs({ retirementAge: v })}
                  />
                  <NumberInput
                    label="Life Expectancy"
                    value={inputs.lifeExpectancy}
                    onChange={(v) => updateInputs({ lifeExpectancy: v })}
                  />
                  <CurrencyInput
                    label="Annual Household Income"
                    value={inputs.annualIncome}
                    onChange={(v) => updateInputs({ annualIncome: v })}
                    helper="Gross pre-tax income"
                  />
                  <NumberInput
                    label="Inflation Assumption"
                    value={inputs.inflation}
                    onChange={(v) => updateInputs({ inflation: v })}
                    suffix="%"
                    helper="Long-term hurdle rate"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
                <h3 className="text-lg font-bold text-zinc-950 tracking-tight">Profile Snapshot</h3>
                <Badge variant="outline">Verified</Badge>
              </div>
              <div className="space-y-3.5 divide-y divide-zinc-100">
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-zinc-500">Client</span>
                  <span className="font-semibold text-zinc-950 truncate max-w-[170px]">{inputs.client?.name || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2.5">
                  <span className="text-zinc-500">Accumulation Phase</span>
                  <span className="font-semibold font-mono text-zinc-950">
                    {Math.max(0, inputs.retirementAge - inputs.currentAge)} yrs
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2.5">
                  <span className="text-zinc-500">Distribution Phase</span>
                  <span className="font-semibold font-mono text-zinc-950">
                    {Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)} yrs
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2.5">
                  <span className="text-zinc-500">Gross Portfolio</span>
                  <span className="font-semibold font-mono text-zinc-950">{formatCurrency(netWorth)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2.5">
                  <span className="text-zinc-500">Net Annual Savings</span>
                  <span
                    className={`font-semibold font-mono ${
                      wealthResult.annualSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatCurrency(wealthResult.annualSavings)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2.5">
                  <span className="text-zinc-500">Savings Rate</span>
                  <span
                    className={`font-semibold font-mono ${
                      wealthResult.savingsRate >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatPercent(wealthResult.savingsRate)}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100">
                <Link
                  to="/risk"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-950 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors"
                >
                  <span>Evaluate Risk Profile</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ASSETS & BALANCE SHEET */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
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

          {/* Allocation Breakdown by Asset Class */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-950 tracking-tight">Portfolio Asset Allocation</h3>
                <p className="text-xs text-zinc-500">Current balance sheet distribution across core asset classes</p>
              </div>
              <div className="text-xs font-mono font-medium text-zinc-700">
                Total: <strong className="text-zinc-950">{formatCurrency(netWorth)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {categoryOptions.map((cat) => {
                const value = assetCategoryTotals[cat.value] || 0;
                const share = netWorth > 0 ? (value / netWorth) * 100 : 0;
                return (
                  <div key={cat.value} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ASSET_COLORS[cat.value] }} />
                      <span className="text-xs font-semibold text-zinc-900 truncate">{cat.label}</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-zinc-950">{formatCurrencyCompact(value)}</div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">{formatPercent(share)}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Assets Inventory Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                <Building2 size={18} className="text-zinc-950" /> Asset Holdings Inventory
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage holdings, projected returns, currency denomination, and retirement liquidation treatment.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
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
              >
                + Equity MF
              </Button>
              <Button
                variant="outline"
                size="sm"
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
              >
                + Debt/FD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  addAsset({
                    name: 'Sovereign Gold Bonds',
                    category: 'gold',
                    value: 300000,
                    returnRate: 8,
                    currency: 'INR',
                    liquidateAtRetirement: false,
                  });
                  showToast('Added Gold holding', 'success');
                }}
              >
                + Gold SGB
              </Button>
              <Button size="sm" onClick={() => addAsset()}>
                <Plus size={14} className="mr-1" /> Add Custom
              </Button>
            </div>
          </div>

          {inputs.assets.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200">
              <p className="text-sm text-zinc-600">No assets recorded yet. Use the quick-add buttons above to document holdings.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inputs.assets.map((asset) => (
              <Card key={asset.id} variant="subtle">
                <div className="flex justify-between items-start mb-3 border-b border-zinc-200/80 pb-2.5">
                  <div className="flex items-center gap-2 w-3/4">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[asset.category] }} />
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAsset(asset.id, { name: e.currentTarget.value })}
                      aria-label={`Asset name: ${asset.name}`}
                      className="bg-transparent text-sm font-bold text-zinc-950 focus:outline-none focus:border-b focus:border-zinc-900 w-full"
                    />
                  </div>
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="p-1 text-zinc-400 hover:text-rose-600 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer"
                    aria-label={`Remove asset ${asset.name}`}
                    title={`Remove asset ${asset.name}`}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <CurrencyInput
                    label="Valuation"
                    value={asset.value}
                    onChange={(v) => updateAsset(asset.id, { value: v })}
                  />
                  <NumberInput
                    label="Expected Return"
                    value={asset.returnRate}
                    onChange={(v) => updateAsset(asset.id, { returnRate: v })}
                    suffix="%"
                  />
                  <Select
                    label="Category"
                    value={asset.category}
                    onChange={(v) => updateAsset(asset.id, { category: v as AssetCategory })}
                    options={categoryOptions}
                  />
                  <Select
                    label="Denomination"
                    value={asset.currency || 'INR'}
                    onChange={(v) => updateAsset(asset.id, { currency: v })}
                    options={currencyOptions}
                  />
                  <Select
                    label="At Retirement Treatment"
                    value={asset.liquidateAtRetirement ? 'true' : 'false'}
                    onChange={(v) => updateAsset(asset.id, { liquidateAtRetirement: v === 'true' })}
                    options={strategyOptions}
                    className="col-span-2"
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CASHFLOWS & SAVINGS RATE */}
      {activeTab === 'cashflows' && (
        <div className="space-y-6">
          {/* Active Return Assumptions Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-950 text-white rounded-2xl border border-zinc-900 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Return Assumptions Engine</div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>{activeAssumptionSourceLabel}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-mono uppercase font-semibold">
                    {assumptionMode} mode
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAssumptionsModalOpen(true)}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Calibrate Assumptions</span>
              <span>→</span>
            </button>
          </div>

          {/* Household Operating Cashflows */}
          <Card>
            <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-4">
              <div className="flex items-center space-x-2">
                <Banknote size={18} className="text-zinc-950" />
                <h3 className="text-lg font-bold text-zinc-950 tracking-tight">Household Operating Cashflows</h3>
              </div>
              <Badge variant={wealthResult.savingsRate >= 0 ? 'success' : 'danger'}>
                {formatPercent(wealthResult.savingsRate)} savings rate
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <CurrencyInput
                label="Annual Pre-Tax Income"
                value={inputs.annualIncome}
                onChange={(v) => updateInputs({ annualIncome: v })}
                helper="Gross household income"
              />
              <CurrencyInput
                label="Monthly Living Spend"
                value={baseLivingSpend}
                onChange={(v) => updateInputs({ monthlyExpenditure: v + Math.round(totalMonthlyLoanEMI) })}
                helper="Household operating expenses"
              />
              <div className="flex flex-col justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly Loan EMI</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      totalMonthlyLoanEMI > 0
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : 'text-zinc-600 bg-zinc-100 border-zinc-200'
                    }`}
                  >
                    {activeLoansWithEMI.filter((l) => l.includeInExpenses).length} Active
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                  {formatCurrency(totalMonthlyLoanEMI)}
                  <span className="text-xs font-normal text-zinc-500 font-sans ml-1">/mo</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('loans')}
                  className="text-xs text-zinc-700 hover:text-zinc-950 font-medium text-left mt-2 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Configure liabilities</span>
                  <span>→</span>
                </button>
              </div>
              <CurrencyInput
                label="Total Monthly Outflow"
                value={inputs.monthlyExpenditure}
                onChange={(v) => updateInputs({ monthlyExpenditure: v })}
                helper="Living spend + active loan EMI"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Annual Income" value={formatCurrency(wealthResult.annualIncome)} />
              <MetricCard label="Annual Expenses" value={formatCurrency(wealthResult.annualExpenses)} />
              <MetricCard
                label="Net Annual Savings"
                value={formatCurrency(wealthResult.annualSavings)}
                subtext={`${formatPercent(wealthResult.savingsRate)} of income`}
                variant={wealthResult.annualSavings >= 0 ? 'success' : 'danger'}
              />
              <MetricCard
                label="Invested / Deployed"
                value={formatCurrency(wealthResult.annualInvested)}
                subtext={`${formatPercent(wealthResult.investmentRate)} of income`}
              />
            </div>

            {/* Savings deployment bar & surplus tracking */}
            {wealthResult.annualSavings > 0 ? (
              <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-600 font-medium">Net savings deployment</span>
                  <span className="font-semibold text-zinc-950 font-mono">
                    {formatPercent((wealthResult.annualInvested / Math.max(wealthResult.annualSavings, 1)) * 100)} deployed
                  </span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-950 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (wealthResult.annualInvested / Math.max(wealthResult.annualSavings, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2.5 text-xs text-zinc-600 flex items-center justify-between">
                  <span>
                    Unallocated surplus:{' '}
                    <span className="font-semibold text-emerald-700 font-mono">
                      {formatCurrency(Math.max(0, wealthResult.annualSavings - wealthResult.annualInvested))}
                    </span>{' '}
                    / year
                  </span>
                  <span className="text-zinc-500">Available for goals or debt prepayments</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-700" />
                <div className="text-xs sm:text-sm">
                  <strong>Cashflow Deficit Detected:</strong> Annual expenses exceed household income by{' '}
                  <span className="font-mono font-bold text-rose-900">{formatCurrency(Math.abs(wealthResult.annualSavings))}</span>.
                  Reduce lifestyle expenditure or restructure loan liabilities to eliminate deficits.
                </div>
              </div>
            )}
          </Card>

          {/* Core Investment Strategies: SIP, STP, SWP */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SIP Card */}
            <Card>
              <div className="flex items-center space-x-2 mb-4 border-b border-zinc-100 pb-3">
                <PieChart size={18} className="text-zinc-950" />
                <h3 className="text-base font-bold text-zinc-950 tracking-tight">SIP Accumulation</h3>
              </div>
              <div className="space-y-4">
                <CurrencyInput
                  label="Monthly SIP Amount"
                  value={inputs.sip.amount}
                  onChange={(v) => updateSIP({ amount: v })}
                />
                <Slider
                  label="Equity Split"
                  value={inputs.sip.equitySplit}
                  onChange={(v) => updateSIP({ equitySplit: v, debtSplit: 100 - v })}
                />
                <Slider
                  label="Debt Split"
                  value={inputs.sip.debtSplit}
                  onChange={(v) => updateSIP({ debtSplit: v, equitySplit: 100 - v })}
                />
                <NumberInput
                  label="Annual Step-Up"
                  value={inputs.sip.stepUp}
                  onChange={(v) => updateSIP({ stepUp: v })}
                  suffix="%"
                  helper="Yearly contribution increase"
                />
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <NumberInput
                    label="Equity Return"
                    value={inputs.sip.equityReturn}
                    onChange={(v) => updateSIP({ equityReturn: v })}
                    suffix="%"
                  />
                  <NumberInput
                    label="Debt Return"
                    value={inputs.sip.debtReturn}
                    onChange={(v) => updateSIP({ debtReturn: v })}
                    suffix="%"
                  />
                </div>
              </div>
            </Card>

            {/* STP Card */}
            <Card>
              <div className="flex items-center space-x-2 mb-4 border-b border-zinc-100 pb-3">
                <Landmark size={18} className="text-zinc-950" />
                <h3 className="text-base font-bold text-zinc-950 tracking-tight">STP Phased Deployment</h3>
              </div>
              <label className="flex items-center space-x-2 text-sm font-semibold text-zinc-900 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.stp.active}
                  onChange={(e) => updateSTP({ active: e.currentTarget.checked })}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                />
                <span>Enable Systematic Transfer Plan</span>
              </label>
              {inputs.stp.active ? (
                <div className="space-y-4">
                  <CurrencyInput
                    label="Liquid Lumpsum"
                    value={inputs.stp.lumpsum}
                    onChange={(v) => updateSTP({ lumpsum: v })}
                    helper="Capital parked in liquid funds"
                  />
                  <CurrencyInput
                    label="Monthly Transfer"
                    value={inputs.stp.monthlyTransfer}
                    onChange={(v) => updateSTP({ monthlyTransfer: v })}
                    helper="Transfer into risk portfolio"
                  />
                  <NumberInput
                    label="Liquid Return"
                    value={inputs.stp.liquidReturn}
                    onChange={(v) => updateSTP({ liquidReturn: v })}
                    suffix="%"
                  />
                  <CurrencyInput
                    label="Liquid Floor Reserve"
                    value={inputs.stp.liquidCap}
                    onChange={(v) => updateSTP({ liquidCap: v })}
                    helper="Emergency buffer retained"
                  />
                  <Slider
                    label="Equity Target Split"
                    value={inputs.stp.equitySplit}
                    onChange={(v) => updateSTP({ equitySplit: v, debtSplit: 100 - v })}
                  />
                  <Slider
                    label="Debt Target Split"
                    value={inputs.stp.debtSplit}
                    onChange={(v) => updateSTP({ debtSplit: v, equitySplit: 100 - v })}
                  />
                </div>
              ) : (
                <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                  STP transfers idle cash or windfall liquidity gradually into target equities and debt to mitigate timing risk.
                </p>
              )}
            </Card>

            {/* SWP Post-Retirement Card */}
            <Card>
              <div className="flex items-center space-x-2 mb-4 border-b border-zinc-100 pb-3">
                <Wallet size={18} className="text-zinc-950" />
                <h3 className="text-base font-bold text-zinc-950 tracking-tight">SWP Post-Retirement Drawdown</h3>
              </div>
              <div className="space-y-4">
                <CurrencyInput
                  label="Target Monthly Income (Today's ₹)"
                  value={inputs.swp.monthlyNeedToday}
                  onChange={(v) => updateSWP({ monthlyNeedToday: v })}
                  helper="Desired monthly purchasing power"
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput
                    label="Post-Retirement Return"
                    value={inputs.swp.postRetirementReturn}
                    onChange={(v) => updateSWP({ postRetirementReturn: v })}
                    suffix="%"
                  />
                  <NumberInput
                    label="Effective Tax Rate"
                    value={inputs.swp.taxRate}
                    onChange={(v) => updateSWP({ taxRate: v })}
                    suffix="%"
                  />
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600">Need at Retirement:</span>
                    <span className="font-mono font-bold text-zinc-950">{formatCurrency(monthlyNeedAtRetirement)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>Inflation compounding:</span>
                    <span className="font-mono">{Math.max(0, inputs.retirementAge - inputs.currentAge)} years</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/retirement"
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-semibold transition-colors border border-zinc-200"
                  >
                    <span>Open Retirement & SWP Lab</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: LOANS & LIABILITIES (EMI) */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Total Debt Liabilities"
              value={formatCurrency(totalLiabilities)}
              subtext={`${loans.length} recorded debts`}
              variant={totalLiabilities > 0 ? 'danger' : 'default'}
            />
            <MetricCard
              label="Monthly EMI Commitment"
              value={formatCurrency(totalMonthlyLoanEMI)}
              subtext={`${activeLoansWithEMI.filter((l) => l.includeInExpenses).length} active in cashflow`}
              variant={totalMonthlyLoanEMI > 0 ? 'danger' : 'default'}
            />
            <MetricCard
              label="Total Interest Payable"
              value={formatCurrency(totalInterestPayable)}
              subtext="Over remaining loan tenures"
            />
            <MetricCard
              label="Debt-to-Income (DTI)"
              value={formatPercent(dtiRatio)}
              subtext={dtiRatio === 0 ? 'Zero debt burden' : dtiRatio < 35 ? 'Manageable DTI' : 'High debt servicing burden'}
              variant={dtiRatio > 40 ? 'danger' : 'default'}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                <CreditCard size={18} className="text-zinc-950" /> Recorded Loan Liabilities & EMI
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Model outstanding obligations, amortized monthly debt payments, and integrate debt servicing into plan expenses.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addLoan({
                    name: 'Home Loan',
                    principal: 5000000,
                    rate: 8.5,
                    tenureYears: 20,
                    includeInExpenses: true,
                  })
                }
              >
                + Home Loan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  addLoan({
                    name: 'Vehicle Loan',
                    principal: 1000000,
                    rate: 9.0,
                    tenureYears: 5,
                    includeInExpenses: true,
                  })
                }
              >
                + Vehicle Loan
              </Button>
              <Button size="sm" onClick={() => addLoan()}>
                <Plus size={14} className="mr-1" /> Add Custom Liability
              </Button>
            </div>
          </div>

          {loans.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200">
              <ShieldCheck size={28} className="mx-auto text-emerald-600 mb-2" />
              <h4 className="text-sm font-bold text-zinc-950">No Liabilities Reported</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                Household balance sheet reports zero high-cost debt. If you hold mortgages or loans, add them above to reflect amortized EMIs reactively.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLoansWithEMI.map((loan) => (
              <Card key={loan.id} variant="subtle" className="border-l-4 border-l-rose-600">
                <div className="flex justify-between items-start mb-3 border-b border-zinc-200/80 pb-2.5">
                  <div className="flex items-center gap-2 w-3/4">
                    <input
                      type="text"
                      value={loan.name}
                      onChange={(e) => updateLoan(loan.id, { name: e.currentTarget.value })}
                      aria-label={`Liability name: ${loan.name}`}
                      className="bg-transparent text-sm font-bold text-zinc-950 focus:outline-none focus:border-b focus:border-zinc-900 w-full"
                    />
                    <Badge variant="danger">Liability</Badge>
                  </div>
                  <button
                    onClick={() => removeLoan(loan.id)}
                    className="p-1 text-zinc-400 hover:text-rose-600 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer"
                    aria-label={`Remove loan ${loan.name}`}
                    title={`Remove loan ${loan.name}`}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3.5 mb-4">
                  <CurrencyInput
                    label="Outstanding Principal"
                    value={loan.principal}
                    onChange={(v) => updateLoan(loan.id, { principal: v })}
                  />
                  <NumberInput
                    label="Interest Rate"
                    value={loan.rate}
                    onChange={(v) => updateLoan(loan.id, { rate: v })}
                    suffix="%"
                  />
                  <NumberInput
                    label="Tenure Remaining"
                    value={loan.tenureYears}
                    onChange={(v) => updateLoan(loan.id, { tenureYears: v })}
                    suffix="yrs"
                  />
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Calculated EMI</span>
                    <div className="text-base font-bold font-mono text-rose-700">
                      {formatCurrency(loan.emi)}
                      <span className="text-xs font-normal text-zinc-500 font-sans ml-1">/mo</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs mb-3">
                  <div>
                    <span className="text-zinc-500">Total Interest: </span>
                    <span className="font-mono font-semibold text-zinc-950">{formatCurrency(loan.totalInterest)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Total Obligation: </span>
                    <span className="font-mono font-semibold text-zinc-950">{formatCurrency(loan.totalPayment)}</span>
                  </div>
                </div>

                <label className="flex items-center space-x-2 text-xs font-semibold text-zinc-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loan.includeInExpenses}
                    onChange={(e) => updateLoan(loan.id, { includeInExpenses: e.currentTarget.checked })}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                  />
                  <span>Factor EMI into household monthly expenditure</span>
                </label>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: GOAL MILESTONES */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-950 flex items-center gap-2">
                <Target size={18} className="text-zinc-950" /> Goal Milestone Targets
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Target milestones funded sequentially in priority order: Essential first, then Important, then Aspirational.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  addGoal({
                    name: 'Higher Education',
                    targetAmount: 5000000,
                    yearsToGoal: 10,
                    inflation: 8,
                    priority: 'essential',
                    recurring: false,
                  });
                  showToast('Added Higher Education goal milestone', 'success');
                }}
              >
                + Education
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  addGoal({
                    name: 'Home Down Payment',
                    targetAmount: 3000000,
                    yearsToGoal: 5,
                    inflation: 6,
                    priority: 'important',
                    recurring: false,
                  });
                  showToast('Added Home Down Payment goal milestone', 'success');
                }}
              >
                + Home Purchase
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  addGoal({
                    name: `Goal ${inputs.goals.length + 1}`,
                    targetAmount: 1000000,
                    yearsToGoal: 5,
                    priority: 'important',
                    inflation: inputs.inflation || 5,
                    recurring: false,
                  });
                  showToast('Added custom goal milestone', 'success');
                }}
              >
                <Plus size={14} className="mr-1" /> Add Custom Goal
              </Button>
            </div>
          </div>

          <div className="text-xs text-zinc-600 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 flex items-center gap-2">
            <Info size={16} className="text-zinc-500 shrink-0" />
            <span>
              <strong>Sequencing Rule:</strong> The engine allocates available savings to Essential milestones first.
              Surplus is then deployed to Important and Aspirational goals.
            </span>
          </div>

          {inputs.goals.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200">
              <p className="text-sm text-zinc-600">No goals recorded yet. Click <strong>Add Custom Goal</strong> to establish milestone targets.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inputs.goals.map((goal) => {
              const goalRes = wealthResult.goalResults.find((g) => g.goal.id === goal.id);
              const inflationRate = goal.inflation ?? inputs.inflation ?? 5;
              const futureVal = goalRes?.futureValue ?? Math.round(goal.targetAmount * Math.pow(1 + inflationRate / 100, goal.yearsToGoal));
              const isFunded = goalRes ? goalRes.successRate >= riskProfile.goalSuccessThreshold / 100 : false;

              return (
                <Card key={goal.id} variant="subtle">
                  <div className="flex justify-between items-start mb-3 border-b border-zinc-200/80 pb-2.5">
                    <div className="flex items-center gap-2 w-2/3">
                      <input
                        type="text"
                        value={goal.name}
                        onChange={(e) => updateGoal(goal.id, { name: e.currentTarget.value })}
                        aria-label={`Goal name: ${goal.name}`}
                        className="bg-transparent text-sm font-bold text-zinc-950 focus:outline-none focus:border-b focus:border-zinc-900 w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {goalRes && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isFunded
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : 'text-rose-700 bg-rose-50 border-rose-200'
                          }`}
                        >
                          {isFunded ? 'Funded' : 'Shortfall Risk'}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          removeGoal(goal.id);
                          showToast('Goal removed', 'info');
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 cursor-pointer"
                        aria-label={`Remove goal ${goal.name}`}
                        title={`Remove goal ${goal.name}`}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 mb-3">
                    <CurrencyInput
                      label="Target Today"
                      value={goal.targetAmount}
                      onChange={(v) => updateGoal(goal.id, { targetAmount: v })}
                    />
                    <NumberInput
                      label="Years to Goal"
                      value={goal.yearsToGoal}
                      onChange={(v) => updateGoal(goal.id, { yearsToGoal: v })}
                    />
                    <NumberInput
                      label="Goal Inflation"
                      value={goal.inflation ?? inputs.inflation ?? 5}
                      onChange={(v) => updateGoal(goal.id, { inflation: v })}
                      suffix="%"
                    />
                    <Select
                      label="Priority Category"
                      value={goal.priority}
                      onChange={(v) => updateGoal(goal.id, { priority: v as GoalPriority })}
                      options={priorityOptions}
                    />
                  </div>

                  <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs mb-3">
                    <div>
                      <span className="text-zinc-500">Future Cost: </span>
                      <span className="font-mono font-semibold text-zinc-950">{formatCurrencyCompact(futureVal)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Target Age: </span>
                      <span className="font-mono font-semibold text-zinc-950">Age {inputs.currentAge + goal.yearsToGoal}</span>
                    </div>
                    {goalRes && goalRes.requiredSIP > 0 && (
                      <div>
                        <span className="text-zinc-500">SIP Needed: </span>
                        <span className="font-mono font-semibold text-zinc-950">{formatCurrencyCompact(goalRes.requiredSIP)}/mo</span>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center space-x-2 text-xs font-semibold text-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(goal.recurring)}
                      onChange={(e) => updateGoal(goal.id, { recurring: e.currentTarget.checked })}
                      className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                    />
                    <span>Recurring goal cycle</span>
                  </label>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: RESULTS & PROJECTIONS */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Plan Feasibility Alerts */}
          {!wealthResult.sustainable ? (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800">
              <AlertTriangle size={20} className="shrink-0 mt-0.5 text-rose-700" />
              <div className="text-sm">
                <strong className="font-semibold text-rose-900">Plan Depletion Alert:</strong> Corpus is projected to exhaust at age{' '}
                <span className="font-bold font-mono">{wealthResult.depletionAge}</span>. Increase monthly savings, delay retirement, or reduce post-retirement withdrawal expectations.
              </div>
            </div>
          ) : wealthResult.goalsAtRisk.length > 0 ? (
            <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-4 flex items-start gap-3 text-zinc-800">
              <AlertTriangle size={20} className="shrink-0 mt-0.5 text-zinc-900" />
              <div className="text-sm">
                <strong className="font-semibold text-zinc-950">Goals Requiring Calibration:</strong>{' '}
                {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}. Review required SIP contributions in the Goal Planner.
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-800">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-700" />
              <div className="text-sm">
                <strong className="font-semibold text-emerald-950">Plan Fully Solvent & Sustainable:</strong> Lifetime SWP and all essential milestone goals are projected to be funded through age{' '}
                <span className="font-mono font-bold">{inputs.lifeExpectancy}</span>.
              </div>
            </div>
          )}

          {/* Core Outcome Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Terminal Corpus (Nominal)"
              value={formatCurrency(wealthResult.terminalValue)}
              subtext={`At Age ${inputs.lifeExpectancy}`}
            />
            <MetricCard
              label="Terminal Corpus (Real)"
              value={formatCurrency(wealthResult.terminalRealValue)}
              subtext="Inflation-adjusted"
            />
            <MetricCard
              label="Nominal CAGR"
              value={formatPercent(wealthResult.cagrNominal)}
              subtext="Annual portfolio growth"
            />
            <MetricCard
              label="Monthly Need at Retirement"
              value={formatCurrency(monthlyNeedAtRetirement)}
              subtext={`From ${formatCurrency(inputs.swp.monthlyNeedToday)} today`}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Plan Success Rate"
              value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
              subtext="Correlated simulation paths"
              variant={wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'}
            />
            <MetricCard
              label="Essential Goal Success"
              value={formatPercent(wealthResult.essentialSuccessRate * 100)}
              subtext="Non-negotiable milestones"
              variant={wealthResult.essentialSuccessRate === 1 ? 'success' : 'danger'}
            />
            <MetricCard
              label="Real CAGR"
              value={formatPercent(wealthResult.cagrReal)}
              subtext="Net of inflation"
            />
            <MetricCard
              label="Total Capital Invested"
              value={formatCurrency(wealthResult.totalInvested)}
              subtext="Over accumulation horizon"
            />
          </div>

          {/* Trajectory & Evolution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-bold text-zinc-950 mb-4 tracking-tight">Accumulation Trajectory (Nominal vs Real)</h3>
              <NominalRealChart data={accData} xKey="label" />
            </Card>
            <Card>
              <h3 className="text-base font-bold text-zinc-950 mb-4 tracking-tight">Asset Class Evolution</h3>
              <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-bold text-zinc-950 mb-4 tracking-tight">SWP Drawdown Longevity</h3>
              <SWPDrawdownChart data={swpData} xKey="label" />
            </Card>
            <Card>
              <h3 className="text-base font-bold text-zinc-950 mb-4 tracking-tight">Terminal Allocation</h3>
              <DonutChart data={allocationData} />
            </Card>
          </div>

          {/* Monte Carlo Simulation */}
          <Card>
            <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                  <BarChart2 size={18} className="text-zinc-950" /> Monte Carlo Simulation
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {wealthResult.monteCarlo.outcomes.length.toLocaleString()} stochastic correlated paths under asset return covariance.
                </p>
              </div>
              <Badge variant="navy">Auto-Run</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                label="Success Rate"
                value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
                subtext="Sustainable through lifetime"
                variant={wealthResult.monteCarlo.successRate >= 0.8 ? 'success' : 'danger'}
              />
              <MetricCard
                label="Median Terminal"
                value={formatCurrencyCompact(wealthResult.monteCarlo.medianTerminal)}
                subtext="50th percentile"
              />
              <MetricCard
                label="P5 Terminal (Stress)"
                value={formatCurrencyCompact(wealthResult.monteCarlo.percentile5)}
                subtext="5th percentile tail risk"
                variant="danger"
              />
              <MetricCard
                label="P95 Terminal (Bull)"
                value={formatCurrencyCompact(wealthResult.monteCarlo.percentile95)}
                subtext="95th percentile outcome"
                variant="success"
              />
            </div>
            <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
          </Card>

          {/* Rebalancing & Currency Exposure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-bold text-zinc-950 mb-4 flex items-center gap-2">
                <WalletMinimal size={18} className="text-zinc-950" /> Portfolio Rebalancing
              </h3>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="w-full min-w-[460px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="py-2.5 pr-4">Asset Class</th>
                      <th className="py-2.5 pr-4 text-right">Current</th>
                      <th className="py-2.5 pr-4 text-right">Target</th>
                      <th className="py-2.5 pr-4 text-right">Trade</th>
                      <th className="py-2.5 pr-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wealthResult.rebalancingTrades.map((r) => (
                      <tr key={r.category} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="py-2.5 pr-4 flex items-center font-medium text-zinc-950">
                          <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                          {ASSET_LABELS[r.category]}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono">{formatCurrencyCompact(r.current)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{formatCurrencyCompact(r.target)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono font-medium">{formatCurrencyCompact(r.trade)}</td>
                        <td className="py-2.5 pr-4 text-center">
                          {Math.abs(r.trade) < netWorth * 0.02 ? (
                            <span className="inline-flex items-center text-zinc-500 text-xs font-medium">
                              <CheckCircle2 size={12} className="mr-1 text-zinc-400" /> Hold
                            </span>
                          ) : r.trade > 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              Buy
                            </span>
                          ) : (
                            <span className="text-rose-700 bg-rose-50 border border-rose-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              Sell
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h3 className="text-base font-bold text-zinc-950 mb-4 flex items-center gap-2">
                <Globe size={18} className="text-zinc-950" /> Currency Exposure
              </h3>
              <div className="space-y-3">
                {wealthResult.currencyExposure.map((c) => (
                  <div key={c.currency} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-950 font-mono">{c.currency}</span>
                      <Badge variant={c.currency === 'INR' ? 'outline' : 'navy'}>{formatPercent(c.percentage)}</Badge>
                    </div>
                    <div className="text-xs font-mono text-zinc-500 mt-1">{formatCurrency(c.amount)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Year-by-Year Projection Schedule */}
          <Card>
            <h3 className="text-base font-bold text-zinc-950 mb-4">Year-by-Year Projection Schedule</h3>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-2.5 pr-4">Year</th>
                    <th className="py-2.5 pr-4">Age</th>
                    <th className="py-2.5 pr-4">Phase</th>
                    <th className="py-2.5 pr-4 text-right">Nominal Total</th>
                    <th className="py-2.5 pr-4 text-right">Real Total</th>
                    <th className="py-2.5 pr-4 text-right">Monthly Need</th>
                    <th className="py-2.5 pr-4 text-right">Invested</th>
                    <th className="py-2.5 pr-4 text-right">Withdrawn</th>
                  </tr>
                </thead>
                <tbody>
                  {wealthResult.snapshots.map((s) => {
                    const monthlyNeed =
                      s.phase === 'distribution'
                        ? distributionMonthlyNeed(s.year - Math.max(0, inputs.retirementAge - inputs.currentAge))
                        : undefined;
                    return (
                      <tr key={s.year} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="py-2 pr-4 font-mono text-zinc-500">Y{s.year}</td>
                        <td className="py-2 pr-4 font-mono font-medium text-zinc-950">{s.age}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={s.phase === 'accumulation' ? 'navy' : 'outline'}>
                            {s.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono font-medium text-zinc-950">
                          {formatCurrencyCompact(s.total)}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-zinc-500">
                          {formatCurrencyCompact(s.realTotal)}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-zinc-700">
                          {monthlyNeed ? formatCurrencyCompact(monthlyNeed) : '—'}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-zinc-700">
                          {formatCurrencyCompact(s.invested)}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-zinc-700">
                          {formatCurrencyCompact(s.withdrawn)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Assumptions Calibration Modal */}
      <PlanningAssumptionsModal
        isOpen={isAssumptionsModalOpen}
        onClose={() => setIsAssumptionsModalOpen(false)}
      />

      {/* Modern Workflow Footer */}
      <WorkflowFooter
        prev={{ path: '/', label: 'Dashboard' }}
        next={{ path: '/risk', label: 'Step 2: Risk Profile' }}
        flowHint="Master plan assets, balance sheet liabilities, and cashflows feed the simulation and allocation engine."
      />
    </div>
  );
};
