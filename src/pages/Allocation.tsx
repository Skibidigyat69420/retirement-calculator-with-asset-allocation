import { useMemo, useState, useEffect } from 'react';
import { PieChart, TrendingUp, Target, ArrowRight, AlertTriangle, CheckCircle2, Shield, RotateCcw, BarChart3, Zap, DollarSign, Layers } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Slider } from '../components/ui/Slider';
import { SectionTitle } from '../components/ui/SectionTitle';
import { DonutChart } from '../components/charts/DonutChart';
import { AssetEvolutionChart } from '../components/charts/AssetEvolutionChart';
import { useCalculator } from '../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { projectAssetAllocation, getTargetGlideAllocation } from '../lib/projections';
import { useMarketData } from '../hooks/useMarketData';
import { DEFAULT_ALLOCATION_SYMBOLS, getInstrument } from '../lib/instruments';
import { runMVO, type ConstraintSet, type Portfolio } from '../lib/mvo';
import type { AssetCategory } from '../types';
import { Link } from 'react-router-dom';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { PortfolioNavTabs } from '../components/layout/PortfolioNavTabs';
import { StressTestSimulator } from '../components/analytics/StressTestSimulator';
import { PlanVsReality } from '../components/analytics/PlanVsReality';
import { ImplementationTransitionPlan } from '../components/analytics/ImplementationTransitionPlan';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const categoryMap: Record<string, AssetCategory> = {
  equity: 'equity',
  index: 'equity',
  debt: 'debt',
  gold: 'gold',
  commodity: 'gold',
};

