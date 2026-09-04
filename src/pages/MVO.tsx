import { useState, useMemo, useEffect, useId } from 'react';
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Activity,
  ShieldCheck,
  Check,
  Layers,
  ArrowRight,
  Globe,
  Calendar,
  Database,
  Sliders,
  PieChart,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Slider } from '../components/ui/Slider';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { useMarketData } from '../hooks/useMarketData';
import { INSTRUMENTS, DEFAULT_ALLOCATION_SYMBOLS } from '../lib/instruments';
import {
  runMVO,
  type Portfolio,
  type ConstraintSet,
  evaluateCustomWeights,
  findPortfolioByVolatility,
} from '../lib/mvo';
import { getMaxHistoryDateRange, alignMarketData } from '../lib/marketData';
import { loadSession, buildDefaultCredentials } from '../lib/smartapi';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { ASSET_COLORS } from '../lib/constants';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { MvoMonteCarloSimulator } from '../components/analytics/MvoMonteCarloSimulator';
import type { AssetCategory, MvoApplyDestination } from '../types';

const FRONTIER_MARGIN = { top: 15, right: 25, bottom: 15, left: 5 };
const FRONTIER_TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08)',
  padding: '10px 14px',
};
const FRONTIER_CURSOR = { strokeDasharray: '3 3' };

const categoryMap: Record<string, AssetCategory> = {
  equity: 'equity',
  index: 'equity',
  debt: 'debt',
  gold: 'gold',
  commodity: 'gold',
};

