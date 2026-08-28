import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useMarketData } from '../hooks/useMarketData';
import { INSTRUMENTS, DEFAULT_ALLOCATION_SYMBOLS } from '../lib/instruments';
import { runMVO, type Portfolio, type MVOResult } from '../lib/mvo';
import { getDefaultDateRange } from '../lib/marketData';
import { loadSession, buildDefaultCredentials } from '../lib/smartapi';
import { useCalculator } from '../context/CalculatorContext';
import { formatPercent } from '../lib/formatters';
import { ASSET_COLORS } from '../lib/constants';
import type { AssetCategory } from '../types';

const categoryMap: Record<string, AssetCategory> = {
  equity: 'equity',
  index: 'equity',
  debt: 'debt',
  gold: 'gold',
  commodity: 'gold',
};

export const MVO = () => {
  const { addAsset, updateAsset, inputs } = useCalculator();
  const { data, loading, progress, error, fetchData } = useMarketData();

  const defaultRange = useMemo(() => getDefaultDateRange(3), []);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_ALLOCATION_SYMBOLS);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);

  const mvoResult: MVOResult | null = useMemo(() => {
    if (!data) return null;
    return runMVO(data.symbols, data.stats.map((s) => s.annualizedReturn), data.covariance, {
      samples: 10000,
    });
  }, [data]);

  const frontierData = useMemo(() => {
    return (
      mvoResult?.frontier.map((p) => ({
        risk: p.volatility * 100,
        return: p.expectedReturn * 100,
        sharpe: p.sharpe,
      })) || []
    );
  }, [mvoResult]);

  const highlightedPortfolios = useMemo(() => {
    if (!mvoResult) return [];
    const strategies = [
      { key: 'maxSharpe', label: 'Max Sharpe', portfolio: mvoResult.maxSharpe, color: '#B68B40' },
      { key: 'minVariance', label: 'Min Variance', portfolio: mvoResult.minVariance, color: '#1A233A' },
      { key: 'equalWeight', label: 'Equal Weight', portfolio: mvoResult.equalWeight, color: '#2E7D32' },
      { key: 'riskParity', label: 'Risk Parity', portfolio: mvoResult.riskParity, color: '#8D6E63' },
    ];
    return strategies.map((s) => ({
      ...s,
      risk: s.portfolio.volatility * 100,
      return: s.portfolio.expectedReturn * 100,
    }));
  }, [mvoResult]);

  const handleFetch = async () => {
    const session = loadSession();
    if (!session) {
      alert('Please connect to Angel One SmartAPI first via the Angel Connect page.');
      return;
    }
    const creds = buildDefaultCredentials();
    await fetchData(selectedSymbols, from, to, creds, session);
  };

  const applyWeights = (portfolio: Portfolio, strategyName: string) => {
    if (!data) return;
    // Remove existing MVO assets of the same symbols to avoid duplication
    const existingIds = new Set(inputs.assets.filter((a) => selectedSymbols.includes(a.name)).map((a) => a.id));
    existingIds.forEach((id) => {
      // We cannot remove from context easily; update them to zero instead and they will be hidden
      updateAsset(id as string, { value: 0 });
    });

    portfolio.weights.forEach((w, idx) => {
      const symbol = data.symbols[idx];
      const instrument = INSTRUMENTS.find((i) => i.symbol === symbol);
      const category = (categoryMap[instrument?.category || ''] || 'other') as AssetCategory;
      const returnPct = (data.stats[idx]?.annualizedReturn || 0.08) * 100;
      addAsset({
        name: `${instrument?.name || symbol} (${strategyName})`,
        value: Math.round(w * 10000000), // Use 1 Cr notional for visualization
        returnRate: Math.max(0, Math.min(30, returnPct)),
        category,
      });
    });
    setAppliedStrategy(strategyName);
    setTimeout(() => setAppliedStrategy(null), 3000);
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Asset Allocation Optimizer"
        subtitle="Use live Angel One daily price history to compute risk, return, and the efficient frontier. Build institutional-grade strategic allocations."
        badge="Quant Lab"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <Layers size={18} className="text-gold" /> Universe & Date Range
            </h3>
            <Badge variant="outline">{selectedSymbols.length} assets selected</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Select Benchmarks / ETFs
            </label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.filter((i) => i.benchmark || ['NIFTYBEES', 'GOLDBEES', 'LIQUIDBEES'].includes(i.symbol)).map(
                (inst) => {
                  const selected = selectedSymbols.includes(inst.symbol);
                  return (
                    <button
                      key={inst.symbol}
                      onClick={() => toggleSymbol(inst.symbol)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-navy'
                      }`}
                    >
                      {inst.name}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-rose-50 text-rose-800 border border-rose-200">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <Button onClick={handleFetch} disabled={loading || selectedSymbols.length < 2} className="w-full py-3">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Fetching {progress.currentSymbol} ({progress.completed}/{progress.total})
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <BarChart3 size={18} /> Run MVO Analysis
              </span>
            )}
          </Button>
        </Card>

        <Card className="bg-navy text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ShieldCheck size={120} />
          </div>
          <h3 className="text-lg font-serif text-gold mb-4">Why MVO?</h3>
          <ul className="space-y-3 text-sm text-stone-200">
            <li className="flex gap-2">
              <Check size={16} className="text-gold shrink-0 mt-0.5" />
              Quantify risk/return trade-offs using real historical daily data.
            </li>
            <li className="flex gap-2">
              <Check size={16} className="text-gold shrink-0 mt-0.5" />
              Identify the maximum-Sharpe and minimum-variance strategic portfolios.
            </li>
            <li className="flex gap-2">
              <Check size={16} className="text-gold shrink-0 mt-0.5" />
              Export optimized weights directly into the Master Plan.
            </li>
          </ul>
        </Card>
      </div>

      {mvoResult && data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-6">Efficient Frontier</h3>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis
                      type="number"
                      dataKey="risk"
                      name="Risk"
                      unit="%"
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                      tick={{ fontSize: 12, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Annualized Volatility', position: 'insideBottom', offset: -5, fill: '#78716c', fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="return"
                      name="Return"
                      unit="%"
                      tickFormatter={(v) => `${v.toFixed(1)}%`}
                      tick={{ fontSize: 12, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', fill: '#78716c', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={((value: number) => `${value.toFixed(2)}%`) as any}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Scatter data={frontierData} fill="#1A233A" opacity={0.4} />
                    {highlightedPortfolios.map((p) => (
                      <ReferenceDot
                        key={p.key}
                        x={p.risk}
                        y={p.return}
                        r={6}
                        fill={p.color}
                        stroke="none"
                        label={{ value: p.label, position: 'top', fill: p.color, fontSize: 11, fontWeight: 700 }}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">Historical Risk/Return Profile</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                      <th className="py-2 pr-4">Asset</th>
                      <th className="py-2 pr-4 text-right">Ann. Return</th>
                      <th className="py-2 pr-4 text-right">Ann. Vol</th>
                      <th className="py-2 pr-4 text-right">Sharpe</th>
                      <th className="py-2 pr-4 text-right">Max DD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.stats.map((s, idx) => {
                      const inst = data.instruments[idx];
                      return (
                        <tr key={s.symbol}>
                          <td className="py-2 pr-4 font-medium text-navy">{inst?.name || s.symbol}</td>
                          <td className="py-2 pr-4 text-right font-mono">{formatPercent(s.annualizedReturn * 100)}</td>
                          <td className="py-2 pr-4 text-right font-mono">{formatPercent(s.annualizedVolatility * 100)}</td>
                          <td className="py-2 pr-4 text-right font-mono">{s.sharpeRatio.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-right font-mono text-rose-600">
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { key: 'maxSharpe', label: 'Max Sharpe', portfolio: mvoResult.maxSharpe, icon: TrendingUp, color: 'gold' },
              { key: 'minVariance', label: 'Min Variance', portfolio: mvoResult.minVariance, icon: ShieldCheck, color: 'navy' },
              { key: 'equalWeight', label: 'Equal Weight', portfolio: mvoResult.equalWeight, icon: Layers, color: 'default' },
              { key: 'riskParity', label: 'Risk Parity', portfolio: mvoResult.riskParity, icon: Activity, color: 'default' },
            ].map((strategy) => {
              const Icon = strategy.icon;
              return (
                <Card key={strategy.key} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-navy">
                      <Icon size={16} />
                    </div>
                    <h4 className="font-serif text-navy">{strategy.label}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-stone-400 block text-[10px]">RETURN</span>
                      <span className="font-semibold text-navy">{formatPercent(strategy.portfolio.expectedReturn * 100)}</span>
                    </div>
                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-stone-400 block text-[10px]">VOLATILITY</span>
                      <span className="font-semibold text-navy">{formatPercent(strategy.portfolio.volatility * 100)}</span>
                    </div>
                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-stone-400 block text-[10px]">SHARPE</span>
                      <span className="font-semibold text-navy">{strategy.portfolio.sharpe.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {strategy.portfolio.weights.map((w, idx) => {
                      const inst = data.instruments[idx];
                      const color = ASSET_COLORS[(categoryMap[inst?.category || ''] || 'other') as keyof typeof ASSET_COLORS];
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            {inst?.name || data.symbols[idx]}
                          </span>
                          <span className="font-mono font-medium">{(w * 100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyWeights(strategy.portfolio, strategy.label)}
                  >
                    {appliedStrategy === strategy.label ? (
                      <>
                        <Check size={14} className="mr-1" /> Applied
                      </>
                    ) : (
                      <>
                        Apply to Plan <ArrowRight size={14} className="ml-1" />
                      </>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
