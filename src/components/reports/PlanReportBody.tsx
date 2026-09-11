import { FileText, TrendingUp, Target, PieChart, ShieldCheck, AlertTriangle, CheckCircle2, Globe, Wallet, Route, StickyNote, History, Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DonutChart } from '../charts/DonutChart';
import { MonteCarloFanChart } from '../charts/MonteCarloFanChart';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { guardNumber } from '../../lib/planState';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { computePlanHealthScore } from '../../lib/planHealthScore';
import { generatePlanRecommendations } from '../../lib/recommendationEngine';
import { CRISIS_PRESETS, runStressTest } from '../../lib/stressTest';
import { runReversePlanning } from '../../lib/reversePlanning';
import { PlanHealthPanel } from './PlanHealthPanel';
import { StressMatrixTable } from './StressMatrixTable';
import { GoalDistributionBars } from './GoalDistributionBars';
import { MonteCarloHistogram } from './screen/MonteCarloHistogram';
import { NetWorthTrajectory } from './screen/NetWorthTrajectory';
import { GoalFundingChart } from './screen/GoalFundingChart';
import { AllocationDriftChart } from './screen/AllocationDriftChart';
import { StressScenarioChart } from './screen/StressScenarioChart';
import { TaxBreakdownChart } from './screen/TaxBreakdownChart';
import { CurrencyExposureChart } from './screen/CurrencyExposureChart';
import { CashflowTimelineChart } from './screen/CashflowTimelineChart';
import { SensitivityTornado } from './screen/SensitivityTornado';
import { evaluateGoalConflicts } from '../../lib/goalConflictEngine';
import type { AssetCategory } from '../../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const MEETING_STAGE_NAMES: Record<number, string> = {
  1: 'Meeting 01 · Discovery & Inventory',
  2: 'Meeting 02 · Diagnostic & Scenario Lab',
  3: 'Meeting 03 · Recommendation & Strategy',
  4: 'Meeting 04 · Plan Delivery & Governance',
};

const fmtOrDash = (v: number | null | undefined, fmt: (n: number) => string) =>
  guardNumber(v) === null ? '—' : fmt(guardNumber(v) as number);

/**
 * The comprehensive, printable plan report. Rendered only when
 * wealthResult.isConfigured is true — the parent page owns that guard.
 */
