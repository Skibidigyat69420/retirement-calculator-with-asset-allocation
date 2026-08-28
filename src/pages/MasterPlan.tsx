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
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
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
import type { AssetCategory, GoalPriority } from '../types';

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'equity', label: 'Equity' },
  { value: 'debt', label: 'Debt' },
  { value: 'gold', label: 'Gold' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'other', label: 'Other' },
];

const strategyOptions = [
  { value: 'true', label: 'Liquidate to SWP Corpus' },
  { value: 'false', label: 'Retain & Let Grow' },
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
    return [
      { name: 'Equity', value: terminalSnapshot.values.equity, color: ASSET_COLORS.equity },
      { name: 'Debt', value: terminalSnapshot.values.debt, color: ASSET_COLORS.debt },
      { name: 'Gold', value: terminalSnapshot.values.gold, color: ASSET_COLORS.gold },
      { name: 'Real Estate', value: terminalSnapshot.values.realestate, color: ASSET_COLORS.realestate },
      { name: 'Liquid', value: terminalSnapshot.values.liquid, color: ASSET_COLORS.liquid },
      { name: 'Other', value: terminalSnapshot.values.other, color: ASSET_COLORS.other },
    ].filter((d) => d.value > 0);
  }, [terminalSnapshot]);

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

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <User size={18} className="text-gold" />
              <h3 className="text-lg font-serif text-navy">Life & Economy Profile</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <NumberInput label="Current Age" value={inputs.currentAge} onChange={(v) => updateInputs({ currentAge: v })} />
              <NumberInput label="Retirement Age" value={inputs.retirementAge} onChange={(v) => updateInputs({ retirementAge: v })} />
              <NumberInput label="Life Expectancy" value={inputs.lifeExpectancy} onChange={(v) => updateInputs({ lifeExpectancy: v })} />
              <NumberInput label="Annual Income" value={inputs.annualIncome} onChange={(v) => updateInputs({ annualIncome: v })} helper="Pre-tax household income" />
              <NumberInput label="Inflation Assumption" value={inputs.inflation} onChange={(v) => updateInputs({ inflation: v })} suffix="%" helper="Used for real returns and SWP" />
            </div>
          </Card>
          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Profile Snapshot</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Years to retirement</span>
                <span className="font-medium text-navy">{Math.max(0, inputs.retirementAge - inputs.currentAge)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Distribution years</span>
                <span className="font-medium text-navy">{Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Current net worth</span>
                <span className="font-medium text-navy">{formatCurrency(netWorth)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Annual savings</span>
                <span className="font-medium text-navy">{formatCurrency(wealthResult.annualSavings)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Savings rate</span>
                <span className="font-medium text-navy">{formatPercent(wealthResult.savingsRate)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <Building2 size={18} className="text-gold" /> Existing Assets
            </h3>
            <Button variant="outline" size="sm" onClick={() => addAsset()}>
              <Plus size={14} className="mr-1" /> Add Asset
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inputs.assets.map((asset) => (
              <Card key={asset.id} variant="subtle">
                <div className="flex justify-between items-start mb-3">
                  <input
                    type="text"
                    value={asset.name}
                    onChange={(e) => updateAsset(asset.id, { name: e.currentTarget.value })}
                    className="bg-transparent text-sm font-semibold text-navy focus:outline-none w-2/3"
                  />
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="Value" value={asset.value} onChange={(v) => updateAsset(asset.id, { value: v })} />
                  <NumberInput label="Return" value={asset.returnRate} onChange={(v) => updateAsset(asset.id, { returnRate: v })} suffix="%" />
                  <Select
                    label="Category"
                    value={asset.category}
                    onChange={(v) => updateAsset(asset.id, { category: v as AssetCategory })}
                    options={categoryOptions}
                  />
                  <Select
                    label="At Retirement"
                    value={asset.liquidateAtRetirement ? 'true' : 'false'}
                    onChange={(v) => updateAsset(asset.id, { liquidateAtRetirement: v === 'true' })}
                    options={strategyOptions}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cashflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <PieChart size={18} className="text-gold" />
              <h3 className="text-lg font-serif text-navy">SIP Injection</h3>
            </div>
            <div className="space-y-4">
              <NumberInput label="Monthly SIP" value={inputs.sip.amount} onChange={(v) => updateSIP({ amount: v })} />
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
              <Landmark size={18} className="text-gold" />
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
                <NumberInput label="STP Lumpsum" value={inputs.stp.lumpsum} onChange={(v) => updateSTP({ lumpsum: v })} />
                <NumberInput label="Monthly Transfer" value={inputs.stp.monthlyTransfer} onChange={(v) => updateSTP({ monthlyTransfer: v })} />
                <NumberInput label="Liquid Return" value={inputs.stp.liquidReturn} onChange={(v) => updateSTP({ liquidReturn: v })} suffix="%" />
                <NumberInput label="Liquid Cap" value={inputs.stp.liquidCap} onChange={(v) => updateSTP({ liquidCap: v })} />
                <Slider label="Equity Split" value={inputs.stp.equitySplit} onChange={(v) => updateSTP({ equitySplit: v, debtSplit: 100 - v })} />
                <Slider label="Debt Split" value={inputs.stp.debtSplit} onChange={(v) => updateSTP({ debtSplit: v, equitySplit: 100 - v })} />
              </div>
            )}
          </Card>

          <Card className="border-l-4 border-l-gold">
            <div className="flex items-center space-x-2 mb-4">
              <Wallet size={18} className="text-gold" />
              <h3 className="text-lg font-serif text-navy">Distribution (SWP)</h3>
            </div>
            <div className="space-y-4">
              <NumberInput label="Target Monthly Income (Today's ₹)" value={inputs.swp.monthlyNeedToday} onChange={(v) => updateSWP({ monthlyNeedToday: v })} />
              <NumberInput label="Post-Retirement Return" value={inputs.swp.postRetirementReturn} onChange={(v) => updateSWP({ postRetirementReturn: v })} suffix="%" />
              <NumberInput label="SWP Tax Rate" value={inputs.swp.taxRate} onChange={(v) => updateSWP({ taxRate: v })} suffix="%" />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <Target size={18} className="text-gold" /> Goals & Liabilities
            </h3>
            <Button variant="outline" size="sm" onClick={() => addGoal()}>
              <Plus size={14} className="mr-1" /> Add Goal
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inputs.goals.map((goal) => (
              <Card key={goal.id} variant="subtle">
                <div className="flex justify-between items-start mb-3">
                  <input
                    type="text"
                    value={goal.name}
                    onChange={(e) => updateGoal(goal.id, { name: e.currentTarget.value })}
                    className="bg-transparent text-sm font-semibold text-navy focus:outline-none w-2/3"
                  />
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="Target Amount" value={goal.targetAmount} onChange={(v) => updateGoal(goal.id, { targetAmount: v })} />
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
                  <BarChart2 size={18} className="text-gold" /> Monte Carlo Simulation
                </h3>
                <p className="text-sm text-stone-500 mt-1">
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
                <WalletMinimal size={18} className="text-gold" /> Rebalancing & Implementation
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                      <th className="py-2 pr-4">Asset</th>
                      <th className="py-2 pr-4 text-right">Current</th>
                      <th className="py-2 pr-4 text-right">Target</th>
                      <th className="py-2 pr-4 text-right">Trade</th>
                      <th className="py-2 pr-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wealthResult.rebalancingTrades.map((r) => (
                      <tr key={r.category} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-2 pr-4 flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                          {ASSET_LABELS[r.category]}
                        </td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(r.current)}</td>
                        <td className="py-2 pr-4 text-right">{formatCurrency(r.target)}</td>
                        <td className="py-2 pr-4 text-right font-medium">{formatCurrency(r.trade)}</td>
                        <td className="py-2 pr-4 text-center">
                          {Math.abs(r.trade) < netWorth * 0.02 ? (
                            <span className="inline-flex items-center text-stone-500 text-xs"><CheckCircle2 size={12} className="mr-1" /> Hold</span>
                          ) : r.trade > 0 ? (
                            <span className="text-green-600 text-xs font-semibold">Buy</span>
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
                <Globe size={18} className="text-gold" /> Currency Exposure
              </h3>
              <div className="space-y-3">
                {wealthResult.currencyExposure.map((c) => (
                  <div key={c.currency} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-navy">{c.currency}</span>
                      <Badge variant={c.currency === 'INR' ? 'outline' : 'gold'}>{formatPercent(c.percentage)}</Badge>
                    </div>
                    <div className="text-xs text-stone-500 mt-1">{formatCurrency(c.amount)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Year-by-Year Projection</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
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
                      <tr key={s.year} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-2 pr-4">Y{s.year}</td>
                        <td className="py-2 pr-4">{s.age}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={s.phase === 'accumulation' ? 'navy' : 'gold'}>{s.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-right font-medium">{formatCurrencyCompact(s.total)}</td>
                        <td className="py-2 pr-4 text-right text-stone-500">{formatCurrencyCompact(s.realTotal)}</td>
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
    </div>
  );
};
