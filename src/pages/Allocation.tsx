import { useMemo, useState, useEffect } from 'react';
import { PieChart, TrendingUp, Target, ArrowRight, AlertTriangle, CheckCircle2, Shield, RotateCcw, BarChart3, Zap, DollarSign } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import { SectionTitle } from '../components/ui/SectionTitle';
import { DonutChart } from '../components/charts/DonutChart';
import { AssetEvolutionChart } from '../components/charts/AssetEvolutionChart';
import { useCalculator } from '../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { projectAssetAllocation, getTargetGlideAllocation } from '../lib/projections';
import { useMarketData } from '../hooks/useMarketData';
import { DEFAULT_ALLOCATION_SYMBOLS } from '../lib/instruments';
import { runMVO, type ConstraintSet, type Portfolio } from '../lib/mvo';
import type { AssetCategory } from '../types';
import { Link } from 'react-router-dom';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const categoryMap: Record<string, AssetCategory> = {
  equity: 'equity',
  index: 'equity',
  debt: 'debt',
  gold: 'gold',
  commodity: 'gold',
};

export const Allocation = () => {
  const { inputs, assumptions, riskProfile, wealthResult, setInputs, manualTargets, setManualTargets } = useCalculator();
  const targets = manualTargets || riskProfile.targets;

  const { data: marketData, loadBackendData } = useMarketData();
  const [appliedMvo, setAppliedMvo] = useState<string | null>(null);

  useEffect(() => {
    loadBackendData(DEFAULT_ALLOCATION_SYMBOLS);
  }, [loadBackendData]);

  const equityMask = useMemo(() => {
    return marketData?.instruments.map((inst) =>
      inst?.category === 'index' || inst?.category === 'equity',
    ) ?? [];
  }, [marketData]);

  const mvoResult = useMemo(() => {
    if (!marketData || marketData.symbols.length < 2) return null;
    const means = marketData.stats.map((s) => s.annualizedReturn);
    const constraints: ConstraintSet = {
      minWeight: marketData.symbols.map(() => 0),
      maxWeight: marketData.symbols.map(() => 1),
      maxEquity: riskProfile.maxEquity / 100,
      equityMask,
    };
    return runMVO(marketData.symbols, means, marketData.covariance, {
      samples: 20000,
      riskFreeRate: riskProfile.riskFreeRate / 100,
      constraints,
    });
  }, [marketData, riskProfile.maxEquity, riskProfile.riskFreeRate, equityMask]);

  const mvoTargets = useMemo(() => {
    if (!mvoResult || !marketData) return null;
    return {
      maxSharpe: portfolioToCategoryTargets(mvoResult.maxSharpe, marketData.instruments),
      minVariance: portfolioToCategoryTargets(mvoResult.minVariance, marketData.instruments),
    };
  }, [mvoResult, marketData]);

  const projection = useMemo(() => {
    try {
      return projectAssetAllocation(inputs, assumptions, targets, 600);
    } catch {
      return null;
    }
  }, [inputs, assumptions, targets]);

  const totalValue = wealthResult.netWorth;

  const currentData = CATEGORIES.map((cat) => ({ name: ASSET_LABELS[cat], value: wealthResult.currentAllocation[cat] * totalValue, color: ASSET_COLORS[cat] })).filter((d) => d.value > 0);

  const targetData = CATEGORIES.map((cat) => ({ name: ASSET_LABELS[cat], value: totalValue * (targets[cat] / 100), color: ASSET_COLORS[cat] })).filter((d) => d.value > 0);

  const projectedTotal = projection?.terminalValue || wealthResult.terminalValue;
  const projectedWeights = projection?.terminalWeights || wealthResult.projectedAllocation;
  const projectedData = CATEGORIES.map((cat) => ({ name: ASSET_LABELS[cat], value: projectedTotal * (projectedWeights[cat] || 0), color: ASSET_COLORS[cat] })).filter((d) => d.value > 0);

  const handleTargetChange = (category: AssetCategory, newValue: number) => {
    setManualTargets((prev) => {
      const current = prev || riskProfile.targets;
      const updated = { ...current, [category]: newValue };
      // Show warning if total != 100, but don't force normalize
      return updated;
    });
  };

  const applyMvoTargets = (mvoPortfolio: Portfolio, label: string) => {
    const newTargets = portfolioToCategoryTargets(mvoPortfolio, marketData?.instruments || []);
    setManualTargets(newTargets);
    // Note: SIP/STP only support equity/debt splits.
    // We assign all non-equity allocation into debt. Gold/real estate aren't available for SIPs.
    const equitySplit = Math.round(newTargets.equity);
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));
    setAppliedMvo(label);
    setTimeout(() => setAppliedMvo(null), 3000);
  };

  const assetEvolutionData = useMemo(() => {
    if (!projection) return [];
    return projection.years.filter((_, i) => i % Math.max(1, Math.floor(projection.years.length / 12)) === 0).map((y) => ({
      label: `Age ${y.age}`,
      equity: y.equity,
      debt: y.debt,
      gold: y.gold,
      realestate: y.realestate,
      liquid: y.liquid,
      other: y.other,
    }));
  }, [projection]);

  const dynamicRebalancingTrades = useMemo(() => {
    return CATEGORIES.map((c) => {
      const currentVal = (wealthResult.currentAllocation[c] || 0) * totalValue;
      const targetVal = totalValue * (targets[c] / 100);
      const trade = targetVal - currentVal;
      const action = Math.abs(trade) < totalValue * 0.02 ? 'Hold' : trade > 0 ? 'Buy' : 'Sell';
      return {
        category: c,
        current: currentVal,
        currentPct: (wealthResult.currentAllocation[c] || 0) * 100,
        targetPct: targets[c],
        trade,
        action,
      };
    });
  }, [wealthResult.currentAllocation, totalValue, targets]);

  const maxDrift = useMemo(
    () => Math.max(...dynamicRebalancingTrades.map((r) => Math.abs(r.currentPct - r.targetPct))),
    [dynamicRebalancingTrades],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Asset Allocation"
        subtitle="Current allocation versus strategic target, projected glide path, and probability of success under the target mix."
        badge="Strategic + Tactical"
      />

      {maxDrift > 10 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Rebalancing recommended.</strong> One or more asset classes are more than 10% away from target. Review the rebalancing table below or run the{' '}
            <Link to="/mvo" className="underline hover:text-amber-900">MVO optimizer</Link>.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Current Equity</div>
          <div className="text-2xl font-serif text-navy mt-1">{formatPercent(wealthResult.currentAllocation.equity * 100)}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Target Equity</div>
          <div className="text-2xl font-serif text-navy mt-1">{formatPercent(targets.equity)}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Projected Terminal Value</div>
          <div className="text-2xl font-serif text-navy mt-1">{formatCurrency(projectedTotal)}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Plan Success Probability</div>
          <div className={`text-2xl font-serif mt-1 ${projection && projection.probabilityOfSuccess >= riskProfile.goalSuccessThreshold ? 'text-green-600' : projection && projection.probabilityOfSuccess >= riskProfile.goalSuccessThreshold * 0.6 ? 'text-amber-600' : 'text-red-600'}`}>
            {projection ? formatPercent(projection.probabilityOfSuccess) : '—'}
          </div>
        </Card>
      </div>

      {wealthResult.currencyExposure.length > 1 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Currency Exposure</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wealthResult.currencyExposure.map((ce) => (
              <div key={ce.currency} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{ce.currency}</div>
                <div className="text-lg font-serif text-navy mt-1">{formatPercent(ce.percentage)}</div>
                <div className="text-xs text-stone-500">{formatCurrency(ce.amount)}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-3">
            Foreign-currency assets get an additional FX return drift ({wealthResult.currencyExposure.find((c) => c.currency !== 'INR')?.currency || 'USD'} ≈ 4% p.a. vs INR) and volatility in Monte Carlo projections.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><PieChart size={18} className="text-gold" /> Current</h3>
          <DonutChart data={currentData} />
        </Card>
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><Target size={18} className="text-gold" /> Target</h3>
          <DonutChart data={targetData} />
        </Card>
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-gold" /> Projected (Terminal)</h3>
          <DonutChart data={projectedData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2"><Shield size={18} className="text-gold" /> Strategic Target</h3>
            <Link to="/risk" className="text-xs text-gold hover:underline">{riskProfile.label}</Link>
          </div>
          <div className="space-y-5">
            {CATEGORIES.map((cat) => (
              <Slider key={cat} label={ASSET_LABELS[cat]} value={targets[cat]} onChange={(v) => handleTargetChange(cat, v)} suffix="%" />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center text-xs">
              <span className="text-stone-500">Total: {formatPercent(Object.values(targets).reduce((a, b) => a + b, 0))}</span>
              {Math.abs(Object.values(targets).reduce((a, b) => a + b, 0) - 100) > 0.1 && (
                <span className="ml-2 inline-flex items-center text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                  <AlertTriangle size={12} className="mr-1" /> Does not equal 100%
                </span>
              )}
            </span>
            <button onClick={() => setManualTargets(null)} className="text-xs flex items-center text-gold hover:underline">
              <RotateCcw size={12} className="mr-1" /> Reset to {riskProfile.label}
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-lg font-serif text-navy mb-4">Projected Asset-Class Evolution</h3>
          <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
        </Card>
      </div>

      {mvoTargets && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <BarChart3 size={18} className="text-gold" /> Market-Optimized Targets
            </h3>
            <Link to="/mvo" className="text-xs text-gold hover:underline flex items-center">
              Open MVO <ArrowRight size={12} className="ml-1" />
            </Link>
          </div>
          <p className="text-sm text-stone-600 mb-4">
            Targets derived from the mean-variance efficient frontier using the longest available history. These respect your risk profile's max equity constraint.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'maxSharpe', label: 'Max Sharpe', targets: mvoTargets.maxSharpe, portfolio: mvoResult?.maxSharpe },
              { key: 'minVariance', label: 'Min Variance', targets: mvoTargets.minVariance, portfolio: mvoResult?.minVariance },
            ].map((item) => (
              <div key={item.key} className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-navy flex items-center gap-2"><Zap size={16} className="text-gold" /> {item.label}</span>
                  <span className="text-xs font-mono text-stone-500">Sharpe {item.portfolio?.sharpe.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {CATEGORIES.filter((c) => item.targets[c] > 0.5).map((cat) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                      <span>{ASSET_LABELS[cat]} {formatPercent(item.targets[cat])}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => item.portfolio && applyMvoTargets(item.portfolio, item.label)}
                  className="w-full py-2 px-3 bg-navy text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-1"
                >
                  {appliedMvo === item.label ? <><CheckCircle2 size={14} /> Applied</> : <>Apply to Target Mix</>}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4">Rebalancing Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                <th className="py-2 pr-4">Asset Class</th>
                <th className="py-2 pr-4 text-right">Current</th>
                <th className="py-2 pr-4 text-right">Current %</th>
                <th className="py-2 pr-4 text-right">Target %</th>
                <th className="py-2 pr-4 text-right">Projected Terminal %</th>
                <th className="py-2 pr-4 text-right">Gap (₹)</th>
                <th className="py-2 pr-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {dynamicRebalancingTrades.map((r) => {
                const projectedPct = (projectedWeights[r.category] || 0) * 100;
                return (
                  <tr key={r.category} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-2 pr-4 flex items-center">
                      <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                      {ASSET_LABELS[r.category]}
                    </td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(r.current)}</td>
                    <td className="py-2 pr-4 text-right">{formatPercent(r.currentPct)}</td>
                    <td className="py-2 pr-4 text-right">{formatPercent(r.targetPct)}</td>
                    <td className="py-2 pr-4 text-right">{formatPercent(projectedPct)}</td>
                    <td className="py-2 pr-4 text-right font-medium">{formatCurrency(r.trade)}</td>
                    <td className="py-2 pr-4 text-center">
                      {r.action === 'Hold' ? (
                        <span className="inline-flex items-center text-stone-500 text-xs"><CheckCircle2 size={12} className="mr-1" /> Hold</span>
                      ) : r.action === 'Buy' ? (
                        <span className="text-green-600 text-xs font-semibold">Buy</span>
                      ) : (
                        <span className="text-red-600 text-xs font-semibold">Sell</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif text-navy">Glide Path Reference</h3>
        </div>
        <p className="text-sm text-stone-600 mb-4">
          The default glide path reduces equity as you approach retirement, shifting to capital preservation.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { age: inputs.currentAge, label: 'Today' },
            { age: Math.round(inputs.currentAge + (inputs.retirementAge - inputs.currentAge) * 0.5), label: 'Midway' },
            { age: inputs.retirementAge, label: 'Retirement' },
            { age: inputs.lifeExpectancy, label: 'Late Life' },
          ].map((point) => {
            const glide = getTargetGlideAllocation(point.age, inputs.retirementAge);
            return (
              <div key={point.label} className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500">{point.label} (Age {point.age})</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Equity</span><span className="font-medium">{formatPercent(glide.equity * 100)}</span></div>
                  <div className="flex justify-between"><span>Debt</span><span className="font-medium">{formatPercent(glide.debt * 100)}</span></div>
                  <div className="flex justify-between"><span>Liquid</span><span className="font-medium">{formatPercent(glide.liquid * 100)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

function portfolioToCategoryTargets(portfolio: Portfolio, instruments: { category?: string }[]): Record<AssetCategory, number> {
  const targets: Record<AssetCategory, number> = {
    equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0,
  };
  const total = portfolio.weights.reduce((a, b) => a + b, 0);
  portfolio.weights.forEach((w, idx) => {
    const cat = (categoryMap[instruments[idx]?.category || ''] || 'other') as AssetCategory;
    targets[cat] += total > 0 ? (w / total) * 100 : 0;
  });
  const sum = Object.values(targets).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    (Object.keys(targets) as AssetCategory[]).forEach((cat) => (targets[cat] = (targets[cat] / sum) * 100));
  }
  return targets;
}
