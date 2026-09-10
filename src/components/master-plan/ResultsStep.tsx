import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Globe,
  WalletMinimal,
  ArrowLeft,
  FileDown,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { NominalRealChart } from '../charts/NominalRealChart';
import { AssetEvolutionChart } from '../charts/AssetEvolutionChart';
import { SWPDrawdownChart } from '../charts/SWPDrawdownChart';
import { DonutChart } from '../charts/DonutChart';
import { MonteCarloFanChart } from '../charts/MonteCarloFanChart';
import { NetWorthInvestedChart } from '../charts/NetWorthInvestedChart';
import { CashFlowTimelineChart } from '../charts/CashFlowTimelineChart';
import { PhaseTimelineBar } from '../charts/PhaseTimelineBar';
import { ScenarioLab } from '../analytics/ScenarioLab';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import type { MasterPlanInputs, AssetCategory, RiskProfile } from '../../types';
import type { WealthEngineResult } from '../../lib/wealthEngine';

interface ResultsStepProps {
  inputs: MasterPlanInputs;
  wealthResult: WealthEngineResult;
  riskProfile: RiskProfile;
  onBack: () => void;
}

export const ResultsStep = ({
  inputs,
  wealthResult,
  riskProfile,
  onBack,
}: ResultsStepProps) => {
  const accData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'accumulation')
        .map((s) => ({ label: `Age ${s.age}`, nominal: s.total, real: s.realTotal })),
    [wealthResult.snapshots],
  );

  const swpData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'distribution')
        .map((s) => ({ label: `Age ${s.age}`, corpus: s.total })),
    [wealthResult.snapshots],
  );

  const netWorthData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        label: `Age ${s.age}`,
        netWorth: s.total,
        invested: s.invested,
      })),
    [wealthResult.snapshots],
  );

  const assetEvolutionAllData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        label: `Age ${s.age}`,
        equity: s.values.equity,
        debt: s.values.debt,
        gold: s.values.gold,
        realestate: s.values.realestate,
        liquid: s.values.liquid,
        other: s.values.other,
      })),
    [wealthResult.snapshots],
  );

  const growthMultiple =
    wealthResult.totalInvested > 0
      ? wealthResult.terminalValue / Math.max(wealthResult.netWorth, 1)
      : 0;

  const terminalSnapshot = wealthResult.snapshots[wealthResult.snapshots.length - 1];
  const allocationData = useMemo(() => {
    if (!terminalSnapshot) return [];
    const total = terminalSnapshot.total;
    const alloc = wealthResult.projectedAllocation;
    return (['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as AssetCategory[])
      .map((cat) => ({ name: ASSET_LABELS[cat], value: total * alloc[cat], color: ASSET_COLORS[cat] }))
      .filter((d) => d.value > 0);
  }, [terminalSnapshot, wealthResult.projectedAllocation]);

  const monthlyNeedAtRetirement = useMemo(() => {
    const years = Math.max(0, inputs.retirementAge - inputs.currentAge);
    return inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, years);
  }, [inputs.swp.monthlyNeedToday, inputs.inflation, inputs.retirementAge, inputs.currentAge]);

  const distributionMonthlyNeed = (year: number) => {
    const accYears = Math.max(0, inputs.retirementAge - inputs.currentAge);
    return inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, accYears + year);
  };

  const netWorth = wealthResult.netWorth;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <Card className="border border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-accent" />
            <h3 className="text-lg font-bold text-ink">Comprehensive Projections & Scenario Stress Lab</h3>
          </div>
          <Badge variant="navy" className="text-xs">
            Step 07 · Synthesized Analysis
          </Badge>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Stochastic correlated simulation paths, asset class evolution, purchasing power preservation, and interactive scenario what-if modeling.
        </p>
      </Card>

      {/* Plan Feasibility Alerts */}
      {!wealthResult.sustainable ? (
        <div className="bg-negative-soft border border-negative/30 rounded-2xl p-4 flex items-start gap-3 text-negative">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-negative" />
          <div className="text-sm">
            <strong className="font-bold">Plan Depletion Alert:</strong> Corpus is projected to exhaust at age{' '}
            <span className="font-bold font-mono text-ink">{wealthResult.depletionAge}</span>. Increase monthly savings, delay retirement, or recalibrate post-retirement withdrawals in Step 03.
          </div>
        </div>
      ) : wealthResult.goalsAtRisk.length > 0 ? (
        <div className="bg-warning-soft border border-warning/30 rounded-2xl p-4 flex items-start gap-3 text-warning">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-warning" />
          <div className="text-sm">
            <strong className="font-bold">Goals Requiring Calibration:</strong>{' '}
            {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}. Resolve competing timelines in the Goal Conflict Resolver in Step 04.
          </div>
        </div>
      ) : (
        <div className="bg-positive-soft border border-positive/30 rounded-2xl p-4 flex items-start gap-3 text-positive">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-positive" />
          <div className="text-sm">
            <strong className="font-bold">Plan Fully Solvent & Sustainable:</strong> Lifetime SWP withdrawals and all essential milestones are fully funded through age{' '}
            <span className="font-mono font-bold text-ink">{inputs.lifeExpectancy}</span>.
          </div>
        </div>
      )}

      {/* Core Outcome Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <MetricCard
          label="Terminal Wealth (Nominal)"
          value={formatCurrency(wealthResult.terminalValue)}
          subtext={`At Age ${inputs.lifeExpectancy}`}
        />
        <MetricCard
          label="Terminal Wealth (Real)"
          value={formatCurrency(wealthResult.terminalRealValue)}
          subtext="Inflation-adjusted purchasing power"
        />
        <MetricCard
          label="Monte Carlo Solvency"
          value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
          subtext="Correlated simulation runs"
          variant={wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'}
        />
        <MetricCard
          label="Essential Goals Success"
          value={formatPercent(wealthResult.essentialSuccessRate * 100)}
          subtext="Priority milestone funding"
          variant={wealthResult.essentialSuccessRate === 1 ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <MetricCard
          label="Nominal CAGR"
          value={formatPercent(wealthResult.cagrNominal)}
          subtext="Portfolio gross compound return"
        />
        <MetricCard
          label="Real CAGR"
          value={formatPercent(wealthResult.cagrReal)}
          subtext="Net of compound inflation"
        />
        <MetricCard
          label="Monthly Need at Retire"
          value={formatCurrency(monthlyNeedAtRetirement)}
          subtext={`From ${formatCurrency(inputs.swp.monthlyNeedToday)} today`}
        />
        <MetricCard
          label="Total Capital Contributed"
          value={formatCurrency(wealthResult.totalInvested)}
          subtext={growthMultiple > 0 ? `${growthMultiple.toFixed(1)}× growth multiple` : 'Over accumulation'}
        />
      </div>

      {/* Phase Timeline */}
      <Card className="border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            <h4 className="text-sm font-bold text-ink">Plan Phase Timeline</h4>
          </div>
          <span className="text-xs text-muted font-mono">
            {inputs.currentAge} → {inputs.retirementAge} → {inputs.lifeExpectancy} Yrs
          </span>
        </div>
        <PhaseTimelineBar
          currentAge={inputs.currentAge}
          retirementAge={inputs.retirementAge}
          lifeExpectancy={inputs.lifeExpectancy}
          depletionAge={wealthResult.depletionAge}
        />
        <p className="text-xs text-muted pt-2 border-t border-border">
          <strong className="text-ink">Horizon Insight:</strong>{' '}
          {wealthResult.sustainable
            ? `The plan funds all ${Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)} retirement years — corpus holds positive throughout.`
            : `Corpus depletes at age ${wealthResult.depletionAge}, leaving ${Math.max(0, inputs.lifeExpectancy - (wealthResult.depletionAge ?? inputs.lifeExpectancy))} unfunded years.`}
        </p>
      </Card>

      {/* Trajectory & Evolution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border space-y-3">
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" /> Accumulation Trajectory (Nominal vs Real)
          </h4>
          <NominalRealChart data={accData} xKey="label" />
          <p className="text-xs text-muted pt-2 border-t border-border">
            <strong className="text-ink">Insight:</strong> The gap between solid nominal and dashed real tracks the cumulative impact of {inputs.inflation}% inflation.
          </p>
        </Card>

        <Card className="border border-border space-y-3">
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <Layers size={16} className="text-accent" /> Asset Class Evolution (Full Horizon)
          </h4>
          <AssetEvolutionChart data={assetEvolutionAllData} xKey="label" variant="area" />
          <p className="text-xs text-muted pt-2 border-t border-border">
            <strong className="text-ink">Insight:</strong> Equity expansion drives compounding in accumulation, transitioning to stable drawdown in retirement.
          </p>
        </Card>
      </div>

      {/* Net Worth vs Invested + Annual Cashflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border space-y-3">
          <h4 className="text-sm font-bold text-ink">Net Worth vs Capital Invested</h4>
          <NetWorthInvestedChart data={netWorthData} />
          <p className="text-xs text-muted pt-2 border-t border-border">
            <strong className="text-ink">Insight:</strong>{' '}
            {wealthResult.totalInvested > 0
              ? `Compounding creates ${formatCurrency(wealthResult.terminalValue)} from ${formatCurrency(wealthResult.totalInvested)} invested capital.`
              : 'Add an active monthly SIP in Step 03 to project capital contributions.'}
          </p>
        </Card>

        <Card className="border border-border space-y-3">
          <h4 className="text-sm font-bold text-ink">Annual Cash Flow Inflows & Outflows</h4>
          <CashFlowTimelineChart snapshots={wealthResult.snapshots} />
          <p className="text-xs text-muted pt-2 border-t border-border">
            <strong className="text-ink">Insight:</strong> Green bars represent SIP/STP savings; amber bars reflect milestone goals; red bars represent SWP distributions.
          </p>
        </Card>
      </div>

      {/* SWP Drawdown & Terminal Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border space-y-3">
          <h4 className="text-sm font-bold text-ink">SWP Drawdown Longevity</h4>
          <SWPDrawdownChart data={swpData} xKey="label" />
          <p className="text-xs text-muted pt-2 border-t border-border">
            <strong className="text-ink">Insight:</strong>{' '}
            {wealthResult.sustainable
              ? `Retirement corpus sustains withdrawals through age ${inputs.lifeExpectancy}.`
              : `Corpus drops to zero at age ${wealthResult.depletionAge}.`}
          </p>
        </Card>

        <Card className="border border-border space-y-3">
          <h4 className="text-sm font-bold text-ink">Terminal Asset Allocation</h4>
          <DonutChart data={allocationData} />
          <p className="text-xs text-muted pt-2 border-t border-border">
            <strong className="text-ink">Insight:</strong> Residual asset allocation distribution at horizon end.
          </p>
        </Card>
      </div>

      {/* Monte Carlo Correlated Simulation */}
      <Card className="border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <BarChart2 size={18} className="text-accent" /> Monte Carlo Correlated Simulation
            </h4>
            <p className="text-xs text-muted mt-0.5">
              {wealthResult.monteCarlo.outcomes.length.toLocaleString()} stochastic runs factoring asset cross-covariance.
            </p>
          </div>
          <Badge variant="navy" className="text-xs">Stochastic Model</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <MetricCard
            label="Success Rate"
            value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
            subtext="Lifetime solvency"
            variant={wealthResult.monteCarlo.successRate >= 0.8 ? 'success' : 'danger'}
          />
          <MetricCard
            label="Median Terminal (P50)"
            value={formatCurrencyCompact(wealthResult.monteCarlo.medianTerminal)}
            subtext="50th percentile outcome"
          />
          <MetricCard
            label="P5 Terminal (Severe Stress)"
            value={formatCurrencyCompact(wealthResult.monteCarlo.percentile5)}
            subtext="5th percentile tail risk"
            variant="danger"
          />
          <MetricCard
            label="P95 Terminal (Bull Market)"
            value={formatCurrencyCompact(wealthResult.monteCarlo.percentile95)}
            subtext="95th percentile outcome"
            variant="success"
          />
        </div>

        <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
      </Card>

      {/* Embedded Scenario Comparative Simulation Lab */}
      <div className="pt-2">
        <ScenarioLab />
      </div>

      {/* Portfolio Rebalancing & Currency Exposure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border space-y-4">
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <WalletMinimal size={18} className="text-accent" /> Portfolio Rebalancing Recommendations
          </h4>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable rebalancing table">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted font-bold">
                  <th className="py-2.5 pr-3">Asset Class</th>
                  <th className="py-2.5 pr-3 text-right">Current</th>
                  <th className="py-2.5 pr-3 text-right">Target</th>
                  <th className="py-2.5 pr-3 text-right">Trade</th>
                  <th className="py-2.5 pr-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wealthResult.rebalancingTrades.map((r) => (
                  <tr key={r.category} className="hover:bg-sunken/50 transition-colors">
                    <td className="py-2.5 pr-3 flex items-center font-medium text-ink">
                      <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                      {ASSET_LABELS[r.category]}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-muted">{formatCurrencyCompact(r.current)}</td>
                    <td className="py-2.5 pr-3 text-right font-mono text-muted">{formatCurrencyCompact(r.target)}</td>
                    <td className="py-2.5 pr-3 text-right font-mono font-medium text-ink">{formatCurrencyCompact(r.trade)}</td>
                    <td className="py-2.5 pr-3 text-center">
                      {Math.abs(r.trade) < netWorth * 0.02 ? (
                        <span className="inline-flex items-center text-muted text-[11px] font-medium">
                          Hold
                        </span>
                      ) : r.trade > 0 ? (
                        <span className="text-positive bg-positive-soft border border-positive/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Buy
                        </span>
                      ) : (
                        <span className="text-negative bg-negative-soft border border-negative/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Sell
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border border-border space-y-4">
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <Globe size={18} className="text-accent" /> Currency Exposure
          </h4>
          <div className="space-y-2.5">
            {wealthResult.currencyExposure.map((c) => (
              <div key={c.currency} className="p-3 bg-sunken rounded-xl border border-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-ink font-mono text-xs">{c.currency}</span>
                  <div className="text-[11px] font-mono text-muted">{formatCurrency(c.amount)}</div>
                </div>
                <Badge variant={c.currency === 'INR' ? 'outline' : 'navy'}>
                  {formatPercent(c.percentage)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Year-by-Year Projection Schedule */}
      <Card className="border border-border space-y-4">
        <h4 className="text-sm font-bold text-ink">Annual Projection Schedule</h4>
        <div className="overflow-x-auto max-h-96" tabIndex={0} role="region" aria-label="Scrollable schedule table">
          <table className="w-full min-w-[620px] text-xs">
            <thead className="sticky top-0 bg-surface border-b border-border z-10">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted font-bold">
                <th className="py-2.5 pr-3">Year</th>
                <th className="py-2.5 pr-3">Age</th>
                <th className="py-2.5 pr-3">Phase</th>
                <th className="py-2.5 pr-3 text-right">Nominal Total</th>
                <th className="py-2.5 pr-3 text-right">Real Total</th>
                <th className="py-2.5 pr-3 text-right">Monthly Need</th>
                <th className="py-2.5 pr-3 text-right">Invested</th>
                <th className="py-2.5 pr-3 text-right">Withdrawn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {wealthResult.snapshots.map((s) => {
                const monthlyNeed =
                  s.phase === 'distribution'
                    ? distributionMonthlyNeed(s.year - Math.max(0, inputs.retirementAge - inputs.currentAge))
                    : undefined;
                return (
                  <tr key={s.year} className="hover:bg-sunken/40 transition-colors">
                    <td className="py-2 pr-3 font-mono text-muted">Y{s.year}</td>
                    <td className="py-2 pr-3 font-mono font-medium text-ink">{s.age}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={s.phase === 'accumulation' ? 'navy' : 'outline'} className="text-[10px]">
                        {s.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono font-medium text-ink">
                      {formatCurrencyCompact(s.total)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-muted">
                      {formatCurrencyCompact(s.realTotal)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-ink">
                      {monthlyNeed ? formatCurrencyCompact(monthlyNeed) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-muted">
                      {formatCurrencyCompact(s.invested)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-muted">
                      {formatCurrencyCompact(s.withdrawn)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} />
          <span>Back: Assumptions</span>
        </Button>

        <Link
          to="/dossier?autoPrint=true"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs hover:bg-accent-strong transition-all shadow-sm"
        >
          <FileDown size={16} />
          <span>Export Plan Dossier</span>
        </Link>
      </div>
    </div>
  );
};
