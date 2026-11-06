import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Target, TrendingUp, CheckCircle2, Shield, BarChart3, ArrowRight, Scale, Activity } from 'lucide-react';
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
import { simulateRebalancing } from '../lib/implementationShortfall';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { StressTestSimulator } from '../components/analytics/StressTestSimulator';
import { PlanVsReality } from '../components/analytics/PlanVsReality';
import { ImplementationTransitionPlan } from '../components/analytics/ImplementationTransitionPlan';
import { CompositionCompare, type CompositionRow } from '../components/analytics/CompositionCompare';
import { TargetPolicyEditor } from '../components/analytics/TargetPolicyEditor';
import { RebalanceTickets } from '../components/analytics/RebalanceTickets';
import { DriftMonitor } from '../components/analytics/DriftMonitor';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const Allocation = () => {
  const { inputs, assumptions, riskProfile, wealthResult, manualTargets } = useCalculator();
  const targets = manualTargets || riskProfile.targets;

  const [targetDrawerOpen, setTargetDrawerOpen] = useState(false);

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
        title="Strategic Asset Allocation & Rebalancing"
        description="Current holdings versus strategic policy target, projected glide path, rebalancing tickets, and portfolio governance."
      />

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
                    <div className="font-mono text-xs font-medium text-muted">{ce.currency}</div>
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
                    <div className="text-xs font-semibold text-ink">{point.label}</div>
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

      <WorkflowFooter
        prev={{ path: '/policy', label: 'Policy Center' }}
        next={{ path: '/dossier', label: 'Proceed to Dossier' }}
        flowHint="Strategic targets guide rebalancing trade suggestions and asset allocation envelopes."
      />
    </div>
  );
};
