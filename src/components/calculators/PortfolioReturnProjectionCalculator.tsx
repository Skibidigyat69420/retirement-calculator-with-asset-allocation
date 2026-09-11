import { useState, useMemo } from 'react';
import { Layers, Sliders, TrendingUp, ExternalLink } from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { Select } from '../ui/Select';
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
} from '../../lib/portfolioProjection';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { getChartTheme } from '../../lib/chartTheme';
import { useCalculator } from '../../context/CalculatorContext';
import { ProjectionAssetClassTable } from './ProjectionAssetClassTable';

const PRESET_TEMPLATES: { name: string; classes: ProjectableAssetClass[] }[] = [
  {
    name: 'Global All-Weather (Default)',
    classes: [
      { id: '1', name: 'Indian Large & Mid Cap', weight: 40, returnRate: 12.0, currency: 'INR', fxRate: 0, color: 'var(--color-accent)' },
      { id: '2', name: 'US Tech & Global Equities', weight: 20, returnRate: 10.5, currency: 'USD', fxRate: 3.5, color: 'var(--color-info)' },
      { id: '3', name: 'Sovereign Gold Bonds', weight: 15, returnRate: 9.0, currency: 'INR', fxRate: 0, color: 'var(--color-brass)' },
      { id: '4', name: 'Corporate Debt & G-Secs', weight: 20, returnRate: 7.5, currency: 'INR', fxRate: 0, color: 'var(--color-positive)' },
      { id: '5', name: 'Liquid Cash Buffer', weight: 5, returnRate: 5.5, currency: 'INR', fxRate: 0, color: 'var(--color-muted)' },
    ],
  },
  {
    name: 'Aggressive Multi-Asset Growth',
    classes: [
      { id: '1', name: 'Domestic High Growth Equities', weight: 45, returnRate: 14.0, currency: 'INR', fxRate: 0, color: 'var(--color-accent)' },
      { id: '2', name: 'Global Tech & Innovation', weight: 30, returnRate: 12.0, currency: 'USD', fxRate: 3.5, color: 'var(--color-info)' },
      { id: '3', name: 'Emerging Market / Europe', weight: 10, returnRate: 9.5, currency: 'EUR', fxRate: 2.5, color: 'var(--color-warning)' },
      { id: '4', name: 'Precious Metals / Gold', weight: 15, returnRate: 9.0, currency: 'INR', fxRate: 0, color: 'var(--color-brass)' },
    ],
  },
  {
    name: 'Conservative Capital Preservation',
    classes: [
      { id: '1', name: 'High-Grade Domestic Bonds', weight: 50, returnRate: 7.5, currency: 'INR', fxRate: 0, color: 'var(--color-positive)' },
      { id: '2', name: 'US Sovereign Treasuries', weight: 20, returnRate: 4.8, currency: 'USD', fxRate: 3.5, color: 'var(--color-info)' },
      { id: '3', name: 'Bluechip Dividend Equities', weight: 20, returnRate: 10.0, currency: 'INR', fxRate: 0, color: 'var(--color-accent)' },
      { id: '4', name: 'Sovereign Gold', weight: 10, returnRate: 8.5, currency: 'INR', fxRate: 0, color: 'var(--color-brass)' },
    ],
  },
];

