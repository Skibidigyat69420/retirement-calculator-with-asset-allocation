import { Link } from 'react-router-dom';
import {
  Activity,
  PieChart,
  Target,
  Calculator,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  BarChart3,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wallet,
  TrendingUp,
  Sparkles,
  DollarSign,
  Database,
  PiggyBank,
} from 'lucide-react';
import { useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
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
  { path: '/retirement', label: 'Retirement Check', desc: 'Longevity & shortfall solver', icon: Calculator },
  { path: '/allocation', label: 'Asset Allocation', desc: 'Rebalance portfolio & targets', icon: PieChart },
  { path: '/mvo', label: 'MVO Optimizer', desc: 'Mean-Variance Frontier', icon: BarChart2 },
  { path: '/reports', label: 'Executive Report', desc: 'Comprehensive plan & print', icon: BarChart3 },
  { path: '/ips', label: 'IPS Document', desc: 'Investment Policy Statement', icon: FileText },
  { path: '/calculators', label: 'Calculators', desc: 'SIP, SWP, lumpsum & retirement tools', icon: TrendingUp },
  { path: '/angel-data', label: 'Angel Data', desc: 'Live broker snapshot logs', icon: Database },
];

const quickActions = [
  { path: '/risk', label: 'Risk Profile', icon: ShieldCheck },
  { path: '/master-plan', label: 'Update Plan', icon: Activity },
  { path: '/goal', label: 'Check Goals', icon: Target },
  { path: '/retirement', label: 'Retirement', icon: PiggyBank },
  { path: '/allocation', label: 'Rebalance', icon: PieChart },
  { path: '/mvo', label: 'Run MVO', icon: BarChart2 },
  { path: '/reports', label: 'Plan Report', icon: BarChart3 },
  { path: '/ips', label: 'IPS', icon: FileText },
  { path: '/calculators', label: 'Calculators', icon: TrendingUp },
  { path: '/angel-data', label: 'Angel Data', icon: Database },
];

