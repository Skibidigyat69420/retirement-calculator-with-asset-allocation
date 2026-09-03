import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Globe,
  Sliders,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { NumberInput } from '../ui/NumberInput';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  projectPortfolioGrowth,
  type ProjectableAssetClass,
  type PortfolioProjectionConfig,
  SUPPORTED_CURRENCIES,
} from '../../lib/portfolioProjection';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';

const PRESET_TEMPLATES: { name: string; classes: ProjectableAssetClass[] }[] = [
  {
    name: 'Global All-Weather (Default)',
    classes: [
      { id: '1', name: 'Indian Large & Mid Cap', weight: 40, returnRate: 12.0, currency: 'INR', fxRate: 0, color: '#3b82f6' },
      { id: '2', name: 'US Tech & Global Equities', weight: 20, returnRate: 10.5, currency: 'USD', fxRate: 3.5, color: '#8b5cf6' },
      { id: '3', name: 'Sovereign Gold Bonds', weight: 15, returnRate: 9.0, currency: 'INR', fxRate: 0, color: '#f59e0b' },
      { id: '4', name: 'Corporate Debt & G-Secs', weight: 20, returnRate: 7.5, currency: 'INR', fxRate: 0, color: '#10b981' },
      { id: '5', name: 'Liquid Cash Buffer', weight: 5, returnRate: 5.5, currency: 'INR', fxRate: 0, color: '#64748b' },
    ],
  },
  {
    name: 'Aggressive Multi-Asset Growth',
    classes: [
      { id: '1', name: 'Domestic High Growth Equities', weight: 45, returnRate: 14.0, currency: 'INR', fxRate: 0, color: '#3b82f6' },
      { id: '2', name: 'Global Tech & Innovation', weight: 30, returnRate: 12.0, currency: 'USD', fxRate: 3.5, color: '#8b5cf6' },
      { id: '3', name: 'Emerging Market / Europe', weight: 10, returnRate: 9.5, currency: 'EUR', fxRate: 2.5, color: '#06b6d4' },
      { id: '4', name: 'Precious Metals / Gold', weight: 15, returnRate: 9.0, currency: 'INR', fxRate: 0, color: '#f59e0b' },
    ],
  },
  {
    name: 'Conservative Capital Preservation',
    classes: [
      { id: '1', name: 'High-Grade Domestic Bonds', weight: 50, returnRate: 7.5, currency: 'INR', fxRate: 0, color: '#10b981' },
      { id: '2', name: 'US Sovereign Treasuries', weight: 20, returnRate: 4.8, currency: 'USD', fxRate: 3.5, color: '#8b5cf6' },
      { id: '3', name: 'Bluechip Dividend Equities', weight: 20, returnRate: 10.0, currency: 'INR', fxRate: 0, color: '#3b82f6' },
      { id: '4', name: 'Sovereign Gold', weight: 10, returnRate: 8.5, currency: 'INR', fxRate: 0, color: '#f59e0b' },
    ],
  },
];

const PALETTE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#64748b'];

