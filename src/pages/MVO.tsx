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
  Globe,
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
import { Alert } from '../components/ui/Alert';
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
  const { addAsset, updateAsset, inputs, assumptions, riskProfile } = useCalculator();
  const { data, loading, progress, error, fetchData } = useMarketData();

  const defaultRange = useMemo(() => getDefaultDateRange(3), []);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_ALLOCATION_SYMBOLS);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);

  const mvoResult: MVOResult | null = useMemo(() => {
    const options = { samples: 10000, riskFreeRate: riskProfile.riskFreeRate / 100 };
    if (data) {
      return runMVO(data.symbols, data.stats.map((s) => s.annualizedReturn), data.covariance, options);
    }
    // Fallback to assumption-driven MVO across broad asset categories
    const cats: AssetCategory[] = ['equity', 'debt', 'gold', 'liquid', 'other'];
    const means = cats.map((c) => assumptions.categories[c].mean);
    const cov = cats.map((i) => cats.map((j) => assumptions.covariance[i][j]));
    return runMVO(cats, means, cov, { ...options, samples: 8000 });
  }, [data, assumptions, riskProfile.riskFreeRate]);

  const symbolsForDisplay = useMemo(() => {
    if (data) return data.symbols;
    return ['equity', 'debt', 'gold', 'liquid', 'other'];
  }, [data]);

  const instrumentsForDisplay = useMemo(() => {
    if (data) return data.instruments;
    return symbolsForDisplay.map((s) => ({
      symbol: s,
      name: s.charAt(0).toUpperCase() + s.slice(1),
      category: s === 'gold' ? 'gold' : s === 'debt' || s === 'liquid' ? 'debt' : s === 'other' ? 'commodity' : 'index',
    })) as typeof INSTRUMENTS;
  }, [data, symbolsForDisplay]);

  const frontierData = useMemo(() => {
    if (!mvoResult) return [];
    return mvoResult.frontier
      .filter((p) => p.volatility * 100 <= riskProfile.targetVolatility * 1.2)
      .map((p) => ({ risk: p.volatility * 100, return: p.expectedReturn * 100, sharpe: p.sharpe }));
  }, [mvoResult, riskProfile.targetVolatility]);

  const maxSharpeEquityPct = useMemo(() => {
    if (!mvoResult) return 0;
    return mvoResult.maxSharpe.weights.reduce((sum, w, i) => {
      const symbol = mvoResult.symbols[i];
      const isEquity = data
        ? data.instruments[i]?.category === 'index' || data.instruments[i]?.category === 'equity'
        : symbol === 'equity';
      return sum + (isEquity ? w : 0);
    }, 0) * 100;
  }, [mvoResult, data]);

  const highlightedPortfolios = useMemo(() => {
    if (!mvoResult) return [];
    const strategies = [
      { key: 'maxSharpe', label: 'Max Sharpe', portfolio: mvoResult.maxSharpe, color: '#B68B40' },
      { key: 'minVariance', label: 'Min Variance', portfolio: mvoResult.minVariance, color: '#1A233A' },
      { key: 'equalWeight', label: 'Equal Weight', portfolio: mvoResult.equalWeight, color: '#2E7D32' },
      { key: 'riskParity', label: 'Risk Parity', portfolio: mvoResult.riskParity, color: '#8D6E63' },
    ];
    return strategies.map((s) => ({ ...s, risk: s.portfolio.volatility * 100, return: s.portfolio.expectedReturn * 100 }));
  }, [mvoResult]);

  const correlationMatrix = useMemo(() => {
    if (!mvoResult) return [];
    const corr = mvoResult.symbols.map((_, i) =>
      mvoResult.symbols.map((__, j) => {
        const cov = mvoResult.covariance[i][j];
        const stdI = Math.sqrt(mvoResult.covariance[i][i]);
        const stdJ = Math.sqrt(mvoResult.covariance[j][j]);
        return stdI > 0 && stdJ > 0 ? cov / (stdI * stdJ) : 0;
      }),
    );
    return mvoResult.symbols.map((sym, i) => ({
      symbol: sym,
      values: corr[i].map((v, j) => ({ symbol: mvoResult.symbols[j], value: v })),
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
    if (!data) {
      // When using fallback assumptions, apply category weights to SIP split instead of adding assets
      const cats = ['equity', 'debt', 'gold', 'liquid', 'other'] as AssetCategory[];
      const eqWeight = portfolio.weights[cats.indexOf('equity')] || 0;
      const debtWeight = portfolio.weights[cats.indexOf('debt')] || 0;
      const total = eqWeight + debtWeight;
      if (total > 0) {
        // Update SIP split proportionally
        // We can't directly update SIP here without context helper, so we just alert
        alert(`${strategyName} weights: Equity ${(eqWeight * 100).toFixed(1)}%, Debt ${(debtWeight * 100).toFixed(1)}%. Apply this in Master Plan > Cashflows.`);
      }
      setAppliedStrategy(strategyName);
      setTimeout(() => setAppliedStrategy(null), 3000);
      return;
    }

    const existingIds = new Set(inputs.assets.filter((a) => selectedSymbols.includes(a.name)).map((a) => a.id));
    existingIds.forEach((id) => updateAsset(id as string, { value: 0 }));

    portfolio.weights.forEach((w, idx) => {
      const symbol = data.symbols[idx];
      const instrument = INSTRUMENTS.find((i) => i.symbol === symbol);
      const category = (categoryMap[instrument?.category || ''] || 'other') as AssetCategory;
      const returnPct = (data.stats[idx]?.annualizedReturn || 0.08) * 100;
      addAsset({
        name: `${instrument?.name || symbol} (${strategyName})`,
        value: Math.round(w * 10000000),
        returnRate: Math.max(0, Math.min(30, returnPct)),
        category,
      });
    });
    setAppliedStrategy(strategyName);
    setTimeout(() => setAppliedStrategy(null), 3000);
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) => (prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Asset Allocation Optimizer"
        subtitle="Mean-variance optimization using Angel One daily history. When live data is unavailable, the engine falls back to the category assumption set."
        badge="Quant Lab"
      />

      {!data && (
        <Alert variant="warning" icon={Globe}>
          Running in assumption mode. Connect Angel One SmartAPI and fetch live data for instrument-level MVO.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Risk Profile</div>
          <div className="text-xl font-serif text-navy mt-1">{riskProfile.label}</div>
          <div className="text-xs text-stone-500 mt-1">Max equity {formatPercent(riskProfile.maxEquity)} · Vol target {formatPercent(riskProfile.targetVolatility)}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Risk-Free Rate</div>
          <div className="text-xl font-serif text-navy mt-1">{formatPercent(riskProfile.riskFreeRate)}</div>
          <div className="text-xs text-stone-500 mt-1">Used for Sharpe ratio calculation</div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Frontier Filter</div>
          <div className="text-xl font-serif text-navy mt-1">≤ {formatPercent(riskProfile.targetVolatility * 1.2)}</div>
          <div className="text-xs text-stone-500 mt-1">Volatility cap for displayed frontier</div>
        </Card>
      </div>

      {mvoResult && maxSharpeEquityPct > riskProfile.maxEquity && (
        <Alert variant="warning" icon={AlertCircle}>
          The max-Sharpe portfolio exceeds your risk profile's equity limit ({formatPercent(riskProfile.maxEquity)}). Consider the Min-Variance portfolio or adjust your risk profile.
        </Alert>
      )}

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
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Select Benchmarks / ETFs</label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.filter((i) => i.benchmark || ['NIFTYBEES', 'GOLDBEES', 'LIQUIDBEES'].includes(i.symbol)).map((inst) => {
                const selected = selectedSymbols.includes(inst.symbol);
                return (
                  <button
                    key={inst.symbol}
                    onClick={() => toggleSymbol(inst.symbol)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-navy text-white border-navy' : 'bg-white text-stone-600 border-stone-200 hover:border-navy'}`}
                  >
                    {inst.name}
                  </button>
                );
              })}
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
                <RefreshCw size={16} className="animate-spin" /> Fetching {progress.currentSymbol} ({progress.completed}/{progress.total})
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
            <li className="flex gap-2"><Check size={16} className="text-gold shrink-0 mt-0.5" /> Quantify risk/return trade-offs using real historical daily data.</li>
            <li className="flex gap-2"><Check size={16} className="text-gold shrink-0 mt-0.5" /> Identify the maximum-Sharpe and minimum-variance strategic portfolios.</li>
            <li className="flex gap-2"><Check size={16} className="text-gold shrink-0 mt-0.5" /> Export optimized weights directly into the Master Plan.</li>
            <li className="flex gap-2"><Check size={16} className="text-gold shrink-0 mt-0.5" /> Assumption mode works offline using category mean/variance/correlation.</li>
          </ul>
        </Card>
      </div>

      {mvoResult && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-6">Efficient Frontier</h3>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis type="number" dataKey="risk" name="Risk" unit="%" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} label={{ value: 'Annualized Volatility', position: 'insideBottom', offset: -5, fill: '#78716c', fontSize: 12 }} />
                    <YAxis type="number" dataKey="return" name="Return" unit="%" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', fill: '#78716c', fontSize: 12 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={((value: number) => `${value.toFixed(2)}%`) as any} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Scatter data={frontierData} fill="#1A233A" opacity={0.4} />
                    {highlightedPortfolios.map((p) => (
                      <ReferenceDot key={p.key} x={p.risk} y={p.return} r={6} fill={p.color} stroke="none" label={{ value: p.label, position: 'top', fill: p.color, fontSize: 11, fontWeight: 700 }} />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">Correlation Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                      <th className="py-2 pr-2">Asset</th>
                      {correlationMatrix.map((row) => (
                        <th key={row.symbol} className="py-2 pr-2 text-right">{row.symbol.slice(0, 6)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationMatrix.map((row, i) => (
                      <tr key={row.symbol} className="border-b border-stone-100">
                        <td className="py-2 pr-2 font-medium text-navy">{row.symbol.slice(0, 8)}</td>
                        {row.values.map((cell, j) => (
                          <td key={j} className="py-2 pr-2 text-right font-mono" style={{ color: i === j ? '#1A233A' : cell.value > 0.5 ? '#B68B40' : '#78716c' }}>
                            {cell.value.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Risk / Return Profile</h3>
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
                  {data?.stats.map((s, idx) => {
                    const inst = data.instruments[idx];
                    return (
                      <tr key={s.symbol}>
                        <td className="py-2 pr-4 font-medium text-navy">{inst?.name || s.symbol}</td>
                        <td className="py-2 pr-4 text-right font-mono">{formatPercent(s.annualizedReturn * 100)}</td>
                        <td className="py-2 pr-4 text-right font-mono">{formatPercent(s.annualizedVolatility * 100)}</td>
                        <td className="py-2 pr-4 text-right font-mono">{s.sharpeRatio.toFixed(2)}</td>
                        <td className="py-2 pr-4 text-right font-mono text-rose-600">{formatPercent(s.maxDrawdown * 100)}</td>
                      </tr>
                    );
                  })}
                  {!data && assumptions && (
                    <>
                      {(['equity', 'debt', 'gold', 'liquid', 'other'] as AssetCategory[]).map((cat) => (
                        <tr key={cat}>
                          <td className="py-2 pr-4 font-medium text-navy capitalize">{cat}</td>
                          <td className="py-2 pr-4 text-right font-mono">{formatPercent(assumptions.categories[cat].mean * 100)}</td>
                          <td className="py-2 pr-4 text-right font-mono">{formatPercent(assumptions.categories[cat].std * 100)}</td>
                          <td className="py-2 pr-4 text-right font-mono">{((assumptions.categories[cat].mean - 0.06) / assumptions.categories[cat].std).toFixed(2)}</td>
                          <td className="py-2 pr-4 text-right font-mono text-rose-600">—</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

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
                      const inst = instrumentsForDisplay[idx];
                      const color = ASSET_COLORS[(categoryMap[inst?.category || ''] || 'other') as keyof typeof ASSET_COLORS];
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            {inst?.name || symbolsForDisplay[idx]}
                          </span>
                          <span className="font-mono font-medium">{(w * 100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => applyWeights(strategy.portfolio, strategy.label)}>
                    {appliedStrategy === strategy.label ? (
                      <><Check size={14} className="mr-1" /> Applied</>
                    ) : (
                      <>Apply to Plan <ArrowRight size={14} className="ml-1" /></>
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
