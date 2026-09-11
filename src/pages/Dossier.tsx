import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  Shield,
  TrendingUp,
  PieChart,
  Activity,
  Award,
  FileText,
  Building2,
  HeartPulse,
  Target,
  Percent,
  StickyNote,
  History,
  Landmark,
} from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { DonutChart } from '../components/charts/DonutChart';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { CRISIS_PRESETS, runStressTest } from '../lib/stressTest';
import { computePlanHealthScore } from '../lib/planHealthScore';
import { generatePlanRecommendations } from '../lib/recommendationEngine';
import { getDimensionBreakdown, analyzeRiskGap, detectBehavioralBiases, type RiskDimension } from '../lib/riskQuestionnaire';
import { StressMatrixTable } from '../components/reports/StressMatrixTable';
import { GoalDistributionBars } from '../components/reports/GoalDistributionBars';
import { PlanHealthPanel } from '../components/reports/PlanHealthPanel';
import { NetWorthGrowthChart } from '../components/reports/NetWorthGrowthChart';
import { SWPSurvivalChart } from '../components/reports/SWPSurvivalChart';
import { AllocationComparisonBars } from '../components/reports/AllocationComparisonBars';
import { StressImpactBars } from '../components/reports/StressImpactBars';
import { PlanHealthRadial } from '../components/reports/PlanHealthRadial';
import { CurrencyExposureBars } from '../components/reports/CurrencyExposureBars';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const DIMENSION_LABELS: Record<RiskDimension, string> = {
  time: 'Time Horizon',
  tolerance: 'Risk Tolerance',
  capacity: 'Risk Capacity',
  knowledge: 'Knowledge & Experience',
  liquidity: 'Liquidity & Safety Net',
  flexibility: 'Goal Flexibility',
  behavior: 'Behavioral Stability',
  context: 'Concentration & Context',
};

const MEETING_STAGES: { id: 1 | 2 | 3 | 4; name: string; title: string }[] = [
  { id: 1, name: 'Meeting 01', title: 'Client Discovery & Inventory' },
  { id: 2, name: 'Meeting 02', title: 'Diagnostic & Scenario Lab' },
  { id: 3, name: 'Meeting 03', title: 'Recommendation & Strategy Architecture' },
  { id: 4, name: 'Meeting 04', title: 'Plan Delivery & Governance Onboarding' },
];

const AUTHOR_LABELS: Record<string, string> = {
  Adviser: 'Advisor',
  Client: 'Client',
  'Automated System': 'Automated System',
};

const SECTIONS = [
  { id: 'dossier-s1', label: 'Section 1', title: 'Executive Dashboard' },
  { id: 'dossier-s2', label: 'Section 2', title: 'Master Plan & Capital Assets' },
  { id: 'dossier-s3', label: 'Section 3', title: 'Retirement & SWP Longevity Analysis' },
  { id: 'dossier-s4', label: 'Section 4', title: 'Strategic Asset Allocation & Rebalancing' },
  { id: 'dossier-s5', label: 'Section 5', title: 'Quant Lab & Tail-Risk Analysis' },
  { id: 'dossier-s6', label: 'Section 6', title: 'Plan Health & Priority Actions' },
  { id: 'dossier-s7', label: 'Section 7', title: 'Goal Probability Detail' },
  { id: 'dossier-s8', label: 'Section 8', title: 'Risk Questionnaire & Behavioral Profiling' },
  { id: 'dossier-s9', label: 'Section 9', title: 'Tax & Currency Position' },
  { id: 'dossier-s10', label: 'dossier-s10', title: 'Appendices' },
  { id: 'dossier-s11', label: 'Section 11', title: 'Investment Policy Statement' },
];

const sectionClass =
  'bg-raised rounded-xl border border-border p-8 print:border-none print:p-6 shadow-card page-break scroll-mt-20';
const sectionHeaderClass = 'border-b border-border pb-4 mb-6 flex items-center justify-between gap-4';
const tableHeadClass = 'bg-sunken text-muted font-semibold border-b border-border uppercase tracking-wider';