export const PortfolioReturnProjectionCalculator = () => {
  const { inputs, wealthResult } = useCalculator();

  // Global levers
  const [initialCorpus, setInitialCorpus] = useState<number>(wealthResult?.netWorth || 2500000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(inputs.sip?.amount || 50000);
  const [annualStepUp, setAnnualStepUp] = useState<number>(inputs.sip?.stepUp || 5);
  const [years, setYears] = useState<number>(15);
  const [inflationRate, setInflationRate] = useState<number>(inputs.inflation || 6);
  const [rebalanceAnnually, setRebalanceAnnually] = useState<boolean>(true);

  // Asset classes list
  const [assetClasses, setAssetClasses] = useState<ProjectableAssetClass[]>(
    PRESET_TEMPLATES[0].classes,
  );

  // Chart view toggle
  const [chartView, setChartView] = useState<'nominal-real' | 'breakdown'>('nominal-real');
  const [showAllTable, setShowAllTable] = useState<boolean>(false);

  // Total weight check
  const totalWeight = useMemo(
    () => assetClasses.reduce((sum, a) => sum + (Number(a.weight) || 0), 0),
    [assetClasses],
  );

  const isWeight100 = Math.abs(totalWeight - 100) < 0.1;

  // Run calculation engine
  const projection = useMemo(() => {
    const config: PortfolioProjectionConfig = {
      initialCorpus: Math.max(0, initialCorpus),
      monthlyContribution: Math.max(0, monthlyContribution),
      annualStepUp: Math.max(0, annualStepUp),
      years: Math.max(1, Math.min(50, years)),
      inflationRate: Math.max(0, inflationRate),
      rebalanceAnnually,
      assetClasses,
    };
    return projectPortfolioGrowth(config);
  }, [
    initialCorpus,
    monthlyContribution,
    annualStepUp,
    years,
    inflationRate,
    rebalanceAnnually,
    assetClasses,
  ]);

  // Asset class update handlers
  const handleUpdateClass = (id: string, updates: Partial<ProjectableAssetClass>) => {
    setAssetClasses((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };

        // If currency changed and fxRate wasn't manually overridden, auto-populate default FX rate
        if (updates.currency && updates.currency !== item.currency) {
          const currConfig = SUPPORTED_CURRENCIES.find((c) => c.code === updates.currency);
          if (currConfig) {
            updated.fxRate = currConfig.defaultFxRate;
          }
        }
        return updated;
      }),
    );
  };

  const handleAddClass = () => {
    const newId = String(Date.now());
    const colorIndex = assetClasses.length % PALETTE.length;
    setAssetClasses((prev) => [
      ...prev,
      {
        id: newId,
        name: `Asset Class ${prev.length + 1}`,
        weight: 10,
        returnRate: 10.0,
        currency: 'INR',
        fxRate: 0.0,
        color: PALETTE[colorIndex],
      },
    ]);
  };

  const handleRemoveClass = (id: string) => {
    if (assetClasses.length <= 1) return;
    setAssetClasses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleNormalizeWeights = () => {
    if (totalWeight <= 0) return;
    setAssetClasses((prev) =>
      prev.map((a) => ({
        ...a,
        weight: Math.round(((a.weight || 0) / totalWeight) * 1000) / 10,
      })),
    );
  };

  const handleApplyPreset = (presetName: string) => {
    const found = PRESET_TEMPLATES.find((p) => p.name === presetName);
    if (found) {
      setAssetClasses(found.classes);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Headline & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={22} className="text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Multi-Asset Portfolio Return & Wealth Projection
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Model custom asset classes, individual return targets, and currency appreciation/depreciation effects
            with compound nominal vs real purchasing-power projections.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Preset:</span>
          <select
            onChange={(e) => handleApplyPreset(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PRESET_TEMPLATES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Topline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Blended Portfolio Return
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-950">
              {formatPercent(projection.blendedNominalReturn)}
            </span>
            <span className="text-xs font-semibold text-slate-500">Nominal p.a.</span>
          </div>
          <p className="text-xs font-mono font-medium text-emerald-700">
            Real: {formatPercent(projection.blendedRealReturn)} p.a. (net of inflation)
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Terminal Nominal Corpus (Yr {years})
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {formatCurrencyCompact(projection.terminalNominalWealth)}
            </span>
            <Badge variant="navy" className="text-[10px]">
              {projection.nominalMultiplier}x Invested
            </Badge>
          </div>
          <p className="text-xs text-slate-500">Total future rupee valuation</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Terminal Real Purchasing Power
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {formatCurrencyCompact(projection.terminalRealWealth)}
            </span>
            <Badge variant="success" className="text-[10px]">
              {projection.realMultiplier}x Real
            </Badge>
          </div>
          <p className="text-xs text-slate-500">Deflated at {inflationRate}% annual inflation</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Capital Contribution & Gain
          </span>
          <div className="text-sm font-semibold text-slate-800">
            Invested: <span className="font-mono">{formatCurrencyCompact(projection.totalInvested)}</span>
          </div>
          <p className="text-xs text-slate-600">
            Net Capital Gain:{' '}
            <span className="font-mono font-bold text-slate-900">
              +{formatCurrencyCompact(projection.terminalNominalWealth - projection.totalInvested)}
            </span>
          </p>
        </div>
      </div>

      {/* Main Grid: Left Controls + Right Asset Class Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Global Simulation Levers */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sliders size={16} className="text-indigo-600" />
              Global Projection Levers
            </h3>

            <NumberInput
              label="Initial Lumpsum Corpus (₹)"
              value={initialCorpus}
              onChange={setInitialCorpus}
              step={50000}
              min={0}
            />

            <NumberInput
              label="Monthly SIP Inflow (₹/month)"
              value={monthlyContribution}
              onChange={setMonthlyContribution}
              step={5000}
              min={0}
            />

            <NumberInput
              label="Annual SIP Step-Up (%)"
              value={annualStepUp}
              onChange={setAnnualStepUp}
              step={1}
              min={0}
              max={50}
            />

            <NumberInput
              label="Investment Horizon (Years)"
              value={years}
              onChange={setYears}
              step={1}
              min={1}
              max={50}
            />

            <NumberInput
              label="Domestic Inflation Rate (% p.a.)"
              value={inflationRate}
              onChange={setInflationRate}
              step={0.25}
              min={0}
              max={20}
            />

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Portfolio Rebalancing
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setRebalanceAnnually(true)}
                  className={`p-2 rounded-lg border font-medium transition-all ${
                    rebalanceAnnually
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Annual Rebalance
                </button>
                <button
                  onClick={() => setRebalanceAnnually(false)}
                  className={`p-2 rounded-lg border font-medium transition-all ${
                    !rebalanceAnnually
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Buy & Hold (Drift)
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {rebalanceAnnually
                  ? 'Assets are rebalanced annually back to strategic target weights.'
                  : 'Assets drift naturally based on relative compound performance.'}
              </p>
            </div>
          </Card>
        </div>

        {/* Right: Asset Classes Configuration Table */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Asset Classes & Currency Modeling
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                    isWeight100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Total Weight: {totalWeight.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isWeight100 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNormalizeWeights}
                    className="text-xs h-7 px-2.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    Auto-Normalize to 100%
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddClass}
                  className="text-xs h-7 px-2.5 gap-1 bg-slate-900 text-white hover:bg-slate-800 border-none"
                >
                  <Plus size={13} />
                  Add Class
                </Button>
              </div>
            </div>

            {/* Asset Class Rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Asset Class Name</th>
                    <th className="pb-2 w-20 text-right">Weight %</th>
                    <th className="pb-2 w-24 text-right">Local Return</th>
                    <th className="pb-2 w-28">Currency</th>
                    <th className="pb-2 w-24 text-right">FX Drift %</th>
                    <th className="pb-2 text-right">Effective INR</th>
                    <th className="pb-2 text-right">Real Return</th>
                    <th className="pb-2 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assetClasses.map((ac, idx) => {
                    const eff = projection.effectiveAssetReturns[idx];

                    return (
                      <tr key={ac.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Name */}
                        <td className="py-2.5 pr-2">
                          <input
                            type="text"
                            value={ac.name}
                            onChange={(e) => handleUpdateClass(ac.id, { name: e.target.value })}
                            className="w-full font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Weight */}
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            value={ac.weight}
                            onChange={(e) =>
                              handleUpdateClass(ac.id, { weight: parseFloat(e.target.value) || 0 })
                            }
                            step={1}
                            min={0}
                            max={100}
                            className="w-16 text-right font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Local Return */}
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <input
                              type="number"
                              value={ac.returnRate}
                              onChange={(e) =>
                                handleUpdateClass(ac.id, {
                                  returnRate: parseFloat(e.target.value) || 0,
                                })
                              }
                              step={0.5}
                              className="w-16 text-right font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>

                        {/* Currency */}
                        <td className="py-2.5 px-2">
                          <select
                            value={ac.currency}
                            onChange={(e) => handleUpdateClass(ac.id, { currency: e.target.value })}
                            className="w-full font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} ({c.symbol})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* FX Drift Rate */}
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <input
                              type="number"
                              value={ac.fxRate}
                              onChange={(e) =>
                                handleUpdateClass(ac.id, {
                                  fxRate: parseFloat(e.target.value) || 0,
                                })
                              }
                              step={0.5}
                              disabled={ac.currency === 'INR'}
                              className={`w-16 text-right font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                ac.currency === 'INR' ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            />
                            <span className="text-slate-500">%</span>
                          </div>
                        </td>

                        {/* Effective INR Return */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                          {eff ? `${eff.effectiveInrReturn.toFixed(1)}%` : '-'}
                        </td>

                        {/* Real Return */}
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-emerald-700">
                          {eff ? `${eff.realReturn.toFixed(1)}%` : '-'}
                        </td>

                        {/* Action Delete */}
                        <td className="py-2.5 pl-2 text-center">
                          {assetClasses.length > 1 && (
                            <button
                              onClick={() => handleRemoveClass(ac.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete asset class"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-start gap-2">
              <Globe size={15} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Currency Compounding Note:</span> Foreign assets (e.g. US Equities in USD) automatically compound at their local return plus foreign currency appreciation against the Indian Rupee: <code className="text-indigo-700 font-mono">(1 + r_local) × (1 + r_fx) - 1</code>. Real returns are further deflated by domestic inflation ({inflationRate}%).
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Interactive Growth Trajectory Charts */}
      <Card className="p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Projected Wealth Trajectory & Asset Growth
            </h3>
            <p className="text-xs text-slate-500">
              Compound wealth accumulation over {years} years comparing nominal value against real purchasing power.
            </p>
          </div>

          {/* Chart Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg self-start sm:self-center">
            <button
              onClick={() => setChartView('nominal-real')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                chartView === 'nominal-real'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nominal vs Real
            </button>
            <button
              onClick={() => setChartView('breakdown')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                chartView === 'breakdown'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Asset Breakdown
            </button>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'nominal-real' ? (
              <AreaChart data={projection.snapshots} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tickFormatter={(val) => formatCurrencyCompact(val)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={75}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatCurrency(Number(val)),
                    name === 'nominalValue'
                      ? 'Nominal Wealth'
                      : name === 'realValue'
                        ? 'Real Purchasing Power'
                        : 'Total Invested',
                  ]}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'nominalValue'
                      ? 'Nominal Wealth'
                      : value === 'realValue'
                        ? 'Real (Inflation-Adjusted)'
                        : 'Total Capital Invested'
                  }
                />
                <Area
                  type="monotone"
                  dataKey="nominalValue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorNominal)"
                />
                <Area
                  type="monotone"
                  dataKey="realValue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReal)"
                />
                <Area
                  type="monotone"
                  dataKey="totalInvested"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={0}
                  fill="transparent"
                />
              </AreaChart>
            ) : (
              <AreaChart
                data={projection.snapshots.map((s) => {
                  const item: any = { year: s.year };
                  s.assetBreakdown.forEach((ab) => {
                    item[ab.name] = ab.nominalValue;
                  });
                  return item;
                })}
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="year" tickFormatter={(y) => `Yr ${y}`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tickFormatter={(val) => formatCurrencyCompact(val)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={75}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [formatCurrency(Number(val)), name]}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                {assetClasses.map((ac, idx) => (
                  <Area
                    key={ac.id}
                    type="monotone"
                    dataKey={ac.name}
                    stackId="1"
                    stroke={PALETTE[idx % PALETTE.length]}
                    fill={PALETTE[idx % PALETTE.length]}
                    fillOpacity={0.65}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Year-by-Year Growth Table */}
      <Card className="p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Year-by-Year Growth & Purchasing Power Schedule
          </h3>
          {projection.snapshots.length > 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllTable(!showAllTable)}
              className="text-xs h-7 px-2.5"
            >
              {showAllTable ? 'Show 5-Year Milestones' : `Show All ${projection.snapshots.length - 1} Years`}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-2">Year</th>
                <th className="pb-2 text-right">Cumulative Invested</th>
                <th className="pb-2 text-right">Nominal Corpus</th>
                <th className="pb-2 text-right">Real Purchasing Power</th>
                <th className="pb-2 text-right">Nominal Gain</th>
                <th className="pb-2 text-right">Real Gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {projection.snapshots
                .filter((s) => showAllTable || s.year % 5 === 0 || s.year === years)
                .map((s) => (
                  <tr key={s.year} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 font-sans font-bold text-slate-800">
                      {s.year === 0 ? 'Initial (Yr 0)' : `Year ${s.year}`}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{formatCurrency(s.totalInvested)}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(s.nominalValue)}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(s.realValue)}</td>
                    <td className="py-2.5 text-right text-slate-700">+{formatCurrency(s.nominalGain)}</td>
                    <td className="py-2.5 text-right font-medium text-emerald-600">
                      {s.realGain >= 0 ? `+${formatCurrency(s.realGain)}` : formatCurrency(s.realGain)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
