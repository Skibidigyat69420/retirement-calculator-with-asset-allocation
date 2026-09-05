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
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { computePlanHealthScore } from '../lib/planHealthScore';
import { generatePlanRecommendations } from '../lib/recommendationEngine';
import { PlanHealthScoreCard } from '../components/dashboard/PlanHealthScoreCard';
import { RecommendationsList } from '../components/dashboard/RecommendationsList';
import { WhatChangedPanel } from '../components/dashboard/WhatChangedPanel';
import { MetricCard } from '../components/ui/MetricCard';
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

const tools = [
  { path: '/risk', label: 'Risk Profile', desc: 'Assess risk tolerance', icon: ShieldCheck },
  { path: '/master-plan', label: 'Master Plan', desc: 'Configure cashflows & assets', icon: Activity },
  { path: '/goal', label: 'Goal Planner', desc: 'Prioritized goal funding', icon: Target },
  { path: '/retirement', label: 'Retirement & SWP', desc: 'Corpus longevity & withdrawal plan', icon: PiggyBank },
  { path: '/reverse-planning', label: 'Reverse Planning', desc: 'Target solver (SIP, corpus, age)', icon: Compass },
  { path: '/allocation', label: 'Asset Allocation', desc: 'Rebalance portfolio & targets', icon: PieChart },
  { path: '/advanced-portfolio', label: 'Portfolio Lab', desc: 'Black-Litterman, Risk Parity, TAA', icon: Layers },
  { path: '/meeting-workflow', label: 'Client Meeting', desc: '4-stage agenda & audit tracker', icon: Briefcase },
  { path: '/decision-history', label: 'Decision Audit', desc: 'Immutable log & 1-click revert', icon: History },
  { path: '/reports', label: 'Executive Report', desc: 'Comprehensive plan & print', icon: BarChart3 },
  { path: '/ips', label: 'IPS Document', desc: 'Investment Policy Statement', icon: FileText },
  { path: '/calculators', label: 'Calculators', desc: 'SIP, SWP, lumpsum & retirement tools', icon: TrendingUp },
];

const quickActions = [
  { path: '/reverse-planning', label: 'Reverse Plan', icon: Compass },
  { path: '/allocation', label: 'Allocation', icon: PieChart },
  { path: '/advanced-portfolio', label: 'Portfolio Lab', icon: Layers },
  { path: '/meeting-workflow', label: 'Client Meeting', icon: Briefcase },
  { path: '/decision-history', label: 'Decision Log', icon: History },
  { path: '/reports', label: 'Executive PDF', icon: BarChart3 },
];

