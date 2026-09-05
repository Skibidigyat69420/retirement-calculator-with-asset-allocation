import { Link } from 'react-router-dom';
import {
  Activity,
  PieChart,
  Target,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wallet,
  TrendingUp,
  DollarSign,
  PiggyBank,
  Compass,
  Layers,
  Briefcase,
  History,
  Info,
  Users,
  Calendar,
  Award,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { computePlanHealthScore } from '../lib/planHealthScore';
import { generatePlanRecommendations } from '../lib/recommendationEngine';
import { PlanHealthScoreCard } from '../components/dashboard/PlanHealthScoreCard';
import { RecommendationsList } from '../components/dashboard/RecommendationsList';
import { WhatChangedPanel } from '../components/dashboard/WhatChangedPanel';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { DonutChart } from '../components/charts/DonutChart';
import { AssetEvolutionChart } from '../components/charts/AssetEvolutionChart';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { PlanManager } from '../components/identity/PlanManager';
import { isComplete } from '../lib/riskQuestionnaire';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { cn } from '../lib/utils';
import { ASSET_COLORS } from '../lib/constants';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';

const workflowTools = [
  { step: '01', path: '/risk', label: 'Risk Profile', desc: 'Assess risk tolerance & capacity', icon: ShieldCheck },
  { step: '02', path: '/master-plan', label: 'Master Plan', desc: 'Configure cashflows & assets', icon: Activity },
  { step: '03', path: '/goal', label: 'Goal Planner', desc: 'Prioritized goal funding & milestones', icon: Target },
  { step: '04', path: '/retirement', label: 'Retirement & SWP', desc: 'Corpus longevity & withdrawal plan', icon: PiggyBank },
  { step: '05', path: '/reverse-planning', label: 'Reverse Planning', desc: 'Target solver (SIP, corpus, age)', icon: Compass },
  { step: '06', path: '/allocation', label: 'Asset Allocation', desc: 'Strategic rebalancing & drift limits', icon: PieChart },
  { step: '07', path: '/advanced-portfolio', label: 'Portfolio Lab', desc: 'Black-Litterman, Risk Parity & TAA', icon: Layers },
  { step: '08', path: '/meeting-workflow', label: 'Client Meeting', desc: '4-stage agenda & audit tracker', icon: Briefcase },
  { step: '09', path: '/decision-history', label: 'Decision Audit', desc: 'Immutable log & 1-click revert', icon: History },
  { step: '10', path: '/reports', label: 'Executive Report', desc: 'Comprehensive plan & print summary', icon: BarChart3 },
  { step: '11', path: '/ips', label: 'IPS Document', desc: 'Investment Policy Statement', icon: FileText },
  { step: '12', path: '/calculators', label: 'Calculators', desc: 'SIP, SWP, lumpsum & retirement tools', icon: TrendingUp },
];

const quickActions = [
  { path: '/reverse-planning', label: 'Reverse Plan', icon: Compass },
  { path: '/allocation', label: 'Allocation', icon: PieChart },
  { path: '/advanced-portfolio', label: 'Portfolio Lab', icon: Layers },
  { path: '/meeting-workflow', label: 'Client Meeting', icon: Briefcase },
  { path: '/decision-history', label: 'Decision Log', icon: History },
  { path: '/reports', label: 'Executive PDF', icon: BarChart3 },
  { path: '/goal', label: 'Goal Planner', icon: Target },
  { path: '/ips', label: 'IPS Document', icon: FileText },
];

export const Dashboard = () => {
  const { inputs, riskProfile, wealthResult, riskAnswers, riskScore, manualTargets } = useCalculator();

  const hasPlanData = wealthResult.netWorth > 0 || wealthResult.annualIncome > 0;
  const nonInrExposure = wealthResult.currencyExposure.filter((c) => c.currency !== 'INR');

  const clientName = inputs.client?.name?.trim() || 'Priya & Rahul Sharma';
  const clientMandate = inputs.client?.notes?.trim() || 'Core Wealth Growth & Capital Preservation';
  const advisorName = inputs.client?.advisor?.trim() || 'Sound Thesis Wealth Advisory · Lead: Anand Mehta, CFA';
  const reviewDate = inputs.client?.reviewDate?.trim() || 'Q3 2026 Mandate Review';

  const allocationData = useMemo(() => {
    return Object.entries(wealthResult.currentAllocation)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value: value * wealthResult.netWorth,
        color: ASSET_COLORS[name as keyof typeof ASSET_COLORS] || '#94a3b8',
      }));
  }, [wealthResult]);

  const essentialSuccess = wealthResult.goalResults
    .filter((g) => g.goal.priority === 'essential')
    .every((g) => g.successRate >= riskProfile.goalSuccessThreshold / 100);

  const chartData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        label: `Age ${s.age}`,
        nominal: s.total,
        real: s.realTotal,
      })),
    [wealthResult.snapshots],
  );

  const assetEvolutionData = useMemo(
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

  const [viewMode, setViewMode] = useState<'adviser' | 'client'>('adviser');

  const planHealth = useMemo(() => {
    return computePlanHealthScore(inputs, wealthResult, riskScore);
  }, [inputs, wealthResult, riskScore]);

  const recommendations = useMemo(() => {
    return generatePlanRecommendations(inputs, wealthResult, planHealth, riskScore);
  }, [inputs, wealthResult, planHealth, riskScore]);

  const checklistItems = [
    {
      label: '1. Risk Profile',
      path: '/risk',
      completed: isComplete(riskAnswers),
      subtext: isComplete(riskAnswers) ? `${riskProfile.label} (${riskScore}/100)` : 'Assessment pending',
    },
    {
      label: '2. Household Assets',
      path: '/master-plan',
      completed: inputs.assets.length > 0,
      subtext: `${inputs.assets.length} holdings · ${formatCurrencyCompact(wealthResult.netWorth)}`,
    },
    {
      label: '3. Cashflows & SIP',
      path: '/master-plan',
      completed: inputs.annualIncome > 0 && wealthResult.monthlySIP > 0,
      subtext: `${formatCurrencyCompact(wealthResult.monthlySIP)}/mo · ${formatPercent(wealthResult.savingsRate)} savings`,
    },
    {
      label: '4. Goal Funding',
      path: '/goal',
      completed: inputs.goals.length > 0,
      subtext: `${inputs.goals.length} goals · ${wealthResult.goalsAtRisk.length === 0 ? 'All on track' : `${wealthResult.goalsAtRisk.length} at risk`}`,
    },
    {
      label: '5. Retirement & SWP',
      path: '/retirement',
      completed: wealthResult.sustainable,
      subtext: wealthResult.sustainable ? 'Sustainable > life exp' : `Depletes at age ${wealthResult.depletionAge}`,
    },
    {
      label: '6. Asset Allocation',
      path: '/allocation',
      completed: manualTargets !== null || isComplete(riskAnswers),
      subtext: manualTargets ? 'Customized weights' : `${riskProfile.label} targets`,
    },
  ];
  const completedChecklistCount = checklistItems.filter((i) => i.completed).length;

  const targetCorpusValue = wealthResult.terminalValue > 0 ? wealthResult.terminalValue : wealthResult.netWorth * 2.5;

  return (
    <div className="space-y-8">
      {/* Top Header & Interactive View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionTitle
          title={viewMode === 'adviser' ? 'Executive Wealth Command Center' : 'Personal Wealth Overview'}
          subtitle={
            viewMode === 'adviser'
              ? 'Multi-asset portfolio analytics, actuarial cashflow models, stress tests, and fiduciary action plans.'
              : 'Holistic wealth trajectory, life milestone funding, and retirement sustainability at a glance.'
          }
          badge={viewMode === 'adviser' ? 'Adviser Portal' : 'Client Presentation Portal'}
        />

        {/* Sleek Pill View Mode Toggle */}
        <div className="inline-flex items-center bg-zinc-200/70 p-1 rounded-xl border border-zinc-300/80 shrink-0 self-start sm:self-center shadow-inner">
          <button
            type="button"
            onClick={() => setViewMode('adviser')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all',
              viewMode === 'adviser'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50',
            )}
          >
            <Briefcase size={13} />
            <span>Adviser Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('client')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all',
              viewMode === 'client'
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50',
            )}
          >
            <Users size={13} />
            <span>Client Mode</span>
          </button>
        </div>
      </div>

      {/* 1. Executive Advisor Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white border border-zinc-800 shadow-lg p-6 sm:p-8">
        {/* Ambient background glow accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            {/* Mandate Badge & Review Date */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800/90 text-emerald-400 border border-zinc-700/80 shadow-2xs backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Mandate: {clientMandate}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-900/80 text-zinc-300 border border-zinc-800">
                <Calendar size={11} className="text-zinc-400" />
                {reviewDate}
              </span>
            </div>

            {/* Client Welcome Heading */}
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-sans font-extrabold tracking-tight text-white">
                Welcome, {clientName}
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-1 flex items-center gap-2">
                <Award size={13} className="text-amber-400" />
                <span>Advisor: <strong className="text-zinc-200">{advisorName}</strong></span>
              </p>
            </div>

            {/* Executive Synthesis Statement */}
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed max-w-2xl pt-1">
              Currently age <span className="text-white font-semibold">{inputs.currentAge}</span>, targeting financial independence at age <span className="text-white font-semibold">{inputs.retirementAge}</span> with a planning horizon through age <span className="text-white font-semibold">{inputs.lifeExpectancy}</span>. The plan carries a{' '}
              <span
                className={cn(
                  'font-bold px-1.5 py-0.5 rounded text-xs inline-block font-mono',
                  wealthResult.monteCarlo.successRate >= 0.8
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : wealthResult.monteCarlo.successRate >= 0.6
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-800',
                )}
              >
                {formatPercent(wealthResult.monteCarlo.successRate * 100)} Confidence
              </span>{' '}
              probability across {wealthResult.monteCarlo.outcomes.length.toLocaleString()} stochastic Monte Carlo simulations.
            </p>
          </div>

          {/* Banner Quick Actions */}
          <div className="flex flex-wrap sm:flex-col lg:flex-row items-center gap-2.5 shrink-0 self-start lg:self-center">
            <Link to="/master-plan">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-zinc-950 hover:bg-zinc-100 font-bold shadow-sm h-9 px-4 rounded-xl transition-all hover:scale-[1.02]"
              >
                <Activity size={15} className="mr-1.5 text-zinc-900" />
                <span>Update Master Plan</span>
              </Button>
            </Link>
            <Link to="/risk">
              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-900/80 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white font-semibold h-9 px-3.5 rounded-xl"
              >
                <ShieldCheck size={15} className="mr-1.5 text-zinc-400" />
                <span>Risk Profile</span>
              </Button>
            </Link>
            <Link to="/reports">
              <Button
                variant="outline"
                size="sm"
                className="bg-zinc-900/80 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white font-semibold h-9 px-3.5 rounded-xl"
              >
                <BarChart3 size={15} className="mr-1.5 text-zinc-400" />
                <span>Executive PDF</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Hero KPI Metric Cards with Glowing Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Net Worth */}
        <div className="group relative overflow-hidden rounded-2xl p-5 bg-white border border-zinc-200/90 shadow-2xs hover:shadow-card hover:border-zinc-300 transition-all duration-200">
          {/* Top glowing accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-90" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Total Net Worth
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-zinc-950 tracking-tight tabular-nums">
            {formatCurrencyCompact(wealthResult.netWorth)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>{inputs.assets.length} active holdings</span>
            <span className="font-mono text-[11px] text-zinc-700 font-semibold">{formatCurrency(wealthResult.netWorth)}</span>
          </div>
        </div>

        {/* KPI 2: Target Corpus */}
        <div className="group relative overflow-hidden rounded-2xl p-5 bg-white border border-zinc-200/90 shadow-2xs hover:shadow-card hover:border-zinc-300 transition-all duration-200">
          {/* Top glowing accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-90" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Target Corpus (Terminal)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Target size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-zinc-950 tracking-tight tabular-nums">
            {formatCurrencyCompact(targetCorpusValue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>Target at Age {inputs.lifeExpectancy}</span>
            <span className="font-semibold text-blue-700">
              {wealthResult.sustainable ? 'Fully Funded' : 'Shortfall Projected'}
            </span>
          </div>
        </div>

        {/* KPI 3: Plan Health Score */}
        <div className="group relative overflow-hidden rounded-2xl p-5 bg-white border border-zinc-200/90 shadow-2xs hover:shadow-card hover:border-zinc-300 transition-all duration-200">
          {/* Top glowing accent bar */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-1 opacity-90',
              planHealth.overallScore >= 85
                ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                : planHealth.overallScore >= 70
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                : 'bg-gradient-to-r from-rose-500 to-red-400',
            )}
          />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Plan Health Score
            </span>
            <div
              className={cn(
                'w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform',
                planHealth.overallScore >= 85
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : planHealth.overallScore >= 70
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700',
              )}
            >
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-zinc-950 tracking-tight tabular-nums flex items-baseline gap-1.5">
            <span>{planHealth.overallScore}</span>
            <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider font-mono">/ 100</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>Status: <strong className="text-zinc-950">{planHealth.status}</strong></span>
            <span
              className={cn(
                'font-bold text-[11px]',
                planHealth.overallScore >= 85
                  ? 'text-emerald-700'
                  : planHealth.overallScore >= 70
                  ? 'text-amber-700'
                  : 'text-rose-700',
              )}
            >
              {planHealth.overallScore >= 85 ? 'Excellent' : planHealth.overallScore >= 70 ? 'Solid' : 'Attention'}
            </span>
          </div>
        </div>

        {/* KPI 4: Monthly SIP Commitment */}
        <div className="group relative overflow-hidden rounded-2xl p-5 bg-white border border-zinc-200/90 shadow-2xs hover:shadow-card hover:border-zinc-300 transition-all duration-200">
          {/* Top glowing accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400 opacity-90" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Monthly SIP Commitment
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PiggyBank size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-extrabold text-zinc-950 tracking-tight tabular-nums">
            {formatCurrencyCompact(wealthResult.monthlySIP || inputs.sip.amount)}/mo
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>Savings rate {formatPercent(wealthResult.savingsRate)}</span>
            <span className="font-semibold text-zinc-700">{inputs.sip.stepUp}% annual step-up</span>
          </div>
        </div>
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-100/80 p-3 rounded-2xl border border-zinc-200 text-xs">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl border border-zinc-200/70 shadow-2xs">
          <TrendingUp size={15} className="text-zinc-600 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Annual Income</span>
            <span className="font-sans font-bold text-zinc-950">{formatCurrencyCompact(wealthResult.annualIncome)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl border border-zinc-200/70 shadow-2xs">
          <ShieldCheck size={15} className="text-zinc-600 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Risk Profile</span>
            <span className="font-sans font-bold text-zinc-950">{riskProfile.label} ({riskScore}/100)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl border border-zinc-200/70 shadow-2xs">
          <Target size={15} className="text-zinc-600 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Monte Carlo Run</span>
            <span
              className={cn(
                'font-sans font-bold',
                wealthResult.monteCarlo.successRate >= 0.8 ? 'text-emerald-700' : 'text-amber-700',
              )}
            >
              {formatPercent(wealthResult.monteCarlo.successRate * 100)} Success
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl border border-zinc-200/70 shadow-2xs">
          <DollarSign size={15} className="text-zinc-600 shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">FX Currency</span>
            <span className="font-sans font-bold text-zinc-950 truncate max-w-[120px] block">
              {nonInrExposure.length > 0 ? nonInrExposure.map((c) => `${c.currency}`).join(', ') : '100% INR'}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {!hasPlanData && (
        <Alert variant="info" icon={Info}>
          No plan data entered yet — add household assets, income, and goals to generate projections.{' '}
          <Link to="/master-plan" className="font-semibold underline hover:text-zinc-950">
            Set up your plan <ArrowRight size={12} className="inline" />
          </Link>
        </Alert>
      )}

      {!wealthResult.sustainable && (
        <Alert variant="danger" icon={AlertTriangle}>
          Your current plan projects a funding shortfall with corpus depletion at age {wealthResult.depletionAge}. Increase monthly SIPs, extend your working horizon, or moderate withdrawal rates.{' '}
          <Link to="/master-plan" className="font-semibold underline">
            Adjust in Master Plan <ArrowRight size={12} className="inline" />
          </Link>
        </Alert>
      )}

      {!essentialSuccess && (
        <Alert variant="warning" icon={AlertTriangle}>
          One or more essential goals have a projected success probability below {formatPercent(riskProfile.goalSuccessThreshold)}.{' '}
          <Link to="/goal" className="font-semibold underline">
            Review in Goal Planner <ArrowRight size={12} className="inline" />
          </Link>
        </Alert>
      )}

      {/* 4. Quick Actions Grid with Clean Styling */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Quick Actions & Advisory Shortcuts
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">1-Click Direct Access</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 hover:shadow-2xs transition-all duration-150 group text-center"
              >
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center mb-1.5 group-hover:bg-zinc-950 group-hover:text-white transition-colors shadow-2xs">
                  <Icon size={16} />
                </div>
                <span className="text-[11px] font-semibold truncate w-full">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Parameter Drift & Audit Monitor */}
      <WhatChangedPanel />

      {/* 2. Modern Plan Health Score Card */}
      <PlanHealthScoreCard health={planHealth} />

      {/* 3. Prioritized Strategic Interventions (Adviser Mode) */}
      {viewMode === 'adviser' && (
        <RecommendationsList recommendations={recommendations} />
      )}

      {/* 6-Stage Planning Readiness Checklist (Adviser Mode) */}
      {viewMode === 'adviser' && (
        <Card className="border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base font-sans font-bold text-zinc-950 flex items-center gap-2">
                <ShieldCheck size={18} className="text-zinc-800" /> Advisor Planning Readiness Checklist
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Track audit status across the 6 foundational pillars of the client mandate</p>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto font-semibold text-zinc-800 border-zinc-300">
              {completedChecklistCount} of 6 Completed
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklistItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all hover:shadow-2xs group ${
                  item.completed
                    ? 'bg-zinc-50/70 border-zinc-200/90 hover:border-zinc-300 hover:bg-white'
                    : 'bg-rose-50/30 border-rose-200/70 hover:border-rose-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {item.completed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-zinc-950 group-hover:text-zinc-700 transition-colors flex items-center justify-between">
                    <span>{item.label}</span>
                    <ArrowRight size={12} className="text-zinc-400 group-hover:text-zinc-700 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className={`text-[11px] truncate mt-0.5 ${item.completed ? 'text-zinc-500' : 'text-rose-700 font-medium'}`}>
                    {item.subtext}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Advisory Suite Strategic Launch Cards (Adviser Mode) */}
      {viewMode === 'adviser' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/reverse-planning"
            className="group relative overflow-hidden p-5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-2xs hover:shadow-card hover:border-zinc-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
                <Compass size={20} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Target Solver
              </span>
            </div>
            <h4 className="text-base font-sans font-bold text-white mb-1 group-hover:text-zinc-100 transition-colors">
              Reverse Planning
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
              Target ₹10Cr at age 55 or solve for required monthly SIP, capital injection, and safe retirement runway.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-zinc-200 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Solve Targets</span>
              <ArrowRight size={13} />
            </div>
          </Link>

          <Link
            to="/allocation"
            className="group relative overflow-hidden p-5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-2xs hover:shadow-card hover:border-zinc-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
                <PieChart size={20} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Rebalancing
              </span>
            </div>
            <h4 className="text-base font-sans font-bold text-white mb-1 group-hover:text-zinc-100 transition-colors">
              Asset Allocation
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
              Strategic asset allocation, drift monitoring, cash surplus waterfall, and transition execution plans.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-zinc-200 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Rebalance Portfolio</span>
              <ArrowRight size={13} />
            </div>
          </Link>

          <Link
            to="/advanced-portfolio"
            className="group relative overflow-hidden p-5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-2xs hover:shadow-card hover:border-zinc-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
                <Layers size={20} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                SAA & TAA Models
              </span>
            </div>
            <h4 className="text-base font-sans font-bold text-white mb-1 group-hover:text-zinc-100 transition-colors">
              Portfolio Lab
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
              Black-Litterman subjective views, Risk Parity equal risk contribution, and valuation & momentum overlays.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-zinc-200 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Explore Models</span>
              <ArrowRight size={13} />
            </div>
          </Link>

          <Link
            to="/meeting-workflow"
            className="group relative overflow-hidden p-5 rounded-2xl bg-zinc-950 text-white border border-zinc-800 shadow-2xs hover:shadow-card hover:border-zinc-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 group-hover:scale-105 transition-transform">
                <Briefcase size={20} />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Advisory Room
              </span>
            </div>
            <h4 className="text-base font-sans font-bold text-white mb-1 group-hover:text-zinc-100 transition-colors">
              Client Meeting
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
              Structured 4-stage client meeting workflow, live agenda tracking, and immutable decision audit trail.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-zinc-200 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Open Meeting Flow</span>
              <ArrowRight size={13} />
            </div>
          </Link>
        </div>
      )}

      {/* 6. Charts Presentation: Clean Cards with Donut, Nominal vs Real, and Asset Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nominal vs Real Wealth Trajectory Chart */}
        <Card variant="elevated" className="lg:col-span-2 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">
                Wealth Trajectory: Accumulation & Distribution
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Nominal growth vs real purchasing power adjusted for inflation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                Age {inputs.currentAge} ➔ {inputs.lifeExpectancy}
              </Badge>
            </div>
          </div>
          <NominalRealChart data={chartData} xKey="label" />
        </Card>

        {/* Donut Chart: Current Allocation */}
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">
                Current Asset Allocation
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Weighted holdings breakdown</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase">
              {allocationData.length} Asset Classes
            </Badge>
          </div>
          {allocationData.length > 0 ? (
            <DonutChart data={allocationData} />
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-center text-sm text-zinc-500 space-y-2">
              <PieChart size={32} className="text-zinc-300" />
              <p>No asset holdings recorded yet.</p>
              <Link to="/master-plan" className="text-zinc-950 font-bold hover:underline flex items-center">
                Add Assets in Master Plan <ArrowRight size={12} className="ml-1" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Asset Evolution & Goal Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Evolution Chart */}
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">
                Asset Evolution Dynamics
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Asset-class balances projected over time</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase">
              Compound Model
            </Badge>
          </div>
          <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
        </Card>

        {/* Goal Health Progress */}
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">
                Life Goals & Milestone Funding
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Probability and dedicated funding progress</p>
            </div>
            <Link
              to="/goal"
              className="text-xs text-zinc-700 hover:text-zinc-950 underline flex items-center font-bold"
            >
              Open Goal Planner <ArrowRight size={12} className="ml-1" />
            </Link>
          </div>

          <div className="space-y-3">
            {wealthResult.goalResults.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 space-y-2">
                <Target size={32} className="mx-auto text-zinc-300" />
                <p>No family financial goals mapped yet.</p>
                <Link to="/goal" className="inline-flex items-center text-zinc-950 font-bold hover:underline">
                  Configure Milestones in Goal Planner <ArrowRight size={12} className="ml-1" />
                </Link>
              </div>
            ) : (
              wealthResult.goalResults.map((g) => (
                <div
                  key={g.goal.id}
                  className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/90 hover:border-zinc-300 transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {g.successRate >= riskProfile.goalSuccessThreshold / 100 ? (
                        <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-rose-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-zinc-950">{g.goal.name}</span>
                      <span className="text-[10px] uppercase font-semibold text-zinc-500 bg-zinc-200/60 px-1.5 py-0.2 rounded">
                        {g.goal.priority}
                      </span>
                    </div>
                    <Badge
                      variant={
                        g.successRate >= riskProfile.goalSuccessThreshold / 100
                          ? 'success'
                          : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6
                          ? 'warning'
                          : 'danger'
                      }
                      className="text-[10px] font-bold"
                    >
                      {formatPercent(g.successRate * 100)} Funded
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-600 pt-1">
                    <span>Target: <strong>{formatCurrency(g.futureValue)}</strong></span>
                    <span className={g.requiredSIP > 0 ? 'font-bold text-zinc-950' : 'text-zinc-500'}>
                      {g.requiredSIP > 0 ? `Required: ${formatCurrency(g.requiredSIP)}/mo` : 'Fully Funded'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Monte Carlo Fan Chart Card (Adviser Mode) */}
      {viewMode === 'adviser' && (
        <Card variant="elevated" className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">
                Monte Carlo Simulation Percentile Cone
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Stochastic outcome fan across 10th, 25th, 50th, 75th, and 90th percentiles
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold uppercase">
              {wealthResult.monteCarlo.outcomes.length.toLocaleString()} Scenarios Evaluated
            </Badge>
          </div>
          <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
        </Card>
      )}

      {/* 5. Refined Workflow Tools Grid with Step Badges & Hover Lift Effects */}
      <Card variant="elevated" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">
              Institutional Advisory Workflow Suite
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Comprehensive end-to-end advisory engine from behavioral risk profiling to investment policy statements
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-semibold font-mono">12 Modules Integrated</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {workflowTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.path}
                to={tool.path}
                className={cn(
                  'relative group p-4 rounded-2xl transition-all duration-200 flex flex-col justify-between',
                  'bg-zinc-50/70 border border-zinc-200/90 hover:bg-white hover:border-zinc-300',
                  'hover:-translate-y-1 hover:shadow-card',
                )}
              >
                {/* Step Badge & Icon */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200/90 flex items-center justify-center shadow-2xs group-hover:border-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-all">
                    <Icon size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-200/60 px-2 py-0.5 rounded-md">
                    Step {tool.step}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="text-sm font-bold text-zinc-950 group-hover:text-zinc-800 transition-colors">
                    {tool.label}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {tool.desc}
                  </div>
                </div>

                {/* Bottom link chevron */}
                <div className="mt-3 pt-2 border-t border-zinc-200/50 flex items-center justify-between text-[11px] font-semibold text-zinc-600 group-hover:text-zinc-950">
                  <span>Launch Tool</span>
                  <ArrowRight size={13} className="text-zinc-400 group-hover:text-zinc-950 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Plan Manager Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PlanManager />
        </div>
      </div>

      <WorkflowFooter
        next={{ path: '/risk', label: 'Risk Profile' }}
        flowHint="Assess behavioral risk tolerance to calibrate asset allocation targets and portfolio limits."
      />
    </div>
  );
};