export const Allocation = () => {
  const { inputs, assumptions, riskProfile, wealthResult, setInputs, manualTargets, setManualTargets, showToast } = useCalculator();
  const targets = manualTargets || riskProfile.targets;

  const { data: marketData, loadBackendData } = useMarketData();
  const [appliedMvo, setAppliedMvo] = useState<string | null>(null);

  useEffect(() => {
    loadBackendData(DEFAULT_ALLOCATION_SYMBOLS);
  }, [loadBackendData]);

  const equityMask = useMemo(() => {
    return marketData?.symbols.map((sym) => {
      const inst = getInstrument(sym);
      if (inst) return inst.category === 'index' || inst.category === 'equity';
      const raw = marketData.instruments.find((i) => i.symbol === sym);
      return raw?.category === 'index' || raw?.category === 'equity';
    }) ?? [];
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
      maxSharpe: portfolioToCategoryTargets(mvoResult.maxSharpe, marketData.symbols, marketData.instruments),
      minVariance: portfolioToCategoryTargets(mvoResult.minVariance, marketData.symbols, marketData.instruments),
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

  const currentData = useMemo(
    () => CATEGORIES.map((cat) => ({ name: ASSET_LABELS[cat], value: wealthResult.currentAllocation[cat] * totalValue, color: ASSET_COLORS[cat] })).filter((d) => d.value > 0),
    [wealthResult.currentAllocation, totalValue],
  );

  const targetData = useMemo(
    () => CATEGORIES.map((cat) => ({ name: ASSET_LABELS[cat], value: totalValue * (targets[cat] / 100), color: ASSET_COLORS[cat] })).filter((d) => d.value > 0),
    [totalValue, targets],
  );

  // ?? not ||: a legitimately depleted median Monte Carlo run has terminalValue
  // 0 and zero weights — falling back to the mean-path values would mix
  // incoherent numbers (nonzero total with 0% weights).
  const projectedTotal = projection?.terminalValue ?? wealthResult.terminalValue;
  const projectedWeights = projection?.terminalWeights ?? wealthResult.projectedAllocation;
  const projectedData = useMemo(
    () => CATEGORIES.map((cat) => ({ name: ASSET_LABELS[cat], value: projectedTotal * (projectedWeights[cat] || 0), color: ASSET_COLORS[cat] })).filter((d) => d.value > 0),
    [projectedTotal, projectedWeights],
  );

  const normalizeTargets = () => {
    setManualTargets((prev) => {
      const current = prev || riskProfile.targets;
      const sum = Object.values(current).reduce((a, b) => a + b, 0);
      if (sum <= 0) return prev;
      const scaled = { ...current };
      (Object.keys(scaled) as AssetCategory[]).forEach((cat) => {
        scaled[cat] = (scaled[cat] / sum) * 100;
      });
      const investable = scaled.equity + scaled.debt;
      if (investable > 0) {
        const equitySplit = Math.round((scaled.equity / investable) * 100);
        setInputs((prevInputs) => ({
          ...prevInputs,
          sip: { ...prevInputs.sip, equitySplit, debtSplit: 100 - equitySplit },
          stp: { ...prevInputs.stp, equitySplit, debtSplit: 100 - equitySplit },
        }));
      }
      return scaled;
    });
    showToast('Targets normalized to 100% and synced to SIP/STP flows.', 'info');
  };

  const syncTargetsToCashflows = () => {
    const investable = targets.equity + targets.debt;
    const equitySplit = investable > 0 ? Math.round((targets.equity / investable) * 100) : 50;
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));
    showToast(`Synced strategic targets to monthly SIP/STP (${equitySplit}% Equity / ${100 - equitySplit}% Debt)!`, 'success');
  };

  const handleTargetChange = (category: AssetCategory, newValue: number) => {
    setManualTargets((prev) => {
      const current = prev || riskProfile.targets;
      const updated = { ...current, [category]: newValue };
      // Show warning if total != 100, but don't force normalize
      return updated;
    });
  };

  const applyMvoTargets = (mvoPortfolio: Portfolio, label: string) => {
    const newTargets = portfolioToCategoryTargets(mvoPortfolio, marketData?.symbols || [], marketData?.instruments || []);
    setManualTargets(newTargets);
    // Note: SIP/STP only support equity/debt splits, so we preserve the
    // equity:debt ratio from the MVO targets instead of lumping gold and other
    // non-equity categories into debt flows.
    const investable = newTargets.equity + newTargets.debt;
    const equitySplit = investable > 0 ? Math.round((newTargets.equity / investable) * 100) : 0;
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));
    setAppliedMvo(label);
    showToast(`Applied ${label} allocation to strategic targets and plan!`, 'success');
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
        title="Strategic Asset Allocation (SAA) & Rebalancing"
        subtitle="Current asset allocation versus strategic policy target, projected glide path, rebalancing trade tickets, and multi-model optimization."
        badge="Step 4: Strategic Allocation"
      />

      <PortfolioNavTabs currentPath="/allocation" />

      {maxDrift > 10 && (
        <div className="bg-zinc-100/80 border border-zinc-200/80 rounded-2xl p-4 flex items-start gap-3 text-zinc-900 shadow-2xs">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-zinc-600" />
          <div className="text-sm">
            <strong className="font-semibold">Rebalancing recommended:</strong> One or more asset classes drift more than 10% away from policy target. Review the rebalancing execution table below.
          </div>
        </div>
      )}

      {/* Empirical Market Calibration Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div>
            <div className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              Empirical Market Calibration Active
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-semibold border border-emerald-200/60">4,209 Daily Sessions</span>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Asset class correlations, annualized volatilities, and return parameters calibrated from historical daily data (2009–2026).
            </div>
          </div>
        </div>
        <Link
          to="/advanced-portfolio"
          className="text-xs font-semibold text-zinc-900 hover:text-zinc-950 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 transition-colors flex items-center gap-1.5"
        >
          <Layers size={13} /> Portfolio Lab <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Current Equity"
          value={formatPercent(wealthResult.currentAllocation.equity * 100)}
          subtext="Portfolio weight today"
          icon={<PieChart size={16} />}
        />
        <MetricCard
          label="Target Equity"
          value={formatPercent(targets.equity)}
          subtext="Strategic target mix"
          icon={<Target size={16} />}
        />
        <MetricCard
          label="Median Terminal Value"
          value={formatCurrencyCompact(projectedTotal)}
          subtext="Simulated paths under target mix"
          icon={<TrendingUp size={16} />}
          variant="gold"
        />
        <MetricCard
          label="Target Mix Success"
          value={projection ? formatPercent(projection.probabilityOfSuccess) : '—'}
          subtext="All goals funded"
          icon={<CheckCircle2 size={16} />}
          variant={projection && projection.probabilityOfSuccess >= riskProfile.goalSuccessThreshold ? 'success' : projection && projection.probabilityOfSuccess >= riskProfile.goalSuccessThreshold * 0.6 ? 'default' : 'danger'}
        />
      </div>

      {wealthResult.currencyExposure.length > 1 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-zinc-500" />
            <h3 className="text-lg font-serif font-bold text-zinc-950">Currency Exposure</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wealthResult.currencyExposure.map((ce) => (
              <div key={ce.currency} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{ce.currency}</div>
                <div className="text-lg font-serif font-bold text-zinc-950 mt-1">{formatPercent(ce.percentage)}</div>
                <div className="text-xs text-zinc-500">{formatCurrency(ce.amount)}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Foreign-currency assets incorporate additional FX return drift ({wealthResult.currencyExposure.find((c) => c.currency !== 'INR')?.currency || 'USD'} ≈ 4% p.a. vs INR) and currency volatility in Monte Carlo projections.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-serif font-bold text-zinc-950 mb-4 flex items-center gap-2"><PieChart size={18} className="text-zinc-500" /> Current Allocation</h3>
          <DonutChart data={currentData} />
        </Card>
        <Card>
          <h3 className="text-lg font-serif font-bold text-zinc-950 mb-4 flex items-center gap-2"><Target size={18} className="text-zinc-500" /> Target Allocation</h3>
          <DonutChart data={targetData} />
        </Card>
        <Card>
          <h3 className="text-lg font-serif font-bold text-zinc-950 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-zinc-500" /> Projected Terminal</h3>
          <DonutChart data={projectedData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-bold text-zinc-950 flex items-center gap-2"><Shield size={18} className="text-zinc-500" /> Strategic Target Weights</h3>
            <Link to="/risk" className="text-xs text-zinc-600 hover:text-zinc-950 underline font-medium">{riskProfile.label}</Link>
          </div>
            {CATEGORIES.map((cat) => {
              return (
                <Slider
                  key={cat}
                  label={ASSET_LABELS[cat]}
                  value={Math.round(targets[cat])}
                  onChange={(v) => handleTargetChange(cat, v)}
                  min={0}
                  max={100}
                  suffix="%"
                />
              );
            })}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-zinc-100">
            <span className="flex items-center text-xs">
              <span className="text-zinc-700 font-medium">Total: {formatPercent(Object.values(targets).reduce((a, b) => a + b, 0))}</span>
              {Math.abs(Object.values(targets).reduce((a, b) => a + b, 0) - 100) > 0.1 && (
                <span className="ml-2 inline-flex items-center text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-md font-semibold border border-zinc-200/60">
                  <AlertTriangle size={12} className="mr-1" /> Total ≠ 100%
                  <button onClick={normalizeTargets} className="ml-1.5 underline hover:text-zinc-950">Normalize</button>
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={syncTargetsToCashflows}
                title="Sync these weights to your monthly SIP & STP allocations in Master Plan"
                className="text-xs flex items-center text-zinc-600 hover:text-zinc-950 hover:underline font-medium"
              >
                <TrendingUp size={12} className="mr-1 text-zinc-500" /> Sync to SIP/STP
              </button>
              <button
                onClick={() => {
                  setManualTargets(null);
                  showToast(`Reset targets to ${riskProfile.label} profile.`, 'info');
                }}
                className="text-xs flex items-center text-zinc-600 hover:text-zinc-950 underline font-medium"
              >
                <RotateCcw size={12} className="mr-1" /> Reset to {riskProfile.label}
              </button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-lg font-serif font-bold text-zinc-950 mb-4">Projected Asset-Class Evolution</h3>
          <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
        </Card>
      </div>

      {mvoTargets && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-bold text-zinc-950 flex items-center gap-2">
              <BarChart3 size={18} className="text-zinc-500" /> Markowitz Efficient Targets
            </h3>
          </div>
          <p className="text-sm text-zinc-600 mb-4">
            Optimal portfolios derived from the parametric mean-variance efficient frontier using full empirical history. These allocations strictly respect your risk profile constraints.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'maxSharpe', label: 'Max Sharpe (Tangency)', targets: mvoTargets.maxSharpe, portfolio: mvoResult?.maxSharpe },
              { key: 'minVariance', label: 'Minimum Variance', targets: mvoTargets.minVariance, portfolio: mvoResult?.minVariance },
            ].map((item) => (
              <div key={item.key} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-zinc-950 flex items-center gap-2"><Zap size={16} className="text-zinc-600" /> {item.label}</span>
                  <span className="text-xs font-mono font-bold text-zinc-700 bg-white px-2 py-0.5 rounded-md border border-zinc-200">Sharpe {item.portfolio?.sharpe.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {CATEGORIES.filter((c) => item.targets[c] > 0.5).map((cat) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                      <span className="truncate">{ASSET_LABELS[cat]} {formatPercent(item.targets[cat])}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => item.portfolio && applyMvoTargets(item.portfolio, item.label)}
                  className="w-full py-2 px-3 bg-zinc-950 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  {appliedMvo === item.label ? <><CheckCircle2 size={14} className="text-emerald-400" /> Applied to Target Mix</> : <>Apply to Target Mix</>}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-bold text-zinc-950">Rebalancing Analysis & Execution Tickets</h3>
          <span className="text-xs text-zinc-500 font-medium">Rebalancing threshold: ±2% portfolio drift</span>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable rebalancing table">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="py-2.5 pr-4">Asset Class</th>
                <th className="py-2.5 pr-4 text-right">Current Value</th>
                <th className="py-2.5 pr-4 text-right">Current %</th>
                <th className="py-2.5 pr-4 text-right">Target %</th>
                <th className="py-2.5 pr-4 text-right">Projected Terminal %</th>
                <th className="py-2.5 pr-4 text-right">Rebalance Gap (₹)</th>
                <th className="py-2.5 pr-4 text-center">Execution Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {dynamicRebalancingTrades.map((r) => {
                const projectedPct = (projectedWeights[r.category] || 0) * 100;
                return (
                  <tr key={r.category} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 pr-4 flex items-center font-medium text-zinc-900">
                      <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                      {ASSET_LABELS[r.category]}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-zinc-700">{formatCurrency(r.current)}</td>
                    <td className="py-3 pr-4 text-right font-mono text-zinc-700">{formatPercent(r.currentPct)}</td>
                    <td className="py-3 pr-4 text-right font-mono font-bold text-zinc-900">{formatPercent(r.targetPct)}</td>
                    <td className="py-3 pr-4 text-right font-mono text-zinc-600">{formatPercent(projectedPct)}</td>
                    <td className="py-3 pr-4 text-right font-mono font-bold">
                      <span className={r.trade > 0 ? 'text-emerald-700' : r.trade < 0 ? 'text-rose-700' : 'text-zinc-500'}>
                        {r.trade > 0 ? `+${formatCurrency(r.trade)}` : formatCurrency(r.trade)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {r.action === 'Hold' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                          <CheckCircle2 size={11} className="mr-1 text-zinc-400" /> Hold
                        </span>
                      ) : r.action === 'Buy' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Buy
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Sell
                        </span>
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
          <h3 className="text-lg font-serif font-bold text-zinc-950">Glide Path Reference</h3>
        </div>
        <p className="text-sm text-zinc-600 mb-4">
          The baseline strategic glide path systematically tapers equity exposure as you approach retirement, shifting allocations towards capital preservation and liquidity.
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
              <div key={point.label} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 shadow-2xs">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-600">{point.label} (Age {point.age})</div>
                <div className="mt-2.5 space-y-1.5 text-sm">
                  <div className="flex justify-between text-zinc-600"><span>Equity</span><span className="font-semibold text-zinc-900 font-mono">{formatPercent(glide.equity * 100)}</span></div>
                  <div className="flex justify-between text-zinc-600"><span>Debt</span><span className="font-semibold text-zinc-900 font-mono">{formatPercent(glide.debt * 100)}</span></div>
                  <div className="flex justify-between text-zinc-600"><span>Liquid</span><span className="font-semibold text-zinc-900 font-mono">{formatPercent(glide.liquid * 100)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* MACRO STRESS TEST ENGINE */}
      <StressTestSimulator />

      {/* PLAN VS REALITY PORTFOLIO GOVERNANCE */}
      <PlanVsReality />

      {/* PORTFOLIO TRANSITION & TRADE IMPLEMENTATION PLAN */}
      <ImplementationTransitionPlan />

      <WorkflowFooter
        prev={{ path: '/retirement', label: 'Step 3: Retirement' }}
        next={{ path: '/ips', label: 'Step 5: Deliverables & IPS' }}
        flowHint="Strategic targets guide rebalancing trade suggestions and asset allocation envelopes."
      />
    </div>
  );
};

function portfolioToCategoryTargets(portfolio: Portfolio, symbols: string[], instruments: { category?: string }[]): Record<AssetCategory, number> {
  const targets: Record<AssetCategory, number> = {
    equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0,
  };
  const total = portfolio.weights.reduce((a, b) => a + b, 0);
  portfolio.weights.forEach((w, idx) => {
    const sym = symbols[idx];
    const inst = getInstrument(sym);
    let cat: AssetCategory = 'other';
    if (inst) {
      if (inst.category === 'index' || inst.category === 'equity') cat = 'equity';
      else if (inst.category === 'gold' || inst.category === 'commodity') cat = 'gold';
      else if (inst.category === 'debt') {
        cat = sym.includes('LIQUID') ? 'liquid' : 'debt';
      }
    } else {
      cat = (categoryMap[instruments[idx]?.category || ''] || 'other') as AssetCategory;
    }
    targets[cat] += total > 0 ? (w / total) * 100 : 0;
  });
  const sum = Object.values(targets).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    (Object.keys(targets) as AssetCategory[]).forEach((cat) => (targets[cat] = (targets[cat] / sum) * 100));
  }
  return targets;
}
