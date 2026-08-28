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
import { formatCurrency, formatPercent } from '../lib/formatters';
import { cn } from '../lib/utils';
import { ASSET_COLORS } from '../lib/constants';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';

const tools = [
  { path: '/risk', label: 'Risk Profile', icon: ShieldCheck, desc: 'Behavioural questionnaire that drives allocation.' },
  { path: '/master-plan', label: 'Master Plan', icon: Activity, desc: 'Unified profile, assets, cashflows, goals & results.' },
  { path: '/goal', label: 'Goals', icon: Target, desc: 'Probability-weighted goals, PV needed & required SIP.' },
  { path: '/retirement', label: 'Retirement', icon: Calculator, desc: 'FIRE-style corpus gap analysis.' },
  { path: '/allocation', label: 'Asset Allocation', icon: PieChart, desc: 'Current vs target, projections & glide path.' },
  { path: '/mvo', label: 'MVO Optimizer', icon: BarChart2, desc: 'Mean-variance frontier from historical data.' },
  { path: '/reports', label: 'Plan Reports', icon: BarChart3, desc: 'Consolidated plan summary, tax & currency.' },
  { path: '/ips', label: 'IPS Template', icon: FileText, desc: 'Generate a CFA-aligned policy statement.' },
];

const quickActions = [
  { path: '/risk', label: 'Risk Profile', icon: ShieldCheck },
  { path: '/master-plan', label: 'Update Plan', icon: Activity },
  { path: '/goal', label: 'Check Goals', icon: Target },
  { path: '/allocation', label: 'Rebalance', icon: PieChart },
  { path: '/mvo', label: 'Run MVO', icon: BarChart2 },
  { path: '/reports', label: 'Plan Report', icon: BarChart3 },
];

export const Dashboard = () => {
  const { inputs, riskProfile, wealthResult } = useCalculator();

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
        .filter((s) => s.phase === 'accumulation')
        .map((s) => ({ label: `Y${s.year}`, nominal: s.total, real: s.realTotal })),
    [wealthResult.snapshots],
  );

  const assetEvolutionData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'accumulation')
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

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Executive Dashboard"
        subtitle="Your complete wealth plan — risk profile, master plan, allocation, goals, and reports in one place."
        badge="Wealth OS"
      />

      {!wealthResult.sustainable && (
        <Alert variant="danger" icon={AlertTriangle}>
          Your current plan is not sustainable — corpus is projected to deplete at age {wealthResult.depletionAge}. Increase SIPs, extend retirement age, or reduce withdrawal needs.
        </Alert>
      )}

      {!essentialSuccess && (
        <Alert variant="warning" icon={AlertTriangle}>
          One or more essential goals have a success probability below {formatPercent(riskProfile.goalSuccessThreshold)}. Visit the Goal Planner to review required SIPs.
        </Alert>
      )}

      <Card variant="navy" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <Badge variant="gold" className="mb-3">Overview</Badge>
            <h3 className="text-2xl md:text-3xl font-serif text-white">Welcome back</h3>
            <p className="mt-2 text-stone-200 max-w-xl">
              You are {inputs.currentAge} years old, targeting retirement at {inputs.retirementAge}. Your plan has a{' '}
              <span className="text-gold font-semibold">{formatPercent(wealthResult.monteCarlo.successRate * 100)}</span>{' '}
              probability of meeting all goals and sustaining withdrawals.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/master-plan">
              <Button variant="secondary"><Activity size={16} className="mr-2" /> Update Plan</Button>
            </Link>
            <Link to="/risk">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">Risk Profile</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          subtext={`Savings rate ${formatPercent(wealthResult.savingsRate)}`}
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
          value={formatCurrency(wealthResult.terminalValue)}
          subtext={`At age ${inputs.retirementAge}`}
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-stone-200/80 rounded-xl text-sm font-semibold text-navy hover:border-gold hover:text-gold hover:shadow-sm transition-all"
            >
              <Icon size={16} /> {action.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="elevated" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif text-navy">Accumulation Trajectory</h3>
            <Badge variant="navy">Nominal vs Real</Badge>
          </div>
          <NominalRealChart data={chartData} xKey="label" />
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy">Current Allocation</h3>
            <Badge variant="outline">Today</Badge>
          </div>
          <DonutChart data={allocationData} />
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
            <Link to="/goal" className="text-xs text-gold hover:underline flex items-center font-semibold">
              Open planner <ArrowRight size={12} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {wealthResult.goalResults.map((g) => (
              <div key={g.goal.id} className="p-3 bg-stone-50/80 rounded-xl border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {g.successRate >= riskProfile.goalSuccessThreshold / 100 ? (
                      <CheckCircle2 size={16} className="text-emerald-600 mr-2" />
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
                <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
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
                  'bg-stone-50/60 border border-stone-100 hover:bg-white hover:border-gold/30 hover:shadow-sm',
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-100 flex items-center justify-center mr-3 group-hover:border-gold/30 shadow-sm">
                  <Icon size={18} className="text-navy group-hover:text-gold transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy truncate">{tool.label}</div>
                  <div className="text-xs text-stone-500 truncate">{tool.desc}</div>
                </div>
                <ArrowRight size={14} className="text-stone-300 group-hover:text-gold shrink-0 ml-2" />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