export const Dashboard = () => {
  const { inputs, riskProfile, wealthResult, riskAnswers, riskScore, manualTargets } = useCalculator();

  const hasPlanData = wealthResult.netWorth > 0 || wealthResult.annualIncome > 0;
  const nonInrExposure = wealthResult.currencyExposure.filter((c) => c.currency !== 'INR');

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



  const checklistItems = [
    {
      label: '1. Risk Profile',
      path: '/risk',
      completed: isComplete(riskAnswers),
      subtext: isComplete(riskAnswers) ? `${riskProfile.label} (${riskScore}/100)` : 'Questionnaire pending',
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
      label: '5. Retirement Solvency',
      path: '/retirement',
      completed: wealthResult.sustainable,
      subtext: wealthResult.sustainable ? 'Sustainable > life exp' : `Depletes age ${wealthResult.depletionAge}`,
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
      <SectionTitle
        title="Executive Dashboard"
        subtitle="Your complete wealth plan — risk profile, master plan, allocation, goals, and reports in one place."
        badge="Wealth OS"
      />

      {!hasPlanData && (
        <Alert variant="info" icon={Sparkles}>
          No plan data yet — add your assets, income, and goals to see projections.{' '}
          <Link to="/master-plan" className="font-semibold underline hover:text-navy">
            Set up your plan <ArrowRight size={12} className="inline" />
          </Link>
        </Alert>
      )}

      {!wealthResult.sustainable && (
        <Alert variant="danger" icon={AlertTriangle}>
          Your current plan is not sustainable — corpus is projected to deplete at age {wealthResult.depletionAge}. Increase SIPs, extend retirement age, or reduce withdrawal needs.{' '}
          <Link to="/master-plan" className="font-semibold underline">
            Fix in Master Plan <ArrowRight size={12} className="inline" />
          </Link>
        </Alert>
      )}

      {!essentialSuccess && (
        <Alert variant="warning" icon={AlertTriangle}>
          One or more essential goals have a success probability below {formatPercent(riskProfile.goalSuccessThreshold)}.{' '}
          <Link to="/goal" className="font-semibold underline">
            Review in Goal Planner <ArrowRight size={12} className="inline" />
          </Link>
        </Alert>
      )}

      <Card variant="navy" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <Badge variant="gold" className="mb-3">Mandate: {inputs.client?.notes || 'Core Wealth Growth'}</Badge>
            <h3 className="text-2xl md:text-3xl font-serif text-white">Welcome, {inputs.client?.name || 'Vikram & Ananya Sharma'}</h3>
            <p className="mt-1 text-xs text-white font-medium">
              Advisor: {inputs.client?.advisor || 'Sound Thesis Wealth Advisory'} · Review Date: {inputs.client?.reviewDate || 'Quarterly'}
            </p>
            <p className="mt-2 text-slate-200 max-w-xl text-sm">
              You are {inputs.currentAge} years old targeting retirement at {inputs.retirementAge}. Your plan has a{' '}
              <span className="text-white font-semibold">{formatPercent(wealthResult.monteCarlo.successRate * 100)}</span>{' '}
              probability of meeting all goals and sustaining withdrawals.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/master-plan">
              <Button variant="secondary"><Activity size={16} className="mr-2" /> Update Plan</Button>
            </Link>
            <Link to="/risk">
              <Button variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">Risk Profile</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 6-Stage Planning Readiness Checklist */}
      <Card className="border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-navy flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-500" /> Advisor Planning Checklist
            </h3>
            <p className="text-xs text-slate-700">Track progress through the 6 stages of your institutional financial architecture</p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto font-medium">
            {completedChecklistCount} of 6 Completed
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {checklistItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all hover:shadow-xs group ${
                item.completed
                  ? 'bg-slate-50/50 border-slate-200 hover:border-navy/40'
                  : 'bg-amber-50/30 border-amber-200 hover:border-amber-400'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {item.completed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-navy group-hover:text-amber-500 transition-colors flex items-center justify-between">
                  <span>{item.label}</span>
                  <ArrowRight size={12} className="text-slate-300 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="text-[11px] text-slate-700 truncate mt-0.5">{item.subtext}</div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Net Worth"
          value={formatCurrency(wealthResult.netWorth)}
          subtext="Current assets"
          variant="navy"
          icon={<Wallet size={20} />}
        />
        <MetricCard
          label="Annual Income"
          value={formatCurrency(wealthResult.annualIncome)}
          subtext={`Net savings ${formatPercent(wealthResult.savingsRate)}`}
          variant="gold"
          icon={<TrendingUp size={20} />}
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
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200/80 rounded-xl text-sm font-semibold text-navy hover:border-amber-500 hover:text-amber-500 hover:shadow-sm transition-all"
            >
              <Icon size={16} /> {action.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="elevated" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif text-navy">Wealth Trajectory</h3>
            <Badge variant="navy">Accumulation + Distribution</Badge>
          </div>
          <NominalRealChart data={chartData} xKey="label" />
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy">Current Allocation</h3>
            <Badge variant="outline">Today</Badge>
          </div>
          {allocationData.length > 0 ? (
            <DonutChart data={allocationData} />
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-center text-sm text-slate-700">
              <p>No assets added yet.</p>
              <Link to="/master-plan" className="mt-2 text-amber-500 font-semibold hover:underline flex items-center">
                Add assets <ArrowRight size={12} className="ml-1" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif text-navy">Asset-Class Projections</h3>
            <Badge variant="gold">Mean Path</Badge>
          </div>
          <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy">Goal Health</h3>
            <Link to="/goal" className="text-xs text-navy hover:text-amber-500 underline flex items-center font-semibold">
              Open planner <ArrowRight size={12} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {wealthResult.goalResults.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-700">
                <p>No goals defined yet.</p>
                <Link to="/goal" className="mt-2 inline-flex items-center text-amber-500 font-semibold hover:underline">
                  Create a goal <ArrowRight size={12} className="ml-1" />
                </Link>
              </div>
            )}
            {wealthResult.goalResults.map((g) => (
              <div key={g.goal.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {g.successRate >= riskProfile.goalSuccessThreshold / 100 ? (
                      <CheckCircle2 size={16} className="text-emerald-700 mr-2" />
                    ) : (
                      <XCircle size={16} className="text-rose-500 mr-2" />
                    )}
                    <span className="text-sm font-semibold text-navy">{g.goal.name}</span>
                  </div>
                  <Badge
                    variant={
                      g.successRate >= riskProfile.goalSuccessThreshold / 100
                        ? 'success'
                        : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6
                          ? 'default'
                          : 'danger'
                    }
                  >
                    {formatPercent(g.successRate * 100)}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-700">
                  <span>Future need {formatCurrency(g.futureValue)}</span>
                  <span>Required SIP {formatCurrency(g.requiredSIP)}/mo</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card variant="elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif text-navy">Monte Carlo Fan Chart</h3>
          <Badge variant="gold">{wealthResult.monteCarlo.outcomes.length.toLocaleString()} paths</Badge>
        </div>
        <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
      </Card>

      <Card variant="elevated">
        <h3 className="text-lg font-serif text-navy mb-4">Platform Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.path}
                to={tool.path}
                className={cn(
                  'flex items-center p-4 rounded-xl transition-all group',
                  'bg-slate-50/60 border border-slate-100 hover:bg-white hover:border-amber-500/30 hover:shadow-sm',
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center mr-3 group-hover:border-amber-500/30 shadow-sm">
                  <Icon size={18} className="text-navy group-hover:text-amber-500 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy truncate">{tool.label}</div>
                  <div className="text-xs text-slate-700 truncate">{tool.desc}</div>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-amber-500 shrink-0 ml-2" />
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
        flowHint="Discover your behavioral risk profile to automatically parameterize your portfolio and financial plan."
      />
    </div>
  );
};
