import { Plus, Trash2, Building2, Landmark, PieChart, Wallet, BarChart2, RefreshCw, User, Target, TrendingUp } from 'lucide-react';
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
import { ASSET_COLORS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { runRetirementMonteCarlo, type RetirementSimParams } from '../lib/monteCarlo';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { useMarketData } from '../hooks/useMarketData';
import type { AssetCategory, MonteCarloRun, GoalPriority } from '../types';

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
    result,
  } = useCalculator();

  const { data: marketData } = useMarketData();
  const [activeTab, setActiveTab] = useState('profile');
  const [mcResult, setMcResult] = useState<MonteCarloRun | null>(null);
  const [mcLoading, setMcLoading] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'assets', label: 'Assets', icon: <Building2 size={16} /> },
    { id: 'cashflows', label: 'Cashflows', icon: <TrendingUp size={16} /> },
    { id: 'goals', label: 'Goals', icon: <Target size={16} /> },
    { id: 'results', label: 'Results', icon: <BarChart2 size={16} /> },
  ];

  const runMonteCarlo = () => {
    setMcLoading(true);
    setTimeout(() => {
      const sumByCategory: Record<AssetCategory, number> = {
        equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0,
      };
      inputs.assets.forEach((a) => {
        sumByCategory[a.category] += a.value;
      });
      const total = Object.values(sumByCategory).reduce((a, b) => a + b, 0);
      const weights: Record<AssetCategory, number> = {
        equity: total > 0 ? sumByCategory.equity / total : inputs.sip.equitySplit / 100,
        debt: total > 0 ? sumByCategory.debt / total : inputs.sip.debtSplit / 100,
        gold: total > 0 ? sumByCategory.gold / total : 0.05,
        realestate: total > 0 ? sumByCategory.realestate / total : 0,
        liquid: total > 0 ? sumByCategory.liquid / total : 0.05,
        other: total > 0 ? sumByCategory.other / total : 0,
      };

      const means: Record<AssetCategory, number> = marketData
        ? {
            equity: marketData.stats.find((s) => marketData.instruments.find((i) => i.symbol === s.symbol)?.category === 'index')?.annualizedReturn || inputs.sip.equityReturn / 100,
            debt: marketData.stats.find((s) => marketData.instruments.find((i) => i.symbol === s.symbol)?.category === 'debt')?.annualizedReturn || inputs.sip.debtReturn / 100,
            gold: marketData.stats.find((s) => marketData.instruments.find((i) => i.symbol === s.symbol)?.category === 'gold')?.annualizedReturn || 0.08,
            realestate: 0.03,
            liquid: inputs.stp.liquidReturn / 100,
            other: 0.06,
          }
        : {
            equity: inputs.sip.equityReturn / 100,
            debt: inputs.sip.debtReturn / 100,
            gold: 0.08,
            realestate: 0.03,
            liquid: inputs.stp.liquidReturn / 100,
            other: 0.06,
          };

      const cov: Record<AssetCategory, Record<AssetCategory, number>> = {
        equity: { equity: 0.0225, debt: 0.001, gold: 0.002, realestate: 0.005, liquid: 0.0001, other: 0.003 },
        debt: { equity: 0.001, debt: 0.0025, gold: 0.0005, realestate: 0.001, liquid: 0.0001, other: 0.0005 },
        gold: { equity: 0.002, debt: 0.0005, gold: 0.04, realestate: 0.001, liquid: 0.0001, other: 0.001 },
        realestate: { equity: 0.005, debt: 0.001, gold: 0.001, realestate: 0.01, liquid: 0.0001, other: 0.002 },
        liquid: { equity: 0.0001, debt: 0.0001, gold: 0.0001, realestate: 0.0001, liquid: 0.0001, other: 0.0001 },
        other: { equity: 0.003, debt: 0.0005, gold: 0.001, realestate: 0.002, liquid: 0.0001, other: 0.02 },
      };

      if (marketData) {
        marketData.symbols.forEach((_, i) => {
          const inst = marketData.instruments[i];
          const cat: AssetCategory = inst?.category === 'index' ? 'equity' : inst?.category === 'debt' ? 'debt' : inst?.category === 'gold' ? 'gold' : 'other';
          cov[cat][cat] = marketData.covariance[i][i];
          marketData.symbols.forEach((__, j) => {
            const inst2 = marketData.instruments[j];
            const cat2: AssetCategory = inst2?.category === 'index' ? 'equity' : inst2?.category === 'debt' ? 'debt' : inst2?.category === 'gold' ? 'gold' : 'other';
            cov[cat][cat2] = marketData.covariance[i][j];
          });
        });
      }

      const params: RetirementSimParams = {
        currentAge: inputs.currentAge,
        retirementAge: inputs.retirementAge,
        lifeExpectancy: inputs.lifeExpectancy,
        initialValues: sumByCategory,
        weights,
        monthlySIP: inputs.sip.amount,
        sipStepUp: inputs.sip.stepUp,
        monthlyNeedAtRetirement: result.monthlyNeedAtRetirement,
        inflation: inputs.inflation,
        taxRate: inputs.swp.taxRate,
        simulations: 1000,
        means,
        covariance: cov,
      };

      setMcResult(runRetirementMonteCarlo(params));
      setMcLoading(false);
    }, 100);
  };

  const accData = result.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Y${s.year}`,
      nominal: s.nominal,
      real: s.real,
    }));

  const assetEvolutionData = result.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Y${s.year}`,
      equity: s.equity,
      debt: s.debt,
      gold: s.gold,
      realestate: s.realEstate,
      liquid: s.liquid,
      other: s.other,
    }));

  const swpData = result.snapshots
    .filter((s) => s.phase === 'distribution')
    .map((s) => ({
      label: `Age ${s.age}`,
      corpus: s.corpusLeft || 0,
    }));

  const terminalAllocation = result.snapshots[result.snapshots.length - 1];
  const allocationData = [
    { name: 'Equity', value: terminalAllocation.equity, color: ASSET_COLORS.equity },
    { name: 'Debt', value: terminalAllocation.debt, color: ASSET_COLORS.debt },
    { name: 'Gold', value: terminalAllocation.gold, color: ASSET_COLORS.gold },
    { name: 'Real Estate', value: terminalAllocation.realEstate, color: ASSET_COLORS.realestate },
    { name: 'Liquid', value: terminalAllocation.liquid, color: ASSET_COLORS.liquid },
    { name: 'Other', value: terminalAllocation.other, color: ASSET_COLORS.other },
  ].filter((d) => d.value > 0);

  const netWorth = useMemo(() => inputs.assets.reduce((sum, a) => sum + a.value, 0), [inputs.assets]);

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
                <span className="font-medium text-navy">{formatCurrency(inputs.sip.amount * 12 + (inputs.stp.active ? inputs.stp.monthlyTransfer * 12 : 0))}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Liquid SWP Corpus (Nominal)" value={formatCurrency(result.terminalCorpusNominal)} subtext={`At Age ${inputs.retirementAge}`} variant="navy" />
            <MetricCard label="Liquid SWP Corpus (Real)" value={formatCurrency(result.terminalCorpusReal)} subtext="Inflation-adjusted" variant="gold" />
            <MetricCard label="CAGR Nominal" value={formatPercent(result.cagrNominal)} subtext="Annual portfolio growth" />
            <MetricCard label="Monthly Need at Retirement" value={formatCurrency(result.monthlyNeedAtRetirement)} subtext={`From ${formatCurrency(inputs.swp.monthlyNeedToday)} today`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Depletion Age" value={result.sustainable ? 'Sustainable' : `${result.depletionAge}`} subtext={result.sustainable ? 'Outlasts life expectancy' : 'Corpus runs out early'} variant={result.sustainable ? 'success' : 'danger'} />
            <MetricCard label="CAGR Real" value={formatPercent(result.cagrReal)} subtext="After inflation" />
            <MetricCard label="Total Invested" value={formatCurrency(result.totalInvested)} subtext="Over accumulation phase" />
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
                <p className="text-sm text-stone-500 mt-1">1,000 correlated market paths using current assumptions.</p>
              </div>
              <Button onClick={runMonteCarlo} disabled={mcLoading} variant="outline">
                {mcLoading ? (
                  <span className="flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Running...</span>
                ) : (
                  <span className="flex items-center gap-2"><BarChart2 size={14} /> Run Simulation</span>
                )}
              </Button>
            </div>

            {mcResult ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <MetricCard label="Success Rate" value={formatPercent(mcResult.successRate * 100)} subtext="Sustainable through life expectancy" variant={mcResult.successRate >= 0.8 ? 'success' : mcResult.successRate >= 0.5 ? 'default' : 'danger'} />
                  <MetricCard label="Median Terminal" value={formatCurrencyCompact(mcResult.medianTerminalCorpus)} subtext="50th percentile" />
                  <MetricCard label="P5 Terminal" value={formatCurrencyCompact(mcResult.percentile5)} subtext="Stress case" variant="danger" />
                  <MetricCard label="P95 Terminal" value={formatCurrencyCompact(mcResult.percentile95)} subtext="Bull case" variant="success" />
                </div>
                <MonteCarloFanChart data={mcResult.yearlyPercentiles} />
              </>
            ) : (
              <div className="text-center py-12 text-stone-400 bg-stone-50 rounded-xl border border-stone-100">
                <BarChart2 size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Run the simulation to see percentile bands.</p>
              </div>
            )}
          </Card>

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
                    <th className="py-2 pr-4 text-right">Corpus Left</th>
                  </tr>
                </thead>
                <tbody>
                  {result.snapshots.map((s) => (
                    <tr key={s.year} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-2 pr-4">Y{s.year}</td>
                      <td className="py-2 pr-4">{s.age}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={s.phase === 'accumulation' ? 'navy' : 'gold'}>{s.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">{formatCurrencyCompact(s.nominal)}</td>
                      <td className="py-2 pr-4 text-right text-stone-500">{formatCurrencyCompact(s.real)}</td>
                      <td className="py-2 pr-4 text-right">{s.monthlyNeed ? formatCurrencyCompact(s.monthlyNeed) : '-'}</td>
                      <td className="py-2 pr-4 text-right">{s.corpusLeft !== undefined ? formatCurrencyCompact(s.corpusLeft) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