export const PlanReportBody = () => {
  const navigate = useNavigate();
  const { inputs, riskProfile, riskScore, wealthResult, manualTargets, decisionHistory, meetingState } = useCalculator();

  const targets = manualTargets || riskProfile.targets;

  const planHealth = useMemo(
    () => computePlanHealthScore(inputs, wealthResult, riskScore),
    [inputs, wealthResult, riskScore],
  );
  const recommendations = useMemo(
    () => generatePlanRecommendations(inputs, wealthResult, planHealth, riskScore),
    [inputs, wealthResult, planHealth, riskScore],
  );
  const stressResults = useMemo(() => CRISIS_PRESETS.map((p) => runStressTest(inputs, p)), [inputs]);
  const reverseResult = useMemo(() => runReversePlanning(inputs, wealthResult), [inputs, wealthResult]);
  const goalConflict = useMemo(() => evaluateGoalConflicts(inputs, wealthResult), [inputs, wealthResult]);

  const mc = wealthResult.monteCarlo;

  const meetingNotes = ([1, 2, 3, 4] as const)
    .map((stageId) => ({ stageId, note: (meetingState.notes[stageId] || '').trim() }))
    .filter((s) => s.note.length > 0);

  const currentAllocationData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        name: ASSET_LABELS[cat],
        value: wealthResult.currentAllocation[cat] * wealthResult.netWorth,
        color: ASSET_COLORS[cat],
      })).filter((d) => d.value > 0),
    [wealthResult.currentAllocation, wealthResult.netWorth],
  );

  const targetAllocationData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        name: ASSET_LABELS[cat],
        value: wealthResult.netWorth * (targets[cat] / 100),
        color: ASSET_COLORS[cat],
      })).filter((d) => d.value > 0),
    [wealthResult.netWorth, targets],
  );

  const essentialGoals = wealthResult.goalResults.filter((g) => g.goal.priority === 'essential');
  const importantGoals = wealthResult.goalResults.filter((g) => g.goal.priority === 'important');
  const aspirationalGoals = wealthResult.goalResults.filter((g) => g.goal.priority === 'aspirational');

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between items-baseline gap-4 py-2 border-b border-border-subtle last:border-b-0">
      <span className="text-muted text-[13px]">{label}</span>
      <span className="font-mono tabular-nums text-[13px] text-ink text-right">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Executive Client Header Banner */}
      <Card className="print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="eyebrow">Institutional Wealth Plan</div>
            <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">{inputs.client?.name || 'Private Client Plan'}</h2>
            <p className="text-xs text-muted mt-1.5">
              Advisor: <span className="text-ink-soft font-medium">{inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}</span>
              {' · '}Review Date: <span className="font-mono text-ink-soft">{inputs.client?.reviewDate || new Date().toISOString().split('T')[0]}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{riskProfile.label}</Badge>
            <Badge tone={wealthResult.sustainable ? 'positive' : 'negative'}>
              {wealthResult.sustainable ? 'Sustainable' : `Depletes Age ${wealthResult.depletionAge}`}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Net Worth"
          value={fmtOrDash(wealthResult.netWorth, formatCurrencyCompact)}
          subtext={fmtOrDash(wealthResult.netWorth, formatCurrency)}
          icon={<Wallet size={16} strokeWidth={1.6} />}
        />
        <MetricCard
          label="Net Annual Savings"
          value={fmtOrDash(wealthResult.annualSavings, formatCurrencyCompact)}
          subtext={`${fmtOrDash(wealthResult.savingsRate, formatPercent)} of income`}
          icon={<TrendingUp size={16} strokeWidth={1.6} />}
          variant="gold"
        />
        <MetricCard
          label="Terminal Corpus"
          value={fmtOrDash(wealthResult.terminalValue, formatCurrencyCompact)}
          subtext={
            guardNumber(mc.medianTerminal) !== null
              ? `Median path ${formatCurrencyCompact(mc.medianTerminal)} · P5–P95 ${formatCurrencyCompact(mc.percentile5)}–${formatCurrencyCompact(mc.percentile95)}`
              : 'Median path —'
          }
          icon={<Target size={16} strokeWidth={1.6} />}
        />
        <MetricCard
          label="Plan Success Rate"
          value={fmtOrDash(mc.successRate * 100, formatPercent)}
          subtext={
            mc.medianDepletionAge !== null
              ? `Median path depletes at age ${mc.medianDepletionAge}`
              : `Median path sustains withdrawals through age ${inputs.lifeExpectancy}`
          }
          icon={<CheckCircle2 size={16} strokeWidth={1.6} />}
          variant={mc.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <FileText size={16} strokeWidth={1.6} className="text-muted" /> Plan Summary
          </h3>
          <div>
            {row('Client age', inputs.currentAge)}
            {row('Retirement age', inputs.retirementAge)}
            {row('Life expectancy', inputs.lifeExpectancy)}
            {row('Annual income', fmtOrDash(wealthResult.annualIncome, formatCurrency))}
            {row('Monthly expenditure', fmtOrDash(inputs.monthlyExpenditure, formatCurrency))}
            {row('Annual expenses (today)', fmtOrDash(wealthResult.annualExpenses, formatCurrency))}
            {row('Net annual savings', `${fmtOrDash(wealthResult.annualSavings, formatCurrency)} (${fmtOrDash(wealthResult.savingsRate, formatPercent)})`)}
            {row('Invested / deployed', `${fmtOrDash(wealthResult.annualInvested, formatCurrency)} (${fmtOrDash(wealthResult.investmentRate, formatPercent)})`)}
            {row('Monthly SIP', fmtOrDash(wealthResult.monthlySIP, formatCurrency))}
            {row('Total invested (projected)', fmtOrDash(wealthResult.totalInvested, formatCurrency))}
            {row('CAGR nominal', fmtOrDash(wealthResult.cagrNominal, formatPercent))}
            {row('CAGR real', fmtOrDash(wealthResult.cagrReal, formatPercent))}
          </div>
        </Card>

        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <ShieldCheck size={16} strokeWidth={1.6} className="text-muted" /> Risk Profile
          </h3>
          <div className="p-4 bg-deep text-canvas rounded-md mb-4">
            <div className="font-display text-2xl">{riskProfile.label}</div>
            <p className="text-sm text-canvas/70 mt-1 leading-relaxed">{riskProfile.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Max drawdown', fmtOrDash(riskProfile.maxDrawdown, formatPercent)],
              ['Volatility target', fmtOrDash(riskProfile.targetVolatility, formatPercent)],
              ['Goal threshold', fmtOrDash(riskProfile.goalSuccessThreshold, formatPercent)],
              ['Max drawdown prob', fmtOrDash(wealthResult.maxDrawdownProbability * 100, formatPercent)],
            ].map(([label, value]) => (
              <div key={label} className="p-3 bg-sunken border border-border-subtle rounded-md">
                <div className="eyebrow">{label}</div>
                <div className="font-mono tabular-nums text-ink mt-1 text-sm">{value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <PieChart size={16} strokeWidth={1.6} className="text-muted" /> Current vs Target Allocation
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-muted mb-2 text-center">Current</div>
              <DonutChart data={currentAllocationData} innerRadius={40} outerRadius={70} />
            </div>
            <div>
              <div className="text-xs font-medium text-muted mb-2 text-center">Target</div>
              <DonutChart data={targetAllocationData} innerRadius={40} outerRadius={70} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <TrendingUp size={16} strokeWidth={1.6} className="text-muted" /> Monte Carlo Fan Chart
          </h3>
          <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonteCarloHistogram mc={mc} />
        <NetWorthTrajectory snapshots={wealthResult.snapshots} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <History size={16} strokeWidth={1.6} className="text-muted" /> Plan Health
          </h3>
          <PlanHealthPanel health={planHealth} />
        </Card>

        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <Lightbulb size={16} strokeWidth={1.6} className="text-muted" /> Priority Recommendations
          </h3>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec) => (
                <div key={rec.id} className="p-3.5 rounded-md border border-border bg-sunken/50 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-medium bg-ink text-canvas">P{rec.priority}</span>
                    <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-sunken text-ink-soft border border-border-subtle">{rec.category}</span>
                    <span className="text-xs font-semibold text-ink">{rec.title}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{rec.impact}</p>
                  <p className="text-[11px] text-faint">
                    Confidence: <span className="font-mono text-ink-soft">{rec.confidence}%</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No active recommendations — the plan is on track across all diagnostic components.</p>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
          <Target size={16} strokeWidth={1.6} className="text-muted" /> Goal Probability Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Essential goals', value: wealthResult.essentialSuccessRate * 100, count: essentialGoals.length },
            {
              label: 'Important goals',
              value: importantGoals.length > 0 ? (importantGoals.reduce((s, g) => s + g.successRate, 0) / importantGoals.length) * 100 : null,
              count: importantGoals.length,
            },
            {
              label: 'Aspirational goals',
              value: aspirationalGoals.length > 0 ? (aspirationalGoals.reduce((s, g) => s + g.successRate, 0) / aspirationalGoals.length) * 100 : null,
              count: aspirationalGoals.length,
            },
          ].map((g) => (
            <div key={g.label} className="p-4 bg-sunken rounded-md border border-border-subtle">
              <div className="eyebrow">{g.label}</div>
              <div className="num-hero text-3xl text-ink mt-1">{fmtOrDash(g.value, (v) => formatPercent(v))}</div>
              <div className="text-xs text-muted mt-1">{g.count} goals</div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border-strong text-left eyebrow">
                <th className="py-2.5 pr-4 font-medium">Goal</th>
                <th className="py-2.5 pr-4 font-medium">Priority</th>
                <th className="py-2.5 pr-4 text-right font-medium">Target</th>
                <th className="py-2.5 pr-4 text-right font-medium">Future Value</th>
                <th className="py-2.5 pr-4 text-right font-medium">PV Needed</th>
                <th className="py-2.5 pr-4 text-right font-medium">Success</th>
                <th className="py-2.5 pr-4 text-right font-medium">Shortfall Prob.</th>
                <th className="py-2.5 pr-4 text-right font-medium">Expected Shortfall</th>
                <th className="py-2.5 pr-4 text-right font-medium">Required SIP</th>
                <th className="py-2.5 pr-4 w-44 font-medium">Outcome Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {wealthResult.goalResults.map((g) => (
                <tr key={g.goal.id} className="hover:bg-surface">
                  <td className="py-2.5 pr-4 font-medium text-ink">{g.goal.name}</td>
                  <td className="py-2.5 pr-4">
                    <Badge tone={g.goal.priority === 'essential' ? 'negative' : g.goal.priority === 'important' ? 'neutral' : 'brass'}>
                      {g.goal.priority}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">{formatCurrency(g.goal.targetAmount)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">{formatCurrency(g.futureValue)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">{formatCurrencyCompact(g.pvNeeded)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold">
                    <span className={g.successRate >= riskProfile.goalSuccessThreshold / 100 ? 'text-positive' : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6 ? 'text-warning' : 'text-negative'}>
                      {formatPercent(g.successRate * 100)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-negative">{formatPercent(g.shortfallProbability * 100)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">{formatCurrencyCompact(g.expectedShortfall)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold text-ink">{formatCurrency(g.requiredSIP)}</td>
                  <td className="py-2.5 pr-4">
                    <GoalDistributionBars distribution={g.probabilityDistribution} targetAmount={g.futureValue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {stressResults.length > 0 && (
        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-1 flex items-center gap-2">
            <ShieldCheck size={16} strokeWidth={1.6} className="text-muted" /> Stress Matrix — Historical Crisis Scenarios
          </h3>
          <p className="text-xs text-muted mb-4">
            Four historical crises re-applied to current holdings; the plan is then re-projected to retirement under each shock.
          </p>
          <StressMatrixTable results={stressResults} />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalFundingChart conflict={goalConflict} />
        <StressScenarioChart results={stressResults} />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
          <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
            <Route size={16} strokeWidth={1.6} className="text-muted" /> Reverse-Planning Pathways
          </h3>
          <span className="text-xs text-muted">
            Target corpus {formatCurrencyCompact(reverseResult.targetCorpus)} by age {reverseResult.targetAge}
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          Four levers to close the funding gap: {formatCurrencyCompact(reverseResult.requiredMonthlySip)}/mo required SIP · feasible
          retirement at age {reverseResult.feasibleRetirementAge} · max sustainable spend {formatCurrency(reverseResult.maxSustainableMonthlySpend)}/mo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reverseResult.pathways.map((p) => (
            <div key={p.id} className="p-4 rounded-md border border-border bg-sunken/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{p.name}</span>
                <Badge tone={p.successProbability >= 95 ? 'positive' : 'neutral'}>{p.successProbability}% success</Badge>
              </div>
              <p className="text-[11px] text-muted leading-snug">{p.tagline}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-raised rounded-md border border-border-subtle">
                  <div className="text-[10px] uppercase tracking-wide text-muted eyebrow">Required SIP</div>
                  <div className="text-xs font-mono tabular-nums font-semibold text-ink mt-1">{formatCurrencyCompact(p.requiredSipMonthly)}</div>
                </div>
                <div className="p-2 bg-raised rounded-md border border-border-subtle">
                  <div className="text-[10px] uppercase tracking-wide text-muted eyebrow">Retire At</div>
                  <div className="text-xs font-mono tabular-nums font-semibold text-ink mt-1">Age {p.projectedRetirementAge}</div>
                </div>
                <div className="p-2 bg-raised rounded-md border border-border-subtle">
                  <div className="text-[10px] uppercase tracking-wide text-muted eyebrow">Spend / Mo</div>
                  <div className="text-xs font-mono tabular-nums font-semibold text-ink mt-1">{formatCurrencyCompact(p.monthlyRetirementSpending)}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted leading-snug">{p.tradeOffDescription}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <Wallet size={16} strokeWidth={1.6} className="text-muted" /> Tax Summary
          </h3>
          <div>
            {row('Annual income', fmtOrDash(wealthResult.annualIncome, formatCurrency))}
            {row('Estimated tax', fmtOrDash(wealthResult.taxSummary.annualTax, formatCurrency))}
            {row('Effective tax rate', fmtOrDash(wealthResult.taxSummary.effectiveRate * 100, formatPercent))}
            {row('Post-tax income', fmtOrDash(wealthResult.taxSummary.postTaxIncome, formatCurrency))}
            {row('Recommended tax saving', fmtOrDash(wealthResult.taxSummary.recommendedTaxSaving, formatCurrency))}
          </div>
        </Card>

        <Card>
          <h3 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
            <Globe size={16} strokeWidth={1.6} className="text-muted" /> Currency Exposure
          </h3>
          <div className="space-y-3">
            {wealthResult.currencyExposure.map((c) => (
              <div key={c.currency} className="p-3 bg-sunken rounded-md border border-border-subtle">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium text-ink">{c.currency}</span>
                  <Badge tone={c.currency === 'INR' ? 'neutral' : 'brass'}>{formatPercent(c.percentage)}</Badge>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border-subtle overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, c.percentage)}%` }} />
                </div>
                <div className="text-xs font-mono tabular-nums text-muted mt-1.5">{formatCurrency(c.amount)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationDriftChart current={wealthResult.currentAllocation} targets={targets} netWorth={wealthResult.netWorth} />
        <CurrencyExposureChart exposure={wealthResult.currencyExposure} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaxBreakdownChart taxSummary={wealthResult.taxSummary} annualIncome={wealthResult.annualIncome} />
        <SensitivityTornado inputs={inputs} wealthResult={wealthResult} />
      </div>

      <CashflowTimelineChart snapshots={wealthResult.snapshots} />

      {wealthResult.goalsAtRisk.length > 0 && (
        <div className="bg-negative-soft border border-negative/25 rounded-md p-4 flex items-start gap-3 text-negative">
          <AlertTriangle size={18} strokeWidth={1.6} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Goals at risk:</strong> {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}. Review the Goal Planner to
            increase SIPs or extend horizons.
          </div>
        </div>
      )}

      {wealthResult.sustainable ? (
        <div className="bg-positive-soft border border-positive/25 rounded-md p-4 flex items-start gap-3 text-positive">
          <CheckCircle2 size={18} strokeWidth={1.6} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is sustainable.</strong> The projected corpus is expected to last through age {inputs.lifeExpectancy} under mean
            assumptions.
          </div>
        </div>
      ) : (
        <div className="bg-negative-soft border border-negative/25 rounded-md p-4 flex items-start gap-3 text-negative">
          <AlertTriangle size={18} strokeWidth={1.6} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is not sustainable.</strong> Corpus may deplete at age {wealthResult.depletionAge}. Consider increasing savings,
            delaying retirement, or reducing withdrawals.
          </div>
        </div>
      )}

      {(decisionHistory.length > 0 || meetingNotes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {decisionHistory.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                  <History size={16} strokeWidth={1.6} className="text-muted" /> Decision Log Summary
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigate('/decision-history')}>
                  View all
                </Button>
              </div>
              <div className="space-y-2.5">
                {decisionHistory.slice(0, 5).map((dec) => (
                  <div key={dec.id} className="flex items-start justify-between gap-3 py-2 border-b border-border-subtle last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">
                        {dec.actionTitle}
                        {dec.reverted && <span className="ml-1.5 px-1.5 py-0.5 rounded-sm text-[9px] font-mono bg-sunken text-faint">REVERTED</span>}
                      </p>
                      {dec.rationale && <p className="text-[11px] text-muted truncate mt-0.5">{dec.rationale}</p>}
                    </div>
                    <span className="text-[10px] font-mono text-faint whitespace-nowrap shrink-0">
                      {dec.dateFormatted} · {dec.author}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {meetingNotes.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                  <StickyNote size={16} strokeWidth={1.6} className="text-muted" /> Meeting Notes
                </h3>
                <Badge tone="neutral">{meetingNotes.length} of 4 stages recorded</Badge>
              </div>
              <div className="space-y-2.5">
                {meetingNotes.map((s) => (
                  <div key={s.stageId} className="py-2 border-b border-border-subtle last:border-0">
                    <p className="text-xs font-semibold text-ink">{MEETING_STAGE_NAMES[s.stageId]}</p>
                    <p className="text-[11px] text-muted leading-snug mt-0.5 line-clamp-2">{s.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
