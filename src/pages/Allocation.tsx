import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Target, TrendingUp, CheckCircle2, Shield, BarChart3, Layers, ArrowRight, Scale, Activity } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { AssetEvolutionChart } from '../components/charts/AssetEvolutionChart';
import { useCalculator } from '../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS, CATEGORY_SIGMAS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { formatOrDash, guardNumber } from '../lib/planState';
import { projectAssetAllocation, getTargetGlideAllocation } from '../lib/projections';
import { useMarketData } from '../hooks/useMarketData';
import { DEFAULT_ALLOCATION_SYMBOLS, getInstrument } from '../lib/instruments';
import { runMVO, type ConstraintSet, type Portfolio } from '../lib/mvo';
import { simulateRebalancing } from '../lib/implementationShortfall';
import { PortfolioNavTabs } from '../components/layout/PortfolioNavTabs';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { StressTestSimulator } from '../components/analytics/StressTestSimulator';
import { PlanVsReality } from '../components/analytics/PlanVsReality';
import { ImplementationTransitionPlan } from '../components/analytics/ImplementationTransitionPlan';
import { CompositionCompare, type CompositionRow } from '../components/analytics/CompositionCompare';
import { TargetPolicyEditor } from '../components/analytics/TargetPolicyEditor';
import { RebalanceTickets } from '../components/analytics/RebalanceTickets';
import { DriftMonitor } from '../components/analytics/DriftMonitor';
import { MvoTargetsCard } from '../components/analytics/MvoTargetsCard';
import type { AssetCategory } from '../types';

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
  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false);

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
  const hasPortfolio = wealthResult.isConfigured && inputs.assets.length > 0 && totalValue > 0;

  const projectedTotal = projection?.terminalValue ?? wealthResult.terminalValue;
  const projectedWeights = projection?.terminalWeights ?? wealthResult.projectedAllocation;

  const projectedData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        name: ASSET_LABELS[cat],
        value: projectedTotal * (projectedWeights[cat] || 0),
        color: ASSET_COLORS[cat],
      })).filter((d) => d.value > 0),
    [projectedTotal, projectedWeights],
  );

  const applyMvoTargets = (mvoPortfolio: Portfolio, label: string) => {
    const newTargets = portfolioToCategoryTargets(mvoPortfolio, marketData?.symbols || [], marketData?.instruments || []);
    setManualTargets(newTargets);
    // SIP/STP only support equity/debt splits, so preserve the equity:debt
    // ratio from the MVO targets instead of lumping non-flow categories into debt.
    const investable = newTargets.equity + newTargets.debt;
    const equitySplit = investable > 0 ? Math.round((newTargets.equity / investable) * 100) : 0;
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));
    setAppliedMvo(label);
    showToast(`Applied ${label} allocation to strategic targets and plan.`, 'success');
    setTimeout(() => setAppliedMvo(null), 3000);
  };

  const assetEvolutionData = useMemo(() => {
    if (!projection) return [];
    return projection.years
      .filter((_, i) => i % Math.max(1, Math.floor(projection.years.length / 12)) === 0)
      .map((y) => ({
        label: `Age ${y.age}`,
        equity: y.equity,
        debt: y.debt,
        gold: y.gold,
        realestate: y.realestate,
        liquid: y.liquid,
        other: y.other,
      }));
  }, [projection]);

  const rebalancingRows: CompositionRow[] = useMemo(
    () =>
      CATEGORIES.map((c) => {
        const currentVal = (wealthResult.currentAllocation[c] || 0) * totalValue;
        const targetVal = totalValue * (targets[c] / 100);
        const trade = targetVal - currentVal;
        const action = Math.abs(trade) < totalValue * 0.02 ? 'Hold' : trade > 0 ? 'Buy' : 'Sell';
        return {
          category: c,
          current: currentVal,
          currentPct: (wealthResult.currentAllocation[c] || 0) * 100,
          targetPct: targets[c],
          currentValue: currentVal,
          targetValue: targetVal,
          trade,
          action,
        };
      }),
    [wealthResult.currentAllocation, totalValue, targets],
  );

  const maxDrift = useMemo(
    () => Math.max(0, ...rebalancingRows.map((r) => Math.abs(r.currentPct - r.targetPct))),
    [rebalancingRows],
  );

  const totalBuys = useMemo(
    () => rebalancingRows.filter((t) => t.trade > 0 && t.action === 'Buy').reduce((sum, t) => sum + t.trade, 0),
    [rebalancingRows],
  );

  const totalSells = useMemo(
    () => rebalancingRows.filter((t) => t.trade < 0 && t.action === 'Sell').reduce((sum, t) => sum + Math.abs(t.trade), 0),
    [rebalancingRows],
  );

  // Pre-trade implementation-shortfall estimate for the full rebalance program:
  // square-root market impact per asset class vs 2%-of-portfolio daily liquidity.
  const rebalancingSim = useMemo(() => {
    if (totalValue <= 0) return null;
    const currentWeights: Record<string, number> = {};
    const targetWeights: Record<string, number> = {};
    const advByAsset: Record<string, number> = {};
    const volByAsset: Record<string, number> = {};
    CATEGORIES.forEach((c) => {
      currentWeights[c] = wealthResult.currentAllocation[c] || 0;
      targetWeights[c] = (targets[c] || 0) / 100;
      advByAsset[c] = totalValue * 0.02;
      volByAsset[c] = CATEGORY_SIGMAS[c] ?? 0.15;
    });
    return simulateRebalancing(currentWeights, targetWeights, totalValue, advByAsset, volByAsset);
  }, [wealthResult.currentAllocation, targets, totalValue]);

  const tradeImpactData = useMemo(
    () =>
      (rebalancingSim?.trades ?? []).map((t) => {
        const cat = t.symbol as AssetCategory;
        return {
          category: cat,
          label: ASSET_LABELS[cat] ?? t.symbol,
          trade: t.diff * totalValue,
          impactBps: t.impactBps,
        };
      }),
    [rebalancingSim, totalValue],
  );

  const horizonYears = guardNumber(inputs.lifeExpectancy - inputs.currentAge);

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        eyebrow="Step 4 · Strategic Allocation"
        title="Strategic Asset Allocation & Rebalancing"
        description="Current holdings versus strategic policy target, projected glide path, rebalancing tickets, and multi-model optimization."
        actions={
          <Link to="/advanced-portfolio">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Layers size={14} strokeWidth={1.6} aria-hidden="true" /> Portfolio Lab <ArrowRight size={12} strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </Link>
        }
      />

      <PortfolioNavTabs currentPath="/allocation" />

      {hasPortfolio && maxDrift > 10 && (
        <Alert variant="warning">
          <strong className="font-semibold">Rebalancing recommended.</strong>{' '}
          <span className="font-mono tabular-nums">{maxDrift.toFixed(1)}%</span> maximum drift from policy target
          (threshold ±10%). Review the execution tickets below to restore the target mix.
        </Alert>
      )}

      {/* Empirical market calibration — quiet status strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-positive shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-ink inline-flex items-center gap-2">
              Empirical market calibration active
              <Badge tone="accent" dot={false} className="font-mono">4,209 daily sessions</Badge>
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              Correlations, volatilities, and return parameters calibrated from historical daily data (2009–2026).
            </div>
          </div>
        </div>
        <Link
          to="/advanced-portfolio"
          className="text-xs font-medium text-accent-strong hover:text-accent transition-colors inline-flex items-center gap-1 shrink-0"
        >
          Portfolio Lab <ArrowRight size={12} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>

      {!hasPortfolio ? (
        <EmptyState
          icon={PieChart}
          title="No portfolio to analyze"
          description="Add assets in the balance sheet to compare current vs target allocation. Policy targets below can be set at any time."
          action={
            <Link to="/master-plan?tab=assets">
              <Button>Add assets</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Topline metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Current equity"
              value={formatOrDash(wealthResult.currentAllocation.equity * 100, (v) => formatPercent(v, 0))}
              subtext="Portfolio weight today"
              icon={<PieChart size={16} strokeWidth={1.6} />}
            />
            <MetricCard
              label="Target equity"
              value={formatOrDash(targets.equity, (v) => formatPercent(v, 0))}
              subtext={`Strategic policy mix · ${riskProfile.label}`}
              icon={<Target size={16} strokeWidth={1.6} />}
            />
            <MetricCard
              label="Median terminal value"
              value={formatOrDash(projectedTotal, formatCurrencyCompact)}
              subtext="Simulated paths under target mix"
              variant="gold"
              icon={<TrendingUp size={16} strokeWidth={1.6} />}
            />
            <MetricCard
              label="Target-mix success"
              value={projection ? formatPercent(projection.probabilityOfSuccess, 0) : '—'}
              subtext="All goals funded"
              variant={
                projection && projection.probabilityOfSuccess >= riskProfile.goalSuccessThreshold
                  ? 'success'
                  : projection && projection.probabilityOfSuccess >= riskProfile.goalSuccessThreshold * 0.6
                    ? 'default'
                    : 'danger'
              }
              icon={<CheckCircle2 size={16} strokeWidth={1.6} />}
            />
          </div>

          {/* Primary visual — current vs target composition */}
          <CompositionCompare
            rows={rebalancingRows}
            totalValue={totalValue}
            projectedData={projectedData}
            projectedTotal={projectedTotal}
            projectionSuccess={projection ? projection.probabilityOfSuccess : null}
            horizonYears={horizonYears}
          />

          {wealthResult.currencyExposure.length > 1 && (
            <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Currency exposure">
              <SectionHeader
                title="Currency Exposure"
                description={`Foreign-currency assets carry additional FX drift (${wealthResult.currencyExposure.find((c) => c.currency !== 'INR')?.currency || 'USD'} ≈ 4% p.a. vs INR) and currency volatility in Monte Carlo projections.`}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {wealthResult.currencyExposure.map((ce) => (
                  <div key={ce.currency} className="rounded-md border border-border bg-surface p-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">{ce.currency}</div>
                    <div className="font-mono text-lg tabular-nums font-semibold text-ink mt-1">{formatPercent(ce.percentage, 0)}</div>
                    <div className="font-mono text-xs tabular-nums text-muted mt-0.5">{formatCurrency(ce.amount)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Policy targets + projected evolution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TargetPolicyEditor
              drawerOpen={targetDrawerOpen}
              onDrawerOpen={() => setTargetDrawerOpen(true)}
              onDrawerClose={() => setTargetDrawerOpen(false)}
            />
            <section className="lg:col-span-2 rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Projected asset-class evolution">
              <SectionHeader
                title="Projected Asset-Class Evolution"
                description="Simulated mix across the plan horizon under the target policy."
              />
              <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
            </section>
          </div>

          {mvoTargets && mvoResult && (
            <MvoTargetsCard
              maxSharpe={mvoTargets.maxSharpe}
              minVariance={mvoTargets.minVariance}
              maxSharpePortfolio={mvoResult.maxSharpe}
              minVariancePortfolio={mvoResult.minVariance}
              appliedMvo={appliedMvo}
              onApply={applyMvoTargets}
            />
          )}

          <DriftMonitor
            rows={rebalancingRows}
            maxDrift={maxDrift}
            rebalancingSim={rebalancingSim}
            tradeImpactData={tradeImpactData}
          />

          <RebalanceTickets
            rows={rebalancingRows}
            projectedWeights={projectedWeights}
            totalBuys={totalBuys}
            totalSells={totalSells}
            onAdjustTarget={() => setTargetDrawerOpen(true)}
          />

          {/* Glide path reference */}
          <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Glide path reference">
            <SectionHeader
              title="Glide Path Reference"
              description="The baseline strategic glide path tapers equity exposure approaching retirement, shifting toward capital preservation and liquidity."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { age: inputs.currentAge, label: 'Today' },
                { age: Math.round(inputs.currentAge + (inputs.retirementAge - inputs.currentAge) * 0.5), label: 'Midway' },
                { age: inputs.retirementAge, label: 'Retirement' },
                { age: inputs.lifeExpectancy, label: 'Late life' },
              ].map((point) => {
                const glide = getTargetGlideAllocation(point.age, inputs.retirementAge);
                return (
                  <div key={point.label} className="rounded-md border border-border bg-surface p-4">
                    <div className="eyebrow">{point.label}</div>
                    <div className="font-mono text-xs tabular-nums text-muted mt-0.5">Age {point.age}</div>
                    <dl className="mt-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between"><dt className="text-muted">Equity</dt><dd className="font-mono tabular-nums font-semibold text-ink">{formatPercent(glide.equity * 100, 0)}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted">Debt</dt><dd className="font-mono tabular-nums font-semibold text-ink">{formatPercent(glide.debt * 100, 0)}</dd></div>
                      <div className="flex justify-between"><dt className="text-muted">Liquid</dt><dd className="font-mono tabular-nums font-semibold text-ink">{formatPercent(glide.liquid * 100, 0)}</dd></div>
                    </dl>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Macro stress test engine */}
          <StressTestSimulator />

          {/* Plan vs reality portfolio governance */}
          <PlanVsReality />

          {/* Portfolio transition & trade implementation plan */}
          <ImplementationTransitionPlan />
        </>
      )}

      {/* Policy targets remain editable without a portfolio */}
      {!hasPortfolio && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TargetPolicyEditor
            drawerOpen={targetDrawerOpen}
            onDrawerOpen={() => setTargetDrawerOpen(true)}
            onDrawerClose={() => setTargetDrawerOpen(false)}
          />
          <section className="lg:col-span-2 rounded-lg border border-border bg-surface p-5 md:p-6" aria-label="Rebalancing preview">
            <SectionHeader
              title="What appears here"
              description="Once the balance sheet has assets, this page shows the full current-vs-target comparison."
            />
            <ul className="space-y-2.5 text-xs text-muted">
              {[
                { icon: BarChart3, text: 'Side-by-side current vs target composition with per-class drift' },
                { icon: Scale, text: 'Rebalancing tickets and pre-trade market-impact estimates' },
                { icon: Shield, text: 'Crisis stress tests, plan-vs-reality governance, and the transition plan' },
                { icon: Activity, text: 'Monte Carlo glide path and projected terminal mix' },
              ].map((f) => (
                <li key={f.text} className="flex items-start gap-2.5">
                  <f.icon size={14} strokeWidth={1.6} className="text-faint shrink-0 mt-0.5" aria-hidden="true" />
                  {f.text}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-border-subtle pt-4">
              <Link to="/master-plan?tab=assets">
                <Button variant="secondary" size="sm" className="gap-1.5">
                  Go to balance sheet <ArrowRight size={12} strokeWidth={1.8} aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </section>
        </div>
      )}
      {!hasPortfolio && mvoTargets && mvoResult && (
        <MvoTargetsCard
          maxSharpe={mvoTargets.maxSharpe}
          minVariance={mvoTargets.minVariance}
          maxSharpePortfolio={mvoResult.maxSharpe}
          minVariancePortfolio={mvoResult.minVariance}
          appliedMvo={appliedMvo}
          onApply={applyMvoTargets}
        />
      )}

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