export const Dashboard = () => {
  const { inputs, riskProfile, wealthResult, riskAnswers, riskScore, manualTargets } = useCalculator();

  const hasPlanData = wealthResult.netWorth > 0 || wealthResult.annualIncome > 0;
  const nonInrExposure = wealthResult.currencyExposure.filter((c) => c.currency !== 'INR');

  const clientName = inputs.client?.name?.trim() || 'Private Client';
  const clientMandate = inputs.client?.notes?.trim() || 'Core Wealth Growth';
  const advisorName = inputs.client?.advisor?.trim() || 'Sound Thesis Wealth Advisory';
  const reviewDate = inputs.client?.reviewDate?.trim() || 'Quarterly';

  const allocationData = useMemo(() => {
    return Object.entries(wealthResult.currentAllocation)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: value * wealthResult.netWorth, color: ASSET_COLORS[name as keyof typeof ASSET_COLORS] || '#94a3b8' }));
  }, [wealthResult]);

  const essentialSuccess = wealthResult.goalResults.filter((g) => g.goal.priority === 'essential').every(
    (g) => g.successRate >= riskProfile.goalSuccessThreshold / 100,
  );

  const chartData = useMemo(
    () =>
      wealthResult.snapshots
        .map((s) => ({ label: `Age ${s.age}`, nominal: s.total, real: s.realTotal })),
    [wealthResult.snapshots],
  );

  const assetEvolutionData = useMemo(
    () =>
      wealthResult.snapshots
        .map((s) => ({
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionTitle
          title={viewMode === 'adviser' ? 'Adviser Command Center' : 'Client Wealth Summary'}
          subtitle={
            viewMode === 'adviser'
              ? 'Portfolio analytics, capital forecasting, stress tests, and action plans.'
              : 'Wealth trajectory, retirement funding, and goal status at a glance.'
          }
          badge={viewMode === 'adviser' ? 'Adviser Portal' : 'Client Portal'}
        />

        {/* Global View Toggle */}
        <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setViewMode('adviser')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'adviser'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Adviser View
          </button>
          <button
            onClick={() => setViewMode('client')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'client'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Client View
          </button>
        </div>
      </div>

      {/* Real-Time Portfolio Dynamics Bar */}
      <WhatChangedPanel />

      {/* Plan Health Score Card */}
      <PlanHealthScoreCard health={planHealth} />

      {/* Central Prioritized Action Engine */}
      {viewMode === 'adviser' && (
        <RecommendationsList recommendations={recommendations} />
      )}

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

      {/* Client Overview Card */}
      <Card variant="navy" className="relative overflow-hidden bg-zinc-950 border border-zinc-900 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700 mb-3">
              Mandate: {clientMandate}
            </div>
            <h3 className="text-2xl md:text-3xl font-sans font-bold text-white tracking-tight">
              Welcome, {clientName}
            </h3>
            <p className="mt-1 text-xs text-zinc-400 font-medium">
              Advisor: {advisorName} · Review Date: {reviewDate}
            </p>
            <p className="mt-2 text-zinc-300 max-w-xl text-sm leading-relaxed">
              You are {inputs.currentAge} years old targeting retirement at age {inputs.retirementAge}. Your plan has a{' '}
              <span
                className={cn(
                  'font-bold',
                  wealthResult.monteCarlo.successRate >= 0.8
                    ? 'text-emerald-400'
                    : wealthResult.monteCarlo.successRate >= 0.6
                      ? 'text-zinc-300'
                      : 'text-rose-400',
                )}
              >
                {formatPercent(wealthResult.monteCarlo.successRate * 100)}
              </span>{' '}
              probability of meeting all funding goals and sustaining planned withdrawals.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/master-plan">
              <Button variant="secondary" className="bg-white text-zinc-950 hover:bg-zinc-100 font-semibold shadow-xs">
                <Activity size={15} className="mr-2" /> Update Plan
              </Button>
            </Link>
            <Link to="/risk">
              <Button variant="outline" className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-900 hover:text-white">
                Risk Profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 6-Stage Planning Readiness Checklist */}
      <Card className="border border-zinc-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-sans font-bold text-zinc-950 flex items-center gap-2">
              <ShieldCheck size={18} className="text-zinc-700" /> Advisor Planning Checklist
            </h3>
            <p className="text-xs text-zinc-500">Track progress across all 6 core pillars of the advisory plan</p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto font-semibold text-zinc-700 border-zinc-300">
            {completedChecklistCount} of 6 Completed
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {checklistItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all hover:shadow-2xs group ${
                item.completed
                  ? 'bg-zinc-50/70 border-zinc-200 hover:border-zinc-300 hover:bg-white'
                  : 'bg-rose-50/30 border-rose-200/70 hover:border-rose-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {item.completed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
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

      {/* Advisory Suite Quick Launch */}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Net Worth"
          value={formatCurrencyCompact(wealthResult.netWorth)}
          subtext={`Total assets: ${formatCurrency(wealthResult.netWorth)}`}
          variant="navy"
          icon={<Wallet size={18} />}
        />
        <MetricCard
          label="Annual Income"
          value={formatCurrencyCompact(wealthResult.annualIncome)}
          subtext={`Savings ${formatPercent(wealthResult.savingsRate)}`}
          variant="default"
          icon={<TrendingUp size={18} />}
        />
        <Link to="/risk" className="block">
          <MetricCard
            label="Risk Profile"
            value={riskProfile.label}
            subtext={`Max drawdown ${formatPercent(riskProfile.maxDrawdown)}`}
            icon={<ShieldCheck size={20} />}
          />
        </Link>
        <MetricCard
          label="Terminal Corpus"
          value={formatCurrencyCompact(wealthResult.terminalValue)}
          subtext={`At age ${inputs.lifeExpectancy}`}
          icon={<BarChart3 size={20} />}
        />
        <MetricCard
          label="Plan Probability"
          value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
          subtext="All goals + SWP"
          variant={
            wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold
              ? 'success'
              : wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold * 0.6
                ? 'default'
                : 'danger'
          }
          icon={<Target size={20} />}
        />
        <MetricCard
          label="Currency Exposure"
          value={nonInrExposure.length > 0
            ? nonInrExposure.map((c) => `${c.currency} ${formatPercent(c.percentage)}`).join(' · ')
            : '100% INR'}
          subtext={wealthResult.currencyExposure.map((c) => `${c.currency} ${formatPercent(c.percentage)}`).join(' · ')}
          icon={<DollarSign size={20} />}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zinc-200/90 rounded-xl text-xs font-semibold text-zinc-800 hover:border-zinc-400 hover:text-zinc-950 hover:shadow-2xs transition-all"
            >
              <Icon size={16} className="text-zinc-600" /> {action.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="elevated" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">Wealth Trajectory</h3>
            <Badge variant="outline">Accumulation & Distribution</Badge>
          </div>
          <NominalRealChart data={chartData} xKey="label" />
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">Current Allocation</h3>
            <Badge variant="outline">Current Holdings</Badge>
          </div>
          {allocationData.length > 0 ? (
            <DonutChart data={allocationData} />
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-center text-sm text-zinc-600">
              <p>No assets added yet.</p>
              <Link to="/master-plan" className="mt-2 text-zinc-950 font-semibold hover:underline flex items-center">
                Add assets <ArrowRight size={12} className="ml-1" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">Asset-Class Projections</h3>
            <Badge variant="outline">Expected Return</Badge>
          </div>
          <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">Goal Health</h3>
            <Link to="/goal" className="text-xs text-zinc-600 hover:text-zinc-950 underline flex items-center font-semibold">
              Open planner <ArrowRight size={12} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {wealthResult.goalResults.length === 0 && (
              <div className="p-6 text-center text-sm text-zinc-600">
                <p>No goals defined yet.</p>
                <Link to="/goal" className="mt-2 inline-flex items-center text-zinc-950 font-semibold hover:underline">
                  Create a goal <ArrowRight size={12} className="ml-1" />
                </Link>
              </div>
            )}
            {wealthResult.goalResults.map((g) => (
              <div key={g.goal.id} className="p-3 bg-zinc-50/70 rounded-xl border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {g.successRate >= riskProfile.goalSuccessThreshold / 100 ? (
                      <CheckCircle2 size={16} className="text-emerald-700 mr-2 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-rose-600 mr-2 shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-zinc-950">{g.goal.name}</span>
                  </div>
                  <Badge
                    variant={
                      g.successRate >= riskProfile.goalSuccessThreshold / 100
                        ? 'success'
                        : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {formatPercent(g.successRate * 100)}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                  <span>Target: {formatCurrency(g.futureValue)}</span>
                  <span className={g.requiredSIP > 0 ? 'font-semibold text-zinc-900' : ''}>
                    Required SIP: {formatCurrency(g.requiredSIP)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card variant="elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight">Monte Carlo Fan Chart</h3>
          <Badge variant="outline">{wealthResult.monteCarlo.outcomes.length.toLocaleString()} simulations</Badge>
        </div>
        <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
      </Card>

      <Card variant="elevated">
        <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-950 tracking-tight mb-4">Platform Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.path}
                to={tool.path}
                className={cn(
                  'flex items-center p-4 rounded-xl transition-all group',
                  'bg-zinc-50/60 border border-zinc-200/80 hover:bg-white hover:border-zinc-300 hover:shadow-2xs',
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mr-3 group-hover:border-zinc-400 shadow-2xs">
                  <Icon size={18} className="text-zinc-700 group-hover:text-zinc-950 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-950 truncate">{tool.label}</div>
                  <div className="text-xs text-zinc-500 truncate">{tool.desc}</div>
                </div>
                <ArrowRight size={14} className="text-zinc-400 group-hover:text-zinc-700 shrink-0 ml-2" />
              </Link>
            );
          })}
        </div>
      </Card>

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

