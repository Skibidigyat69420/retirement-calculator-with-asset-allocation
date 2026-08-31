import { useState, useMemo, useEffect } from 'react';
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
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { useMarketData } from '../hooks/useMarketData';
import { INSTRUMENTS, DEFAULT_ALLOCATION_SYMBOLS } from '../lib/instruments';
import { runMVO, type Portfolio, type MVOResult, type ConstraintSet } from '../lib/mvo';
import { getMaxHistoryDateRange, alignMarketData } from '../lib/marketData';
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
  const { addAsset, updateAsset, inputs, riskProfile, setInputs } = useCalculator();
  const { data, rawBundle, loading, progress, error, fetchData, loadBackendData } = useMarketData();

  const maxRange = useMemo(() => getMaxHistoryDateRange(), []);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_ALLOCATION_SYMBOLS);
  const [from, setFrom] = useState(maxRange.from);
  const [to, setTo] = useState(maxRange.to);
  const [maxEquity, setMaxEquity] = useState(riskProfile.maxEquity);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);

  // Load the backend bundle once on mount using maximum-history default symbols.
  useEffect(() => {
    loadBackendData(DEFAULT_ALLOCATION_SYMBOLS, from, to);
  }, [loadBackendData, from, to]);

  // Re-align data when the user changes the selected symbol set.
  const alignedData = useMemo(() => {
    if (!rawBundle) return data;
    if (selectedSymbols.length < 2) return data;
    try {
      return alignMarketData(rawBundle, selectedSymbols);
    } catch {
      return data;
    }
  }, [data, rawBundle, selectedSymbols]);

  const equityMask = useMemo(() => {
    return (alignedData?.instruments || []).map((inst) =>
      inst?.category === 'index' || inst?.category === 'equity',
    );
  }, [alignedData]);

  const mvoComputation = useMemo(() => {
    if (!alignedData || alignedData.symbols.length < 2) return { result: null, error: null };
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
        samples: 30000,
        riskFreeRate: riskProfile.riskFreeRate / 100,
        constraints,
      });
      return { result, error: null };
    } catch (err: any) {
      return { 
        result: null, 
        error: err?.message || 'Optimization failed (e.g. singular matrix). Try selecting a different mix of less-correlated assets.' 
      };
    }
  }, [alignedData, maxEquity, riskProfile.riskFreeRate, riskProfile.targetVolatility, equityMask]);

  const mvoResult = mvoComputation.result;
  const mvoError = mvoComputation.error;

  const frontierData = useMemo(() => {
    if (!mvoResult) return [];
    return mvoResult.frontier
      .filter((p) => p.volatility * 100 <= riskProfile.targetVolatility * 1.2)
      .map((p) => ({ risk: p.volatility * 100, return: p.expectedReturn * 100, sharpe: p.sharpe }));
  }, [mvoResult, riskProfile.targetVolatility]);

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

  const handleBackendFetch = async () => {
    await loadBackendData(selectedSymbols, from, to);
  };

  const handleAngelFetch = async () => {
    const session = loadSession();
    if (!session) {
      alert('Please connect to Angel One SmartAPI first via the Angel Connect page.');
      return;
    }
    const creds = buildDefaultCredentials();
    await fetchData(selectedSymbols, from, to, creds, session);
  };

  const applyWeightsToAllocation = (portfolio: Portfolio, strategyName: string) => {
    if (!alignedData) return;

    const targets = { ...riskProfile.targets };
    const total = portfolio.weights.reduce((a, b) => a + b, 0);

    // Reset category weights.
    (Object.keys(targets) as AssetCategory[]).forEach((cat) => (targets[cat] = 0));

    portfolio.weights.forEach((w, idx) => {
      const symbol = alignedData.symbols[idx];
      const inst = INSTRUMENTS.find((i) => i.symbol === symbol) || alignedData.instruments[idx];
      const category = (categoryMap[inst?.category || ''] || 'other') as AssetCategory;
      targets[category] += total > 0 ? (w / total) * 100 : 0;
    });

    // Normalize to 100%.
    const targetTotal = Object.values(targets).reduce((a, b) => a + b, 0);
    if (targetTotal > 0) {
      (Object.keys(targets) as AssetCategory[]).forEach((cat) => (targets[cat] = (targets[cat] / targetTotal) * 100));
    }

    const equitySplit = Math.round(targets.equity);
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));

    setAppliedStrategy(`${strategyName}-alloc`);
    setTimeout(() => setAppliedStrategy(null), 3000);
  };

  const applyWeightsToAssets = (portfolio: Portfolio, strategyName: string) => {
    if (!alignedData) {
      alert('No live market data loaded. Connect Angel One SmartAPI first.');
      return;
    }

    const existingIds = new Set(inputs.assets.filter((a) => selectedSymbols.includes(a.name)).map((a) => a.id));
    existingIds.forEach((id) => updateAsset(id as string, { value: 0 }));

    portfolio.weights.forEach((w, idx) => {
      const symbol = alignedData.symbols[idx];
      const instrument = INSTRUMENTS.find((i) => i.symbol === symbol) || alignedData.instruments[idx];
      const category = (categoryMap[instrument?.category || ''] || 'other') as AssetCategory;
      const returnPct = (alignedData.stats[idx]?.annualizedReturn || 0.08) * 100;
      const value = Math.round(w * 10000000);
      if (value <= 0) return;
      addAsset({
        name: `${instrument?.name || symbol} (${strategyName})`,
        value,
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

  const sourceLabel = data?.source === 'angel' ? 'Angel One SmartAPI' : data?.source === 'yahoo' ? 'Yahoo Finance' : 'Assumption mode';

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Asset Allocation Optimizer"
        subtitle="Mean-variance optimization using the longest available daily history. The efficient frontier is built from live or bundled market data and filtered by your risk profile."
        badge="Quant Lab"
      />

      {!data && !loading && (
        <Alert variant="warning" icon={Globe}>
          Backend market-data bundle not loaded. The optimizer is running in assumption mode. Connect Angel One SmartAPI for live instrument-level data.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">History</div>
          <div className="text-xl font-serif text-navy mt-1">{historyDays > 0 ? `${historyDays} days` : '—'}</div>
          <div className="text-xs text-stone-500 mt-1">{alignedData?.dateRange.from} → {alignedData?.dateRange.to}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Data Source</div>
          <div className="text-xl font-serif text-navy mt-1 flex items-center gap-2">
            <Database size={16} /> {sourceLabel}
          </div>
          <div className="text-xs text-stone-500 mt-1">{data?.symbols.length || 0} instruments available</div>
        </Card>
      </div>

      {mvoError && (
        <Alert variant="danger" icon={AlertCircle}>
          <strong>Optimization Error:</strong> {mvoError}
        </Alert>
      )}

      {mvoResult && mvoResult.maxSharpe.weights.reduce((sum, w, i) => sum + (equityMask[i] ? w : 0), 0) * 100 > maxEquity && (
        <Alert variant="warning" icon={AlertCircle}>
          The unconstrained max-Sharpe portfolio exceeds your equity limit. The constrained frontier below respects the max-equity slider.
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1"><Calendar size={12} /> From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1"><Calendar size={12} /> To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Select Assets ({data?.symbols.length || 0} available)
            </label>
            <div className="flex flex-wrap gap-2">
              {(data?.symbols || DEFAULT_ALLOCATION_SYMBOLS).map((symbol) => {
                const instrument = INSTRUMENTS.find((i) => i.symbol === symbol);
                const selected = selectedSymbols.includes(symbol);
                return (
                  <button
                    key={symbol}
                    onClick={() => toggleSymbol(symbol)}
                    title={instrument?.name || symbol}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-navy text-white border-navy' : 'bg-white text-stone-600 border-stone-200 hover:border-navy'}`}
                  >
                    {instrument?.name || symbol}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Max Equity Constraint ({formatPercent(maxEquity)})
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={maxEquity}
              onChange={(e) => setMaxEquity(Number(e.target.value))}
              className="w-full accent-navy"
            />
            <div className="flex justify-between text-xs text-stone-500 mt-1">
              <span>0%</span>
              <span>Profile default: {formatPercent(riskProfile.maxEquity)}</span>
              <span>100%</span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-rose-50 text-rose-800 border border-rose-200">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={handleBackendFetch} disabled={loading || selectedSymbols.length < 2} className="w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Fetching {progress.currentSymbol} ({progress.completed}/{progress.total})
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <BarChart3 size={18} /> Reload Backend Data
                </span>
              )}
            </Button>
            <Button onClick={handleAngelFetch} variant="outline" disabled={loading || selectedSymbols.length < 2} className="w-full py-3">
              <Globe size={16} className="mr-2" /> Fetch Live from Angel One
            </Button>
          </div>
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
                  <LineChart data={frontierData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis type="number" dataKey="risk" name="Risk" unit="%" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} label={{ value: 'Annualized Volatility', position: 'insideBottom', offset: -5, fill: '#78716c', fontSize: 12 }} />
                    <YAxis type="number" dataKey="return" name="Return" unit="%" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', fill: '#78716c', fontSize: 12 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={((value: number) => `${value.toFixed(2)}%`) as any} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Line dataKey="return" stroke="#1A233A" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    {highlightedPortfolios.map((p) => (
                      <ReferenceDot key={p.key} x={p.risk} y={p.return} r={6} fill={p.color} stroke="none" label={{ value: p.label, position: 'top', fill: p.color, fontSize: 11, fontWeight: 700 }} />
                    ))}
                  </LineChart>
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
                  {alignedData?.stats.map((s, idx) => {
                    const inst = alignedData.instruments[idx];
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
                    <div className="p-2 bg-stone-50 rounded-lg col-span-2">
                      <span className="text-stone-400 block text-[10px]">SHARPE</span>
                      <span className="font-semibold text-navy">{strategy.portfolio.sharpe.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {strategy.portfolio.weights.map((w, idx) => {
                      const inst = alignedData?.instruments[idx];
                      const color = ASSET_COLORS[(categoryMap[inst?.category || ''] || 'other') as keyof typeof ASSET_COLORS];
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            {inst?.name || alignedData?.symbols[idx]}
                          </span>
                          <span className="font-mono font-medium">{(w * 100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => applyWeightsToAllocation(strategy.portfolio, strategy.label)}>
                      {appliedStrategy === `${strategy.label}-alloc` ? (
                        <><Check size={14} className="mr-1" /> Applied</>
                      ) : (
                        <>Apply to Allocation <ArrowRight size={14} className="ml-1" /></>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => applyWeightsToAssets(strategy.portfolio, strategy.label)}>
                      {appliedStrategy === strategy.label ? (
                        <><Check size={14} className="mr-1" /> Added</>
                      ) : (
                        <>Add to Assets <ArrowRight size={14} className="ml-1" /></>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
