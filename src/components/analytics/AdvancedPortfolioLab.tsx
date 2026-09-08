import { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Sliders,
  ArrowRight,
  LineChart as LineChartIcon,
  ScatterChart as ScatterChartIcon,
  GitCompare,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useCalculator } from '../../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS, GLIDE_PATH_PRESETS } from '../../lib/constants';
import { buildGlidePath } from '../../lib/riskQuestionnaire';
import { formatPercent } from '../../lib/formatters';
import { useMarketData } from '../../hooks/useMarketData';
import { DEFAULT_ALLOCATION_SYMBOLS } from '../../lib/instruments';
import { runMVO } from '../../lib/mvo';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ReferenceDot,
} from 'recharts';
import type { AssetCategory } from '../../types';

interface TacticalOverlays {
  valuationTilt: number; // -5 to +5%
  momentumTilt: number; // -5 to +5%
  volatilityTargeting: number; // 0.6x to 1.4x scale factor
}

export const AdvancedPortfolioLab = () => {
  const { setManualTargets, showToast, logDecision, inputs, riskProfile } = useCalculator();

  const { data: marketData, loadBackendData } = useMarketData();

  useEffect(() => {
    loadBackendData(DEFAULT_ALLOCATION_SYMBOLS);
  }, [loadBackendData]);

  const [activeModel, setActiveModel] = useState<'mvo' | 'riskParity' | 'blackLitterman'>('blackLitterman');

  // Black-Litterman view states
  const [blViewReturn, setBlViewReturn] = useState<number>(4.0); // +4% outperformance view
  const [blConfidence, setBlConfidence] = useState<number>(75); // 75% confidence

  // Tactical overlay states
  const [tacticalOverlays, setTacticalOverlays] = useState<TacticalOverlays>({
    valuationTilt: -2.0, // slight equity trim due to rich valuations
    momentumTilt: 1.5, // positive momentum in gold/equities
    volatilityTargeting: 1.0, // 100% normal exposure
  });

  // Base strategic weights depending on selected model
  const strategicWeights: Record<AssetCategory, number> = useMemo(
    () => computeModelWeights(activeModel, blViewReturn, blConfidence),
    [activeModel, blViewReturn, blConfidence],
  );

  // All three strategic models side-by-side for the comparison chart.
  const modelComparisonData = useMemo(() => {
    const models = [
      { id: 'blackLitterman' as const, label: 'Black-Litterman', color: 'var(--color-accent)' },
      { id: 'mvo' as const, label: 'Max-Sharpe MVO', color: 'var(--color-info)' },
      { id: 'riskParity' as const, label: 'Risk Parity', color: 'var(--color-warning)' },
    ];
    const weights = models.map((m) => ({ ...m, weights: computeModelWeights(m.id, blViewReturn, blConfidence) }));
    const cats: AssetCategory[] = ['equity', 'debt', 'gold', 'liquid'];
    return cats.map((cat) => {
      const bl = weights.find((m) => m.id === 'blackLitterman')!.weights[cat];
      const mvoW = weights.find((m) => m.id === 'mvo')!.weights[cat];
      const rp = weights.find((m) => m.id === 'riskParity')!.weights[cat];
      return {
        category: ASSET_LABELS[cat],
        catKey: cat,
        blackLitterman: Math.round(bl),
        mvo: Math.round(mvoW),
        riskParity: Math.round(rp),
      };
    });
  }, [blViewReturn, blConfidence]);

  // Client-specific glide path versus standard risk presets.
  const glidePathData = useMemo(() => {
    const clientPath = buildGlidePath(inputs.currentAge, inputs.retirementAge, riskProfile);
    const clientByAge = new Map(clientPath.map((p) => [p.age, p.equity]));
    const ages = Array.from(
      new Set([
        ...GLIDE_PATH_PRESETS.moderate.map((p) => p.age),
        ...clientPath.map((p) => p.age),
      ]),
    ).sort((a, b) => a - b);
    return ages.map((age) => ({
      age,
      client: clientByAge.has(age) ? clientByAge.get(age) : null,
      aggressive: interpolateGlide(GLIDE_PATH_PRESETS.aggressive, age),
      moderate: interpolateGlide(GLIDE_PATH_PRESETS.moderate, age),
      conservative: interpolateGlide(GLIDE_PATH_PRESETS.conservative, age),
    }));
  }, [inputs.currentAge, inputs.retirementAge, riskProfile]);

  // Empirical efficient frontier from the calibrated covariance matrix.
  const frontierResult = useMemo(() => {
    if (!marketData || marketData.symbols.length < 2) return null;
    const means = marketData.stats.map((s) => s.annualizedReturn);
    return runMVO(marketData.symbols, means, marketData.covariance, {
      samples: 8000,
      riskFreeRate: riskProfile.riskFreeRate / 100,
    });
  }, [marketData, riskProfile.riskFreeRate]);

  const frontierScatter = useMemo(
    () =>
      (frontierResult?.frontier ?? []).map((p) => ({
        volatility: p.volatility * 100,
        ret: p.expectedReturn * 100,
        sharpe: p.sharpe,
      })),
    [frontierResult],
  );

  // Tactical adjustments
  const finalWeights = useMemo(() => {
    const netTacticalEquity = tacticalOverlays.valuationTilt + tacticalOverlays.momentumTilt;
    const scaledEquity = Math.min(80, Math.max(20, Math.round(strategicWeights.equity + netTacticalEquity)));
    const delta = scaledEquity - strategicWeights.equity;

    // Compensate delta in debt and liquid
    const debt = Math.max(5, Math.round(strategicWeights.debt - delta * 0.7));
    const liquid = Math.max(2, 100 - scaledEquity - debt - strategicWeights.gold);

    return {
      equity: scaledEquity,
      debt,
      gold: strategicWeights.gold,
      realestate: 0,
      liquid,
      other: 0,
    };
  }, [strategicWeights, tacticalOverlays]);

  const handleApplyFinalAllocation = () => {
    setManualTargets(finalWeights);
    logDecision({
      category: 'allocation',
      actionTitle: `Applied Advanced Portfolio Lab Allocation`,
      summary: `Strategic ${activeModel.toUpperCase()} (${strategicWeights.equity}% Eq) with Tactical Overlays (${finalWeights.equity}% Final Eq).`,
      newValue: `${finalWeights.equity}% Eq / ${finalWeights.debt}% Debt / ${finalWeights.gold}% Gold`,
      rationale: `Applied Black-Litterman equilibrium with ${blConfidence}% confidence view and valuation/momentum tactical tilts.`,
      author: 'Advisor',
    });
    showToast('Applied institutional allocation to Strategic Targets!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border border-zinc-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-900 text-white rounded-lg">
                <Layers size={18} />
              </span>
              <h3 className="text-xl font-sans font-bold text-zinc-900 tracking-tight">
                Advanced Portfolio Engineering Lab
              </h3>
              <Badge variant="navy" className="text-[10px] uppercase font-mono">
                SAA + TAA Architecture
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Combines Strategic Asset Allocation (MVO, Risk Parity, Black-Litterman) with Tactical Overlays (Valuation, Momentum, Volatility Targeting).
            </p>
          </div>

          <Button onClick={handleApplyFinalAllocation} className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs">
            Apply Final Weights <ArrowRight size={13} className="ml-1" />
          </Button>
        </div>

        {/* Strategic Model Selection Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              1. Strategic Asset Allocation (SAA) Foundation:
            </span>
            <span className="text-xs text-zinc-500">Long-Term Equilibrium Policy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'blackLitterman',
                title: 'Black-Litterman Model',
                desc: 'Combines neutral market equilibrium prior with advisor subjective views & confidence matrix.',
                tag: 'Recommended',
              },
              {
                id: 'mvo',
                title: 'Mean-Variance Tangency',
                desc: 'Classical Markowitz maximum-Sharpe portfolio based on 10Y empirical covariance.',
                tag: 'Sharpe Maximizer',
              },
              {
                id: 'riskParity',
                title: 'Risk Parity (Equal Risk)',
                desc: 'Allocates capital inversely to asset volatility so each asset contributes equally to risk.',
                tag: 'Hedge Fund Style',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModel(m.id as any)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeModel === m.id
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={activeModel === m.id ? 'gold' : 'outline'} className="text-[9px]">
                    {m.tag}
                  </Badge>
                </div>
                <h4 className={`text-sm font-bold ${activeModel === m.id ? 'text-white' : 'text-zinc-900'}`}>
                  {m.title}
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${activeModel === m.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {m.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Black-Litterman View Inputs if Active */}
        {activeModel === 'blackLitterman' && (
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-zinc-600" />
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Advisory Forward Views &amp; Confidence Matrix:
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                Posterior Return Tilt: +{((blViewReturn * blConfidence) / 100).toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Slider
                label="Equities vs. Debt Outperformance View"
                value={blViewReturn}
                onChange={setBlViewReturn}
                min={-6}
                max={10}
                step={0.5}
                suffix="%"
              />
              <Slider
                label="Advisory Confidence in View"
                value={blConfidence}
                onChange={setBlConfidence}
                min={10}
                max={100}
                step={5}
                suffix="%"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Tactical Overlays Card */}
      <Card className="border border-zinc-200/90 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-sans font-bold text-zinc-900 flex items-center gap-2">
              <Sliders size={18} className="text-zinc-800" />
              2. Tactical Asset Allocation (TAA) Overlays
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Disciplined short-to-medium term shifts around strategic benchmarks based on valuation, momentum, and regime signals.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Explicitly Separated from SAA
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-zinc-50/70 rounded-xl border border-zinc-200">
          <div>
            <Slider
              label="Valuation Tilt (Trailing PE & Yield Spread)"
              value={tacticalOverlays.valuationTilt}
              onChange={(v) => setTacticalOverlays((prev) => ({ ...prev, valuationTilt: v }))}
              min={-5}
              max={5}
              step={0.5}
              suffix="%"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Negative tilt trims equity exposure when market valuations are stretched beyond historical averages.
            </span>
          </div>

          <div>
            <Slider
              label="Momentum Tilt (12M Trend Following)"
              value={tacticalOverlays.momentumTilt}
              onChange={(v) => setTacticalOverlays((prev) => ({ ...prev, momentumTilt: v }))}
              min={-5}
              max={5}
              step={0.5}
              suffix="%"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Positive momentum allocates incremental tactical weight into assets sustaining established upward trends.
            </span>
          </div>
        </div>

        {/* Synthesis Table: Strategic + Tactical = Final */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[10px]">
                <th className="pb-2">Asset Class</th>
                <th className="pb-2 text-right">Strategic Policy (SAA)</th>
                <th className="pb-2 text-right">Tactical Overlay (TAA)</th>
                <th className="pb-2 text-right">Final Execution Weight</th>
                <th className="pb-2 text-right">Active Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {(['equity', 'debt', 'gold', 'liquid'] as AssetCategory[]).map((cat) => {
                const strat = strategicWeights[cat];
                const final = finalWeights[cat];
                const delta = final - strat;
                const color = ASSET_COLORS[cat];

                return (
                  <tr key={cat} className="hover:bg-zinc-50/60">
                    <td className="py-2.5 font-sans font-bold text-zinc-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {ASSET_LABELS[cat]}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-zinc-700">{strat}%</td>
                    <td className="py-2.5 text-right">
                      {delta !== 0 ? (
                        <span className={delta > 0 ? 'text-emerald-700 font-bold' : 'text-zinc-700 font-bold'}>
                          {delta > 0 ? `+${delta}%` : `${delta}%`}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0%</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold text-zinc-900 text-sm">{final}%</td>
                    <td className="py-2.5 text-right">
                      <Badge variant={delta === 0 ? 'outline' : delta > 0 ? 'success' : 'warning'} className="text-[9px]">
                        {delta > 0 ? `Overweight` : delta < 0 ? `Underweight` : `Neutral`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Strategic Model Comparison */}
      <Card className="border border-zinc-200/90 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h3 className="text-base font-sans font-bold text-zinc-900 flex items-center gap-2">
            <GitCompare size={18} className="text-zinc-800" />
            Strategic Model Weight Comparison
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Black-Litterman blends equilibrium with advisory views ({Math.round(computeModelWeights('blackLitterman', blViewReturn, blConfidence).equity)}% equity); Risk Parity equalizes risk contribution; MVO maximizes the Sharpe ratio.
          </p>
        </div>
        <div className="h-64 w-full" role="img" aria-label="Grouped bar chart comparing Black-Litterman, Max-Sharpe MVO, and Risk Parity strategic weights across equity, debt, gold, and liquid asset classes.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modelComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any, name: any) => [`${Number(value)}%`, name]}
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  padding: '10px 14px',
                }}
              />
              <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="blackLitterman" name="Black-Litterman" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="mvo" name="Max-Sharpe MVO" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="riskParity" name="Risk Parity" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Strategic model weights table">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                <th className="py-2 pr-4">Asset Class</th>
                <th className="py-2 pr-4 text-right">Black-Litterman</th>
                <th className="py-2 pr-4 text-right">Max-Sharpe MVO</th>
                <th className="py-2 pr-2 text-right">Risk Parity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {modelComparisonData.map((row) => (
                <tr key={row.catKey} className="hover:bg-zinc-50/70">
                  <td className="py-2 pr-4 flex items-center font-semibold text-zinc-900">
                    <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: ASSET_COLORS[row.catKey as AssetCategory] }} />
                    {row.category}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-zinc-700">{String(row.blackLitterman)}%</td>
                  <td className="py-2 pr-4 text-right font-mono text-zinc-700">{String(row.mvo)}%</td>
                  <td className="py-2 pr-2 text-right font-mono text-zinc-700">{String(row.riskParity)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Glide Path Comparison */}
      <Card className="border border-zinc-200/90 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h3 className="text-base font-sans font-bold text-zinc-900 flex items-center gap-2">
            <LineChartIcon size={18} className="text-zinc-800" />
            Glide Path Slope — Client vs Risk Presets
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Your {riskProfile.label} path de-risks from {formatPercent(riskProfile.targets.equity)} equity today to {formatPercent(riskProfile.equityAtRetirement)} at retirement (age {inputs.retirementAge}); preset paths follow standard age-based schedules.
          </p>
        </div>
        <div className="h-64 w-full" role="img" aria-label={`Line chart of equity allocation glide paths by age. The client ${riskProfile.label} path starts at ${Math.round(riskProfile.targets.equity)} percent equity and declines to ${Math.round(riskProfile.equityAtRetirement)} percent at age ${inputs.retirementAge}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={glidePathData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="age" tickFormatter={(a: number) => `Age ${a}`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any, name: any) => (value === null || value === undefined ? ['—', name] : [`${Number(value)}%`, name])}
                labelFormatter={(label) => `Age ${label}`}
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  padding: '10px 14px',
                }}
              />
              <Legend verticalAlign="top" height={32} iconType="line" wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="client" name={`Client (${riskProfile.label})`} stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls={false} />
              <Line type="monotone" dataKey="aggressive" name="Aggressive preset" stroke="var(--color-negative)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="moderate" name="Moderate preset" stroke="var(--color-info)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="conservative" name="Conservative preset" stroke="var(--color-warning)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>Equity glide path percentages by age for the client profile and standard presets</caption>
          <thead>
            <tr><th>Age</th><th>Client</th><th>Aggressive</th><th>Moderate</th><th>Conservative</th></tr>
          </thead>
          <tbody>
            {glidePathData.map((p) => (
              <tr key={p.age}>
                <td>{p.age}</td>
                <td>{p.client === null ? '—' : `${p.client}%`}</td>
                <td>{p.aggressive}%</td>
                <td>{p.moderate}%</td>
                <td>{p.conservative}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Empirical Efficient Frontier */}
      <Card className="border border-zinc-200/90 shadow-sm space-y-4">
        <div className="border-b border-zinc-100 pb-3">
          <h3 className="text-base font-sans font-bold text-zinc-900 flex items-center gap-2">
            <ScatterChartIcon size={18} className="text-zinc-800" />
            Empirical Efficient Frontier
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Long-only portfolios simulated from 4,209 sessions of calibrated daily returns. The highlighted tangency portfolio maximizes the Sharpe ratio at the current risk-free rate.
          </p>
        </div>
        {frontierResult && frontierResult.frontier.length > 2 ? (
          <>
            <p className="text-xs text-zinc-600">
              Tangency portfolio: {formatPercent(frontierResult.maxSharpe.expectedReturn * 100)} return at {formatPercent(frontierResult.maxSharpe.volatility * 100)} volatility (Sharpe {frontierResult.maxSharpe.sharpe.toFixed(2)}) — portfolios above the frontier line are unattainable with these assets.
            </p>
            <div className="h-72 w-full" role="img" aria-label={`Scatter chart of the efficient frontier. Maximum Sharpe portfolio earns ${formatPercent(frontierResult.maxSharpe.expectedReturn * 100)} at ${formatPercent(frontierResult.maxSharpe.volatility * 100)} volatility; minimum variance portfolio earns ${formatPercent(frontierResult.minVariance.expectedReturn * 100)} at ${formatPercent(frontierResult.minVariance.volatility * 100)} volatility.`}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    type="number"
                    dataKey="volatility"
                    name="Volatility"
                    unit="%"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Annualized Volatility', position: 'insideBottom', offset: -4, fill: 'var(--color-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="ret"
                    name="Return"
                    unit="%"
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ZAxis type="number" dataKey="sharpe" range={[40, 120]} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}%`, name]}
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      padding: '10px 14px',
                    }}
                  />
                  <Scatter data={frontierScatter} isAnimationActive={false}>
                    {frontierScatter.map((_p, i) => (
                      <Cell key={i} style={{ fill: 'var(--color-info)', fillOpacity: 0.55 }} />
                    ))}
                  </Scatter>
                  <ReferenceDot
                    x={frontierResult.maxSharpe.volatility * 100}
                    y={frontierResult.maxSharpe.expectedReturn * 100}
                    r={7}
                    fill="var(--color-accent)"
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                  <ReferenceDot
                    x={frontierResult.minVariance.volatility * 100}
                    y={frontierResult.minVariance.expectedReturn * 100}
                    r={7}
                    fill="var(--color-warning)"
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-5 text-[11px] text-zinc-600">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }} /> Max-Sharpe tangency</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-warning)' }} /> Minimum variance</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-info" /> Frontier portfolios</span>
            </div>
            <table className="sr-only">
              <caption>Key portfolios on the efficient frontier</caption>
              <thead>
                <tr><th>Portfolio</th><th>Expected return</th><th>Volatility</th><th>Sharpe</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Maximum Sharpe</td>
                  <td>{formatPercent(frontierResult.maxSharpe.expectedReturn * 100)}</td>
                  <td>{formatPercent(frontierResult.maxSharpe.volatility * 100)}</td>
                  <td>{frontierResult.maxSharpe.sharpe.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Minimum Variance</td>
                  <td>{formatPercent(frontierResult.minVariance.expectedReturn * 100)}</td>
                  <td>{formatPercent(frontierResult.minVariance.volatility * 100)}</td>
                  <td>{frontierResult.minVariance.sharpe.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-xs text-zinc-600">
            Frontier unavailable — the calibrated market data bundle has not loaded yet. Ensure the market database is reachable, then revisit this section.
          </p>
        )}
      </Card>
    </div>
  );
};

/** Strategic weights for each SAA model. Black-Litterman blends equilibrium with advisor views. */
function computeModelWeights(
  model: 'mvo' | 'riskParity' | 'blackLitterman',
  blViewReturn: number,
  blConfidence: number,
): Record<AssetCategory, number> {
  if (model === 'mvo') {
    return { equity: 62, debt: 24, gold: 10, realestate: 0, liquid: 4, other: 0 };
  }
  if (model === 'riskParity') {
    return { equity: 35, debt: 45, gold: 15, realestate: 0, liquid: 5, other: 0 };
  }
  const baseEq = 55;
  const viewEffect = (blViewReturn / 10) * (blConfidence / 100) * 12;
  const equity = Math.min(75, Math.max(30, Math.round(baseEq + viewEffect)));
  const remaining = 100 - equity;
  const debt = Math.round(remaining * 0.65);
  const gold = Math.round(remaining * 0.25);
  const liquid = 100 - equity - debt - gold;
  return { equity, debt, gold, realestate: 0, liquid, other: 0 };
}

/** Piecewise-linear equity weight for a preset glide path at a given age. */
function interpolateGlide(points: { age: number; equity: number }[], age: number): number {
  if (age <= points[0].age) return points[0].equity;
  for (let i = 1; i < points.length; i++) {
    if (age <= points[i].age) {
      const prev = points[i - 1];
      const next = points[i];
      const t = (age - prev.age) / (next.age - prev.age || 1);
      return Math.round(prev.equity + (next.equity - prev.equity) * t);
    }
  }
  return points[points.length - 1].equity;
}