export const Dossier = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    inputs,
    riskProfile,
    riskScore,
    wealthResult,
    manualTargets,
    riskAnswers,
    decisionHistory,
    meetingState,
    assumptions,
    activeAssumptionSourceLabel,
    hasRiskAnswers,
  } = useCalculator();

  const autoPrint = searchParams.get('autoPrint') === 'true';

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const targets = manualTargets || riskProfile.targets;

  // Section 5: stress matrix across all four crisis presets.
  const stressResults = useMemo(() => CRISIS_PRESETS.map((p) => runStressTest(inputs, p)), [inputs]);

  // Section 6: plan health + recommendations.
  const planHealth = useMemo(
    () => computePlanHealthScore(inputs, wealthResult, riskScore),
    [inputs, wealthResult, riskScore],
  );
  const recommendations = useMemo(
    () => generatePlanRecommendations(inputs, wealthResult, planHealth, riskScore).slice(0, 5),
    [inputs, wealthResult, planHealth, riskScore],
  );

  // Section 8: risk analytics.
  const dimensionBreakdown = useMemo(
    () => (hasRiskAnswers ? getDimensionBreakdown(riskAnswers) : null),
    [riskAnswers, hasRiskAnswers],
  );
  const riskGap = useMemo(
    () => (hasRiskAnswers ? analyzeRiskGap(riskAnswers) : null),
    [riskAnswers, hasRiskAnswers],
  );
  const biases = useMemo(
    () => (hasRiskAnswers ? detectBehavioralBiases(riskAnswers) : []),
    [riskAnswers, hasRiskAnswers],
  );

  const currentAllocationData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        name: ASSET_LABELS[cat],
        value: wealthResult.currentAllocation[cat] * wealthResult.netWorth,
        color: ASSET_COLORS[cat],
      })).filter((d) => d.value > 0),
    [wealthResult.currentAllocation, wealthResult.netWorth],
  );

  const liquidAssets = wealthResult.currentAllocation.liquid * wealthResult.netWorth;
  const monthlySurplus = wealthResult.annualSavings / 12;

  const retirementSnapshot = wealthResult.snapshots.find((s) => s.age === inputs.retirementAge);
  const corpusAtRetirement = retirementSnapshot ? retirementSnapshot.total : wealthResult.terminalValue;

  // Section 3: Monte Carlo terminal band.
  const mc = wealthResult.monteCarlo;
  const mcBandMin = mc.percentile5;
  const mcBandMax = mc.percentile95 > mc.percentile5 ? mc.percentile95 : mc.percentile5 + 1;
  const bandPos = (v: number) => `${Math.min(100, Math.max(0, ((v - mcBandMin) / (mcBandMax - mcBandMin)) * 100))}%`;

  // Appendix A: projection milestones at key ages.
  const milestones = useMemo(() => {
    const seen = new Set<number>();
    const ages = [inputs.currentAge + 5, inputs.currentAge + 10, inputs.retirementAge, 75].filter((age) => {
      if (age < inputs.currentAge || age > inputs.lifeExpectancy || seen.has(age)) return false;
      seen.add(age);
      return true;
    });
    return ages
      .map((age) => {
        const snap = wealthResult.snapshots.find((s) => s.age === age);
        return snap ? { age, snap } : null;
      })
      .filter((m): m is { age: number; snap: (typeof wealthResult.snapshots)[number] } => m !== null);
  }, [inputs.currentAge, inputs.retirementAge, inputs.lifeExpectancy, wealthResult.snapshots]);

  // Section 4: strategic target weights as fractions for the comparison bars.
  const targetFractions = useMemo(() => {
    const rec = {} as Record<AssetCategory, number>;
    CATEGORIES.forEach((c) => {
      rec[c] = targets[c] / 100;
    });
    return rec;
  }, [targets]);

  // Section 3: deterministic net-worth trajectory for the growth chart (with retirement marker).
  const netWorthGrowthData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        age: s.age,
        nominal: s.total,
        real: s.realTotal,
      })),
    [wealthResult.snapshots],
  );

  // Section 3: SWP survival curves — per-year P5/P50/P95 across Monte Carlo outcome paths
  // (fall back to the deterministic snapshot totals when no outcome paths exist).
  const swpSurvivalData = useMemo(() => {
    const percentile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
    const outcomes = mc.outcomes;
    if (outcomes.length > 0) {
      const years = Math.min(...outcomes.map((o) => o.yearlyValues.length));
      const rows: { age: number; p5: number; p50: number; p95: number }[] = [];
      for (let y = 0; y < years; y++) {
        const age = inputs.currentAge + y + 1;
        if (age < inputs.retirementAge) continue;
        const values = outcomes.map((o) => o.yearlyValues[y] ?? 0).sort((a, b) => a - b);
        rows.push({
          age,
          p5: percentile(values, 0.05),
          p50: percentile(values, 0.5),
          p95: percentile(values, 0.95),
        });
      }
      return rows;
    }
    return wealthResult.snapshots
      .filter((s) => s.age >= inputs.retirementAge)
      .map((s) => ({ age: s.age, p5: s.total, p50: s.total, p95: s.total }));
  }, [mc.outcomes, inputs.currentAge, inputs.retirementAge, wealthResult.snapshots]);

  // Representative survival checkpoints for the adjacent detail table.
  const survivalCheckpoints = useMemo(() => {
    if (!swpSurvivalData.length) return [];
    const pick = (age: number) =>
      swpSurvivalData.find((d) => d.age >= age) ?? swpSurvivalData[swpSurvivalData.length - 1];
    const midAge = Math.round((inputs.retirementAge + inputs.lifeExpectancy) / 2);
    return [pick(inputs.retirementAge), pick(midAge), pick(inputs.lifeExpectancy)].filter(
      (d, i, arr) => arr.findIndex((x) => x.age === d.age) === i,
    );
  }, [swpSurvivalData, inputs.retirementAge, inputs.lifeExpectancy]);

  // Appendix B: meeting record — only stages with saved notes.
  const meetingNotes = MEETING_STAGES.map((s) => ({
    ...s,
    note: (meetingState.notes[s.id] || '').trim(),
  })).filter((s) => s.note.length > 0);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dossierYear = new Date().getFullYear();

  if (!wealthResult.isConfigured) {
    return (
      <EmptyState
        icon={FileText}
        display
        title="The dossier is not available yet"
        description="Configure the plan — profile, finances and goals — and the comprehensive portfolio dossier will compile here, ready for PDF export."
        action={
          <Button variant="outline" onClick={() => navigate('/plan-inputs')}>
            Configure the plan
          </Button>
        }
      />
    );
  }

  return (
    <div className="doc-paper pb-8 print:pb-0">
      {/* Scoped light paper palette — the dossier is a document, even in dark mode. */}
      <style>{`
        .doc-paper {
          --color-canvas: #F4F2ED; --color-background: #F4F2ED; --color-surface: #FBFAF7;
          --color-raised: #FFFFFF; --color-sunken: #ECEAE2; --color-inset: #EFEDE6;
          --color-elevated: #FFFFFF; --color-deep: #20231F;
          --color-border: #D9D8D1; --color-border-strong: #C2C1B7; --color-border-subtle: #E6E4DC;
          --color-ink: #171815; --color-ink-soft: #4E524B; --color-muted: #6E7268; --color-faint: #7B7E76;
          --color-accent: #667A63; --color-accent-strong: #4A5C47; --color-accent-soft: #E6ECE3; --color-accent-softer: #EFF3EC;
          --color-brass: #B3945A; --color-brass-strong: #96793F; --color-brass-soft: #F1EADF;
          --color-positive: #557A60; --color-positive-soft: #E8EFE9;
          --color-negative: #A65954; --color-negative-soft: #F4E8E6;
          --color-warning: #B07D3E; --color-warning-soft: #F4EBDD;
          --color-info: #64758A; --color-info-soft: #E9EDF1;
          --shadow-card: 0 1px 2px rgba(32, 35, 31, 0.05);
        }
        @media print {
          aside, header, footer, nav, .print-hidden { display: none !important; }
          .page-break { break-after: page !important; page-break-after: always !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          tr { break-inside: avoid !important; page-break-inside: avoid !important; }
          table { page-break-inside: auto !important; }
        }
      `}</style>

      {/* Floating Action Bar (Hidden in Print) */}
      <div className="sticky top-0 z-40 glass-header px-4 py-3 flex items-center justify-between print:hidden -mx-1 px-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} strokeWidth={1.6} /> Back
          </Button>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-ink">
              Portfolio Dossier — {inputs.client?.name || 'Client Report'}
            </h1>
            <p className="text-[11px] text-muted">
              Eleven sections compiled for high-resolution PDF export or print
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => window.print()}>
          <Printer size={14} strokeWidth={1.6} /> Save as PDF / Print
        </Button>
      </div>

      {/* Main Printable Container */}
      <div className="max-w-5xl mx-auto p-4 sm:p-8 print:p-0 space-y-8 print:space-y-6">

        {/* ========================================================= */}
        {/* COVER PAGE — WEALTH PLAN                                  */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden bg-surface rounded-xl border border-border shadow-card page-break scroll-mt-20">
          <div className="absolute inset-0 grid-motif opacity-70 pointer-events-none" aria-hidden="true" />
          <div className="relative p-8 sm:p-14 print:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-deep text-canvas flex items-center justify-center font-display text-base">
                    ST
                  </div>
                  <span className="font-display text-2xl text-ink">Sound Thesis</span>
                </div>
                <p className="eyebrow mt-2">Private Wealth & Advisory Mandate</p>
              </div>
              <div className="text-right shrink-0">
                <Badge tone="neutral" className="mb-1.5">Confidential</Badge>
                <p className="text-xs text-muted">Review Date: <span className="font-mono text-ink-soft">{inputs.client?.reviewDate || printDate}</span></p>
              </div>
            </div>

            <div className="my-12 sm:my-16 space-y-5 print:my-8">
              <div className="eyebrow text-accent">Wealth Plan</div>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <h1 className="font-display text-4xl sm:text-6xl text-ink leading-[1.05]">
                  {inputs.client?.name || 'Private Client'}
                </h1>
                <div className="text-right">
                  <div className="num-hero text-5xl sm:text-6xl text-brass-strong">{dossierYear}</div>
                  <div className="eyebrow mt-1">Annual Review</div>
                </div>
              </div>
              <p className="text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
                An institutional wealth plan connecting personal risk tolerance, capital assets, systematic accumulation,
                goal funding, and post-retirement withdrawal longevity into one probabilistic Monte Carlo model.
              </p>
            </div>

            {/* Client & Advisor Mandate Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 p-6 rounded-lg bg-raised border border-border avoid-break">
              <div className="space-y-2">
                <span className="eyebrow">Client Profile</span>
                <p className="text-lg font-semibold text-ink">{inputs.client?.name || 'Primary Client'}</p>
                <div className="text-xs text-muted space-y-1">
                  <p>Email: {inputs.client?.email || '—'}</p>
                  <p>
                    Age: <span className="font-mono text-ink-soft">{inputs.currentAge}</span> · Retirement Target:{' '}
                    <span className="font-mono text-ink-soft">Age {inputs.retirementAge}</span>
                  </p>
                  <p>
                    Planning Horizon: <span className="font-mono text-ink-soft">Age {inputs.lifeExpectancy}</span>{' '}
                    <span className="font-mono text-ink-soft">({inputs.lifeExpectancy - inputs.currentAge} years)</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="eyebrow">Advisory Mandate</span>
                <p className="text-lg font-semibold text-ink">{inputs.client?.advisor || 'Sound Thesis Wealth'}</p>
                <div className="text-xs text-muted space-y-1">
                  <p>Review Date: <span className="font-mono text-ink-soft">{inputs.client?.reviewDate || printDate}</span></p>
                  <p>Mandate: Discretionary Goal-Based Wealth Architecture</p>
                  <p>
                    Risk Profile: {riskProfile.label}{' '}
                    {hasRiskAnswers && <span className="font-mono text-ink-soft">(Score: {riskScore}/100)</span>}
                  </p>
                  <p>Mandate Notes: {inputs.client?.notes || 'Comprehensive retirement security & generational capital preservation.'}</p>
                </div>
              </div>
            </div>

            {/* Topline Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 mt-8 avoid-break">
              <div className="p-4 rounded-md border border-border bg-raised">
                <span className="eyebrow">Total Net Worth</span>
                <p className="num-hero text-2xl text-ink mt-1.5">{formatCurrencyCompact(wealthResult.netWorth)}</p>
                <span className="text-[10px] text-muted font-mono">{inputs.assets.length} active assets</span>
              </div>
              <div className="p-4 rounded-md border border-border bg-raised">
                <span className="eyebrow">Retirement Status</span>
                <p className="num-hero text-2xl text-ink mt-1.5">
                  {wealthResult.sustainable ? 'Sustainable' : `Age ${wealthResult.depletionAge}`}
                </p>
                <span className="text-[10px] text-muted font-mono">Through age {inputs.lifeExpectancy}</span>
              </div>
              <div className="p-4 rounded-md border border-border bg-raised">
                <span className="eyebrow">Monthly Surplus</span>
                <p className="num-hero text-2xl text-ink mt-1.5">{formatCurrencyCompact(monthlySurplus)}</p>
                <span className="text-[10px] text-muted font-mono">
                  After {formatCurrencyCompact(inputs.monthlyExpenditure)} exp.
                </span>
              </div>
              <div className="p-4 rounded-md border border-border bg-raised">
                <span className="eyebrow">Strategic Equity</span>
                <p className="num-hero text-2xl text-ink mt-1.5">{formatPercent(targets.equity)}</p>
                <span className="text-[10px] text-muted">{riskProfile.label} target</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* TABLE OF CONTENTS                                         */}
        {/* ========================================================= */}
        <section className="bg-raised rounded-xl border border-border p-8 print:border-none print:p-6 shadow-card page-break scroll-mt-20">
          <div className={sectionHeaderClass}>
            <div>
              <div className="eyebrow mb-1.5">Document Map</div>
              <h2 className="font-display text-2xl text-ink">Contents</h2>
            </div>
            <span className="text-xs text-muted">Eleven sections · A4</span>
          </div>
          <ol className="divide-y divide-border-subtle">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="group flex items-baseline justify-between gap-4 py-2.5 text-sm print:no-underline"
                >
                  <span className="flex items-baseline gap-3 min-w-0">
                    <span className="font-mono text-[11px] text-faint w-8 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-ink group-hover:text-accent-strong transition-colors truncate">{s.title}</span>
                  </span>
                  <span className="eyebrow shrink-0 hidden sm:block">{s.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* ========================================================= */}
        {/* SECTION 1: EXECUTIVE DASHBOARD                            */}
        {/* ========================================================= */}
        <section id="dossier-s1" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Activity size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 1: Executive Dashboard</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Portfolio Health & Trajectory</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4 mb-6 avoid-break">
            {/* Net Worth Chart */}
            <div className="p-4 rounded-md border border-border bg-raised">
              <h3 className="text-sm font-semibold text-ink mb-1">Projected Net Worth Fan (Monte Carlo)</h3>
              <p className="text-xs text-muted mb-2">Simulated percentiles across accumulation and distribution</p>
              <figure role="img" aria-label="Monte Carlo projected net worth fan chart showing simulated P5, P25, P50, P75 and P95 percentile paths across the planning horizon" className="m-0">
                <div className="h-56 print:h-52 overflow-hidden" aria-hidden="true">
                  <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} className="h-52 w-full" />
                </div>
                <figcaption className="sr-only">
                  Simulated net worth paths from age {inputs.currentAge} to {inputs.lifeExpectancy}. Median terminal value{' '}
                  {formatCurrency(mc.medianTerminal)}; P5 stress path {formatCurrency(mc.percentile5)}; P95 optimistic path{' '}
                  {formatCurrency(mc.percentile95)}.
                </figcaption>
              </figure>
              <p className="text-[11px] text-muted mt-2 leading-snug">
                Insight: {formatPercent(mc.successRate * 100)} of simulated paths sustain the plan — the median path ends at{' '}
                {formatCurrencyCompact(mc.medianTerminal)} versus {formatCurrencyCompact(mc.percentile5)} in the P5 stress case.
              </p>
            </div>

            {/* Asset Allocation Donut */}
            <div className="p-4 rounded-md border border-border bg-raised">
              <h3 className="text-sm font-semibold text-ink mb-1">Current Capital Distribution</h3>
              <p className="text-xs text-muted mb-2">Total holdings: {formatCurrency(wealthResult.netWorth)}</p>
              <figure role="img" aria-label="Donut chart of current capital distribution across asset categories" className="m-0">
                <div className="h-56 print:h-52 flex items-center justify-center" aria-hidden="true">
                  <DonutChart data={currentAllocationData} />
                </div>
                <figcaption className="sr-only">
                  Current allocation: {currentAllocationData.map((d) => `${d.name} ${formatCurrency(d.value)}`).join(', ')}.
                </figcaption>
              </figure>
              <p className="text-[11px] text-muted mt-2 leading-snug">
                Insight: {currentAllocationData.length > 0 && (() => {
                  const top = [...currentAllocationData].sort((a, b) => b.value - a.value)[0];
                  return `${top.name} dominates the book at ${formatPercent((top.value / Math.max(1, wealthResult.netWorth)) * 100)} of net worth (${formatCurrencyCompact(top.value)}).`;
                })()}
              </p>
            </div>
          </div>

          {/* Key Advisory Metrics Table */}
          <div className="overflow-x-auto avoid-break">
            <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="p-3">Advisory Metric</th>
                  <th className="p-3">Current Plan Value</th>
                  <th className="p-3">Target / Benchmark</th>
                  <th className="p-3">Advisory Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                <tr>
                  <td className="p-3 font-medium text-ink">Liquid Emergency Buffer</td>
                  <td className="p-3 font-mono tabular-nums font-semibold text-ink-soft">{formatCurrency(liquidAssets)}</td>
                  <td className="p-3 text-muted font-mono tabular-nums">{formatCurrency(inputs.monthlyExpenditure * 6)} (6 Months)</td>
                  <td className="p-3 text-muted">
                    {liquidAssets >= inputs.monthlyExpenditure * 6
                      ? '✓ Fully capitalized emergency fund.'
                      : '⚠ Below 6-month recommended buffer.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-ink">Monthly SIP Commitment</td>
                  <td className="p-3 font-mono tabular-nums font-semibold text-ink-soft">{formatCurrency(inputs.sip.amount)}/mo</td>
                  <td className="p-3 text-muted font-mono tabular-nums">{formatCurrency(monthlySurplus * 0.7)} (70% surplus)</td>
                  <td className="p-3 text-muted">
                    Step-up: <span className="font-mono">{inputs.sip.stepUp}%</span> p.a. ·{' '}
                    <span className="font-mono">{inputs.sip.equitySplit}%</span> Equity /{' '}
                    <span className="font-mono">{inputs.sip.debtSplit}%</span> Debt
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-ink">Projected Corpus at Retirement</td>
                  <td className="p-3 font-mono tabular-nums font-semibold text-ink-soft">{formatCurrency(corpusAtRetirement)}</td>
                  <td className="p-3 text-muted font-mono tabular-nums">At Age {inputs.retirementAge}</td>
                  <td className="p-3 text-muted">
                    Terminal portfolio real value: <span className="font-mono">{formatCurrency(wealthResult.terminalRealValue)}</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-ink">Retirement Withdrawal Longevity</td>
                  <td className="p-3 font-semibold text-ink-soft">
                    {wealthResult.sustainable ? `Solvent to age ${inputs.lifeExpectancy}+` : `Depletion at age ${wealthResult.depletionAge}`}
                  </td>
                  <td className="p-3 text-muted font-mono tabular-nums">Age {inputs.lifeExpectancy} horizon</td>
                  <td className="p-3 text-muted">
                    {wealthResult.sustainable
                      ? `✓ ${formatPercent(mc.successRate * 100)} of simulated paths sustain withdrawals through age ${inputs.lifeExpectancy}.`
                      : '⚠ Depletion occurs prior to target life expectancy.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: MASTER PLAN                                    */}
        {/* ========================================================= */}
        <section id="dossier-s2" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Building2 size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 2: Master Plan & Capital Assets</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Inventory & Commitments</span>
          </div>

          {/* Assets Inventory Table */}
          <div className="space-y-3 mb-8 avoid-break">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">1. Capital Asset Inventory</h3>
              <span className="text-xs text-muted">Total Value: <span className="font-mono">{formatCurrency(wealthResult.netWorth)}</span></span>
            </div>
            {inputs.assets.length > 0 ? (
              <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="p-3">Asset Description</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Currency</th>
                    <th className="p-3 text-right">Current Value</th>
                    <th className="p-3 text-right">Exp. Return</th>
                    <th className="p-3 text-center">SWP Liquidation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {inputs.assets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="p-3 font-medium text-ink">{asset.name}</td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-sunken text-ink-soft border border-border-subtle">
                          {ASSET_LABELS[asset.category] || asset.category}
                        </span>
                      </td>
                      <td className="p-3 text-muted font-mono">{asset.currency}</td>
                      <td className="p-3 text-right font-mono tabular-nums font-semibold text-ink-soft">{formatCurrency(asset.value)}</td>
                      <td className="p-3 text-right text-muted font-mono tabular-nums">{asset.returnRate}%</td>
                      <td className="p-3 text-center text-muted">
                        {asset.liquidateAtRetirement ? 'Yes (Liquidates)' : 'No (Retained)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted italic">No capital assets recorded in the plan.</p>
            )}
          </div>

          {/* Cashflow Commitments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 mb-8 avoid-break">
            <div className="p-4 rounded-md border border-border bg-sunken/60">
              <span className="eyebrow">Monthly SIP Commitment</span>
              <p className="num-hero text-xl text-ink mt-1.5">{formatCurrency(inputs.sip.amount)}/mo</p>
              <p className="text-xs text-muted mt-1">
                <span className="font-mono">{inputs.sip.stepUp}%</span> annual step-up ·{' '}
                <span className="font-mono">{inputs.sip.equitySplit}%</span> Equity /{' '}
                <span className="font-mono">{inputs.sip.debtSplit}%</span> Debt
              </p>
            </div>
            <div className="p-4 rounded-md border border-border bg-sunken/60">
              <span className="eyebrow">STP Deployment Plan</span>
              <p className="num-hero text-xl text-ink mt-1.5">
                {inputs.stp.active ? `${formatCurrency(inputs.stp.monthlyTransfer)}/mo` : 'Inactive'}
              </p>
              <p className="text-xs text-muted mt-1">
                {inputs.stp.active
                  ? `Lumpsum: ${formatCurrency(inputs.stp.lumpsum)} deployed from ${inputs.stp.source}`
                  : 'No systematic transfer active.'}
              </p>
            </div>
            <div className="p-4 rounded-md border border-border bg-sunken/60">
              <span className="eyebrow">Retirement SWP Target</span>
              <p className="num-hero text-xl text-ink mt-1.5">{formatCurrency(inputs.swp.monthlyNeedToday)}/mo</p>
              <p className="text-xs text-muted mt-1">Current monthly equivalent · Inflation-indexed to retirement</p>
            </div>
          </div>

          {/* Goals Schedule Table */}
          <div className="space-y-3 avoid-break">
            <h3 className="text-sm font-semibold text-ink">2. Life Goal Milestone Commitments</h3>
            {wealthResult.goalResults.length > 0 ? (
              <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="p-3">Goal Description</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3 text-right">Horizon</th>
                    <th className="p-3 text-right">Target Today</th>
                    <th className="p-3 text-right">Future Value</th>
                    <th className="p-3 text-center">Success Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {wealthResult.goalResults.map((gr) => (
                    <tr key={gr.goal.id}>
                      <td className="p-3 font-medium text-ink">{gr.goal.name}</td>
                      <td className="p-3">
                        <Badge tone={gr.goal.priority === 'essential' ? 'negative' : gr.goal.priority === 'important' ? 'neutral' : 'brass'}>
                          {gr.goal.priority}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-muted font-mono tabular-nums">{gr.goal.yearsToGoal} Years</td>
                      <td className="p-3 text-right text-muted font-mono tabular-nums">{formatCurrency(gr.goal.targetAmount)}</td>
                      <td className="p-3 text-right font-mono tabular-nums font-semibold text-ink-soft">{formatCurrency(gr.futureValue)}</td>
                      <td className="p-3 text-center">
                        <span className={`font-mono tabular-nums font-medium ${gr.successRate >= 0.8 ? 'text-positive' : 'text-warning'}`}>
                          {formatPercent(gr.successRate * 100)} (Shortfall: {formatCurrency(gr.expectedShortfall)})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted italic">No life goals recorded in the plan.</p>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: RETIREMENT & SWP LONGEVITY                      */}
        {/* ========================================================= */}
        <section id="dossier-s3" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <TrendingUp size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 3: Retirement & SWP Longevity Analysis</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Distribution Sustainability</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 print:gap-4 mb-8 avoid-break">
            <div className="p-5 rounded-md border border-border bg-sunken/50 space-y-2">
              <span className="eyebrow">Projected Retirement Corpus</span>
              <p className="num-hero text-3xl text-ink">{formatCurrencyCompact(corpusAtRetirement)}</p>
              <p className="text-xs text-muted">At target retirement age {inputs.retirementAge}.</p>
            </div>

            <div className="p-5 rounded-md border border-border bg-sunken/50 space-y-2">
              <span className="eyebrow">Terminal Real Value</span>
              <p className="num-hero text-3xl text-ink">{formatCurrencyCompact(wealthResult.terminalRealValue)}</p>
              <p className="text-xs text-muted">Net worth at age {inputs.lifeExpectancy} in today's rupees.</p>
            </div>

            <div className="p-5 rounded-md border border-border bg-sunken/50 space-y-2">
              <span className="eyebrow">Sustainability Verdict</span>
              <p className={`num-hero text-3xl ${wealthResult.sustainable ? 'text-positive' : 'text-warning'}`}>
                {wealthResult.sustainable ? 'Fully Solvent' : `Depletion: Age ${wealthResult.depletionAge}`}
              </p>
              <p className="text-xs text-muted">Through life expectancy of {inputs.lifeExpectancy} years.</p>
            </div>
          </div>

          {/* Net-worth growth trajectory with retirement marker */}
          <div className="p-6 rounded-md border border-border bg-raised avoid-break space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-ink">Net-Worth Growth Trajectory & Retirement Milestone</h3>
            <p className="text-xs text-muted leading-relaxed">
              Deterministic projection of the plan year by year; the dashed marker flags the transition from accumulation to
              distribution at age {inputs.retirementAge}. Milestone values are tabulated in Appendix A.
            </p>
            <NetWorthGrowthChart
              data={netWorthGrowthData}
              retirementAge={inputs.retirementAge}
              ariaLabel={`Net-worth growth chart from age ${inputs.currentAge} to ${inputs.lifeExpectancy} with retirement marker at age ${inputs.retirementAge}`}
              summary={`Net worth grows from ${formatCurrency(wealthResult.netWorth)} today to a projected ${formatCurrency(corpusAtRetirement)} at retirement (age ${inputs.retirementAge}), reaching ${formatCurrency(wealthResult.terminalValue)} by age ${inputs.lifeExpectancy} nominally (${formatCurrency(wealthResult.terminalRealValue)} in today's rupees).`}
            />
            <p className="text-[11px] text-muted leading-snug">
              Insight: the corpus peaks around retirement at {formatCurrencyCompact(corpusAtRetirement)} —{' '}
              {wealthResult.netWorth > 0 ? formatPercent((corpusAtRetirement / wealthResult.netWorth) * 100, 0) : '—'} of today's net
              worth — then {wealthResult.sustainable ? `holds or grows through age ${inputs.lifeExpectancy}.` : `declines to depletion at age ${wealthResult.depletionAge}.`}
            </p>
          </div>

          {/* Monte Carlo terminal outcome band */}
          <div className="p-6 rounded-md border border-border bg-raised avoid-break space-y-4 mb-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Monte Carlo Terminal Outcome Distribution</h3>
              <span className="text-xs font-mono tabular-nums font-semibold text-ink">
                {formatPercent(mc.successRate * 100)} path success
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {formatPercent(mc.successRate * 100)} of simulated paths sustain withdrawals through age {inputs.lifeExpectancy}.
              {mc.medianDepletionAge !== null
                ? ` The median simulated path first exhausts the corpus at age ${mc.medianDepletionAge}.`
                : ' The median simulated path never exhausts the corpus within the planning horizon.'}
            </p>
            <div>
              <div className="relative h-4 rounded-full bg-sunken overflow-visible">
                <div
                  className="absolute h-4 rounded-full bg-border"
                  style={{ left: bandPos(mc.percentile25), width: `calc(${bandPos(mc.percentile75)} - ${bandPos(mc.percentile25)})` }}
                />
                <div
                  className="absolute h-4 rounded-full bg-border-strong/60"
                  style={{ left: bandPos(mc.percentile5), width: `calc(${bandPos(mc.percentile95)} - ${bandPos(mc.percentile5)})` }}
                />
                <div
                  className="absolute -top-1 h-6 w-0.5 bg-deep rounded"
                  style={{ left: bandPos(mc.medianTerminal) }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-faint font-mono">
                <span>P5 {formatCurrencyCompact(mc.percentile5)}</span>
                <span className="font-semibold text-ink-soft">Median {formatCurrencyCompact(mc.medianTerminal)}</span>
                <span>P95 {formatCurrencyCompact(mc.percentile95)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted block">Mean Terminal</span>
                <span className="font-mono tabular-nums font-semibold text-ink">{formatCurrencyCompact(mc.meanTerminal)}</span>
              </div>
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted block">Interquartile (P25–P75)</span>
                <span className="font-mono tabular-nums font-semibold text-ink">
                  {formatCurrencyCompact(mc.percentile25)} – {formatCurrencyCompact(mc.percentile75)}
                </span>
              </div>
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted block">Median Depletion Age</span>
                <span className="font-mono tabular-nums font-semibold text-ink">
                  {mc.medianDepletionAge !== null ? `Age ${mc.medianDepletionAge}` : 'Not depleted'}
                </span>
              </div>
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted block">Deterministic Verdict</span>
                <span className="font-semibold text-ink">
                  {wealthResult.sustainable ? `Solvent to ${inputs.lifeExpectancy}+` : `Depletes at ${wealthResult.depletionAge}`}
                </span>
              </div>
            </div>
          </div>

          {/* SWP survival curves: corpus survival through the distribution phase */}
          <div className="p-6 rounded-md border border-border bg-raised avoid-break space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-ink">Corpus Survival Through Retirement (Monte Carlo)</h3>
            <p className="text-xs text-muted leading-relaxed">
              Remaining corpus while withdrawals run, from age {inputs.retirementAge} onward. The band spans the 5th–95th percentile
              of simulated paths; the solid line is the median path. A path touching zero has exhausted its corpus.
            </p>
            <SWPSurvivalChart
              data={swpSurvivalData}
              retirementAge={inputs.retirementAge}
              lifeExpectancy={inputs.lifeExpectancy}
              ariaLabel={`Corpus survival chart from retirement age ${inputs.retirementAge} to ${inputs.lifeExpectancy} showing the median path with a P5 to P95 confidence band`}
              summary={
                swpSurvivalData.length > 0
                  ? `Median corpus at retirement is ${formatCurrency(swpSurvivalData[0].p50)}, evolving to ${formatCurrency(swpSurvivalData[swpSurvivalData.length - 1].p50)} by age ${swpSurvivalData[swpSurvivalData.length - 1].age}; the P5 stress path ends at ${formatCurrency(swpSurvivalData[swpSurvivalData.length - 1].p5)}.`
                  : 'No distribution-phase survival data available.'
              }
            />
            {survivalCheckpoints.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border border-border rounded-md overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-2">Age Checkpoint</th>
                      <th className="p-2 text-right">P5 Corpus</th>
                      <th className="p-2 text-right">Median Corpus</th>
                      <th className="p-2 text-right">P95 Corpus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {survivalCheckpoints.map((d) => (
                      <tr key={d.age}>
                        <td className="p-2 font-medium text-ink font-mono tabular-nums">{d.age}</td>
                        <td className="p-2 text-right font-mono tabular-nums text-ink-soft">{formatCurrencyCompact(d.p5)}</td>
                        <td className="p-2 text-right font-mono tabular-nums font-semibold text-ink">{formatCurrencyCompact(d.p50)}</td>
                        <td className="p-2 text-right font-mono tabular-nums text-ink-soft">{formatCurrencyCompact(d.p95)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-muted leading-snug">
              Insight:{' '}
              {(() => {
                const last = swpSurvivalData[swpSurvivalData.length - 1];
                if (!last) return 'No distribution-phase data available.';
                return last.p5 > 0
                  ? `even the P5 stress path retains ${formatCurrencyCompact(last.p5)} at age ${last.age} — withdrawals survive the full horizon in 95% of simulations.`
                  : `the P5 stress path is exhausted by age ${last.age}, while the median path ends at ${formatCurrencyCompact(last.p50)}.`;
              })()}
            </p>
          </div>

          {/* SWP Stress Test Breakdown */}
          <div className="p-6 rounded-md border border-border bg-raised avoid-break space-y-4">
            <h3 className="text-sm font-semibold text-ink">Post-Retirement Withdrawal Framework</h3>
            <p className="text-xs text-muted leading-relaxed">
              The distribution engine assumes an initial monthly draw equivalent to{' '}
              <span className="font-mono text-ink-soft">{formatCurrency(inputs.swp.monthlyNeedToday)}</span> in today's purchasing
              power, inflating at <span className="font-mono">{inputs.inflation}%</span> p.a. through retirement. The expected
              return in distribution is <span className="font-mono">{inputs.swp.postRetirementReturn}%</span> p.a. with an
              estimated tax drag of <span className="font-mono">{inputs.swp.taxRate}%</span>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 pt-2 text-xs">
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted">Base Living Need:</span>
                <p className="font-mono tabular-nums font-semibold text-ink-soft mt-0.5">
                  {formatCurrency(inputs.swp.monthlyNeedToday * 12)} / year
                </p>
              </div>
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted">Inflation Rate:</span>
                <p className="font-mono tabular-nums font-semibold text-ink-soft mt-0.5">{inputs.inflation}% p.a.</p>
              </div>
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted">Post-Retirement Return:</span>
                <p className="font-mono tabular-nums font-semibold text-ink-soft mt-0.5">{inputs.swp.postRetirementReturn}% p.a.</p>
              </div>
              <div className="p-3 bg-sunken rounded-md">
                <span className="text-muted">Longevity Cushion:</span>
                <p className="font-mono tabular-nums font-semibold text-ink-soft mt-0.5">
                  {wealthResult.sustainable ? `${inputs.lifeExpectancy - inputs.retirementAge}+ Years` : `${(wealthResult.depletionAge ?? inputs.retirementAge) - inputs.retirementAge} Years`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: STRATEGIC ASSET ALLOCATION & REBALANCING       */}
        {/* ========================================================= */}
        <section id="dossier-s4" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <PieChart size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 4: Strategic Asset Allocation & Rebalancing</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Target vs Actual Drift</span>
          </div>

          {/* Paired 100% stacked bars: current vs strategic target */}
          <div className="p-5 rounded-md border border-border bg-raised avoid-break space-y-3 mb-8">
            <h3 className="text-sm font-semibold text-ink">Current vs Strategic Target Allocation</h3>
            <AllocationComparisonBars
              current={wealthResult.currentAllocation}
              target={targetFractions}
              ariaLabel="Paired stacked bars comparing current and target allocation weights per asset class"
            />
            <p className="text-[11px] text-muted leading-snug">
              Insight:{' '}
              {(() => {
                const biggest = CATEGORIES.reduce((a, b) =>
                  Math.abs(wealthResult.currentAllocation[b] * 100 - targets[b]) > Math.abs(wealthResult.currentAllocation[a] * 100 - targets[a]) ? b : a,
                );
                const diff = wealthResult.currentAllocation[biggest] * 100 - targets[biggest];
                return `${ASSET_LABELS[biggest]} shows the largest drift at ${diff > 0 ? '+' : ''}${formatPercent(diff)} vs target — ${Math.abs(diff) <= 2 ? 'all classes sit within the ±2% tolerance band.' : 'see the action column below for the rebalance directive.'}`;
              })()}
            </p>
          </div>

          <div className="overflow-x-auto mb-8 avoid-break">
            <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="p-3">Asset Class</th>
                  <th className="p-3 text-right">Current Value</th>
                  <th className="p-3 text-right">Current Weight</th>
                  <th className="p-3 text-right">Target Weight</th>
                  <th className="p-3 text-right">Variance</th>
                  <th className="p-3 text-center">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {CATEGORIES.map((cat) => {
                  const currentVal = wealthResult.currentAllocation[cat] * wealthResult.netWorth;
                  const currentWt = wealthResult.currentAllocation[cat] * 100;
                  const targetWt = targets[cat];
                  const diff = currentWt - targetWt;
                  return (
                    <tr key={cat}>
                      <td className="p-3 font-medium text-ink">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                          {ASSET_LABELS[cat]}
                        </span>
                      </td>
                      <td className="p-3 text-right text-ink-soft font-mono tabular-nums">{formatCurrency(currentVal)}</td>
                      <td className="p-3 text-right font-mono tabular-nums font-semibold text-ink-soft">{formatPercent(currentWt)}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-muted">{formatPercent(targetWt)}</td>
                      <td className={`p-3 text-right font-mono tabular-nums font-semibold ${Math.abs(diff) <= 2 ? 'text-muted' : diff > 0 ? 'text-info' : 'text-warning'}`}>
                        {diff > 0 ? `+${formatPercent(diff)}` : formatPercent(diff)}
                      </td>
                      <td className="p-3 text-center text-xs">
                        {Math.abs(diff) <= 2 ? (
                          <span className="text-muted font-medium">In Band (Balanced)</span>
                        ) : diff > 0 ? (
                          <span className="text-info font-medium">Trim / Reallocate</span>
                        ) : (
                          <span className="text-warning font-medium">Add Capital</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rebalancing Strategy Advice */}
          <div className="p-6 rounded-md border border-border bg-sunken/60 avoid-break space-y-2">
            <h3 className="text-sm font-semibold text-ink">Rebalancing Mandate</h3>
            <p className="text-xs text-muted leading-relaxed">
              Rebalancing should be conducted annually or when any asset class deviates by more than ±5% from its strategic target
              band. To minimize capital gains tax drag, rebalancing should prioritize deploying new SIP/STP inflows into underweight
              asset classes before executing outright liquidations of appreciated assets.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5: QUANT LAB & TAIL-RISK ANALYSIS                  */}
        {/* ========================================================= */}
        <section id="dossier-s5" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Award size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 5: Quant Lab & Tail-Risk Analysis</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Historical Crisis Simulations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 mb-8 avoid-break">
            <div className="p-4 rounded-md border border-border bg-raised">
              <span className="eyebrow">Assumption Engine</span>
              <p className="text-base font-semibold text-ink mt-1.5">{activeAssumptionSourceLabel}</p>
              <p className="text-xs text-muted mt-0.5">
                Calibrated{' '}
                {assumptions.fetchedAt
                  ? new Date(assumptions.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'from default priors'}
              </p>
            </div>
            <div className="p-4 rounded-md border border-border bg-raised">
              <span className="eyebrow">Simulation Method</span>
              <p className="text-base font-semibold text-ink mt-1.5">Historical Replay</p>
              <p className="text-xs text-muted mt-0.5">Crisis drawdowns applied to current holdings</p>
            </div>
            <div className="p-4 rounded-md border border-border bg-raised">
              <span className="eyebrow">Scenarios Modeled</span>
              <p className="text-base font-semibold text-ink mt-1.5 font-mono">{CRISIS_PRESETS.length} Crises</p>
              <p className="text-xs text-muted mt-0.5">{CRISIS_PRESETS.map((p) => p.name).join(' · ')}</p>
            </div>
          </div>

          {/* Tail-Risk Stress Matrix: all four crisis presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Tail-Risk Stress Matrix — Historical Crisis Simulations</h3>
              <span className="text-xs text-muted shrink-0">Shocks applied to current holdings; plans re-projected under stressed inflation</span>
            </div>
            <div className="p-5 rounded-md border border-border bg-raised avoid-break space-y-3">
              <h4 className="text-xs font-semibold text-ink">Corpus Impact at Retirement by Scenario</h4>
              <StressImpactBars
                results={stressResults}
                ariaLabel="Horizontal bars showing corpus impact at retirement for each crisis scenario, scaled by magnitude with negative impacts in red extending left from zero"
              />
              <p className="text-[11px] text-muted leading-snug">
                Insight: the worst modeled shock (
                {[...stressResults].sort((a, b) => a.corpusDelta - b.corpusDelta)[0]?.scenario.name ?? '—'}) cuts the retirement
                corpus by {formatCurrencyCompact(Math.abs(Math.min(...stressResults.map((r) => Math.min(0, r.corpusDelta)))))} —{' '}
                {[...stressResults].sort((a, b) => a.corpusDelta - b.corpusDelta)[0]?.shockedSustainable
                  ? 'the plan still survives it with buffer to spare.'
                  : 'the plan would need the mitigation actions listed below to restore solvency.'}
              </p>
            </div>
            <StressMatrixTable results={stressResults} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6: PLAN HEALTH & PRIORITY ACTIONS                 */}
        {/* ========================================================= */}
        <section id="dossier-s6" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <HeartPulse size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 6: Plan Health & Priority Actions</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Weighted Diagnostic Score</span>
          </div>

          <PlanHealthRadial
            health={planHealth}
            ariaLabel="Radial gauge of the composite plan health score with per-component score bars"
          />
          <div className="mt-6">
            <PlanHealthPanel health={planHealth} recommendations={recommendations} detailed />
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 7: GOAL PROBABILITY DETAIL                        */}
        {/* ========================================================= */}
        {wealthResult.goalResults.length > 0 && (
          <section id="dossier-s7" className={sectionClass}>
            <div className={sectionHeaderClass}>
              <div className="flex items-center gap-2.5">
                <Target size={19} strokeWidth={1.6} className="text-muted" />
                <h2 className="font-display text-2xl text-ink">Section 7: Goal Probability Detail</h2>
              </div>
              <span className="text-xs text-muted shrink-0">Simulated Funding Distributions</span>
            </div>

            <div className="overflow-x-auto avoid-break">
              <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
                <thead className={tableHeadClass}>
                  <tr>
                    <th className="p-3">Goal</th>
                    <th className="p-3 text-right">Horizon</th>
                    <th className="p-3 text-right">FV Needed</th>
                    <th className="p-3 text-right">PV Needed</th>
                    <th className="p-3 text-center">Success</th>
                    <th className="p-3 text-center">Shortfall Prob.</th>
                    <th className="p-3 text-right">Expected Shortfall</th>
                    <th className="p-3 w-44">Outcome Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {wealthResult.goalResults.map((gr) => (
                    <tr key={gr.goal.id}>
                      <td className="p-3 font-medium text-ink">
                        {gr.goal.name}
                        <Badge tone={gr.goal.priority === 'essential' ? 'negative' : gr.goal.priority === 'important' ? 'neutral' : 'brass'} className="ml-1.5">
                          {gr.goal.priority}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-muted font-mono tabular-nums">{gr.goal.yearsToGoal}y</td>
                      <td className="p-3 text-right font-mono tabular-nums text-ink-soft">{formatCurrencyCompact(gr.futureValue)}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-muted">{formatCurrencyCompact(gr.pvNeeded)}</td>
                      <td className="p-3 text-center font-mono tabular-nums font-semibold text-ink">{formatPercent(gr.successRate * 100)}</td>
                      <td className="p-3 text-center font-mono tabular-nums text-negative">{formatPercent(gr.shortfallProbability * 100)}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-ink-soft">{formatCurrencyCompact(gr.expectedShortfall)}</td>
                      <td className="p-3">
                        <GoalDistributionBars distribution={gr.probabilityDistribution} targetAmount={gr.futureValue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted mt-3 leading-relaxed">
              Distributions show the simulated value of each goal's funding bucket at target date. Faded rose segments mark outcomes
              below the required future value; the label below each histogram reports the probability mass in that shortfall zone.
            </p>
            <p className="text-[11px] text-muted leading-snug">
              Insight:{' '}
              {(() => {
                const essential = wealthResult.goalResults.filter((g) => g.goal.priority === 'essential');
                const weakest = [...wealthResult.goalResults].sort((a, b) => a.successRate - b.successRate)[0];
                if (!weakest) return 'No goals configured.';
                return `${weakest.goal.name} is the weakest-funded goal at ${formatPercent(weakest.successRate * 100)} success${
                  essential.length > 0
                    ? `; essential goals overall fund at ${formatPercent(wealthResult.essentialSuccessRate * 100)}.`
                    : '.'
                }`;
              })()}
            </p>
          </section>
        )}

        {/* ========================================================= */}
        {/* SECTION 8: RISK QUESTIONNAIRE & BEHAVIORAL PROFILE        */}
        {/* ========================================================= */}
        <section id="dossier-s8" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Shield size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 8: Risk Questionnaire & Behavioral Profiling</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Capacity & Tolerance</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 mb-8 avoid-break">
            <div className="p-6 rounded-md border border-border bg-sunken/50 space-y-3">
              <span className="eyebrow">Overall Behavioral Score</span>
              <div className="flex items-baseline gap-2">
                <span className="num-hero text-5xl text-ink">{hasRiskAnswers ? riskScore : '—'}</span>
                <span className="text-sm text-faint font-mono">/ 100</span>
              </div>
              <p className="text-sm font-semibold text-ink">Mandate Profile: {riskProfile.label}</p>
              <p className="text-xs text-muted leading-relaxed">{riskProfile.description}</p>
              {!hasRiskAnswers && (
                <p className="text-[11px] text-faint italic">
                  Questionnaire not yet completed — the profile shown is the platform default, not an assessed result.
                </p>
              )}
            </div>

            <div className="p-6 rounded-md border border-border bg-sunken/50 space-y-3">
              <span className="eyebrow">Recommended Allocation Targets</span>
              <div className="space-y-2 text-xs">
                {CATEGORIES.map((cat) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-muted">{ASSET_LABELS[cat]}</span>
                    <span className="font-semibold text-ink font-mono tabular-nums">{formatPercent(targets[cat])}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {dimensionBreakdown && (
            <div className="space-y-3 mb-8 avoid-break">
              <h3 className="text-sm font-semibold text-ink">Dimension Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Dimension</th>
                      <th className="p-3 text-center">Weight</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">Weighted Contribution</th>
                      <th className="p-3">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {(Object.keys(dimensionBreakdown) as RiskDimension[]).map((dim) => {
                      const d = dimensionBreakdown[dim];
                      const interpretation = d.percentage >= 70 ? 'High — strongly supports risk-taking' : d.percentage >= 45 ? 'Moderate — supports measured risk' : 'Low — constrains risk capacity';
                      return (
                        <tr key={dim}>
                          <td className="p-3 font-medium text-ink">{DIMENSION_LABELS[dim]}</td>
                          <td className="p-3 text-center text-muted font-mono tabular-nums">{formatPercent(d.weight * 100, 0)}</td>
                          <td className="p-3 text-center font-mono tabular-nums font-semibold text-ink">{formatPercent(d.percentage)}</td>
                          <td className="p-3 text-center font-mono tabular-nums text-ink-soft">{d.weightedContribution.toFixed(1)} pts</td>
                          <td className="p-3 text-muted">{interpretation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {riskGap && (
            <div className="p-6 rounded-md border border-border bg-sunken/50 avoid-break space-y-2 mb-8">
              <h3 className="text-sm font-semibold text-ink">Risk Tolerance vs Capacity Gap</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-raised rounded-md border border-border-subtle">
                  <span className="text-muted block">Willingness (Tolerance)</span>
                  <span className="font-mono tabular-nums font-semibold text-ink">{formatPercent(riskGap.tolerancePct)}</span>
                </div>
                <div className="p-3 bg-raised rounded-md border border-border-subtle">
                  <span className="text-muted block">Ability (Capacity)</span>
                  <span className="font-mono tabular-nums font-semibold text-ink">{formatPercent(riskGap.capacityPct)}</span>
                </div>
                <div className="p-3 bg-raised rounded-md border border-border-subtle">
                  <span className="text-muted block">Gap</span>
                  <span className={`font-mono tabular-nums font-semibold ${Math.abs(riskGap.gap) > 20 ? 'text-warning' : 'text-positive'}`}>
                    {riskGap.gap > 0 ? '+' : ''}{formatPercent(riskGap.gap)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted leading-relaxed">{riskGap.verdict}</p>
            </div>
          )}

          {biases.length > 0 && (
            <div className="space-y-3 avoid-break">
              <h3 className="text-sm font-semibold text-ink">Detected Behavioral Biases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
                {biases.map((b) => (
                  <div key={b.bias} className="p-4 rounded-md border border-border bg-raised space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink">{b.bias}</span>
                      <Badge tone={b.level === 'high' ? 'negative' : 'warning'}>{b.level}</Badge>
                    </div>
                    <p className="text-[11px] text-muted leading-snug">{b.description}</p>
                    <p className="text-[11px] text-muted leading-snug">
                      <span className="font-medium text-ink-soft">Advisory counterweight:</span> {b.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SECTION 9: TAX & CURRENCY POSITION                        */}
        {/* ========================================================= */}
        <section id="dossier-s9" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Percent size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 9: Tax & Currency Position</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Fiscal Drag & FX Exposure</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 mb-8 avoid-break">
            <div className="p-4 rounded-md border border-border bg-sunken/60">
              <span className="eyebrow">Annual Tax Estimate</span>
              <p className="num-hero text-xl text-ink mt-1.5">{formatCurrencyCompact(wealthResult.taxSummary.annualTax)}</p>
            </div>
            <div className="p-4 rounded-md border border-border bg-sunken/60">
              <span className="eyebrow">Effective Tax Rate</span>
              <p className="num-hero text-xl text-ink mt-1.5">{formatPercent(wealthResult.taxSummary.effectiveRate * 100)}</p>
            </div>
            <div className="p-4 rounded-md border border-border bg-sunken/60">
              <span className="eyebrow">Post-Tax Income</span>
              <p className="num-hero text-xl text-ink mt-1.5">{formatCurrencyCompact(wealthResult.taxSummary.postTaxIncome)}</p>
            </div>
            <div className="p-4 rounded-md border border-border bg-sunken/60">
              <span className="eyebrow">Recommended Tax Saving</span>
              <p className="num-hero text-xl text-ink mt-1.5">{formatCurrencyCompact(wealthResult.taxSummary.recommendedTaxSaving)}</p>
            </div>
          </div>

          {wealthResult.currencyExposure.length > 0 && (
            <div className="space-y-3 avoid-break">
              <h3 className="text-sm font-semibold text-ink">Currency Exposure of Investable Assets</h3>
              <div className="p-4 rounded-md border border-border bg-raised space-y-3">
                <CurrencyExposureBars
                  exposure={wealthResult.currencyExposure}
                  ariaLabel="Percentage bars showing the portfolio weight of each currency exposure"
                />
                <p className="text-[11px] text-muted leading-snug">
                  Insight:{' '}
                  {(() => {
                    const sorted = [...wealthResult.currencyExposure].sort((a, b) => b.percentage - a.percentage);
                    const top = sorted[0];
                    if (!top) return 'No currency exposure data.';
                    return `${top.currency} represents ${formatPercent(top.percentage)} of investable assets${
                      sorted.length > 1
                        ? ` — the remaining ${formatPercent(100 - top.percentage)} is unhedged foreign exposure that adds diversification but FX volatility on rupee goals.`
                        : ' — the book is fully domestic with no FX drag on rupee liabilities.'
                    }`;
                  })()}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Currency</th>
                      <th className="p-3 text-right">Exposure Value</th>
                      <th className="p-3 text-right">Portfolio Weight</th>
                      <th className="p-3">Hedging Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {wealthResult.currencyExposure.map((c) => (
                      <tr key={c.currency}>
                        <td className="p-3 font-medium text-ink font-mono">{c.currency}</td>
                        <td className="p-3 text-right font-mono tabular-nums text-ink-soft">{formatCurrency(c.amount)}</td>
                        <td className="p-3 text-right font-mono tabular-nums font-semibold text-ink">{formatPercent(c.percentage)}</td>
                        <td className="p-3 text-muted">
                          {c.currency === 'INR'
                            ? 'Domestic — no FX drag on liabilities.'
                            : 'Unhedged global exposure — adds diversification but introduces currency volatility on rupee goals.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SECTION 10: APPENDICES                                    */}
        {/* ========================================================= */}
        <section id="dossier-s10" className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Landmark size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 10: Appendices</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Milestones · Meeting Record · Decision Audit</span>
          </div>

          {/* Appendix A: Projection Milestones */}
          {milestones.length > 0 && (
            <div className="space-y-3 mb-8 avoid-break">
              <h3 className="text-sm font-semibold text-ink">Appendix A: Projection Milestones</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Age</th>
                      <th className="p-3">Phase</th>
                      <th className="p-3 text-right">Nominal Net Worth</th>
                      <th className="p-3 text-right">Real Net Worth</th>
                      <th className="p-3 text-right">Cumulative Invested</th>
                      <th className="p-3 text-right">Cumulative Withdrawn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {milestones.map(({ age, snap }) => (
                      <tr key={age}>
                        <td className="p-3 font-semibold text-ink font-mono tabular-nums">{age}</td>
                        <td className="p-3">
                          <Badge tone={snap.phase === 'accumulation' ? 'info' : 'accent'}>
                            {snap.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums font-semibold text-ink">{formatCurrency(snap.total)}</td>
                        <td className="p-3 text-right font-mono tabular-nums text-ink-soft">{formatCurrency(snap.realTotal)}</td>
                        <td className="p-3 text-right font-mono tabular-nums text-ink-soft">{formatCurrency(snap.invested)}</td>
                        <td className="p-3 text-right font-mono tabular-nums text-ink-soft">
                          {snap.withdrawn > 0 ? formatCurrency(snap.withdrawn) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Appendix B: Meeting Record (only when notes exist) */}
          {meetingNotes.length > 0 && (
            <div className="space-y-3 mb-8 avoid-break">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <StickyNote size={15} strokeWidth={1.6} className="text-muted" /> Appendix B: Meeting Record
              </h3>
              <div className="space-y-3">
                {meetingNotes.map((s) => (
                  <div key={s.id} className="p-4 rounded-md border border-border bg-sunken/50">
                    <p className="text-xs font-semibold text-ink">{s.name}: {s.title}</p>
                    <p className="text-xs text-muted leading-relaxed mt-1 whitespace-pre-wrap">{s.note}</p>
                  </div>
                ))}
                <p className="text-[10px] text-faint">Last updated: <span className="font-mono">{meetingState.lastUpdated || '—'}</span></p>
              </div>
            </div>
          )}

          {/* Appendix C: Decision Audit Trail (only when entries exist) */}
          {decisionHistory.length > 0 && (
            <div className="space-y-3 avoid-break">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <History size={15} strokeWidth={1.6} className="text-muted" /> Appendix C: Decision Audit Trail
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Decision</th>
                      <th className="p-3">Change</th>
                      <th className="p-3">Rationale</th>
                      <th className="p-3">Author</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {decisionHistory.slice(0, 12).map((dec) => (
                      <tr key={dec.id}>
                        <td className="p-3 text-muted whitespace-nowrap font-mono">{dec.dateFormatted}</td>
                        <td className="p-3 font-medium text-ink">
                          {dec.actionTitle}
                          {dec.reverted && <span className="ml-1.5 px-1.5 py-0.5 rounded-sm text-[9px] font-mono bg-sunken text-faint">REVERTED</span>}
                        </td>
                        <td className="p-3 text-muted font-mono text-[11px]">{dec.newValue}</td>
                        <td className="p-3 text-muted leading-snug">{dec.rationale || '—'}</td>
                        <td className="p-3 text-ink-soft whitespace-nowrap">{AUTHOR_LABELS[dec.author] || dec.author}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {decisionHistory.length > 12 && (
                <p className="text-[10px] text-faint">
                  Showing 12 of {decisionHistory.length} recorded decisions. The full trail is available on the Decision History page.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SECTION 11: INVESTMENT POLICY STATEMENT (IPS)              */}
        {/* ========================================================= */}
        <section id="dossier-s11" className="bg-raised rounded-xl border border-border p-8 sm:p-12 print:border-none print:p-6 shadow-card scroll-mt-20">
          <div className="border-b border-border pb-4 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <FileText size={19} strokeWidth={1.6} className="text-muted" />
              <h2 className="font-display text-2xl text-ink">Section 11: Investment Policy Statement (IPS)</h2>
            </div>
            <span className="text-xs text-muted shrink-0">Governance & Execution Mandate</span>
          </div>

          <div className="space-y-6 text-xs text-muted leading-relaxed avoid-break">
            <div>
              <h3 className="text-sm font-display text-xl text-ink mb-1">1. Scope and Purpose</h3>
              <p>
                This Investment Policy Statement (IPS) serves as the strategic blueprint for the wealth management of{' '}
                {inputs.client?.name || 'the Client'}. Its primary objective is to formalize the client's risk tolerance, return
                objectives, liquidity constraints, and asset allocation framework to ensure disciplined, long-term capital
                compounding through retirement.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-display text-xl text-ink mb-1">2. Duties and Responsibilities</h3>
              <p>
                The Advisor ({inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}) is responsible for constructing, monitoring,
                and rebalancing the portfolio in accordance with this policy. The Client agrees to notify the Advisor of any
                material changes in income, health, commitments, or financial circumstances that would warrant a review of this
                statement.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-display text-xl text-ink mb-1">3. Strategic Objectives & Constraints</h3>
              <ul className="list-disc pl-5 space-y-1 mt-1 text-muted">
                <li>
                  <span className="font-medium text-ink-soft">Return Objective:</span> Target real portfolio growth of{' '}
                  <span className="font-mono">{formatPercent(wealthResult.cagrReal)}</span> p.a. (projected plan CAGR) to meet
                  essential goals and secure retirement at age {inputs.retirementAge}.
                </li>
                <li>
                  <span className="font-medium text-ink-soft">Risk Tolerance:</span>{' '}
                  {hasRiskAnswers ? (
                    <>
                      Assessed at <span className="font-mono">{riskScore}/100</span> ({riskProfile.label}), permitting controlled
                      drawdowns in equity allocations in exchange for long-term purchasing power expansion.
                    </>
                  ) : (
                    <>Profiled as {riskProfile.label}; the risk questionnaire has not yet been completed.</>
                  )}
                </li>
                <li>
                  <span className="font-medium text-ink-soft">Liquidity Constraints:</span> An emergency liquid reserve of at least
                  6 months of expenditures (<span className="font-mono">{formatCurrency(inputs.monthlyExpenditure * 6)}</span>)
                  must be maintained in high-quality liquid instruments at all times.
                </li>
                <li>
                  <span className="font-medium text-ink-soft">Time Horizon:</span> Multi-stage horizon consisting of an accumulation
                  phase through age {inputs.retirementAge}, followed by an inflation-adjusted distribution phase through age{' '}
                  {inputs.lifeExpectancy}.
                </li>
                <li>
                  <span className="font-medium text-ink-soft">Success Threshold:</span> The plan must maintain at least{' '}
                  <span className="font-mono">{formatPercent(riskProfile.goalSuccessThreshold)}</span> probability of success on
                  essential goals and full SWP sustainability, per the Monte Carlo analysis in Section 3.
                </li>
              </ul>
            </div>

            {/* Signature & Endorsement Block */}
            <div className="pt-8 border-t border-border grid grid-cols-2 gap-12 avoid-break">
              <div className="space-y-8">
                <div>
                  <p className="text-xs font-semibold text-ink-soft">For the Client:</p>
                  <p className="text-xs text-muted mt-0.5">{inputs.client?.name || 'Primary Client'}</p>
                </div>
                <div className="border-b border-border-strong w-full" />
                <div className="flex justify-between text-[11px] text-faint">
                  <span>Signature</span>
                  <span>Date: {printDate}</span>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-xs font-semibold text-ink-soft">For the Advisory Firm:</p>
                  <p className="text-xs text-muted mt-0.5">{inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}</p>
                </div>
                <div className="border-b border-border-strong w-full" />
                <div className="flex justify-between text-[11px] text-faint">
                  <span>Authorized Signature</span>
                  <span>Date: {printDate}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
