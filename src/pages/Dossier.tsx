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
} from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { DonutChart } from '../components/charts/DonutChart';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { CRISIS_PRESETS, runStressTest } from '../lib/stressTest';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const Dossier = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { inputs, riskProfile, riskScore, wealthResult, manualTargets } = useCalculator();

  const autoPrint = searchParams.get('autoPrint') === 'true';

  const gfcTest = useMemo(() => {
    const gfc = CRISIS_PRESETS.find((p) => p.id === 'gfc-2008') || CRISIS_PRESETS[0];
    return runStressTest(inputs, gfc);
  }, [inputs]);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const targets = manualTargets || riskProfile.targets;

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

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
              All 7 sections compiled for high-resolution PDF export or print
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
          <div className="border-b border-zinc-200 pb-4 mb-6 flex items-center justify-between">
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
              <div className="h-56 print:h-52 overflow-hidden">
                <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} className="h-52 w-full" />
              </div>
            </div>

            {/* Asset Allocation Donut */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Current Capital Distribution</h3>
              <p className="text-xs text-zinc-500 mb-2">Total holdings: {formatCurrency(wealthResult.netWorth)}</p>
              <div className="h-56 print:h-52 flex items-center justify-center">
                <DonutChart data={currentAllocationData} />
              </div>
            </div>
          </div>

          {/* Key Advisory Metrics Table */}
          <div className="overflow-x-auto avoid-break">
            <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
              <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider">
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
                      ? '✓ 100% sustainable through full mortality horizon.'
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
          <div className="border-b border-zinc-200 pb-4 mb-6 flex items-center justify-between">
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
              <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider">
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
              <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider">
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
          <div className="border-b border-zinc-200 pb-4 mb-6 flex items-center justify-between">
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
                  {wealthResult.sustainable ? '35+ Years' : `${(wealthResult.depletionAge ?? inputs.retirementAge) - inputs.retirementAge} Years`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: STRATEGIC ASSET ALLOCATION & REBALANCING       */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className="border-b border-zinc-200 pb-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PieChart size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 4: Strategic Asset Allocation & Rebalancing</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Target vs Actual Drift</span>
          </div>

          <div className="overflow-x-auto mb-8 avoid-break">
            <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
              <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider">
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
        {/* SECTION 5: QUANT LAB & MVO OPTIMIZATION                   */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm">
          <div className="border-b border-zinc-200 pb-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 5: Quant Lab & Mean-Variance Optimization</h2>
            </div>
            <span className="text-xs font-medium text-zinc-500">Markowitz Modern Portfolio Theory</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 mb-8 avoid-break">
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Historical Calibration</span>
              <p className="text-lg font-sans font-semibold text-zinc-900 mt-1">10-Year Daily Candles</p>
              <p className="text-xs text-zinc-600 mt-0.5">NSE Nifty, Gold, Bonds & G-Secs</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">MVO Risk-Free Rate</span>
              <p className="text-lg font-sans font-semibold text-zinc-900 mt-1">6.50% p.a.</p>
              <p className="text-xs text-zinc-600 mt-0.5">RBI 10-Year Benchmark G-Sec</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Optimization Goal</span>
              <p className="text-lg font-sans font-semibold text-zinc-900 mt-1">Max Sharpe Frontier</p>
              <p className="text-xs text-zinc-600 mt-0.5">Constrained non-negative weights</p>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50 avoid-break space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900">Optimization Frontier Guidelines</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Mean-Variance Optimization generates the mathematically optimal efficient frontier by evaluating the covariance
              structure between asset classes. The portfolio recommended for the {riskProfile.label} mandate balances
              maximum return per unit of volatility while adhering to liquidity and concentration caps.
            </p>
          </div>

          {/* Tail-Risk Stress Test Audit */}
          <div className="mt-6 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 avoid-break space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Tail-Risk Stress Test: 2008 Global Financial Crisis Simulation
              </h3>
              <span className="text-xs font-mono font-bold text-zinc-900">
                Resilience Score: {gfcTest.resilienceScore}/100
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block">Simulated Drawdown</span>
                <span className="font-mono font-bold text-rose-600">
                  {formatPercent(gfcTest.drawdownPercent)} ({formatCurrencyCompact(gfcTest.drawdownAmount)})
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Shocked Net Worth</span>
                <span className="font-mono font-semibold text-zinc-900">
                  {formatCurrencyCompact(gfcTest.shockedNetWorth)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Longevity Impact</span>
                <span className="font-semibold text-zinc-900">
                  {gfcTest.shockedSustainable ? `Survives to Age ${inputs.lifeExpectancy}` : `Depletes at Age ${gfcTest.shockedDepletionAge}`}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 6: RISK QUESTIONNAIRE & BEHAVIORAL PROFILE        */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 print:border-none print:p-6 shadow-sm page-break">
          <div className="border-b border-zinc-200 pb-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 6: Risk Questionnaire & Behavioral Profiling</h2>
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
        </section>

        {/* ========================================================= */}
        {/* SECTION 7: INVESTMENT POLICY STATEMENT (IPS)              */}
        {/* ========================================================= */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-8 sm:p-12 print:border-none print:p-6 shadow-sm">
          <div className="border-b border-zinc-200 pb-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText size={20} className="text-zinc-700" />
              <h2 className="text-xl font-sans font-bold text-zinc-900">Section 7: Investment Policy Statement (IPS)</h2>
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
                <li><span className="font-medium text-slate-800">Return Objective:</span> Target real portfolio growth of 3.50%–4.50% above inflation to meet essential goals and secure early retirement at age {inputs.retirementAge}.</li>
                <li><span className="font-medium text-slate-800">Risk Tolerance:</span> Assessed at {riskScore}/100 ({riskProfile.label}), permitting controlled drawdowns in equity allocations in exchange for long-term purchasing power expansion.</li>
                <li><span className="font-medium text-slate-800">Liquidity Constraints:</span> An emergency liquid reserve of at least 6 months of expenditures ({formatCurrency(inputs.monthlyExpenditure * 6)}) must be maintained in high-quality liquid instruments at all times.</li>
                <li><span className="font-medium text-slate-800">Time Horizon:</span> Multi-stage horizon consisting of an accumulation phase through age {inputs.retirementAge}, followed by an inflation-adjusted distribution phase through age {inputs.lifeExpectancy}.</li>
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
