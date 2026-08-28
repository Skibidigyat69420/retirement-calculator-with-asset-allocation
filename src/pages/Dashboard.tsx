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
} from 'lucide-react';
import { useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
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
  { path: '/angel-connect', label: 'Angel Connect', icon: ShieldCheck, desc: 'Optional live broker sync & refresh.' },
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

  const chartData = wealthResult.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({ label: `Y${s.year}`, nominal: s.total, real: s.realTotal }));

  const assetEvolutionData = wealthResult.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Age ${s.age}`,
      equity: s.values.equity,
      debt: s.values.debt,
      gold: s.values.gold,
      realestate: s.values.realestate,
      liquid: s.values.liquid,
      other: s.values.other,
    }));

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard label="Net Worth" value={formatCurrency(wealthResult.netWorth)} subtext="Current assets" variant="navy" />
        <MetricCard label="Annual Income" value={formatCurrency(wealthResult.annualIncome)} subtext={`Savings rate ${formatPercent(wealthResult.savingsRate)}`} variant="gold" />
        <Link to="/risk" className="block">
          <MetricCard label="Risk Profile" value={riskProfile.label} subtext={`Max drawdown ${formatPercent(riskProfile.maxDrawdown)}`} />
        </Link>
        <MetricCard label="Terminal Corpus" value={formatCurrency(wealthResult.terminalValue)} subtext={`At age ${inputs.retirementAge}`} />
        <MetricCard
          label="Plan Probability"
          value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
          subtext="Of meeting all goals + SWP"
          variant={
            wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold
              ? 'success'
              : wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold * 0.6
                ? 'default'
                : 'danger'
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-medium text-navy hover:border-gold hover:text-gold transition-colors"
            >
              <Icon size={16} /> {action.label}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif text-navy">Accumulation Trajectory</h3>
            <Badge variant="navy">Nominal vs Real</Badge>
          </div>
          <NominalRealChart data={chartData} xKey="label" />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy">Current Allocation</h3>
            <Badge variant="outline">Today</Badge>
          </div>
          <DonutChart data={allocationData} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif text-navy">Asset-Class Projections</h3>
            <Badge variant="gold">Mean Path</Badge>
          </div>
          <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy">Goal Health</h3>
            <Link to="/goal" className="text-xs text-gold hover:underline flex items-center">
              Open planner <ArrowRight size={12} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {wealthResult.goalResults.map((g) => (
              <div key={g.goal.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {g.successRate >= riskProfile.goalSuccessThreshold / 100 ? (
                      <CheckCircle2 size={16} className="text-green-600 mr-2" />
                    ) : (
                      <XCircle size={16} className="text-red-500 mr-2" />
                    )}
                    <span className="text-sm font-medium text-navy">{g.goal.name}</span>
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

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif text-navy">Monte Carlo Fan Chart</h3>
          <Badge variant="gold">{wealthResult.monteCarlo.outcomes.length.toLocaleString()} paths</Badge>
        </div>
        <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
      </Card>

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4">Platform Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.path}
                to={tool.path}
                className={cn(
                  'flex items-center p-3 rounded-xl transition-colors group',
                  'hover:bg-stone-50 border border-transparent hover:border-stone-200',
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center mr-3 group-hover:bg-gold/10">
                  <Icon size={16} className="text-navy group-hover:text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy truncate">{tool.label}</div>
                  <div className="text-xs text-stone-500 truncate">{tool.desc}</div>
                </div>
                <ArrowRight size={14} className="text-stone-300 group-hover:text-gold shrink-0" />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
