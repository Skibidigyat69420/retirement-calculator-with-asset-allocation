import { FileText, TrendingUp, Target, PieChart, ShieldCheck, AlertTriangle, CheckCircle2, Globe, Wallet, Printer, FileDown, HeartPulse, Route, StickyNote, History, Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculator } from '../context/CalculatorContext';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { DonutChart } from '../components/charts/DonutChart';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { computePlanHealthScore } from '../lib/planHealthScore';
import { generatePlanRecommendations } from '../lib/recommendationEngine';
import { CRISIS_PRESETS, runStressTest } from '../lib/stressTest';
import { runReversePlanning } from '../lib/reversePlanning';
import { PlanHealthPanel } from '../components/reports/PlanHealthPanel';
import { StressMatrixTable } from '../components/reports/StressMatrixTable';
import { GoalDistributionBars } from '../components/reports/GoalDistributionBars';
import { MonteCarloHistogram } from '../components/reports/screen/MonteCarloHistogram';
import { NetWorthTrajectory } from '../components/reports/screen/NetWorthTrajectory';
import { GoalFundingChart } from '../components/reports/screen/GoalFundingChart';
import { AllocationDriftChart } from '../components/reports/screen/AllocationDriftChart';
import { StressScenarioChart } from '../components/reports/screen/StressScenarioChart';
import { TaxBreakdownChart } from '../components/reports/screen/TaxBreakdownChart';
import { CurrencyExposureChart } from '../components/reports/screen/CurrencyExposureChart';
import { CashflowTimelineChart } from '../components/reports/screen/CashflowTimelineChart';
import { SensitivityTornado } from '../components/reports/screen/SensitivityTornado';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { evaluateGoalConflicts } from '../lib/goalConflictEngine';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const MEETING_STAGE_NAMES: Record<number, string> = {
  1: 'Meeting 01 · Discovery & Inventory',
  2: 'Meeting 02 · Diagnostic & Scenario Lab',
  3: 'Meeting 03 · Recommendation & Strategy',
  4: 'Meeting 04 · Plan Delivery & Governance',
};

