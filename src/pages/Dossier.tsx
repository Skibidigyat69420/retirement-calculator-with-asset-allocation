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
  const hasRiskAnswers = Object.keys(riskAnswers).length > 0;
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

  const sectionHeaderClass = 'border-b border-zinc-200 pb-4 mb-6 flex items-center justify-between';
  const tableHeadClass = 'bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-zinc-100/70 print:bg-white text-zinc-900 pb-16 print:pb-0">
      {/* Embedded print stylesheet for pristine PDF rendering */}
      <style>{`
        @media print {
          aside, header, footer, nav, .print-hidden { display: none !important; }
          body { background: white !important; color: #09090b !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page-break { break-after: page !important; page-break-after: always !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          tr { break-inside: avoid !important; page-break-inside: avoid !important; }
          table { page-break-inside: auto !important; }
        }
      `}</style>

      {/* Floating Action Bar (Hidden in Print) */}
      <div className="sticky top-0 z-40 bg-zinc-950 text-white px-4 py-3 shadow-md flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white border-zinc-700 hover:bg-zinc-800"
          >
            <ArrowLeft size={14} className="mr-1.5" /> Back
          </Button>
          <div className="hidden sm:block">
            <h1 className="text-sm font-medium text-zinc-200">
              Complete Portfolio Dossier — {inputs.client?.name || 'Client Report'}
            </h1>
            <p className="text-[11px] text-zinc-400">
              All 11 sections compiled for high-resolution PDF export or print
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            className="bg-white text-zinc-900 hover:bg-slate-100 shadow-sm"
          >
            <Printer size={14} className="mr-1.5" /> Save as PDF / Print
          </Button>
        </div>
      </div>

      {/* Main Printable Container */}
      <div className="max-w-5xl mx-auto p-4 sm:p-8 print:p-0 space-y-8 print:space-y-6">

        {/* ========================================================= */}
        {/* COVER PAGE / EXECUTIVE MANDATE                            */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 sm:p-12 print:border-none print:p-6 shadow-sm page-break">
          <div className="border-b border-zinc-200 pb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-sans font-bold text-base shadow-sm">
                  ST
                </div>
                <span className="font-sans text-xl font-bold tracking-tight text-zinc-900">
                  Sound Thesis
                </span>
              </div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mt-1 font-medium">
                Private Wealth & Advisory Mandate
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-1 font-semibold border-zinc-300">Confidential</Badge>
              <p className="text-xs text-zinc-500">Review Date: {inputs.client?.reviewDate || printDate}</p>
            </div>
          </div>

          <div className="my-10 space-y-4">
            <h1 className="text-3xl sm:text-4xl font-sans font-bold text-zinc-900 tracking-tight">
              Comprehensive Financial Plan & Portfolio Dossier
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed">
              An institutional wealth plan connecting personal risk tolerance, capital assets, systematic accumulation,
              goal funding, and post-retirement withdrawal longevity into one probabilistic Monte Carlo model.
            </p>
          </div>

          {/* Client & Advisor Mandate Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 p-6 rounded-xl bg-zinc-50 border border-zinc-200/80 avoid-break">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Client Profile</span>
              <p className="text-lg font-sans font-semibold text-zinc-900">{inputs.client?.name || 'Primary Client'}</p>
              <div className="text-xs text-zinc-600 space-y-1">
                <p><span className="font-medium text-zinc-700">Email:</span> {inputs.client?.email || '—'}</p>
                <p><span className="font-medium text-zinc-700">Age:</span> {inputs.currentAge} years | <span className="font-medium text-zinc-700">Retirement Target:</span> Age {inputs.retirementAge}</p>
                <p><span className="font-medium text-zinc-700">Planning Horizon:</span> Age {inputs.lifeExpectancy} ({inputs.lifeExpectancy - inputs.currentAge} years)</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Advisory Mandate</span>
              <p className="text-lg font-sans font-semibold text-zinc-900">{inputs.client?.advisor || 'Sound Thesis Wealth'}</p>
              <div className="text-xs text-zinc-600 space-y-1">
                <p><span className="font-medium text-zinc-700">Review Date:</span> {inputs.client?.reviewDate || printDate}</p>
                <p><span className="font-medium text-zinc-700">Mandate:</span> Discretionary Goal-Based Wealth Architecture</p>
                <p><span className="font-medium text-zinc-700">Risk Profile:</span> {riskProfile.label} (Score: {riskScore}/100)</p>
                <p><span className="font-medium text-zinc-700">Mandate Notes:</span> {inputs.client?.notes || 'Comprehensive retirement security & generational capital preservation.'}</p>
              </div>
            </div>
          </div>

          {/* Topline Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 mt-8 avoid-break">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Total Net Worth</span>
              <p className="text-xl font-sans font-bold text-zinc-900 mt-1">{formatCurrencyCompact(wealthResult.netWorth)}</p>
              <span className="text-[10px] text-zinc-500">{inputs.assets.length} active assets</span>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Retirement Status</span>
              <p className="text-xl font-sans font-bold text-zinc-900 mt-1">
                {wealthResult.sustainable ? 'Sustainable' : `Age ${wealthResult.depletionAge}`}
              </p>
              <span className="text-[10px] text-zinc-500">Through age {inputs.lifeExpectancy}</span>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Monthly Surplus</span>
              <p className="text-xl font-sans font-bold text-zinc-900 mt-1">{formatCurrencyCompact(monthlySurplus)}</p>
              <span className="text-[10px] text-zinc-500">After ₹{formatCurrencyCompact(inputs.monthlyExpenditure)} exp.</span>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Strategic Equity</span>
              <p className="text-xl font-sans font-bold text-zinc-900 mt-1">{formatPercent(targets.equity)}</p>
              <span className="text-[10px] text-zinc-500">{riskProfile.label} target</span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 1: EXECUTIVE DASHBOARD                            */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Activity size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 1: Executive Dashboard</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Portfolio Health & Trajectory</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4 mb-6 avoid-break">
            {/* Net Worth Chart */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Projected Net Worth Fan (Monte Carlo)</h3>
              <p className="text-xs text-zinc-500 mb-2">Simulated percentiles across accumulation and distribution</p>
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
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Current Capital Distribution</h3>
              <p className="text-xs text-zinc-500 mb-2">Total holdings: {formatCurrency(wealthResult.netWorth)}</p>
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
            <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="p-3">Advisory Metric</th>
                  <th className="p-3">Current Plan Value</th>
                  <th className="p-3">Target / Benchmark</th>
                  <th className="p-3">Advisory Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-medium text-zinc-900">Liquid Emergency Buffer</td>
                  <td className="p-3 font-semibold text-slate-800">{formatCurrency(liquidAssets)}</td>
                  <td className="p-3 text-zinc-600">{formatCurrency(inputs.monthlyExpenditure * 6)} (6 Months)</td>
                  <td className="p-3 text-zinc-600">
                    {liquidAssets >= inputs.monthlyExpenditure * 6
                      ? '✓ Fully capitalized emergency fund.'
                      : '⚠ Below 6-month recommended buffer.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900">Monthly SIP Commitment</td>
                  <td className="p-3 font-semibold text-slate-800">{formatCurrency(inputs.sip.amount)}/mo</td>
                  <td className="p-3 text-zinc-600">{formatCurrency(monthlySurplus * 0.7)} (70% surplus)</td>
                  <td className="p-3 text-zinc-600">
                    Step-up: {inputs.sip.stepUp}% p.a. | {inputs.sip.equitySplit}% Equity / {inputs.sip.debtSplit}% Debt
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900">Projected Corpus at Retirement</td>
                  <td className="p-3 font-semibold text-slate-800">{formatCurrency(corpusAtRetirement)}</td>
                  <td className="p-3 text-zinc-600">At Age {inputs.retirementAge}</td>
                  <td className="p-3 text-zinc-600">
                    Terminal portfolio real value: {formatCurrency(wealthResult.terminalRealValue)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-900">Retirement Withdrawal Longevity</td>
                  <td className="p-3 font-semibold text-slate-800">
                    {wealthResult.sustainable ? `Solvent to age ${inputs.lifeExpectancy}+` : `Depletion at age ${wealthResult.depletionAge}`}
                  </td>
                  <td className="p-3 text-zinc-600">Age {inputs.lifeExpectancy} horizon</td>
                  <td className="p-3 text-zinc-600">
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
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Building2 size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 2: Master Plan & Capital Assets</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Inventory & Commitments</span>
          </div>

          {/* Assets Inventory Table */}
          <div className="space-y-3 mb-8 avoid-break">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">1. Capital Asset Inventory</h3>
              <span className="text-xs text-zinc-500">Total Value: {formatCurrency(wealthResult.netWorth)}</span>
            </div>
            <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
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
              <tbody className="divide-y divide-slate-100">
                {inputs.assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="p-3 font-medium text-zinc-900">{asset.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-zinc-700">
                        {ASSET_LABELS[asset.category] || asset.category}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-600">{asset.currency}</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(asset.value)}</td>
                    <td className="p-3 text-right text-zinc-600">{asset.returnRate}%</td>
                    <td className="p-3 text-center text-zinc-600">
                      {asset.liquidateAtRetirement ? 'Yes (Liquidates)' : 'No (Retained)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cashflow Commitments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 mb-8 avoid-break">
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Monthly SIP Commitment</span>
              <p className="text-base font-sans font-bold text-zinc-900 mt-1">{formatCurrency(inputs.sip.amount)}/mo</p>
              <p className="text-xs text-zinc-600 mt-1">
                {inputs.sip.stepUp}% annual step-up | {inputs.sip.equitySplit}% Equity / {inputs.sip.debtSplit}% Debt
              </p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">STP Deployment Plan</span>
              <p className="text-base font-sans font-bold text-zinc-900 mt-1">
                {inputs.stp.active ? `${formatCurrency(inputs.stp.monthlyTransfer)}/mo` : 'Inactive'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                {inputs.stp.active
                  ? `Lumpsum: ${formatCurrency(inputs.stp.lumpsum)} deployed from ${inputs.stp.source}`
                  : 'No systematic transfer active.'}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Retirement SWP Target</span>
              <p className="text-base font-sans font-bold text-zinc-900 mt-1">{formatCurrency(inputs.swp.monthlyNeedToday)}/mo</p>
              <p className="text-xs text-zinc-600 mt-1">
                Current monthly equivalent | Inflation-indexed to retirement
              </p>
            </div>
          </div>

          {/* Goals Schedule Table */}
          <div className="space-y-3 avoid-break">
            <h3 className="text-sm font-semibold text-zinc-900">2. Life Goal Milestone Commitments</h3>
            <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
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
              <tbody className="divide-y divide-slate-100">
                {wealthResult.goalResults.map((gr) => (
                  <tr key={gr.goal.id}>
                    <td className="p-3 font-medium text-zinc-900">{gr.goal.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        gr.goal.priority === 'essential' ? 'bg-emerald-50 text-emerald-800' :
                        gr.goal.priority === 'important' ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-zinc-700'
                      }`}>
                        {gr.goal.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right text-zinc-600">{gr.goal.yearsToGoal} Years</td>
                    <td className="p-3 text-right text-zinc-600">{formatCurrency(gr.goal.targetAmount)}</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(gr.futureValue)}</td>
                    <td className="p-3 text-center">
                      <span className={`font-medium ${gr.successRate >= 0.8 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {formatPercent(gr.successRate * 100)} (Shortfall: {formatCurrency(gr.expectedShortfall)})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: RETIREMENT & SWP LONGEVITY                      */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <TrendingUp size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 3: Retirement & SWP Longevity Analysis</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Distribution Sustainability</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-6 print:gap-4 mb-8 avoid-break">
            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Projected Retirement Corpus</span>
              <p className="text-2xl font-sans font-bold text-zinc-900">{formatCurrencyCompact(corpusAtRetirement)}</p>
              <p className="text-xs text-zinc-600">At target retirement age {inputs.retirementAge}.</p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Terminal Real Value</span>
              <p className="text-2xl font-sans font-bold text-zinc-900">{formatCurrencyCompact(wealthResult.terminalRealValue)}</p>
              <p className="text-xs text-zinc-600">Net worth at age {inputs.lifeExpectancy} in today's rupees.</p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sustainability Verdict</span>
              <p className={`text-2xl font-sans font-bold ${wealthResult.sustainable ? 'text-emerald-700' : 'text-amber-700'}`}>
                {wealthResult.sustainable ? 'Fully Solvent' : `Depletion: Age ${wealthResult.depletionAge}`}
              </p>
              <p className="text-xs text-zinc-600">Through life expectancy of {inputs.lifeExpectancy} years.</p>
            </div>
          </div>

          {/* Net-worth growth trajectory with retirement marker */}
          <div className="p-6 rounded-xl border border-zinc-200 bg-white avoid-break space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-zinc-900">Net-Worth Growth Trajectory & Retirement Milestone</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
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
              {wealthResult.netWorth > 0 ? formatPercent((corpusAtRetirement / wealthResult.netWorth) * 100, 0) : '—'} of today's net worth — then{' '}
              {wealthResult.sustainable ? `holds or grows through age ${inputs.lifeExpectancy}.` : `declines to depletion at age ${wealthResult.depletionAge}.`}
            </p>
          </div>

          {/* Monte Carlo terminal outcome band */}
          <div className="p-6 rounded-xl border border-zinc-200 bg-white avoid-break space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">Monte Carlo Terminal Outcome Distribution</h3>
              <span className="text-xs font-mono font-bold text-zinc-900">
                {formatPercent(mc.successRate * 100)} path success
              </span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {formatPercent(mc.successRate * 100)} of simulated paths sustain withdrawals through age {inputs.lifeExpectancy}.
              {mc.medianDepletionAge !== null
                ? ` The median simulated path first exhausts the corpus at age ${mc.medianDepletionAge}.`
                : ' The median simulated path never exhausts the corpus within the planning horizon.'}
            </p>
            <div>
              <div className="relative h-4 rounded-full bg-zinc-100 overflow-visible">
                <div
                  className="absolute h-4 rounded-full bg-zinc-300"
                  style={{ left: bandPos(mc.percentile25), width: `calc(${bandPos(mc.percentile75)} - ${bandPos(mc.percentile25)})` }}
                />
                <div
                  className="absolute h-4 rounded-full bg-zinc-400/70"
                  style={{ left: bandPos(mc.percentile5), width: `calc(${bandPos(mc.percentile95)} - ${bandPos(mc.percentile5)})` }}
                />
                <div
                  className="absolute -top-1 h-6 w-0.5 bg-zinc-950 rounded"
                  style={{ left: bandPos(mc.medianTerminal) }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-mono">
                <span>P5 {formatCurrencyCompact(mc.percentile5)}</span>
                <span className="font-semibold text-zinc-800">Median {formatCurrencyCompact(mc.medianTerminal)}</span>
                <span>P95 {formatCurrencyCompact(mc.percentile95)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500 block">Mean Terminal</span>
                <span className="font-mono font-semibold text-zinc-900">{formatCurrencyCompact(mc.meanTerminal)}</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500 block">Interquartile (P25–P75)</span>
                <span className="font-mono font-semibold text-zinc-900">
                  {formatCurrencyCompact(mc.percentile25)} – {formatCurrencyCompact(mc.percentile75)}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500 block">Median Depletion Age</span>
                <span className="font-mono font-semibold text-zinc-900">
                  {mc.medianDepletionAge !== null ? `Age ${mc.medianDepletionAge}` : 'Not depleted'}
                </span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500 block">Deterministic Verdict</span>
                <span className="font-semibold text-zinc-900">
                  {wealthResult.sustainable ? `Solvent to ${inputs.lifeExpectancy}+` : `Depletes at ${wealthResult.depletionAge}`}
                </span>
              </div>
            </div>
          </div>

          {/* SWP survival curves: corpus survival through the distribution phase */}
          <div className="p-6 rounded-xl border border-zinc-200 bg-white avoid-break space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-zinc-900">Corpus Survival Through Retirement (Monte Carlo)</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
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
                <table className="w-full text-[11px] text-left border border-zinc-200 rounded-lg overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-2">Age Checkpoint</th>
                      <th className="p-2 text-right">P5 Corpus</th>
                      <th className="p-2 text-right">Median Corpus</th>
                      <th className="p-2 text-right">P95 Corpus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {survivalCheckpoints.map((d) => (
                      <tr key={d.age}>
                        <td className="p-2 font-medium text-zinc-900">{d.age}</td>
                        <td className="p-2 text-right font-mono text-zinc-700">{formatCurrencyCompact(d.p5)}</td>
                        <td className="p-2 text-right font-mono font-semibold text-zinc-900">{formatCurrencyCompact(d.p50)}</td>
                        <td className="p-2 text-right font-mono text-zinc-700">{formatCurrencyCompact(d.p95)}</td>
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
          <div className="p-6 rounded-xl border border-zinc-200 bg-white avoid-break space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900">Post-Retirement Withdrawal Framework</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              The distribution engine assumes an initial monthly draw equivalent to {formatCurrency(inputs.swp.monthlyNeedToday)} in today's purchasing power,
              inflating at {inputs.inflation}% p.a. through retirement. The expected return in distribution is {inputs.swp.postRetirementReturn}% p.a.
              with an estimated tax drag of {inputs.swp.taxRate}%.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 pt-2 text-xs">
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500">Base Living Need:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{formatCurrency(inputs.swp.monthlyNeedToday * 12)} / year</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500">Inflation Rate:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inputs.inflation}% p.a.</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500">Post-Retirement Return:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{inputs.swp.postRetirementReturn}% p.a.</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500">Longevity Cushion:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {wealthResult.sustainable ? `${inputs.lifeExpectancy - inputs.retirementAge}+ Years` : `${(wealthResult.depletionAge ?? inputs.retirementAge) - inputs.retirementAge} Years`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: STRATEGIC ASSET ALLOCATION & REBALANCING       */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <PieChart size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 4: Strategic Asset Allocation & Rebalancing</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Target vs Actual Drift</span>
          </div>

          {/* Paired 100% stacked bars: current vs strategic target */}
          <div className="p-5 rounded-xl border border-zinc-200 bg-white avoid-break space-y-3 mb-8">
            <h3 className="text-sm font-semibold text-zinc-900">Current vs Strategic Target Allocation</h3>
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
            <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
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
              <tbody className="divide-y divide-slate-100">
                {CATEGORIES.map((cat) => {
                  const currentVal = wealthResult.currentAllocation[cat] * wealthResult.netWorth;
                  const currentWt = wealthResult.currentAllocation[cat] * 100;
                  const targetWt = targets[cat];
                  const diff = currentWt - targetWt;
                  return (
                    <tr key={cat}>
                      <td className="p-3 font-medium text-zinc-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                        {ASSET_LABELS[cat]}
                      </td>
                      <td className="p-3 text-right text-zinc-700 font-mono">{formatCurrency(currentVal)}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-800">{formatPercent(currentWt)}</td>
                      <td className="p-3 text-right font-mono text-zinc-600">{formatPercent(targetWt)}</td>
                      <td className={`p-3 text-right font-mono font-semibold ${Math.abs(diff) <= 2 ? 'text-zinc-500' : diff > 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                        {diff > 0 ? `+${formatPercent(diff)}` : formatPercent(diff)}
                      </td>
                      <td className="p-3 text-center text-xs">
                        {Math.abs(diff) <= 2 ? (
                          <span className="text-zinc-500 font-medium">In Band (Balanced)</span>
                        ) : diff > 0 ? (
                          <span className="text-blue-700 font-medium">Trim / Reallocate</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Add Capital</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rebalancing Strategy Advice */}
          <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50 avoid-break space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900">Rebalancing Mandate</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Rebalancing should be conducted annually or when any asset class deviates by more than ±5% from its strategic target band.
              To minimize capital gains tax drag, rebalancing should prioritize deploying new SIP/STP inflows into underweight asset classes
              before executing outright liquidations of appreciated assets.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5: QUANT LAB & TAIL-RISK ANALYSIS                  */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Award size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 5: Quant Lab & Tail-Risk Analysis</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Historical Crisis Simulations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 mb-8 avoid-break">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Assumption Engine</span>
              <p className="text-lg font-sans font-semibold text-zinc-900 mt-1">{activeAssumptionSourceLabel}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Calibrated {assumptions.fetchedAt ? new Date(assumptions.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'from default priors'}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Simulation Method</span>
              <p className="text-lg font-sans font-semibold text-zinc-900 mt-1">Historical Replay</p>
              <p className="text-xs text-zinc-600 mt-0.5">Crisis drawdowns applied to current holdings</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Scenarios Modeled</span>
              <p className="text-lg font-sans font-semibold text-zinc-900 mt-1">{CRISIS_PRESETS.length} Crises</p>
              <p className="text-xs text-zinc-600 mt-0.5">{CRISIS_PRESETS.map((p) => p.name).join(' · ')}</p>
            </div>
          </div>

          {/* Tail-Risk Stress Matrix: all four crisis presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">Tail-Risk Stress Matrix — Historical Crisis Simulations</h3>
              <span className="text-xs text-zinc-500">Shocks applied to current holdings; plans re-projected under stressed inflation</span>
            </div>
            <div className="p-5 rounded-xl border border-zinc-200 bg-white avoid-break space-y-3">
              <h4 className="text-xs font-semibold text-zinc-900">Corpus Impact at Retirement by Scenario</h4>
              <StressImpactBars
                results={stressResults}
                ariaLabel="Horizontal bars showing corpus impact at retirement for each crisis scenario, scaled by magnitude with negative impacts in red extending left from zero"
              />
              <p className="text-[11px] text-muted leading-snug">
                Insight: the worst modeled shock (
                {[...stressResults].sort((a, b) => a.corpusDelta - b.corpusDelta)[0]?.scenario.name ?? '—'}) cuts the retirement corpus by{' '}
                {formatCurrencyCompact(Math.abs(Math.min(...stressResults.map((r) => Math.min(0, r.corpusDelta)))))} —{' '}
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
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <HeartPulse size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 6: Plan Health & Priority Actions</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Weighted Diagnostic Score</span>
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
          <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
            <div className={sectionHeaderClass}>
              <div className="flex items-center gap-2.5">
                <Target size={20} className="text-zinc-700" />
                <h2 className="text-xl font-sans font-bold text-zinc-900">Section 7: Goal Probability Detail</h2>
              </div>
              <span className="text-xs font-medium text-zinc-500">Simulated Funding Distributions</span>
            </div>

            <div className="overflow-x-auto avoid-break">
              <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
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
                <tbody className="divide-y divide-slate-100">
                  {wealthResult.goalResults.map((gr) => (
                    <tr key={gr.goal.id}>
                      <td className="p-3 font-medium text-zinc-900">
                        {gr.goal.name}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          gr.goal.priority === 'essential' ? 'bg-emerald-50 text-emerald-800' :
                          gr.goal.priority === 'important' ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-zinc-700'
                        }`}>
                          {gr.goal.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right text-zinc-600">{gr.goal.yearsToGoal}y</td>
                      <td className="p-3 text-right font-mono text-zinc-800">{formatCurrencyCompact(gr.futureValue)}</td>
                      <td className="p-3 text-right font-mono text-zinc-600">{formatCurrencyCompact(gr.pvNeeded)}</td>
                      <td className="p-3 text-center font-mono font-semibold text-zinc-900">{formatPercent(gr.successRate * 100)}</td>
                      <td className="p-3 text-center font-mono text-rose-600">{formatPercent(gr.shortfallProbability * 100)}</td>
                      <td className="p-3 text-right font-mono text-zinc-700">{formatCurrencyCompact(gr.expectedShortfall)}</td>
                      <td className="p-3">
                        <GoalDistributionBars distribution={gr.probabilityDistribution} targetAmount={gr.futureValue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
              Distributions show the simulated value of each goal's funding bucket at target date. Rose segments mark outcomes below the
              required future value; the label below each histogram reports the probability mass in that shortfall zone.
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
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Shield size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 8: Risk Questionnaire & Behavioral Profiling</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Capacity & Tolerance</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 mb-8 avoid-break">
            <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Overall Behavioral Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-sans font-bold text-zinc-900">{riskScore}</span>
                <span className="text-sm text-zinc-500">/ 100</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">Mandate Profile: {riskProfile.label}</p>
              <p className="text-xs text-zinc-600 leading-relaxed">{riskProfile.description}</p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recommended Allocation Targets</span>
              <div className="space-y-2 text-xs">
                {CATEGORIES.map((cat) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-zinc-600">{ASSET_LABELS[cat]}</span>
                    <span className="font-semibold text-zinc-900 font-mono">{formatPercent(targets[cat])}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {dimensionBreakdown && (
            <div className="space-y-3 mb-8 avoid-break">
              <h3 className="text-sm font-semibold text-zinc-900">Dimension Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Dimension</th>
                      <th className="p-3 text-center">Weight</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">Weighted Contribution</th>
                      <th className="p-3">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Object.keys(dimensionBreakdown) as RiskDimension[]).map((dim) => {
                      const d = dimensionBreakdown[dim];
                      const interpretation = d.percentage >= 70 ? 'High — strongly supports risk-taking' : d.percentage >= 45 ? 'Moderate — supports measured risk' : 'Low — constrains risk capacity';
                      return (
                        <tr key={dim}>
                          <td className="p-3 font-medium text-zinc-900">{DIMENSION_LABELS[dim]}</td>
                          <td className="p-3 text-center text-zinc-600 font-mono">{formatPercent(d.weight * 100, 0)}</td>
                          <td className="p-3 text-center font-mono font-semibold text-zinc-900">{formatPercent(d.percentage)}</td>
                          <td className="p-3 text-center font-mono text-zinc-700">{d.weightedContribution.toFixed(1)} pts</td>
                          <td className="p-3 text-zinc-600">{interpretation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {riskGap && (
            <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/50 avoid-break space-y-2 mb-8">
              <h3 className="text-sm font-semibold text-zinc-900">Risk Tolerance vs Capacity Gap</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-zinc-200/70">
                  <span className="text-zinc-500 block">Willingness (Tolerance)</span>
                  <span className="font-mono font-bold text-zinc-900">{formatPercent(riskGap.tolerancePct)}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-zinc-200/70">
                  <span className="text-zinc-500 block">Ability (Capacity)</span>
                  <span className="font-mono font-bold text-zinc-900">{formatPercent(riskGap.capacityPct)}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-zinc-200/70">
                  <span className="text-zinc-500 block">Gap</span>
                  <span className={`font-mono font-bold ${Math.abs(riskGap.gap) > 20 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {riskGap.gap > 0 ? '+' : ''}{formatPercent(riskGap.gap)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">{riskGap.verdict}</p>
            </div>
          )}

          {biases.length > 0 && (
            <div className="space-y-3 avoid-break">
              <h3 className="text-sm font-semibold text-zinc-900">Detected Behavioral Biases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
                {biases.map((b) => (
                  <div key={b.bias} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-900">{b.bias}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        b.level === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {b.level}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-snug">{b.description}</p>
                    <p className="text-[11px] text-zinc-500 leading-snug"><span className="font-medium text-zinc-700">Advisory counterweight:</span> {b.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SECTION 9: TAX & CURRENCY POSITION                        */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Percent size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 9: Tax & Currency Position</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Fiscal Drag & FX Exposure</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-4 mb-8 avoid-break">
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Annual Tax Estimate</span>
              <p className="text-lg font-sans font-bold text-zinc-900 mt-1">{formatCurrencyCompact(wealthResult.taxSummary.annualTax)}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Effective Tax Rate</span>
              <p className="text-lg font-sans font-bold text-zinc-900 mt-1">{formatPercent(wealthResult.taxSummary.effectiveRate * 100)}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Post-Tax Income</span>
              <p className="text-lg font-sans font-bold text-zinc-900 mt-1">{formatCurrencyCompact(wealthResult.taxSummary.postTaxIncome)}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Recommended Tax Saving</span>
              <p className="text-lg font-sans font-bold text-zinc-900 mt-1">{formatCurrencyCompact(wealthResult.taxSummary.recommendedTaxSaving)}</p>
            </div>
          </div>

          {wealthResult.currencyExposure.length > 0 && (
            <div className="space-y-3 avoid-break">
              <h3 className="text-sm font-semibold text-zinc-900">Currency Exposure of Investable Assets</h3>
              <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3">
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
                <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Currency</th>
                      <th className="p-3 text-right">Exposure Value</th>
                      <th className="p-3 text-right">Portfolio Weight</th>
                      <th className="p-3">Hedging Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wealthResult.currencyExposure.map((c) => (
                      <tr key={c.currency}>
                        <td className="p-3 font-medium text-zinc-900">{c.currency}</td>
                        <td className="p-3 text-right font-mono text-zinc-800">{formatCurrency(c.amount)}</td>
                        <td className="p-3 text-right font-mono font-semibold text-zinc-900">{formatPercent(c.percentage)}</td>
                        <td className="p-3 text-zinc-600">
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
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className={sectionHeaderClass}>
            <div className="flex items-center gap-2.5">
              <Landmark size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 10: Appendices</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Milestones · Meeting Record · Decision Audit</span>
          </div>

          {/* Appendix A: Projection Milestones */}
          {milestones.length > 0 && (
            <div className="space-y-3 mb-8 avoid-break">
              <h3 className="text-sm font-semibold text-zinc-900">Appendix A: Projection Milestones</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
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
                  <tbody className="divide-y divide-slate-100">
                    {milestones.map(({ age, snap }) => (
                      <tr key={age}>
                        <td className="p-3 font-semibold text-zinc-900">{age}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            snap.phase === 'accumulation' ? 'bg-blue-50 text-blue-800' : 'bg-violet-50 text-violet-800'
                          }`}>
                            {snap.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-zinc-900">{formatCurrency(snap.total)}</td>
                        <td className="p-3 text-right font-mono text-zinc-700">{formatCurrency(snap.realTotal)}</td>
                        <td className="p-3 text-right font-mono text-zinc-700">{formatCurrency(snap.invested)}</td>
                        <td className="p-3 text-right font-mono text-zinc-700">{snap.withdrawn > 0 ? formatCurrency(snap.withdrawn) : '—'}</td>
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
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <StickyNote size={15} className="text-zinc-600" /> Appendix B: Meeting Record
              </h3>
              <div className="space-y-3">
                {meetingNotes.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                    <p className="text-xs font-semibold text-zinc-900">{s.name}: {s.title}</p>
                    <p className="text-xs text-zinc-600 leading-relaxed mt-1 whitespace-pre-wrap">{s.note}</p>
                  </div>
                ))}
                <p className="text-[10px] text-zinc-500">Last updated: {meetingState.lastUpdated || '—'}</p>
              </div>
            </div>
          )}

          {/* Appendix C: Decision Audit Trail (only when entries exist) */}
          {decisionHistory.length > 0 && (
            <div className="space-y-3 avoid-break">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <History size={15} className="text-zinc-600" /> Appendix C: Decision Audit Trail
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Decision</th>
                      <th className="p-3">Change</th>
                      <th className="p-3">Rationale</th>
                      <th className="p-3">Author</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {decisionHistory.slice(0, 12).map((dec) => (
                      <tr key={dec.id}>
                        <td className="p-3 text-zinc-600 whitespace-nowrap">{dec.dateFormatted}</td>
                        <td className="p-3 font-medium text-zinc-900">
                          {dec.actionTitle}
                          {dec.reverted && <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-200 text-zinc-600">REVERTED</span>}
                        </td>
                        <td className="p-3 text-zinc-600 font-mono text-[11px]">{dec.newValue}</td>
                        <td className="p-3 text-zinc-600 leading-snug">{dec.rationale || '—'}</td>
                        <td className="p-3 text-zinc-700 whitespace-nowrap">{AUTHOR_LABELS[dec.author] || dec.author}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {decisionHistory.length > 12 && (
                <p className="text-[10px] text-zinc-500">Showing 12 of {decisionHistory.length} recorded decisions. The full trail is available on the Decision History page.</p>
              )}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SECTION 11: INVESTMENT POLICY STATEMENT (IPS)              */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 sm:p-12 print:border-none print:p-6 shadow-sm">
          <div className="border-b border-zinc-200 pb-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 11: Investment Policy Statement (IPS)</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Governance & Execution Mandate</span>
          </div>

          <div className="space-y-6 text-xs text-zinc-700 leading-relaxed avoid-break">
            <div>
              <h3 className="text-sm font-sans font-bold text-zinc-900 mb-1">1. Scope and Purpose</h3>
              <p>
                This Investment Policy Statement (IPS) serves as the strategic blueprint for the wealth management of {inputs.client?.name || 'the Client'}.
                Its primary objective is to formalize the client’s risk tolerance, return objectives, liquidity constraints, and asset allocation
                framework to ensure disciplined, long-term capital compounding through retirement.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-sans font-bold text-zinc-900 mb-1">2. Duties and Responsibilities</h3>
              <p>
                The Advisor ({inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}) is responsible for constructing, monitoring, and rebalancing
                the portfolio in accordance with this policy. The Client agrees to notify the Advisor of any material changes in income, health,
                commitments, or financial circumstances that would warrant a review of this statement.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-sans font-bold text-zinc-900 mb-1">3. Strategic Objectives & Constraints</h3>
              <ul className="list-disc pl-5 space-y-1 mt-1 text-zinc-600">
                <li><span className="font-medium text-slate-800">Return Objective:</span> Target real portfolio growth of {formatPercent(wealthResult.cagrReal)} p.a. (projected plan CAGR) to meet essential goals and secure retirement at age {inputs.retirementAge}.</li>
                <li><span className="font-medium text-slate-800">Risk Tolerance:</span> Assessed at {riskScore}/100 ({riskProfile.label}), permitting controlled drawdowns in equity allocations in exchange for long-term purchasing power expansion.</li>
                <li><span className="font-medium text-slate-800">Liquidity Constraints:</span> An emergency liquid reserve of at least 6 months of expenditures ({formatCurrency(inputs.monthlyExpenditure * 6)}) must be maintained in high-quality liquid instruments at all times.</li>
                <li><span className="font-medium text-slate-800">Time Horizon:</span> Multi-stage horizon consisting of an accumulation phase through age {inputs.retirementAge}, followed by an inflation-adjusted distribution phase through age {inputs.lifeExpectancy}.</li>
                <li><span className="font-medium text-slate-800">Success Threshold:</span> The plan must maintain at least {formatPercent(riskProfile.goalSuccessThreshold)} probability of success on essential goals and full SWP sustainability, per the Monte Carlo analysis in Section 3.</li>
              </ul>
            </div>

            {/* Signature & Endorsement Block */}
            <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-12 avoid-break">
              <div className="space-y-8">
                <div>
                  <p className="text-xs font-semibold text-slate-800">For the Client:</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{inputs.client?.name || 'Primary Client'}</p>
                </div>
                <div className="border-b border-zinc-300 w-full" />
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Signature</span>
                  <span>Date: {printDate}</span>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-xs font-semibold text-slate-800">For the Advisory Firm:</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}</p>
                </div>
                <div className="border-b border-zinc-300 w-full" />
                <div className="flex justify-between text-[11px] text-zinc-500">
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