export const MVO = () => {
  const {
    addAsset,
    removeAsset,
    inputs,
    riskProfile,
    setInputs,
    setManualTargets,
    showToast,
    wealthResult,
    logDecision,
  } = useCalculator();
  const { data, rawBundle, loading, progress, error, fetchData, loadBackendData } = useMarketData();
  const baseId = useId();
  const fieldId = (name: string) => `${baseId}-${name}`;

  const maxRange = useMemo(() => getMaxHistoryDateRange(), []);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_ALLOCATION_SYMBOLS);
  const [from, setFrom] = useState(maxRange.from);
  const [to, setTo] = useState(maxRange.to);
  const [maxEquity, setMaxEquity] = useState(riskProfile.maxEquity);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);
  const [selectedSimStrategy, setSelectedSimStrategy] = useState<'maxSharpe' | 'minVariance' | 'equalWeight' | 'riskParity'>('maxSharpe');

  // Frontier interactive scrub slider
  const [scrubVolatility, setScrubVolatility] = useState<number | null>(null);

  // Apply MVO Strategy Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStrategy, setTargetStrategy] = useState<{ portfolio: Portfolio; label: string } | null>(null);
  const [applyDestination, setApplyDestination] = useState<MvoApplyDestination>('targets');
  const [lumpsumAmount, setLumpsumAmount] = useState<number>(5000000);

  // Load the backend bundle once on mount
  useEffect(() => {
    loadBackendData(DEFAULT_ALLOCATION_SYMBOLS, from, to);
  }, [loadBackendData, from, to]);

  // Re-align data when selected symbol set changes
  const alignedData = useMemo(() => {
    if (!rawBundle) return data;
    if (selectedSymbols.length < 2) return data;
    try {
      return alignMarketData(rawBundle, selectedSymbols);
    } catch {
      return data;
    }
  }, [data, rawBundle, selectedSymbols]);

  // Compute MVO results
  const { result: mvoResult, error: mvoError } = useMemo(() => {
    if (!alignedData || alignedData.symbols.length < 2) return { result: null, error: null };

    const equityMask = alignedData.symbols.map((sym) => {
      const inst = INSTRUMENTS.find((i) => i.symbol === sym);
      if (inst) return inst.category === 'index' || inst.category === 'equity';
      const raw = alignedData.instruments.find((i) => i.symbol === sym);
      return raw?.category === 'index' || raw?.category === 'equity';
    });

    const invalidStat = alignedData.stats.find(
      (s) =>
        !Number.isFinite(s.annualizedReturn) ||
        !Number.isFinite(s.annualizedVolatility) ||
        s.annualizedVolatility < 0 ||
        s.annualizedVolatility > 1 ||
        s.annualizedReturn < -1 ||
        s.annualizedReturn > 1,
    );
    if (invalidStat) {
      return {
        result: null,
        error: `Invalid statistics for ${invalidStat.symbol}: volatility is missing/above 100% or annualized return is implausible.`,
        equityMask,
      };
    }

    const means = alignedData.stats.map((s) => s.annualizedReturn);
    const constraints: ConstraintSet = {
      minWeight: alignedData.symbols.map(() => 0),
      maxWeight: alignedData.symbols.map(() => 1),
      maxEquity: maxEquity / 100,
      maxVolatility: riskProfile.targetVolatility / 100,
      equityMask,
    };
    try {
      const result = runMVO(alignedData.symbols, means, alignedData.covariance, {
        samples: 35000,
        riskFreeRate: riskProfile.riskFreeRate / 100,
        constraints,
      });
      if (result.frontier.length === 0) {
        return {
          result: null,
          error: `No feasible solution: no portfolio satisfies the ${formatPercent(riskProfile.targetVolatility)} volatility cap with this asset mix.`,
          equityMask,
        };
      }
      return { result, error: null, equityMask };
    } catch (err: any) {
      return {
        result: null,
        error: `Optimization failed: ${err?.message || 'singular matrix or no feasible solution'}. Try selecting a different mix.`,
        equityMask,
      };
    }
  }, [alignedData, maxEquity, riskProfile.targetVolatility, riskProfile.riskFreeRate]);

  // Frontier chart data points
  const frontierData = useMemo(() => {
    if (!mvoResult) return [];
    return mvoResult.frontier.map((p) => ({
      risk: Math.round(p.volatility * 1000) / 10,
      return: Math.round(p.expectedReturn * 1000) / 10,
      sharpe: p.sharpe,
      weights: p.weights,
    }));
  }, [mvoResult]);

  // Current Portfolio Point in same coordinates
  const currentPortfolioPoint = useMemo(() => {
    if (!alignedData || alignedData.symbols.length < 2) return null;

    const weights = alignedData.symbols.map((sym) => {
      const inst = INSTRUMENTS.find((i) => i.symbol === sym);
      const cat =
        inst?.category === 'index' || inst?.category === 'equity'
          ? 'equity'
          : inst?.category === 'gold'
          ? 'gold'
          : sym.includes('LIQUID')
          ? 'liquid'
          : 'debt';

      const catFraction = wealthResult.currentAllocation[cat] || 0;
      const countInCat = alignedData.symbols.filter((s) => {
        const i2 = INSTRUMENTS.find((x) => x.symbol === s);
        const c2 =
          i2?.category === 'index' || i2?.category === 'equity'
            ? 'equity'
            : i2?.category === 'gold'
            ? 'gold'
            : s.includes('LIQUID')
            ? 'liquid'
            : 'debt';
        return c2 === cat;
      }).length;

      return countInCat > 0 ? catFraction / countInCat : 0;
    });

    const sumW = weights.reduce((a, b) => a + b, 0);
    if (sumW <= 0) return null;
    const normW = weights.map((w) => w / sumW);
    const evaluated = evaluateCustomWeights(
      normW,
      alignedData.stats.map((s) => s.annualizedReturn),
      alignedData.covariance,
      riskProfile.riskFreeRate / 100,
    );

    return {
      portfolio: evaluated,
      risk: Math.round(evaluated.volatility * 1000) / 10,
      return: Math.round(evaluated.expectedReturn * 1000) / 10,
      sharpe: evaluated.sharpe,
    };
  }, [alignedData, wealthResult.currentAllocation, riskProfile.riskFreeRate]);

  // Active scrubbed portfolio along frontier
  const activeScrubPortfolio = useMemo(() => {
    if (!mvoResult || mvoResult.frontier.length === 0) return null;
    const targetVol = (scrubVolatility ?? mvoResult.maxSharpe.volatility * 100) / 100;
    return findPortfolioByVolatility(mvoResult.frontier, targetVol);
  }, [mvoResult, scrubVolatility]);

  const highlightedPortfolios = useMemo(() => {
    if (!mvoResult) return [];
    const strategies = [
      { key: 'maxSharpe', label: 'Max Sharpe (Tangency)', portfolio: mvoResult.maxSharpe, color: '#B68B40' },
      { key: 'minVariance', label: 'Min Variance', portfolio: mvoResult.minVariance, color: '#0F172A' },
      { key: 'equalWeight', label: '1/N Equal Weight', portfolio: mvoResult.equalWeight, color: '#16A34A' },
      { key: 'riskParity', label: 'Risk Parity', portfolio: mvoResult.riskParity, color: '#9333EA' },
    ];
    return strategies.map((s) => ({
      ...s,
      risk: Math.round(s.portfolio.volatility * 1000) / 10,
      return: Math.round(s.portfolio.expectedReturn * 1000) / 10,
    }));
  }, [mvoResult]);

  const correlationMatrix = useMemo(() => {
    if (!alignedData) return [];
    return alignedData.symbols.map((sym, i) => ({
      symbol: sym,
      values: alignedData.correlation[i].map((v, j) => ({ symbol: alignedData.symbols[j], value: v })),
    }));
  }, [alignedData]);

  const historyDays = useMemo(() => {
    if (!alignedData || alignedData.prices.length === 0) return 0;
    return alignedData.prices[0].dates.length;
  }, [alignedData]);

  const isDateRangeValid = from && to && from < to;

  const handleBackendFetch = async () => {
    if (!isDateRangeValid) {
      showToast('Invalid date range: "From" must be earlier than "To".', 'warning');
      return;
    }
    await loadBackendData(selectedSymbols, from, to);
  };

  const handleAngelFetch = async () => {
    const session = loadSession();
    if (!session) {
      showToast('Please connect to Angel One SmartAPI first via the Angel Connect page.', 'warning');
      return;
    }
    if (!isDateRangeValid) {
      showToast('Invalid date range: "From" must be earlier than "To".', 'warning');
      return;
    }
    const fetchable = selectedSymbols.filter((s) => !!INSTRUMENTS.find((i) => i.symbol === s)?.token);
    if (fetchable.length === 0) {
      showToast('None of the selected symbols can be fetched via SmartAPI. Use backend data.', 'warning');
      return;
    }
    const creds = buildDefaultCredentials();
    await fetchData(fetchable, from, to, creds, session);
  };

  const openApplyModal = (portfolio: Portfolio, label: string) => {
    setTargetStrategy({ portfolio, label });
    setModalOpen(true);
  };

  const executeStrategyApplication = () => {
    if (!targetStrategy || !alignedData) return;
    const { portfolio, label } = targetStrategy;

    const targets = { ...riskProfile.targets };
    const total = portfolio.weights.reduce((a, b) => a + b, 0);
    (Object.keys(targets) as AssetCategory[]).forEach((cat) => (targets[cat] = 0));

    portfolio.weights.forEach((w, idx) => {
      const symbol = alignedData.symbols[idx];
      const inst = INSTRUMENTS.find((i) => i.symbol === symbol) || alignedData.instruments[idx];
      let category: AssetCategory = 'other';
      if (inst) {
        if (inst.category === 'index' || inst.category === 'equity') category = 'equity';
        else if (inst.category === 'gold') category = 'gold';
        else if (inst.category === 'debt') {
          category = symbol.includes('LIQUID') ? 'liquid' : 'debt';
        } else if (inst.category === 'commodity') category = 'other';
        else if (categoryMap[inst.category]) category = categoryMap[inst.category];
      }
      targets[category] += total > 0 ? (w / total) * 100 : 0;
    });

    const targetTotal = Object.values(targets).reduce((a, b) => a + b, 0);
    if (targetTotal > 0) {
      (Object.keys(targets) as AssetCategory[]).forEach((cat) => (targets[cat] = (targets[cat] / targetTotal) * 100));
    }

    const equityPlusDebt = targets.equity + targets.debt;
    const equitySplit = equityPlusDebt > 0 ? Math.round((targets.equity / equityPlusDebt) * 100) : 50;

    if (applyDestination === 'targets') {
      setManualTargets(targets);
      logDecision({
        category: 'allocation',
        actionTitle: `Applied ${label} to Strategic Targets`,
        summary: `Strategic targets updated to ${Math.round(targets.equity)}% Eq / ${Math.round(targets.debt)}% Debt / ${Math.round(targets.gold)}% Gold.`,
        newValue: `${Math.round(targets.equity)}% Eq / ${Math.round(targets.debt)}% Debt`,
        rationale: `Applied mathematically optimal weights from ${label} portfolio optimization.`,
        author: 'Adviser',
      });
      showToast(`Applied ${label} weights to Strategic Targets!`, 'success');
    } else if (applyDestination === 'sip') {
      setInputs((prev) => ({
        ...prev,
        sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      }));
      logDecision({
        category: 'sip',
        actionTitle: `Applied ${label} to Monthly SIP Split`,
        summary: `Monthly SIP split updated to ${equitySplit}% Equity and ${100 - equitySplit}% Debt.`,
        newValue: `${equitySplit}% Eq / ${100 - equitySplit}% Debt`,
        rationale: `Aligned incremental cash injections with ${label} optimal asset weights.`,
        author: 'Adviser',
      });
      showToast(`Updated Monthly SIP split to ${equitySplit}% Eq / ${100 - equitySplit}% Debt!`, 'success');
    } else if (applyDestination === 'stp') {
      setInputs((prev) => ({
        ...prev,
        stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
      }));
      showToast(`Updated STP deployment split to ${equitySplit}% Eq / ${100 - equitySplit}% Debt!`, 'success');
    } else if (applyDestination === 'portfolio') {
      const existingMvoIds = inputs.assets.filter((a) => a.source === 'mvo').map((a) => a.id);
      existingMvoIds.forEach((id) => removeAsset(id));

      portfolio.weights.forEach((w, idx) => {
        const symbol = alignedData.symbols[idx];
        const instrument = INSTRUMENTS.find((i) => i.symbol === symbol) || alignedData.instruments[idx];
        let category: AssetCategory = 'other';
        if (instrument) {
          if (instrument.category === 'index' || instrument.category === 'equity') category = 'equity';
          else if (instrument.category === 'gold') category = 'gold';
          else if (instrument.category === 'debt') {
            category = symbol.includes('LIQUID') ? 'liquid' : 'debt';
          } else if (categoryMap[instrument.category]) category = categoryMap[instrument.category];
        }
        const returnPct = (alignedData.stats[idx]?.annualizedReturn || 0.08) * 100;
        const value = Math.round(w * (wealthResult?.netWorth || 10000000));
        if (value <= 0) return;
        addAsset({
          name: `${instrument?.name || symbol} (${label})`,
          value,
          returnRate: Math.max(0, Math.min(30, returnPct)),
          category,
          source: 'mvo',
        });
      });
      showToast(`Replaced portfolio holdings with ${label} proxy allocation.`, 'success');
    } else if (applyDestination === 'investment') {
      // New Lumpsum Investment with exact calculated amounts
      portfolio.weights.forEach((w, idx) => {
        const symbol = alignedData.symbols[idx];
        const instrument = INSTRUMENTS.find((i) => i.symbol === symbol) || alignedData.instruments[idx];
        let category: AssetCategory = 'other';
        if (instrument) {
          if (instrument.category === 'index' || instrument.category === 'equity') category = 'equity';
          else if (instrument.category === 'gold') category = 'gold';
          else if (instrument.category === 'debt') {
            category = symbol.includes('LIQUID') ? 'liquid' : 'debt';
          } else if (categoryMap[instrument.category]) category = categoryMap[instrument.category];
        }
        const returnPct = (alignedData.stats[idx]?.annualizedReturn || 0.08) * 100;
        const allocatedValue = Math.round(w * lumpsumAmount);
        if (allocatedValue <= 0) return;

        addAsset({
          name: `${instrument?.name || symbol} (${label} Investment)`,
          value: allocatedValue,
          returnRate: Math.max(0, Math.min(30, returnPct)),
          category,
          source: 'mvo-lumpsum',
        });
      });

      logDecision({
        category: 'allocation',
        actionTitle: `Deployed ${formatCurrencyCompact(lumpsumAmount)} via ${label}`,
        summary: `Created ${portfolio.weights.filter((w) => w > 0.01).length} holdings across ${alignedData.symbols.length} instruments according to ${label} weights.`,
        newValue: formatCurrencyCompact(lumpsumAmount),
        rationale: `Lumpsum capital deployment executed using quantitative mean-variance weights.`,
        author: 'Adviser',
      });
      showToast(`Successfully deployed ${formatCurrencyCompact(lumpsumAmount)} into household assets!`, 'success');
    }

    setAppliedStrategy(label);
    setModalOpen(false);
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };

  const sourceLabel = data?.source === 'angel' ? 'Angel One SmartAPI' : data?.source === 'yahoo' ? 'Yahoo Finance' : 'Assumption mode';

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionTitle
          title="Mean-Variance Portfolio Optimizer"
          subtitle="Empirical Markowitz optimization built from daily market return histories. Evaluates Capital Market Line (CML) tangency, risk parity, and asset allocation stress testing."
          badge="Quant Lab"
        />

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant="gold" className="text-xs px-3 py-1 font-mono">
            Rf Rate: {formatPercent(riskProfile.riskFreeRate)}
          </Badge>
          <Badge variant="navy" className="text-xs px-3 py-1 font-mono">
            {alignedData?.symbols.length || 0} Assets
          </Badge>
        </div>
      </div>

      {!data && !loading && (
        <Alert variant="warning" icon={Globe}>
          Backend market-data bundle not loaded. The optimizer is running in assumption mode. Connect Angel One SmartAPI for live instrument-level data.
        </Alert>
      )}

      {/* Topline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Risk Profile Anchor"
          value={riskProfile.label}
          subtext={`Max Eq ${formatPercent(riskProfile.maxEquity)} · Vol ${formatPercent(riskProfile.targetVolatility)}`}
          icon={<ShieldCheck size={16} />}
        />
        <MetricCard
          label="Tangency Sharpe Ratio"
          value={mvoResult ? mvoResult.maxSharpe.sharpe.toFixed(2) : '—'}
          subtext={`Optimal excess return per unit risk`}
          icon={<TrendingUp size={16} />}
          variant="gold"
        />
        <MetricCard
          label="Historical Daily Horizon"
          value={historyDays > 0 ? `${historyDays} Days` : '—'}
          subtext={alignedData ? `${alignedData.dateRange.from} → ${alignedData.dateRange.to}` : 'Default universe'}
          icon={<Calendar size={16} />}
        />
        <MetricCard
          label="Market Data Engine"
          value={sourceLabel}
          subtext={`${data?.symbols.length || 0} extracted instruments`}
          icon={<Database size={16} />}
        />
      </div>

      {mvoError && (
        <Alert variant="danger" icon={AlertCircle}>
          <strong>Optimization Error:</strong> {mvoError}
        </Alert>
      )}

      {/* Controls & Universe Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-slate-500" /> Universe & Constraints
            </h3>
            <Badge variant="outline">{selectedSymbols.length} Assets Selected</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={fieldId('from')} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={12} /> From
              </label>
              <input
                id={fieldId('from')}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label htmlFor={fieldId('to')} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={12} /> To
              </label>
              <input
                id={fieldId('to')}
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Asset Universe ({data?.symbols.length || 0} Available)
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 text-[11px] mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSymbols(DEFAULT_ALLOCATION_SYMBOLS)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium"
                >
                  India Classic
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSymbols(
                      ['NIFTY50', 'SPY', 'QQQ', 'GOLDBEES', 'BND', 'LIQUIDBEES'].filter((s) =>
                        (data?.symbols || []).includes(s),
                      ),
                    )
                  }
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium"
                >
                  Global Multi-Asset
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSymbols(data?.symbols || DEFAULT_ALLOCATION_SYMBOLS)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium"
                >
                  All Available
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(data?.symbols || DEFAULT_ALLOCATION_SYMBOLS).map((symbol) => {
                const instrument = INSTRUMENTS.find((i) => i.symbol === symbol);
                const selected = selectedSymbols.includes(symbol);
                return (
                  <button
                    key={symbol}
                    onClick={() => toggleSymbol(symbol)}
                    title={instrument?.name || symbol}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {instrument?.name || symbol}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Slider
              label={`Maximum Strategic Equity Constraint (${formatPercent(maxEquity)})`}
              value={maxEquity}
              onChange={setMaxEquity}
              min={0}
              max={100}
              step={1}
              suffix="%"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-rose-50 text-rose-800 border border-rose-200">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleBackendFetch} disabled={loading || selectedSymbols.length < 2} className="flex-1 py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Fetching ({progress.completed}/{progress.total})
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <BarChart3 size={16} /> Recalibrate Empirical Data
                </span>
              )}
            </Button>
            <Button onClick={handleAngelFetch} variant="outline" disabled={loading || selectedSymbols.length < 2} className="py-2.5">
              <Globe size={16} className="mr-2" /> Live SmartAPI Fetch
            </Button>
          </div>
        </Card>

        {/* Quant Philosophy Card */}
        <Card className="bg-slate-950 text-white relative overflow-hidden border border-slate-800 flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ShieldCheck size={140} />
          </div>
          <div className="space-y-4">
            <Badge variant="gold" className="text-[10px] uppercase font-mono">
              Theoretical Foundation
            </Badge>
            <h3 className="text-xl font-serif text-white font-bold">Markowitz Modern Portfolio Theory</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              MVO identifies portfolios that maximize expected return for a given level of risk. The Capital Market Line (CML) defines the optimal combinations of the risk-free asset and the risky tangency portfolio.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <li className="flex gap-2">
                <Check size={14} className="text-amber-400 shrink-0 mt-0.5" />
                Tangency Portfolio achieves highest Sharpe ratio along the frontier.
              </li>
              <li className="flex gap-2">
                <Check size={14} className="text-amber-400 shrink-0 mt-0.5" />
                Risk Parity balances marginal risk contribution across all assets.
              </li>
              <li className="flex gap-2">
                <Check size={14} className="text-amber-400 shrink-0 mt-0.5" />
                Apply weights to SIP, Lumpsum Deployments, or Strategic Targets.
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            Calibrated on {alignedData?.symbols.length || 0} assets with {historyDays} daily return rows.
          </div>
        </Card>
      </div>

      {mvoResult && (
        <>
          {/* Efficient Frontier & Capital Market Line Chart */}
          <Card className="border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={20} className="text-slate-800" />
                  Parametric Efficient Frontier & Capital Market Line (CML)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Interactive risk-return frontier with constituent assets and current client portfolio position.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-900 inline-block" />
                  Frontier
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <span className="w-3 h-0.5 bg-amber-600 border-t border-dashed inline-block" />
                  CML Tangency Ray
                </span>
                {currentPortfolioPoint && (
                  <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Current Portfolio
                  </span>
                )}
              </div>
            </div>

            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={frontierData} margin={FRONTIER_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="risk"
                    name="Risk"
                    unit="%"
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Annualized Volatility (Risk)', position: 'insideBottom', offset: -8, fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="return"
                    name="Return"
                    unit="%"
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'Annualized Expected Return', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={FRONTIER_CURSOR}
                    formatter={((value: number) => `${value.toFixed(2)}%`) as any}
                    contentStyle={FRONTIER_TOOLTIP_STYLE}
                  />
                  <Line dataKey="return" stroke="#0f172a" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />

                  {/* Highlighted Strategic Portfolios */}
                  {highlightedPortfolios.map((p) => (
                    <ReferenceDot
                      key={p.key}
                      x={p.risk}
                      y={p.return}
                      r={7}
                      fill={p.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      label={{ value: p.label, position: 'top', fill: p.color, fontSize: 10, fontWeight: 700 }}
                    />
                  ))}

                  {/* Constituent Assets */}
                  {mvoResult.assets.map((a) => (
                    <ReferenceDot
                      key={a.symbol}
                      x={Math.round(a.volatility * 1000) / 10}
                      y={Math.round(a.expectedReturn * 1000) / 10}
                      r={4}
                      fill="#94a3b8"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      label={{ value: a.symbol, position: 'bottom', fill: '#64748b', fontSize: 9 }}
                    />
                  ))}

                  {/* Current Portfolio "You Are Here" Marker */}
                  {currentPortfolioPoint && (
                    <ReferenceDot
                      x={currentPortfolioPoint.risk}
                      y={currentPortfolioPoint.return}
                      r={8}
                      fill="#ea580c"
                      stroke="#ffffff"
                      strokeWidth={2.5}
                      label={{ value: 'You Are Here (Current)', position: 'top', fill: '#ea580c', fontSize: 11, fontWeight: 800 }}
                    />
                  )}

                  {/* Active Scrubbed Point */}
                  {activeScrubPortfolio && (
                    <ReferenceDot
                      x={Math.round(activeScrubPortfolio.volatility * 1000) / 10}
                      y={Math.round(activeScrubPortfolio.expectedReturn * 1000) / 10}
                      r={6}
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth={2}
                      label={{ value: 'Target Risk', position: 'bottom', fill: '#2563eb', fontSize: 10, fontWeight: 700 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Frontier Scrub Slider & Live Inspection */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Frontier Risk Scrub Slider:
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    Target Volatility {scrubVolatility ? `${scrubVolatility.toFixed(1)}%` : `${(mvoResult.maxSharpe.volatility * 100).toFixed(1)}%`}
                  </span>
                </div>

                {activeScrubPortfolio && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openApplyModal(activeScrubPortfolio, `Custom ${scrubVolatility?.toFixed(1) || ''}% Vol`)}
                    className="text-xs h-7 px-3"
                  >
                    Apply Scrubbed Portfolio <ArrowRight size={12} className="ml-1" />
                  </Button>
                )}
              </div>

              <input
                type="range"
                min={Math.round(mvoResult.minVariance.volatility * 100)}
                max={Math.min(25, Math.round(Math.max(...mvoResult.frontier.map((p) => p.volatility)) * 100))}
                step={0.1}
                value={scrubVolatility ?? mvoResult.maxSharpe.volatility * 100}
                onChange={(e) => setScrubVolatility(parseFloat(e.target.value))}
                className="w-full accent-slate-900"
              />

              {activeScrubPortfolio && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Expected Return</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatPercent(activeScrubPortfolio.expectedReturn * 100)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Annual Volatility</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {formatPercent(activeScrubPortfolio.volatility * 100)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Sharpe Ratio</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {activeScrubPortfolio.sharpe.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Top Asset Weight</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {Math.max(...activeScrubPortfolio.weights.map((w) => Math.round(w * 100)))}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { key: 'maxSharpe', label: 'Max Sharpe (Tangency)', portfolio: mvoResult.maxSharpe, icon: TrendingUp },
              { key: 'minVariance', label: 'Min Variance', portfolio: mvoResult.minVariance, icon: ShieldCheck },
              { key: 'equalWeight', label: '1/N Equal Weight', portfolio: mvoResult.equalWeight, icon: Layers },
              { key: 'riskParity', label: 'Risk Parity', portfolio: mvoResult.riskParity, icon: Activity },
            ].map((strategy) => {
              const Icon = strategy.icon;
              return (
                <Card key={strategy.key} className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                          <Icon size={16} />
                        </div>
                        <h4 className="font-serif font-bold text-slate-900 text-sm">{strategy.label}</h4>
                      </div>
                      {appliedStrategy === strategy.label && (
                        <Badge variant="success" className="text-[9px]">Active</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Return</span>
                        <span className="font-semibold font-mono text-slate-900">
                          {formatPercent(strategy.portfolio.expectedReturn * 100)}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Volatility</span>
                        <span className="font-semibold font-mono text-slate-900">
                          {formatPercent(strategy.portfolio.volatility * 100)}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg col-span-2 flex items-center justify-between">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Sharpe Ratio</span>
                        <span className="font-bold font-mono text-slate-900">
                          {strategy.portfolio.sharpe.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {strategy.portfolio.weights.map((w, idx) => {
                        const inst = alignedData?.instruments[idx];
                        const color = ASSET_COLORS[(categoryMap[inst?.category || ''] || 'other') as keyof typeof ASSET_COLORS];
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-slate-700 truncate max-w-[140px]">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              {inst?.name || alignedData?.symbols[idx]}
                            </span>
                            <span className="font-mono font-semibold text-slate-900">{(w * 100).toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    className="w-full mt-3 bg-slate-900 text-white hover:bg-slate-800 text-xs"
                    onClick={() => openApplyModal(strategy.portfolio, strategy.label)}
                  >
                    Apply Strategy <ArrowRight size={13} className="ml-1" />
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Monte Carlo Simulator Integration */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Stochastic Monte Carlo Testing Engine:
                </span>
                <span className="text-xs text-slate-500">
                  (Comparative simulation calibrated from empirical daily CSV data)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'maxSharpe', label: 'Max Sharpe' },
                  { key: 'minVariance', label: 'Min Variance' },
                  { key: 'equalWeight', label: 'Equal Weight' },
                  { key: 'riskParity', label: 'Risk Parity' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelectedSimStrategy(s.key as any)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      selectedSimStrategy === s.key
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <MvoMonteCarloSimulator
              portfolio={mvoResult[selectedSimStrategy]}
              portfolioName={
                selectedSimStrategy === 'maxSharpe'
                  ? 'Max Sharpe Tangency Portfolio'
                  : selectedSimStrategy === 'minVariance'
                  ? 'Minimum Variance Portfolio'
                  : selectedSimStrategy === 'equalWeight'
                  ? '1/N Equal Weight Portfolio'
                  : 'Risk Parity Portfolio'
              }
              symbols={alignedData?.symbols || []}
              initialWealth={wealthResult?.netWorth || 2500000}
              initialSip={inputs.sip.amount || 50000}
              currentPortfolio={currentPortfolioPoint?.portfolio}
              onApplyToPlan={() => openApplyModal(mvoResult[selectedSimStrategy], selectedSimStrategy)}
              applied={appliedStrategy === selectedSimStrategy}
            />
          </div>

          {/* Correlation Matrix & Stats Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-base font-serif font-bold text-slate-900 mb-4">
                Empirical Correlation Matrix
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-2">Asset</th>
                      {correlationMatrix.map((row) => (
                        <th key={row.symbol} className="py-2 pr-2 text-right">
                          {row.symbol.slice(0, 6)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationMatrix.map((row, i) => (
                      <tr key={row.symbol} className="border-b border-slate-100">
                        <td className="py-2 pr-2 font-bold text-slate-900">{row.symbol.slice(0, 8)}</td>
                        {row.values.map((cell, j) => (
                          <td
                            key={j}
                            className="py-2 pr-2 text-right font-mono"
                            style={{
                              color: i === j ? '#0f172a' : cell.value > 0.5 ? '#b45309' : cell.value < 0 ? '#15803d' : '#64748b',
                              fontWeight: Math.abs(cell.value) > 0.6 ? 700 : 400,
                            }}
                          >
                            {cell.value.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h3 className="text-base font-serif font-bold text-slate-900 mb-4">
                Historical Return & Volatility Spectrum
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-4">Asset</th>
                      <th className="py-2 pr-4 text-right">Ann. Return</th>
                      <th className="py-2 pr-4 text-right">Ann. Vol</th>
                      <th className="py-2 pr-4 text-right">Sharpe</th>
                      <th className="py-2 pr-4 text-right">Max DD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alignedData?.stats.map((s, idx) => {
                      const inst = alignedData.instruments[idx];
                      return (
                        <tr key={s.symbol}>
                          <td className="py-2 pr-4 font-bold text-slate-900">{inst?.name || s.symbol}</td>
                          <td className="py-2 pr-4 text-right font-mono">{formatPercent(s.annualizedReturn * 100)}</td>
                          <td className="py-2 pr-4 text-right font-mono">{formatPercent(s.annualizedVolatility * 100)}</td>
                          <td className="py-2 pr-4 text-right font-mono">{s.sharpeRatio.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-right font-mono text-rose-600 font-medium">
                            {formatPercent(s.maxDrawdown * 100)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Apply MVO Strategy Multi-Option Modal */}
      {modalOpen && targetStrategy && alignedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-drawer-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                  <PieChart size={18} className="text-slate-800" />
                  Apply {targetStrategy.label} Strategy
                </h3>
                <p className="text-xs text-slate-500">Select where to apply these mathematically optimal asset weights.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Destination Options */}
            <div className="space-y-2.5 text-xs">
              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                applyDestination === 'targets' ? 'bg-slate-50 border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="mvoDest"
                  checked={applyDestination === 'targets'}
                  onChange={() => setApplyDestination('targets')}
                  className="mt-0.5 accent-slate-900"
                />
                <div>
                  <span className="font-bold block text-slate-900">Strategic Allocation Policy Targets</span>
                  <span className="text-slate-500 text-[11px]">Updates strategic asset weights across the master plan and portfolio governance.</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                applyDestination === 'sip' ? 'bg-slate-50 border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="mvoDest"
                  checked={applyDestination === 'sip'}
                  onChange={() => setApplyDestination('sip')}
                  className="mt-0.5 accent-slate-900"
                />
                <div>
                  <span className="font-bold block text-slate-900">Future Monthly SIP Cashflow Injection</span>
                  <span className="text-slate-500 text-[11px]">Directs systematic monthly savings into Equity and Debt matching optimal ratios.</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                applyDestination === 'investment' ? 'bg-slate-50 border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="mvoDest"
                  checked={applyDestination === 'investment'}
                  onChange={() => setApplyDestination('investment')}
                  className="mt-0.5 accent-slate-900"
                />
                <div className="flex-1">
                  <span className="font-bold block text-slate-900">Deploy New Lumpsum Investment (Custom ₹)</span>
                  <span className="text-slate-500 text-[11px]">Calculates exact rupee ticket sizes for each instrument and adds to client holdings.</span>
                </div>
              </label>
            </div>

            {/* Custom Lumpsum Input if Selected */}
            {applyDestination === 'investment' && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <CurrencyInput
                  label="Lumpsum Deployment Capital"
                  value={lumpsumAmount}
                  onChange={setLumpsumAmount}
                  helper="Enter the rupee amount to deploy into the market"
                />
                <div className="flex gap-2">
                  {[1000000, 2500000, 5000000, 10000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setLumpsumAmount(amt)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {formatCurrencyCompact(amt)}
                    </button>
                  ))}
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Execution Ticket Breakdown:</span>
                  {targetStrategy.portfolio.weights.map((w, idx) => {
                    const inst = alignedData.instruments[idx];
                    const rupeeVal = Math.round(w * lumpsumAmount);
                    if (rupeeVal <= 0) return null;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none">
                        <span className="font-semibold text-slate-800">{inst?.name || alignedData.symbols[idx]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">{(w * 100).toFixed(1)}%</span>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(rupeeVal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={executeStrategyApplication} className="bg-slate-900 text-white hover:bg-slate-800">
                Confirm &amp; Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <WorkflowFooter
        prev={{ path: '/allocation', label: 'Allocation' }}
        next={{ path: '/reports', label: 'Reports' }}
        flowHint="Empirical MVO establishes mathematically robust strategic weights for the client's investment policy."
      />
    </div>
  );
};