export const Reports = () => {
  const navigate = useNavigate();
  const { inputs, riskProfile, riskScore, wealthResult, manualTargets, decisionHistory, meetingState } = useCalculator();

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Hide app chrome (sidebar, top bar, footer) when printing the report */}
      <style>{`
        @media print {
          aside, header, footer, nav, .print-hidden { display: none !important; }
          body { background: white !important; color: #09090b !important; }
          .page-break { break-after: page !important; page-break-after: always !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <SectionTitle
          title="Plan Reports"
          subtitle="A consolidated view of your financial plan: net worth, allocation, goals, Monte Carlo outcomes, tax, and currency exposure."
          badge="Comprehensive"
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/dossier?autoPrint=true')} variant="primary" className="flex items-center gap-2 shadow-xs">
            <FileDown size={16} />
            Export Full Dossier (PDF)
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2 border-border-strong text-ink-soft hover:bg-sunken">
            <Printer size={16} />
            Print Page
          </Button>
        </div>
      </div>

      {/* Executive Client Header Banner */}
      <Card className="bg-surface border border-border/90 shadow-2xs print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Institutional Wealth Plan</div>
            <h2 className="text-xl sm:text-2xl font-sans text-ink font-bold mt-0.5">{inputs.client?.name || 'Private Client Plan'}</h2>
            <p className="text-xs text-muted mt-1">
              Advisor: <strong className="text-ink font-semibold">{inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}</strong> · Review Date: <strong className="text-ink font-semibold">{inputs.client?.reviewDate || new Date().toISOString().split('T')[0]}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-3 py-1 font-semibold border-border-strong text-ink-soft">
              Risk: {riskProfile.label}
            </Badge>
            <Badge variant={wealthResult.sustainable ? 'success' : 'danger'} className="text-xs px-3 py-1">
              {wealthResult.sustainable ? 'Sustainable' : `Depletes Age ${wealthResult.depletionAge}`}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Net Worth"
          value={formatCurrencyCompact(wealthResult.netWorth)}
          subtext={formatCurrency(wealthResult.netWorth)}
          icon={<Wallet size={16} />}
          variant="navy"
        />
        <MetricCard
          label="Net Annual Savings"
          value={formatCurrencyCompact(wealthResult.annualSavings)}
          subtext={`${formatPercent(wealthResult.savingsRate)} of income`}
          icon={<TrendingUp size={16} />}
          variant="gold"
        />
        <MetricCard
          label="Terminal Corpus"
          value={formatCurrencyCompact(wealthResult.terminalValue)}
          subtext={`Median path ${formatCurrencyCompact(mc.medianTerminal)} · P5–P95 ${formatCurrencyCompact(mc.percentile5)}–${formatCurrencyCompact(mc.percentile95)}`}
          icon={<Target size={16} />}
        />
        <MetricCard
          label="Plan Success Rate"
          value={formatPercent(mc.successRate * 100)}
          subtext={
            mc.medianDepletionAge !== null
              ? `Median path depletes at age ${mc.medianDepletionAge}`
              : `Median path sustains withdrawals through age ${inputs.lifeExpectancy}`
          }
          icon={<CheckCircle2 size={16} />}
          variant={mc.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><FileText size={18} className="text-muted" /> Plan Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Client age</span><span className="font-semibold text-ink">{inputs.currentAge}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Retirement age</span><span className="font-semibold text-ink">{inputs.retirementAge}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Life expectancy</span><span className="font-semibold text-ink">{inputs.lifeExpectancy}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Annual income</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.annualIncome)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Monthly expenditure</span><span className="font-semibold text-ink">{formatCurrency(inputs.monthlyExpenditure)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Annual expenses (today)</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.annualExpenses)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Net annual savings</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.annualSavings)} ({formatPercent(wealthResult.savingsRate)})</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Invested / deployed</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.annualInvested)} ({formatPercent(wealthResult.investmentRate)})</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Monthly SIP</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.monthlySIP)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Total invested (projected)</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.totalInvested)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">CAGR nominal</span><span className="font-semibold text-ink">{formatPercent(wealthResult.cagrNominal)}</span></div>
            <div className="flex justify-between py-2"><span className="text-muted font-medium">CAGR real</span><span className="font-semibold text-ink">{formatPercent(wealthResult.cagrReal)}</span></div>
          </div>
        </Card>

        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-muted" /> Risk Profile</h3>
          <div className="p-4 bg-sunken text-ink rounded-xl mb-4 shadow-xs">
            <div className="text-2xl font-sans font-bold">{riskProfile.label}</div>
            <p className="text-sm text-ink-soft mt-1">{riskProfile.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-sunken border border-border/60 rounded-xl"><div className="text-xs text-muted font-semibold uppercase tracking-wider">Max drawdown</div><div className="font-semibold text-ink mt-0.5">{formatPercent(riskProfile.maxDrawdown)}</div></div>
            <div className="p-3 bg-sunken border border-border/60 rounded-xl"><div className="text-xs text-muted font-semibold uppercase tracking-wider">Volatility target</div><div className="font-semibold text-ink mt-0.5">{formatPercent(riskProfile.targetVolatility)}</div></div>
            <div className="p-3 bg-sunken border border-border/60 rounded-xl"><div className="text-xs text-muted font-semibold uppercase tracking-wider">Goal threshold</div><div className="font-semibold text-ink mt-0.5">{formatPercent(riskProfile.goalSuccessThreshold)}</div></div>
            <div className="p-3 bg-sunken border border-border/60 rounded-xl"><div className="text-xs text-muted font-semibold uppercase tracking-wider">Max drawdown prob</div><div className="font-semibold text-ink mt-0.5">{formatPercent(wealthResult.maxDrawdownProbability * 100)}</div></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><PieChart size={18} className="text-muted" /> Current vs Target Allocation</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-muted mb-2 text-center">Current</div>
              <DonutChart data={currentAllocationData} innerRadius={40} outerRadius={70} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted mb-2 text-center">Target</div>
              <DonutChart data={targetAllocationData} innerRadius={40} outerRadius={70} />
            </div>
          </div>
        </Card>

        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-muted" /> Monte Carlo Fan Chart</h3>
          <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonteCarloHistogram mc={mc} />
        <NetWorthTrajectory snapshots={wealthResult.snapshots} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><HeartPulse size={18} className="text-muted" /> Plan Health</h3>
          <PlanHealthPanel health={planHealth} />
        </Card>

        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><Lightbulb size={18} className="text-muted" /> Priority Recommendations</h3>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec) => (
                <div key={rec.id} className="p-3.5 rounded-xl border border-border bg-sunken/60 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sunken text-ink">P{rec.priority}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sunken text-ink-soft">{rec.category}</span>
                    <span className="text-xs font-semibold text-ink">{rec.title}</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{rec.impact}</p>
                  <p className="text-[11px] text-muted">
                    Confidence: <span className="font-mono font-semibold text-ink-soft">{rec.confidence}%</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No active recommendations — the plan is on track across all diagnostic components.</p>
          )}
        </Card>
      </div>

      <Card className="border border-border/90 shadow-2xs">
        <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-muted" /> Goal Probability Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-sunken rounded-xl border border-border/80">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Essential goals</div>
            <div className="text-xl font-sans font-bold text-ink mt-1">{formatPercent(wealthResult.essentialSuccessRate * 100)}</div>
            <div className="text-xs text-muted mt-1 font-medium">{essentialGoals.length} goals</div>
          </div>
          <div className="p-4 bg-sunken rounded-xl border border-border/80">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Important goals</div>
            <div className="text-xl font-sans font-bold text-ink mt-1">
              {importantGoals.length > 0 ? formatPercent((importantGoals.reduce((s, g) => s + g.successRate, 0) / importantGoals.length) * 100) : '—'}
            </div>
            <div className="text-xs text-muted mt-1 font-medium">{importantGoals.length} goals</div>
          </div>
          <div className="p-4 bg-sunken rounded-xl border border-border/80">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Aspirational goals</div>
            <div className="text-xl font-sans font-bold text-ink mt-1">
              {aspirationalGoals.length > 0 ? formatPercent((aspirationalGoals.reduce((s, g) => s + g.successRate, 0) / aspirationalGoals.length) * 100) : '—'}
            </div>
            <div className="text-xs text-muted mt-1 font-medium">{aspirationalGoals.length} goals</div>
          </div>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b-2 border-border-strong text-left text-[11px] uppercase tracking-wider text-ink font-bold">
                <th className="py-2.5 pr-4">Goal</th>
                <th className="py-2.5 pr-4">Priority</th>
                <th className="py-2.5 pr-4 text-right">Target</th>
                <th className="py-2.5 pr-4 text-right">Future Value</th>
                <th className="py-2.5 pr-4 text-right">PV Needed</th>
                <th className="py-2.5 pr-4 text-right">Success</th>
                <th className="py-2.5 pr-4 text-right">Shortfall Prob.</th>
                <th className="py-2.5 pr-4 text-right">Expected Shortfall</th>
                <th className="py-2.5 pr-4 text-right">Required SIP</th>
                <th className="py-2.5 pr-4 w-44">Outcome Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {wealthResult.goalResults.map((g) => (
                <tr key={g.goal.id} className="hover:bg-sunken/50">
                  <td className="py-2.5 pr-4 font-semibold text-ink">{g.goal.name}</td>
                  <td className="py-2.5 pr-4"><Badge variant={g.goal.priority === 'essential' ? 'danger' : g.goal.priority === 'important' ? 'default' : 'outline'}>{g.goal.priority}</Badge></td>
                  <td className="py-2.5 pr-4 text-right font-mono text-ink-soft">{formatCurrency(g.goal.targetAmount)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-ink-soft">{formatCurrency(g.futureValue)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-ink-soft">{formatCurrencyCompact(g.pvNeeded)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-bold">
                    <span className={g.successRate >= riskProfile.goalSuccessThreshold / 100 ? 'text-positive' : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6 ? 'text-warning' : 'text-negative'}>
                      {formatPercent(g.successRate * 100)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-negative">{formatPercent(g.shortfallProbability * 100)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-ink-soft">{formatCurrencyCompact(g.expectedShortfall)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-semibold text-ink">{formatCurrency(g.requiredSIP)}</td>
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
        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-1 flex items-center gap-2"><ShieldCheck size={18} className="text-muted" /> Stress Matrix — Historical Crisis Scenarios</h3>
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

      <Card className="border border-border/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
          <h3 className="text-lg font-sans text-ink font-bold flex items-center gap-2"><Route size={18} className="text-muted" /> Reverse-Planning Pathways</h3>
          <span className="text-xs text-muted font-medium">
            Target corpus {formatCurrencyCompact(reverseResult.targetCorpus)} by age {reverseResult.targetAge}
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          Four levers to close the funding gap: {formatCurrencyCompact(reverseResult.requiredMonthlySip)}/mo required SIP · feasible retirement at age{' '}
          {reverseResult.feasibleRetirementAge} · max sustainable spend {formatCurrency(reverseResult.maxSustainableMonthlySpend)}/mo.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reverseResult.pathways.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-border bg-sunken/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{p.name}</span>
                <Badge variant={p.successProbability >= 95 ? 'success' : 'outline'}>{p.successProbability}% success</Badge>
              </div>
              <p className="text-[11px] text-muted leading-snug">{p.tagline}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-surface rounded-lg border border-border/70">
                  <div className="text-[10px] uppercase tracking-wide text-muted font-semibold">Required SIP</div>
                  <div className="text-xs font-mono font-bold text-ink mt-0.5">{formatCurrencyCompact(p.requiredSipMonthly)}</div>
                </div>
                <div className="p-2 bg-surface rounded-lg border border-border/70">
                  <div className="text-[10px] uppercase tracking-wide text-muted font-semibold">Retire At</div>
                  <div className="text-xs font-mono font-bold text-ink mt-0.5">Age {p.projectedRetirementAge}</div>
                </div>
                <div className="p-2 bg-surface rounded-lg border border-border/70">
                  <div className="text-[10px] uppercase tracking-wide text-muted font-semibold">Spend / Mo</div>
                  <div className="text-xs font-mono font-bold text-ink mt-0.5">{formatCurrencyCompact(p.monthlyRetirementSpending)}</div>
                </div>
              </div>
              <p className="text-[11px] text-muted leading-snug">{p.tradeOffDescription}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><Wallet size={18} className="text-muted" /> Tax Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Annual income</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.annualIncome)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Estimated tax</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.taxSummary.annualTax)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Effective tax rate</span><span className="font-semibold text-ink">{formatPercent(wealthResult.taxSummary.effectiveRate * 100)}</span></div>
            <div className="flex justify-between py-2 border-b border-border/70"><span className="text-muted font-medium">Post-tax income</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.taxSummary.postTaxIncome)}</span></div>
            <div className="flex justify-between py-2"><span className="text-muted font-medium">Recommended tax saving</span><span className="font-semibold text-ink">{formatCurrency(wealthResult.taxSummary.recommendedTaxSaving)}</span></div>
          </div>
        </Card>

        <Card className="border border-border/90 shadow-2xs">
          <h3 className="text-lg font-sans text-ink font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-muted" /> Currency Exposure</h3>
          <div className="space-y-3">
            {wealthResult.currencyExposure.map((c) => (
              <div key={c.currency} className="p-3 bg-sunken rounded-xl border border-border/80">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{c.currency}</span>
                  <Badge variant={c.currency === 'INR' ? 'outline' : 'gold'}>{formatPercent(c.percentage)}</Badge>
                </div>
                <div className="mt-2 h-2 rounded-full bg-sunken overflow-hidden">
                  <div
                    className="h-full rounded-full bg-faint"
                    style={{ width: `${Math.min(100, c.percentage)}%` }}
                  />
                </div>
                <div className="text-xs text-muted font-mono mt-1.5">{formatCurrency(c.amount)}</div>
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Goals at risk:</strong>{' '}
            {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}.
            Review the Goal Planner to increase SIPs or extend horizons.
          </div>
        </div>
      )}

      {wealthResult.sustainable ? (
        <div className="bg-positive-soft border border-green-200 rounded-xl p-4 flex items-start gap-3 text-green-800">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is sustainable.</strong> The projected corpus is expected to last through age {inputs.lifeExpectancy} under mean assumptions.
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is not sustainable.</strong> Corpus may deplete at age {wealthResult.depletionAge}. Consider increasing savings, delaying retirement, or reducing withdrawals.
          </div>
        </div>
      )}

      {(decisionHistory.length > 0 || meetingNotes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {decisionHistory.length > 0 && (
            <Card className="border border-border/90 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-sans text-ink font-bold flex items-center gap-2"><History size={18} className="text-muted" /> Decision Log Summary</h3>
                <Button variant="outline" size="sm" onClick={() => navigate('/decision-history')} className="border-border-strong text-ink-soft hover:bg-sunken">
                  View all
                </Button>
              </div>
              <div className="space-y-2.5">
                {decisionHistory.slice(0, 5).map((dec) => (
                  <div key={dec.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/70 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">
                        {dec.actionTitle}
                        {dec.reverted && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sunken text-muted">REVERTED</span>}
                      </p>
                      {dec.rationale && <p className="text-[11px] text-muted truncate mt-0.5">{dec.rationale}</p>}
                    </div>
                    <span className="text-[10px] text-muted whitespace-nowrap shrink-0">{dec.dateFormatted} · {dec.author}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {meetingNotes.length > 0 && (
            <Card className="border border-border/90 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-sans text-ink font-bold flex items-center gap-2"><StickyNote size={18} className="text-muted" /> Meeting Notes</h3>
                <Badge variant="outline">{meetingNotes.length} of 4 stages recorded</Badge>
              </div>
              <div className="space-y-2.5">
                {meetingNotes.map((s) => (
                  <div key={s.stageId} className="py-2 border-b border-border/70 last:border-0">
                    <p className="text-xs font-semibold text-ink">{MEETING_STAGE_NAMES[s.stageId]}</p>
                    <p className="text-[11px] text-muted leading-snug mt-0.5 line-clamp-2">{s.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="print:hidden">
        <WorkflowFooter
          prev={{ path: '/advanced-portfolio', label: 'Portfolio Lab' }}
          next={{ path: '/ips', label: 'IPS' }}
          flowHint="Executive plan summaries, tax analyses, and Monte Carlo curves feed into your institutional Investment Policy Statement."
        />
      </div>
    </div>
  );
};
