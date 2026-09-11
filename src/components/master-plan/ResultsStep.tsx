import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  FileDown,
  Calendar,
  WalletMinimal,
  Globe,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { EmptyState } from '../ui/EmptyState';
import { PhaseTimelineBar } from '../charts/PhaseTimelineBar';
import { MonteCarloFanChart } from '../charts/MonteCarloFanChart';
import { ScenarioLab } from '../analytics/ScenarioLab';
import { ResultsCharts } from './ResultsCharts';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { guardNumber, formatOrDash } from '../../lib/planState';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import type { MasterPlanInputs, RiskProfile } from '../../types';
import type { WealthEngineResult } from '../../lib/wealthEngine';

interface ResultsStepProps {
  inputs: MasterPlanInputs;
  wealthResult: WealthEngineResult;
  riskProfile: RiskProfile;
  hasRiskAnswers?: boolean;
  onBack: () => void;
  onStart?: () => void;
}

export const ResultsStep = ({
  inputs,
  wealthResult,
  riskProfile,
  hasRiskAnswers,
  onBack,
  onStart,
}: ResultsStepProps) => {
  const configured = wealthResult.isConfigured;
  const answered = hasRiskAnswers !== false;

  const growthMultiple =
    wealthResult.totalInvested > 0
      ? wealthResult.terminalValue / Math.max(wealthResult.netWorth, 1)
      : 0;

  const monthlyNeedAtRetirement = useMemo(() => {
    const years = Math.max(0, inputs.retirementAge - inputs.currentAge);
    return inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, years);
  }, [inputs.swp.monthlyNeedToday, inputs.inflation, inputs.retirementAge, inputs.currentAge]);

  const distributionMonthlyNeed = (year: number) => {
    const accYears = Math.max(0, inputs.retirementAge - inputs.currentAge);
    return inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, accYears + year);
  };

  const netWorth = wealthResult.netWorth;

  const mcRate = guardNumber(wealthResult.monteCarlo.successRate * 100);

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Step 07 · Outlook</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Projections & scenario lab</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Stochastic simulation paths, asset-class evolution, purchasing-power preservation, and interactive what-if modeling.
        </p>
      </header>

      {/* Zero state — a blank plan must never present fabricated outcomes */}
      {!configured && (
        <EmptyState
          eyebrow="Plan outlook"
          title="The plan needs a foundation"
          description="Add a client profile, assets, and cashflows before projections can be computed. Nothing here is estimated until the plan is configured."
          display
          icon={Calendar}
          action={
            onStart && (
              <Button onClick={onStart} className="flex items-center gap-2">
                <span>Start with the profile</span>
                <ArrowLeft size={15} className="rotate-180" aria-hidden="true" />
              </Button>
            )
          }
        />
      )}

      {configured && (
        <>
          {/* Feasibility banner */}
          {!wealthResult.sustainable ? (
            <div className="bg-negative-soft border border-negative/30 rounded-md p-4 flex items-start gap-3 text-negative">
              <AlertTriangle size={18} strokeWidth={1.7} className="shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm leading-relaxed">
                <strong className="font-semibold">Plan depletion alert:</strong> corpus is projected to
                exhaust at age{' '}
                <span className="font-mono font-semibold">{wealthResult.depletionAge ?? '—'}</span>.
                Increase monthly savings, delay retirement, or recalibrate withdrawals in Step 03.
              </p>
            </div>
          ) : wealthResult.goalsAtRisk.length > 0 ? (
            <div className="bg-warning-soft border border-warning/30 rounded-md p-4 flex items-start gap-3 text-warning">
              <AlertTriangle size={18} strokeWidth={1.7} className="shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm leading-relaxed">
                <strong className="font-semibold">Goals requiring calibration:</strong>{' '}
                {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}. Resolve competing timelines
                in the Goal Conflict Resolver (Step 04).
              </p>
            </div>
          ) : (
            <div className="bg-positive-soft border border-positive/30 rounded-md p-4 flex items-start gap-3 text-positive">
              <CheckCircle2 size={18} strokeWidth={1.7} className="shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm leading-relaxed">
                <strong className="font-semibold">Plan solvent & sustainable:</strong> lifetime withdrawals
                and essential milestones are funded through age{' '}
                <span className="font-mono font-semibold">{inputs.lifeExpectancy}</span>.
              </p>
            </div>
          )}

          {/* Outcome metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Terminal wealth (nominal)"
              value={formatOrDash(guardNumber(wealthResult.terminalValue), formatCurrency)}
              subtext={`At age ${inputs.lifeExpectancy || '—'}`}
            />
            <MetricCard
              label="Terminal wealth (real)"
              value={formatOrDash(guardNumber(wealthResult.terminalRealValue), formatCurrency)}
              subtext="Inflation-adjusted"
            />
            <MetricCard
              label="Monte Carlo solvency"
              value={formatOrDash(answered ? mcRate : null, (v) => formatPercent(v, 0))}
              subtext={answered ? 'Correlated simulation runs' : 'Complete the risk questionnaire'}
              variant={answered && mcRate !== null && mcRate >= riskProfile.goalSuccessThreshold ? 'success' : answered ? 'danger' : 'default'}
            />
            <MetricCard
              label="Essential goal success"
              value={formatOrDash(
                inputs.goals.length > 0 ? guardNumber(wealthResult.essentialSuccessRate * 100) : null,
                (v) => formatPercent(v, 0),
              )}
              subtext="Priority milestone funding"
              variant={wealthResult.essentialSuccessRate === 1 ? 'success' : 'danger'}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              label="Nominal CAGR"
              value={formatOrDash(guardNumber(wealthResult.cagrNominal), (v) => formatPercent(v, 1))}
              subtext="Gross compound return"
            />
            <MetricCard
              label="Real CAGR"
              value={formatOrDash(guardNumber(wealthResult.cagrReal), (v) => formatPercent(v, 1))}
              subtext="Net of inflation"
            />
            <MetricCard
              label="Monthly need at retirement"
              value={formatOrDash(
                inputs.swp.monthlyNeedToday > 0 ? guardNumber(monthlyNeedAtRetirement) : null,
                formatCurrency,
              )}
              subtext={
                inputs.swp.monthlyNeedToday > 0
                  ? `From ${formatCurrency(inputs.swp.monthlyNeedToday)} today`
                  : 'Set the SWP need in Step 03'
              }
            />
            <MetricCard
              label="Capital contributed"
              value={formatOrDash(guardNumber(wealthResult.totalInvested), formatCurrency)}
              subtext={growthMultiple > 0 ? `${growthMultiple.toFixed(1)}× growth multiple` : 'Over accumulation'}
            />
          </div>

          {/* Phase timeline */}
          <section className="border-t border-border pt-6">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
                <Calendar size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
                Plan phase timeline
              </h3>
              <span className="font-mono text-[11px] text-faint tabular-nums">
                Age {inputs.currentAge} → {inputs.retirementAge} → {inputs.lifeExpectancy}
              </span>
            </div>
            <div className="mt-4 border border-border rounded-md bg-surface p-4">
              <PhaseTimelineBar
                currentAge={inputs.currentAge}
                retirementAge={inputs.retirementAge}
                lifeExpectancy={inputs.lifeExpectancy}
                depletionAge={wealthResult.depletionAge}
              />
            </div>
            <p className="mt-2.5 text-xs text-muted leading-relaxed">
              {wealthResult.sustainable
                ? `The plan funds all ${Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)} retirement years — corpus stays positive throughout.`
                : `Corpus depletes at age ${wealthResult.depletionAge ?? '—'}, leaving ${Math.max(0, inputs.lifeExpectancy - (wealthResult.depletionAge ?? inputs.lifeExpectancy))} unfunded years.`}
            </p>
          </section>

          {/* Trajectory & evolution charts */}
          <ResultsCharts inputs={inputs} wealthResult={wealthResult} />

          {/* Monte Carlo */}
          <section className="border-t border-border pt-6">
            <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-ink tracking-tight">Monte Carlo simulation</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {wealthResult.monteCarlo.outcomes.length.toLocaleString()} stochastic runs with asset cross-covariance.
                </p>
              </div>
              <Badge tone="info">Stochastic model</Badge>
            </div>

            {!answered && (
              <p className="mb-4 text-xs text-faint leading-relaxed border-l-2 border-border pl-3">
                Solvency percentiles use the default moderate risk baseline — complete the risk
                questionnaire to personalize them.
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Success rate"
                value={formatOrDash(answered ? mcRate : null, (v) => formatPercent(v, 0))}
                subtext="Lifetime solvency"
                variant={answered && mcRate !== null && mcRate >= 80 ? 'success' : answered ? 'danger' : 'default'}
              />
              <MetricCard
                label="Median terminal (P50)"
                value={formatOrDash(guardNumber(wealthResult.monteCarlo.medianTerminal), formatCurrencyCompact)}
                subtext="50th percentile"
              />
              <MetricCard
                label="P5 terminal (stress)"
                value={formatOrDash(guardNumber(wealthResult.monteCarlo.percentile5), formatCurrencyCompact)}
                subtext="5th percentile tail"
                variant="danger"
              />
              <MetricCard
                label="P95 terminal (bull)"
                value={formatOrDash(guardNumber(wealthResult.monteCarlo.percentile95), formatCurrencyCompact)}
                subtext="95th percentile"
                variant="success"
              />
            </div>

            <div className="mt-4 border border-border rounded-md bg-surface p-4">
              <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
            </div>
          </section>

          {/* Scenario lab (owned by analytics group) */}
          <ScenarioLab />

          {/* Rebalancing & currency exposure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-8">
            <section className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <WalletMinimal size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
                Rebalancing recommendations
              </h3>
              <div className="overflow-x-auto mt-3" tabIndex={0} role="region" aria-label="Scrollable rebalancing table">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="border-b border-border text-left eyebrow">
                      <th className="py-2.5 pr-3 font-medium">Asset class</th>
                      <th className="py-2.5 pr-3 text-right font-medium">Current</th>
                      <th className="py-2.5 pr-3 text-right font-medium">Target</th>
                      <th className="py-2.5 pr-3 text-right font-medium">Trade</th>
                      <th className="py-2.5 pr-3 text-center font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {wealthResult.rebalancingTrades.map((r) => (
                      <tr key={r.category}>
                        <td className="py-2.5 pr-3 flex items-center font-medium text-ink">
                          <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} aria-hidden="true" />
                          {ASSET_LABELS[r.category]}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted">{formatCurrencyCompact(r.current)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted">{formatCurrencyCompact(r.target)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-medium text-ink">{formatCurrencyCompact(r.trade)}</td>
                        <td className="py-2.5 pr-3 text-center">
                          {Math.abs(r.trade) < netWorth * 0.02 ? (
                            <span className="text-muted text-[11px] font-medium">Hold</span>
                          ) : r.trade > 0 ? (
                            <span className="text-positive bg-positive-soft border border-positive/25 text-[11px] font-semibold px-2 py-0.5 rounded-sm">Buy</span>
                          ) : (
                            <span className="text-negative bg-negative-soft border border-negative/25 text-[11px] font-semibold px-2 py-0.5 rounded-sm">Sell</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Globe size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
                Currency exposure
              </h3>
              <div className="divide-y divide-border border-t border-b border-border mt-3">
                {wealthResult.currencyExposure.map((c) => (
                  <div key={c.currency} className="flex items-center justify-between gap-4 py-2.5">
                    <div>
                      <span className="font-mono text-xs font-semibold text-ink">{c.currency}</span>
                      <span className="block text-[11px] font-mono tabular-nums text-muted">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                    <Badge tone={c.currency === 'INR' ? 'neutral' : 'info'}>
                      {formatPercent(c.percentage)}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Year-by-year schedule */}
          <section className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-ink">Annual projection schedule</h3>
            <div className="overflow-x-auto max-h-96 mt-3 border border-border rounded-md" tabIndex={0} role="region" aria-label="Scrollable schedule table">
              <table className="w-full min-w-[620px] text-xs">
                <thead className="sticky top-0 bg-surface border-b border-border z-10">
                  <tr className="text-left eyebrow">
                    <th className="py-2.5 pr-3 font-medium">Year</th>
                    <th className="py-2.5 pr-3 font-medium">Age</th>
                    <th className="py-2.5 pr-3 font-medium">Phase</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Nominal</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Real</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Monthly need</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Invested</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Withdrawn</th>
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
                        <td className="py-2 pr-3 font-mono tabular-nums text-muted">Y{s.year}</td>
                        <td className="py-2 pr-3 font-mono tabular-nums font-medium text-ink">{s.age}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={s.phase === 'accumulation' ? 'info' : 'neutral'}>
                            {s.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums font-medium text-ink">
                          {formatCurrencyCompact(s.total)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted">
                          {formatCurrencyCompact(s.realTotal)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-ink">
                          {monthlyNeed ? formatCurrencyCompact(monthlyNeed) : '—'}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted">
                          {formatCurrencyCompact(s.invested)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted">
                          {formatCurrencyCompact(s.withdrawn)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Back · Assumptions</span>
            </Button>
            <Link
              to="/dossier?autoPrint=true"
              className="inline-flex items-center gap-2 px-4 min-h-10 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-strong transition-colors"
            >
              <FileDown size={15} aria-hidden="true" />
              <span>Export plan dossier</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
