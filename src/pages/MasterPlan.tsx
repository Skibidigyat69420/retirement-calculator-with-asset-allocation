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
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { AssetEvolutionChart } from '../components/charts/AssetEvolutionChart';
import { SWPDrawdownChart } from '../components/charts/SWPDrawdownChart';
import { DonutChart } from '../components/charts/DonutChart';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { Input } from '../components/ui/Input';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import type { AssetCategory, GoalPriority } from '../types';

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
    addGoal,
    updateGoal,
    removeGoal,
    wealthResult,
    riskProfile,
    scenarios,
    loadScenario,
    showToast,
  } = useCalculator();

  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'assets', label: 'Assets', icon: <Building2 size={16} /> },
    { id: 'cashflows', label: 'Cashflows', icon: <TrendingUp size={16} /> },
    { id: 'goals', label: 'Goals', icon: <Target size={16} /> },
    { id: 'results', label: 'Results', icon: <BarChart2 size={16} /> },
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
        subtitle="Your complete financial life model — profile, assets, cashflows, goals, and probabilistic outcomes in one engine."
        badge="Core Engine"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 shrink-0">Load Scenario:</span>
          <Select
            value=""
            onChange={(scenarioId) => {
              if (!scenarioId) return;
              const scenario = scenarios.find((s) => s.id === scenarioId);
              if (scenario) loadScenario(scenario);
            }}
            options={[
              { value: '', label: 'Select a scenario...' },
              ...scenarios.map((s) => ({ value: s.id, label: s.name }))
            ]}
            className="w-full sm:w-48 min-w-0"
            aria-label="Load scenario"
          />
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <User size={18} className="text-amber-500" />
                <h3 className="text-lg font-serif text-navy">Client & Advisory Mandate</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                  placeholder="e.g. Sound Thesis Wealth Advisory"
                />
                <Input
                  label="Mandate Review Date"
                  type="date"
                  value={inputs.client?.reviewDate || ''}
                  onChange={(e) => updateClient({ reviewDate: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Advisory Focus / Mandate"
                    value={inputs.client?.notes || ''}
                    onChange={(e) => updateClient({ notes: e.target.value })}
                    placeholder="Primary planning objective"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 mt-6">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">Life Horizon & Economy</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberInput label="Current Age" value={inputs.currentAge} onChange={(v) => updateInputs({ currentAge: v })} />
                  <NumberInput label="Retirement Age" value={inputs.retirementAge} onChange={(v) => updateInputs({ retirementAge: v })} />
                  <NumberInput label="Life Expectancy" value={inputs.lifeExpectancy} onChange={(v) => updateInputs({ lifeExpectancy: v })} />
                  <CurrencyInput label="Annual Income" value={inputs.annualIncome} onChange={(v) => updateInputs({ annualIncome: v })} helper="Pre-tax household income" />
                  <NumberInput label="Inflation Assumption" value={inputs.inflation} onChange={(v) => updateInputs({ inflation: v })} suffix="%" helper="Used for real returns and SWP" />
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">Profile Snapshot</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Client</span>
                  <span className="font-medium text-navy truncate max-w-[150px]">{inputs.client?.name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Years to retirement</span>
                  <span className="font-medium text-navy">{Math.max(0, inputs.retirementAge - inputs.currentAge)} yrs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Distribution years</span>
                  <span className="font-medium text-navy">{Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)} yrs</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Current net worth</span>
                  <span className="font-medium text-navy">{formatCurrency(netWorth)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Net annual savings</span>
                  <span className="font-medium text-navy">{formatCurrency(wealthResult.annualSavings)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Net savings rate</span>
                  <span className="font-medium text-navy">{formatPercent(wealthResult.savingsRate)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-serif text-navy flex items-center gap-2">
                <Building2 size={18} className="text-amber-500" /> Existing Assets
              </h3>
              <p className="text-xs text-slate-700 mt-0.5">
                Total portfolio value: <strong className="text-navy">{formatCurrency(netWorth)}</strong> across {inputs.assets.length} assets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  addAsset({ name: 'Diversified Equity MF', category: 'equity', value: 1000000, returnRate: 12, currency: 'INR', liquidateAtRetirement: true });
                  showToast('Added Equity Mutual Fund asset', 'success');
                }}
              >
                + Equity MF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  addAsset({ name: 'Fixed Deposit / Debt', category: 'debt', value: 500000, returnRate: 7, currency: 'INR', liquidateAtRetirement: true });
                  showToast('Added Debt asset', 'success');
                }}
              >
                + Debt/FD
              </Button>
              <Button size="sm" onClick={() => addAsset()}>
                <Plus size={14} className="mr-1" /> Add Custom
              </Button>
            </div>
          </div>
          {inputs.assets.length === 0 && (
            <p className="text-sm text-slate-700">No assets yet. Click <strong>Add Asset</strong> to record your holdings.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inputs.assets.map((asset) => (
              <Card key={asset.id} variant="subtle">
                <div className="flex justify-between items-start mb-3">
                  <input
                    type="text"
                    value={asset.name}
                    onChange={(e) => updateAsset(asset.id, { name: e.currentTarget.value })}
                    aria-label={`Asset name: ${asset.name}`}
                    className="bg-transparent text-sm font-semibold text-navy focus:outline-none w-2/3"
                  />
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="p-1 text-slate-600 hover:text-red-500 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                    aria-label={`Remove asset ${asset.name}`}
                    title={`Remove asset ${asset.name}`}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CurrencyInput label="Value" value={asset.value} onChange={(v) => updateAsset(asset.id, { value: v })} />
                  <NumberInput label="Return" value={asset.returnRate} onChange={(v) => updateAsset(asset.id, { returnRate: v })} suffix="%" />
                  <Select
                    label="Category"
                    value={asset.category}
                    onChange={(v) => updateAsset(asset.id, { category: v as AssetCategory })}
                    options={categoryOptions}
                  />
                  <Select
                    label="Currency"
                    value={asset.currency || 'INR'}
                    onChange={(v) => updateAsset(asset.id, { currency: v })}
                    options={currencyOptions}
                  />
                  <Select
                    label="At Retirement"
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

      {activeTab === 'cashflows' && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Banknote size={18} className="text-amber-500" />
                <h3 className="text-lg font-serif text-navy">Household Cashflow</h3>
              </div>
              <Badge variant="outline">{formatPercent(wealthResult.savingsRate)} savings rate</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <CurrencyInput label="Annual Income" value={inputs.annualIncome} onChange={(v) => updateInputs({ annualIncome: v })} helper="Pre-tax household income" />
              <CurrencyInput label="Monthly Expenditure" value={inputs.monthlyExpenditure} onChange={(v) => updateInputs({ monthlyExpenditure: v })} helper="Current lifestyle spend" />
              <CurrencyInput label="Monthly SIP" value={inputs.sip.amount} onChange={(v) => updateSIP({ amount: v })} helper="Systematic investment" />
              <CurrencyInput label={inputs.stp.active ? 'Monthly STP' : 'STP Monthly Transfer'} value={inputs.stp.monthlyTransfer} onChange={(v) => updateSTP({ monthlyTransfer: v })} helper={inputs.stp.active ? 'From liquid corpus' : 'Enable STP to use'} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Annual Income" value={formatCurrency(wealthResult.annualIncome)} />
              <MetricCard label="Annual Expenses" value={formatCurrency(wealthResult.annualExpenses)} />
              <MetricCard label="Net Savings" value={formatCurrency(wealthResult.annualSavings)} subtext={`${formatPercent(wealthResult.savingsRate)} of income`} variant="navy" />
              <MetricCard label="Invested / Deployed" value={formatCurrency(wealthResult.annualInvested)} subtext={`${formatPercent(wealthResult.investmentRate)} of income`} variant="gold" />
            </div>

            {wealthResult.annualSavings > 0 && (
              <div className="mt-6 p-4 bg-paper rounded-xl border border-warm/30">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-textMuted">Net savings deployment</span>
                  <span className="font-medium text-ink">
                    {formatPercent((wealthResult.annualInvested / Math.max(wealthResult.annualSavings, 1)) * 100)} deployed
                  </span>
                </div>
                <div className="h-2 bg-warm/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy rounded-full"
                    style={{ width: `${Math.min(100, (wealthResult.annualInvested / Math.max(wealthResult.annualSavings, 1)) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-textMuted">
                  Unallocated cashflow: <span className="font-medium text-ink">{formatCurrency(Math.max(0, wealthResult.annualSavings - wealthResult.annualInvested))}</span> / year
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <PieChart size={18} className="text-amber-500" />
                <h3 className="text-lg font-serif text-navy">SIP Injection</h3>
              </div>
              <div className="space-y-4">
                <CurrencyInput label="Monthly SIP" value={inputs.sip.amount} onChange={(v) => updateSIP({ amount: v })} />
                <Slider label="Equity Split" value={inputs.sip.equitySplit} onChange={(v) => updateSIP({ equitySplit: v, debtSplit: 100 - v })} />
                <Slider label="Debt Split" value={inputs.sip.debtSplit} onChange={(v) => updateSIP({ debtSplit: v, equitySplit: 100 - v })} />
                <NumberInput label="Annual Step-up" value={inputs.sip.stepUp} onChange={(v) => updateSIP({ stepUp: v })} suffix="%" />
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput label="Equity Return" value={inputs.sip.equityReturn} onChange={(v) => updateSIP({ equityReturn: v })} suffix="%" />
                  <NumberInput label="Debt Return" value={inputs.sip.debtReturn} onChange={(v) => updateSIP({ debtReturn: v })} suffix="%" />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-navy">
              <div className="flex items-center space-x-2 mb-4">
                <Landmark size={18} className="text-amber-500" />
                <h3 className="text-lg font-serif text-navy">STP Deployment</h3>
              </div>
              <label className="flex items-center space-x-2 text-sm text-navy mb-4">
                <input
                  type="checkbox"
                  checked={inputs.stp.active}
                  onChange={(e) => updateSTP({ active: e.currentTarget.checked })}
                  className="accent-navy w-4 h-4"
                />
                <span>Activate Systematic Transfer Plan</span>
              </label>
              {inputs.stp.active && (
                <div className="space-y-4">
                  <CurrencyInput label="STP Lumpsum" value={inputs.stp.lumpsum} onChange={(v) => updateSTP({ lumpsum: v })} />
                  <CurrencyInput label="Monthly Transfer" value={inputs.stp.monthlyTransfer} onChange={(v) => updateSTP({ monthlyTransfer: v })} />
                  <NumberInput label="Liquid Return" value={inputs.stp.liquidReturn} onChange={(v) => updateSTP({ liquidReturn: v })} suffix="%" />
                  <CurrencyInput label="Liquid Cap" value={inputs.stp.liquidCap} onChange={(v) => updateSTP({ liquidCap: v })} />
                  <Slider label="Equity Split" value={inputs.stp.equitySplit} onChange={(v) => updateSTP({ equitySplit: v, debtSplit: 100 - v })} />
                  <Slider label="Debt Split" value={inputs.stp.debtSplit} onChange={(v) => updateSTP({ debtSplit: v, equitySplit: 100 - v })} />
                </div>
              )}
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <div className="flex items-center space-x-2 mb-4">
                <Wallet size={18} className="text-amber-500" />
                <h3 className="text-lg font-serif text-navy">Post-Retirement Income (SWP)</h3>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Target monthly income (today's ₹)</span><span className="font-medium text-navy">{formatCurrency(inputs.swp.monthlyNeedToday)}</span></div>
                <div className="flex justify-between"><span>Post-retirement return</span><span className="font-medium text-navy">{formatPercent(inputs.swp.postRetirementReturn)}</span></div>
                <div className="flex justify-between"><span>SWP tax rate</span><span className="font-medium text-navy">{formatPercent(inputs.swp.taxRate)}</span></div>
              </div>
              <p className="text-xs text-slate-700 mt-4 bg-slate-50 border border-slate-100 rounded-lg p-3">
                Decumulation is planned in the next step.{' '}
                <Link to="/retirement" className="font-semibold text-amber-600 hover:underline">
                  Plan your SWP in Retirement &amp; SWP →
                </Link>
              </p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <Target size={18} className="text-amber-500" /> Goals & Liabilities
            </h3>
            <Button variant="outline" size="sm" onClick={() => addGoal()}>
              <Plus size={14} className="mr-1" /> Add Goal
            </Button>
          </div>
          <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <strong>Note:</strong> During simulation, the wealth engine automatically funds goals in order of priority: <strong>Essential</strong> first, then <strong>Important</strong>, then <strong>Aspirational</strong>.
          </div>
          {inputs.goals.length === 0 && (
            <p className="text-sm text-slate-700">No goals yet. Click <strong>Add Goal</strong> to create one.</p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...inputs.goals].sort((a, b) => {
              const p = { essential: 1, important: 2, aspirational: 3 };
              return p[a.priority] - p[b.priority] || a.yearsToGoal - b.yearsToGoal;
            }).map((goal) => (
              <Card key={goal.id} variant="subtle">
                <div className="flex justify-between items-start mb-3">
                  <input
                    type="text"
                    value={goal.name}
                    onChange={(e) => updateGoal(goal.id, { name: e.currentTarget.value })}
                    aria-label={`Goal name: ${goal.name}`}
                    className="bg-transparent text-sm font-semibold text-navy focus:outline-none w-2/3"
                  />
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="p-1 text-slate-600 hover:text-red-500 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                    aria-label={`Remove goal ${goal.name}`}
                    title={`Remove goal ${goal.name}`}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CurrencyInput label="Target Amount" value={goal.targetAmount} onChange={(v) => updateGoal(goal.id, { targetAmount: v })} />
                  <NumberInput label="Years to Goal" value={goal.yearsToGoal} onChange={(v) => updateGoal(goal.id, { yearsToGoal: v })} />
                  <NumberInput label="Inflation" value={goal.inflation} onChange={(v) => updateGoal(goal.id, { inflation: v })} suffix="%" />
                  <Select
                    label="Priority"
                    value={goal.priority}
                    onChange={(v) => updateGoal(goal.id, { priority: v as GoalPriority })}
                    options={priorityOptions}
                  />
                </div>
                <label className="flex items-center space-x-2 text-sm text-navy mt-4">
                  <input
                    type="checkbox"
                    checked={goal.recurring}
                    onChange={(e) => updateGoal(goal.id, { recurring: e.currentTarget.checked })}
                    className="accent-navy w-4 h-4"
                  />
                  <span>Recurring goal (refresh after each cycle)</span>
                </label>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="space-y-6">
          {!wealthResult.sustainable && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Plan is not sustainable.</strong> Corpus is projected to deplete at age {wealthResult.depletionAge}. Increase savings, delay retirement, or reduce withdrawal needs.
              </div>
            </div>
          )}

          {wealthResult.goalsAtRisk.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong>Goals at risk:</strong>{' '}
                {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}. Review required SIPs in the Goal Planner.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Terminal Corpus (Nominal)" value={formatCurrency(wealthResult.terminalValue)} subtext={`At Age ${inputs.lifeExpectancy}`} variant="navy" />
            <MetricCard label="Terminal Corpus (Real)" value={formatCurrency(wealthResult.terminalRealValue)} subtext="Inflation-adjusted" variant="gold" />
            <MetricCard label="CAGR Nominal" value={formatPercent(wealthResult.cagrNominal)} subtext="Annual portfolio growth" />
            <MetricCard label="Monthly Need at Retirement" value={formatCurrency(monthlyNeedAtRetirement)} subtext={`From ${formatCurrency(inputs.swp.monthlyNeedToday)} today`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Plan Success Rate" value={formatPercent(wealthResult.monteCarlo.successRate * 100)} subtext="All goals + SWP sustainable" variant={wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'} />
            <MetricCard label="Essential Goal Success" value={formatPercent(wealthResult.essentialSuccessRate * 100)} subtext="Must-have goals" />
            <MetricCard label="CAGR Real" value={formatPercent(wealthResult.cagrReal)} subtext="After inflation" />
            <MetricCard label="Total Invested" value={formatCurrency(wealthResult.totalInvested)} subtext="Over accumulation phase" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-6">Accumulation Trajectory (Nominal vs Real)</h3>
              <NominalRealChart data={accData} xKey="label" />
            </Card>
            <Card>
              <h3 className="text-lg font-serif text-navy mb-6">Asset Class Evolution</h3>
              <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">SWP Drawdown</h3>
              <SWPDrawdownChart data={swpData} xKey="label" />
            </Card>
            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">Terminal Allocation</h3>
              <DonutChart data={allocationData} />
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-serif text-navy flex items-center gap-2">
                  <BarChart2 size={18} className="text-amber-500" /> Monte Carlo Simulation
                </h3>
                <p className="text-sm text-slate-700 mt-1">
                  {wealthResult.monteCarlo.outcomes.length.toLocaleString()} correlated market paths using current assumptions.
                </p>
              </div>
              <Badge variant="navy">Auto-run</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Success Rate" value={formatPercent(wealthResult.monteCarlo.successRate * 100)} subtext="Sustainable through life expectancy" variant={wealthResult.monteCarlo.successRate >= 0.8 ? 'success' : wealthResult.monteCarlo.successRate >= 0.5 ? 'default' : 'danger'} />
              <MetricCard label="Median Terminal" value={formatCurrencyCompact(wealthResult.monteCarlo.medianTerminal)} subtext="50th percentile" />
              <MetricCard label="P5 Terminal" value={formatCurrencyCompact(wealthResult.monteCarlo.percentile5)} subtext="Stress case" variant="danger" />
              <MetricCard label="P95 Terminal" value={formatCurrencyCompact(wealthResult.monteCarlo.percentile95)} subtext="Bull case" variant="success" />
            </div>
            <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
                <WalletMinimal size={18} className="text-amber-500" /> Rebalancing & Implementation
              </h3>
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-700">
                      <th className="py-2 pr-4">Asset</th>
                      <th className="py-2 pr-4 text-right">Current</th>
                      <th className="py-2 pr-4 text-right">Target</th>
                      <th className="py-2 pr-4 text-right">Trade</th>
                      <th className="py-2 pr-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wealthResult.rebalancingTrades.map((r) => (
                      <tr key={r.category} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 pr-4 flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                          {ASSET_LABELS[r.category]}
                        </td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(r.current)}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(r.target)}</td>
                        <td className="py-2 pr-4 text-right font-medium">{formatCurrency(r.trade)}</td>
                        <td className="py-2 pr-4 text-center">
                          {Math.abs(r.trade) < netWorth * 0.02 ? (
                            <span className="inline-flex items-center text-slate-700 text-xs"><CheckCircle2 size={12} className="mr-1" /> Hold</span>
                          ) : r.trade > 0 ? (
                            <span className="text-green-700 text-xs font-semibold">Buy</span>
                          ) : (
                            <span className="text-red-600 text-xs font-semibold">Sell</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
                <Globe size={18} className="text-amber-500" /> Currency Exposure
              </h3>
              <div className="space-y-3">
                {wealthResult.currencyExposure.map((c) => (
                  <div key={c.currency} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-navy">{c.currency}</span>
                      <Badge variant={c.currency === 'INR' ? 'outline' : 'gold'}>{formatPercent(c.percentage)}</Badge>
                    </div>
                    <div className="text-xs text-slate-700 mt-1">{formatCurrency(c.amount)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Year-by-Year Projection</h3>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-700">
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Age</th>
                    <th className="py-2 pr-4">Phase</th>
                    <th className="py-2 pr-4 text-right">Nominal</th>
                    <th className="py-2 pr-4 text-right">Real</th>
                    <th className="py-2 pr-4 text-right">Monthly Need</th>
                    <th className="py-2 pr-4 text-right">Invested</th>
                    <th className="py-2 pr-4 text-right">Withdrawn</th>
                  </tr>
                </thead>
                <tbody>
                  {wealthResult.snapshots.map((s) => {
                    const monthlyNeed = s.phase === 'distribution' ? distributionMonthlyNeed(s.year - Math.max(0, inputs.retirementAge - inputs.currentAge)) : undefined;
                    return (
                      <tr key={s.year} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 pr-4">Y{s.year}</td>
                        <td className="py-2 pr-4">{s.age}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={s.phase === 'accumulation' ? 'navy' : 'gold'}>{s.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-right font-medium">{formatCurrencyCompact(s.total)}</td>
                        <td className="py-2 pr-4 text-right text-slate-700">{formatCurrencyCompact(s.realTotal)}</td>
                        <td className="py-2 pr-4 text-right">{monthlyNeed ? formatCurrencyCompact(monthlyNeed) : '-'}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrencyCompact(s.invested)}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrencyCompact(s.withdrawn)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <WorkflowFooter
        prev={{ path: '/risk', label: 'Risk Profile' }}
        next={{ path: '/goal', label: 'Goals' }}
        flowHint="Master plan assets, cashflows, and life profile parameters power the Monte Carlo simulation engine."
      />
    </div>
  );
};