// Token-based series palette — resolved per theme by the browser in SVG.
const CLASS_PALETTE = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-brass)',
  'var(--color-positive)',
  'var(--color-warning)',
  'var(--color-negative)',
  'var(--color-muted)',
];

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

  // A blank workspace must never present ₹0 as a projection.
  const hasInput = initialCorpus > 0 || monthlyContribution > 0;

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
          const currConfig = SUPPORTED_CURRENCIES_LOOKUP[updates.currency];
          if (currConfig !== undefined) {
            updated.fxRate = currConfig;
          }
        }
        return updated;
      }),
    );
  };

  const handleAddClass = () => {
    const newId = String(Date.now());
    const colorIndex = assetClasses.length % CLASS_PALETTE.length;
    setAssetClasses((prev) => [
      ...prev,
      {
        id: newId,
        name: `Asset Class ${prev.length + 1}`,
        weight: 10,
        returnRate: 10.0,
        currency: 'INR',
        fxRate: 0.0,
        color: CLASS_PALETTE[colorIndex],
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

  const theme = getChartTheme();

  return (
    <div className="space-y-6">
      {/* Top Headline & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border">
        <div className="max-w-2xl">
          <div className="eyebrow mb-1.5">Calculator</div>
          <h2 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
            <Layers size={18} strokeWidth={1.6} className="text-accent-strong" aria-hidden="true" />
            Multi-Asset Portfolio Return & Wealth Projection
          </h2>
          <p className="mt-1.5 text-[13px] text-muted leading-relaxed">
            Model custom asset classes, individual return targets, and currency appreciation/depreciation effects
            with compound nominal vs real purchasing-power projections.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="sm:w-64 shrink-0">
          <Select
            label="Preset allocation"
            value={PRESET_TEMPLATES[0].name}
            onChange={handleApplyPreset}
            options={PRESET_TEMPLATES.map((p) => ({ value: p.name, label: p.name }))}
            aria-label="Preset portfolio allocation template"
          />
        </div>
      </div>

      {hasInput ? (
        <>
          {/* Topline Metrics — hairline result panel with tabular figures */}
          <div className="rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
              <span className="eyebrow">Projection</span>
              <span className="font-mono tabular-nums text-[11px] text-faint">Horizon: {years} yrs</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
              <div className="p-5 space-y-1.5">
                <div className="eyebrow">Blended Portfolio Return</div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono tabular-nums text-2xl font-semibold tracking-tight text-ink">
                    {formatPercent(projection.blendedNominalReturn)}
                  </span>
                  <span className="text-xs text-muted">Nominal p.a.</span>
                </div>
                <p className="text-xs font-mono tabular-nums text-positive">
                  Real: {formatPercent(projection.blendedRealReturn)} p.a. (net of inflation)
                </p>
              </div>

              <div className="p-5 space-y-1.5">
                <div className="eyebrow">Terminal Nominal Corpus (Yr {years})</div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono tabular-nums text-2xl font-semibold tracking-tight text-ink">
                    {formatCurrencyCompact(projection.terminalNominalWealth)}
                  </span>
                  <Badge tone="accent" dot={false}>{projection.nominalMultiplier}x Invested</Badge>
                </div>
                <p className="text-xs text-muted">Total future rupee valuation</p>
              </div>

              <div className="p-5 space-y-1.5">
                <div className="eyebrow">Terminal Real Purchasing Power</div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono tabular-nums text-2xl font-semibold tracking-tight text-positive">
                    {formatCurrencyCompact(projection.terminalRealWealth)}
                  </span>
                  <Badge tone="positive" dot={false}>{projection.realMultiplier}x Real</Badge>
                </div>
                <p className="text-xs text-muted">Deflated at {inflationRate}% annual inflation</p>
              </div>

              <div className="p-5 space-y-1.5">
                <div className="eyebrow">Capital Contribution & Gain</div>
                <div className="text-sm font-medium text-ink">
                  Invested: <span className="font-mono tabular-nums">{formatCurrencyCompact(projection.totalInvested)}</span>
                </div>
                <p className="text-xs text-muted">
                  Net capital gain:{' '}
                  <span className="font-mono tabular-nums font-semibold text-ink">
                    +{formatCurrencyCompact(projection.terminalNominalWealth - projection.totalInvested)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
            <span className="eyebrow">Projection</span>
          </div>
          <div className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-24 grid-motif opacity-60 pointer-events-none" aria-hidden="true" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-surface pointer-events-none" aria-hidden="true" />
            <div className="relative py-14 px-6 flex flex-col items-center text-center">
              <div className="mb-4 p-3 rounded-md border border-border bg-raised text-muted">
                <TrendingUp size={22} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                Enter the numbers to see the result.
              </h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed max-w-sm">
                Set an initial corpus or monthly contribution and the projection will appear here — never a placeholder zero.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Controls + Right Asset Class Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Global Simulation Levers */}
        <div className="lg:col-span-4">
          <div className="rounded-lg border border-border bg-raised p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
              <Sliders size={15} strokeWidth={1.6} className="text-accent-strong" aria-hidden="true" />
              <span className="eyebrow">Global Projection Levers</span>
            </div>

            <CurrencyInput
              label="Initial Lumpsum Corpus"
              value={initialCorpus}
              onChange={setInitialCorpus}
              step={50000}
              min={0}
            />

            <CurrencyInput
              label="Monthly SIP Inflow"
              value={monthlyContribution}
              onChange={setMonthlyContribution}
              step={5000}
              min={0}
            />

            <Slider
              label="Annual SIP Step-Up"
              value={annualStepUp}
              onChange={setAnnualStepUp}
              min={0}
              max={50}
              step={1}
              suffix="%"
            />

            <NumberInput
              label="Investment Horizon"
              value={years}
              onChange={setYears}
              step={1}
              min={1}
              max={50}
              suffix="years"
            />

            <Slider
              label="Domestic Inflation Rate"
              value={inflationRate}
              onChange={setInflationRate}
              min={0}
              max={20}
              step={0.25}
              suffix="% p.a."
            />

            <div className="pt-3 border-t border-border-subtle">
              <div className="eyebrow mb-2">Portfolio Rebalancing</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRebalanceAnnually(true)}
                  className={`p-2 rounded-md border font-medium transition-colors cursor-pointer ${
                    rebalanceAnnually
                      ? 'bg-ink text-canvas border-ink'
                      : 'bg-surface text-ink-soft border-border hover:border-border-strong'
                  }`}
                >
                  Annual Rebalance
                </button>
                <button
                  type="button"
                  onClick={() => setRebalanceAnnually(false)}
                  className={`p-2 rounded-md border font-medium transition-colors cursor-pointer ${
                    !rebalanceAnnually
                      ? 'bg-ink text-canvas border-ink'
                      : 'bg-surface text-ink-soft border-border hover:border-border-strong'
                  }`}
                >
                  Buy & Hold (Drift)
                </button>
              </div>
              <p className="text-[11px] text-muted mt-2 leading-relaxed">
                {rebalanceAnnually
                  ? 'Assets are rebalanced annually back to strategic target weights.'
                  : 'Assets drift naturally based on relative compound performance.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Asset Classes Configuration Table */}
        <div className="lg:col-span-8 min-w-0">
          <ProjectionAssetClassTable
            assetClasses={assetClasses}
            effectiveAssetReturns={projection.effectiveAssetReturns}
            totalWeight={totalWeight}
            isWeight100={isWeight100}
            inflationRate={inflationRate}
            onUpdateClass={handleUpdateClass}
            onAddClass={handleAddClass}
            onRemoveClass={handleRemoveClass}
            onNormalizeWeights={handleNormalizeWeights}
          />
        </div>
      </div>

      {hasInput && (
        <>
          {/* Interactive Growth Trajectory Charts */}
          <div className="rounded-lg border border-border bg-raised">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border-subtle">
              <div>
                <div className="text-sm font-semibold text-ink tracking-tight">
                  Projected Wealth Trajectory & Asset Growth
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Compound wealth accumulation over {years} years comparing nominal value against real purchasing power.
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 border border-border rounded-md p-0.5 text-xs bg-sunken/50 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setChartView('nominal-real')}
                  className={`px-3 py-1 rounded-sm font-medium transition-colors cursor-pointer ${
                    chartView === 'nominal-real'
                      ? 'bg-raised text-ink shadow-card'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Nominal vs Real
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('breakdown')}
                  className={`px-3 py-1 rounded-sm font-medium transition-colors cursor-pointer ${
                    chartView === 'breakdown'
                      ? 'bg-raised text-ink shadow-card'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Asset Breakdown
                </button>
              </div>
            </div>
            <div className="p-5">
              {/* Recharts Area Chart */}
              <div
                className="h-80 w-full"
                role="img"
                aria-label={`Area chart of projected wealth over ${years} years in ${chartView === 'nominal-real' ? 'nominal versus inflation-adjusted terms, with total capital invested' : 'a breakdown by asset class'}.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'nominal-real' ? (
                    <AreaChart data={projection.snapshots} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.primary} stopOpacity={0.22} />
                          <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.positive} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={theme.positive} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="year" tickFormatter={(y: number) => `Yr ${y}`} tick={{ fontSize: 11, fill: theme.axisLabel }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={(val: number) => formatCurrencyCompact(val)}
                        tick={{ fontSize: 11, fill: theme.axisLabel }}
                        width={75}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val, name) => [
                          formatCurrency(Number(val ?? 0)),
                          name === 'nominalValue'
                            ? 'Nominal Wealth'
                            : name === 'realValue'
                              ? 'Real Purchasing Power'
                              : 'Total Invested',
                        ]}
                        labelFormatter={(label) => `Year ${label}`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: `1px solid ${theme.tooltipBorder}`,
                          backgroundColor: theme.tooltipBg,
                          color: theme.tooltipText,
                        }}
                      />
                      <Legend
                        formatter={(value: string) =>
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
                        stroke={theme.primary}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorNominal)"
                      />
                      <Area
                        type="monotone"
                        dataKey="realValue"
                        stroke={theme.positive}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorReal)"
                      />
                      <Area
                        type="monotone"
                        dataKey="totalInvested"
                        stroke={theme.muted}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fillOpacity={0}
                        fill="transparent"
                      />
                    </AreaChart>
                  ) : (
                    <AreaChart
                      data={projection.snapshots.map((s) => {
                        const item: Record<string, number> = { year: s.year };
                        s.assetBreakdown.forEach((ab) => {
                          item[ab.name] = ab.nominalValue;
                        });
                        return item;
                      })}
                      margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="year" tickFormatter={(y: number) => `Yr ${y}`} tick={{ fontSize: 11, fill: theme.axisLabel }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={(val: number) => formatCurrencyCompact(val)}
                        tick={{ fontSize: 11, fill: theme.axisLabel }}
                        width={75}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val, name) => [formatCurrency(Number(val ?? 0)), String(name)]}
                        labelFormatter={(label) => `Year ${label}`}
                        contentStyle={{
                          borderRadius: '8px',
                          border: `1px solid ${theme.tooltipBorder}`,
                          backgroundColor: theme.tooltipBg,
                          color: theme.tooltipText,
                        }}
                      />
                      <Legend />
                      {assetClasses.map((ac, idx) => (
                        <Area
                          key={ac.id}
                          type="monotone"
                          dataKey={ac.name}
                          stackId="1"
                          stroke={CLASS_PALETTE[idx % CLASS_PALETTE.length]}
                          fill={CLASS_PALETTE[idx % CLASS_PALETTE.length]}
                          fillOpacity={0.65}
                        />
                      ))}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Year-by-Year Growth Table */}
          <div className="rounded-lg border border-border bg-raised">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
              <div className="eyebrow">Year-by-Year Growth & Purchasing Power Schedule</div>
              {projection.snapshots.length > 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllTable(!showAllTable)}
                  className="text-xs h-8"
                >
                  {showAllTable ? 'Show 5-Year Milestones' : `Show All ${projection.snapshots.length - 1} Years`}
                </Button>
              )}
            </div>

            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Year-by-year growth schedule">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pl-5 pr-4 font-semibold">Year</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Cumulative Invested</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Nominal Corpus</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Real Purchasing Power</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Nominal Gain</th>
                    <th className="py-2.5 pr-5 text-right font-semibold">Real Gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {projection.snapshots
                    .filter((s) => showAllTable || s.year % 5 === 0 || s.year === years)
                    .map((s) => (
                      <tr key={s.year} className="hover:bg-sunken/50 transition-colors">
                        <td className="py-2.5 pl-5 pr-4 font-medium text-ink">
                          {s.year === 0 ? 'Initial (Yr 0)' : `Year ${s.year}`}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-muted">{formatCurrency(s.totalInvested)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold text-ink">{formatCurrency(s.nominalValue)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-medium text-positive">{formatCurrency(s.realValue)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">+{formatCurrency(s.nominalGain)}</td>
                        <td className="py-2.5 pr-5 text-right font-mono tabular-nums font-medium text-positive">
                          {s.realGain >= 0 ? `+${formatCurrency(s.realGain)}` : formatCurrency(s.realGain)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="text-[11px] text-faint flex items-center gap-1.5">
        <ExternalLink size={11} strokeWidth={1.6} aria-hidden="true" />
        Projections are nominal and real estimates from deterministic compounding — not a guarantee of future returns.
      </p>
    </div>
  );
};

// Compact lookup of default FX rates by currency code (from SUPPORTED_CURRENCIES).
const SUPPORTED_CURRENCIES_LOOKUP: Record<string, number> = {
  INR: 0.0,
  USD: 3.5,
  EUR: 2.5,
  GBP: 2.0,
  AED: 3.5,
  SGD: 3.0,
  JPY: 0.5,
};
