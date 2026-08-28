import { Link } from 'react-router-dom';
import {
  Activity,
  PieChart,
  TrendingUp,
  Wallet,
  Target,
  Calculator,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  Database,
  Radio,
  BrainCircuit,
  Scissors,
  RefreshCcw,
  Grid3X3,
  AlertTriangle,
  TrendingDown,
  Zap,
  CheckCircle2,
  XCircle,
  BarChart3,
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
import { simulateAllGoals } from '../lib/goals';
import { projectAssetAllocation } from '../lib/projections';

const tools = [
  { path: '/master-plan', label: 'Master Plan', icon: Activity, desc: 'Unified profile, assets, cashflows, goals & results.' },
  { path: '/goal', label: 'Goal Planner', icon: Target, desc: 'Probability-weighted goals, PV needed & required SIP.' },
  { path: '/allocation', label: 'Asset Allocation', icon: PieChart, desc: 'Current vs target, projections & MVO target.' },
  { path: '/mvo', label: 'MVO Optimizer', icon: BarChart2, desc: 'Mean-variance frontier with live Angel One data.' },
  { path: '/advanced-allocation', label: 'Advanced Allocation', icon: BrainCircuit, desc: 'Black-Litterman, risk parity & glide path.' },
  { path: '/portfolio-analytics', label: 'Portfolio Analytics', icon: BarChart3, desc: 'Risk metrics, attribution & stress tests.' },
  { path: '/trade-analytics', label: 'Trade Analytics', icon: Zap, desc: 'Implementation shortfall & market impact.' },
  { path: '/sequence-risk', label: 'Sequence Risk', icon: TrendingDown, desc: 'Early-retirement return shock analysis.' },
  { path: '/swr', label: 'SWR Matrix', icon: Grid3X3, desc: 'Safe withdrawal rate probability grid.' },
  { path: '/rebalancing', label: 'Rebalancing', icon: RefreshCcw, desc: 'Drift-band rebalancing optimizer.' },
  { path: '/tax-loss-harvesting', label: 'Tax Loss Harvest', icon: Scissors, desc: 'Harvest losses and estimate tax alpha.' },
  { path: '/sip', label: 'SIP Engine', icon: TrendingUp, desc: 'Project monthly SIPs with annual step-ups.' },
  { path: '/stp', label: 'STP Deployment', icon: Wallet, desc: 'Deploy lumpsum via liquid-fund staging.' },
  { path: '/swp', label: 'SWP Engine', icon: Wallet, desc: 'Inflation-indexed withdrawal longevity.' },
  { path: '/retirement', label: 'Retirement Readiness', icon: Calculator, desc: 'FIRE-style readiness check.' },
  { path: '/angel-connect', label: 'Angel One SmartAPI', icon: ShieldCheck, desc: 'Live broker sync, TOTP & holdings.' },
  { path: '/live-market', label: 'Live Market', icon: Radio, desc: 'Real-time streaming quotes and watchlists.' },
  { path: '/market-data', label: 'Market Data', icon: Database, desc: 'Explore and download price history.' },
];

const quickActions = [
  { path: '/master-plan', label: 'Update Plan', icon: Activity },
  { path: '/goal', label: 'Check Goals', icon: Target },
  { path: '/allocation', label: 'Rebalance', icon: PieChart },
  { path: '/mvo', label: 'Run MVO', icon: BarChart2 },
  { path: '/trade-analytics', label: 'Trade IS', icon: Zap },
];

export const Dashboard = () => {
  const { result, inputs, assumptions } = useCalculator();

  const netWorth = useMemo(() => inputs.assets.reduce((sum, a) => sum + a.value, 0), [inputs.assets]);
  const annualSavings = inputs.sip.amount * 12 + (inputs.stp.active ? inputs.stp.monthlyTransfer * 12 : 0);
  const savingsRate = inputs.annualIncome > 0 ? (annualSavings / inputs.annualIncome) * 100 : 0;

  const allocationData = useMemo(() => {
    const byCat: Record<string, number> = {};
    inputs.assets.forEach((a) => {
      byCat[a.category] = (byCat[a.category] || 0) + a.value;
    });
    return Object.entries(byCat)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: ASSET_COLORS[name as keyof typeof ASSET_COLORS] || '#94a3b8' }));
  }, [inputs.assets]);

  const goalResults = useMemo(() => {
    const weights = { equity: inputs.sip.equitySplit / 100, debt: inputs.sip.debtSplit / 100, gold: 0, realestate: 0, liquid: 0, other: 0 };
    return simulateAllGoals(inputs.goals, assumptions, netWorth, inputs.sip.amount, weights);
  }, [inputs.goals, assumptions, netWorth, inputs.sip.amount, inputs.sip.equitySplit, inputs.sip.debtSplit]);

  const projection = useMemo(() => {
    try {
      return projectAssetAllocation(inputs, assumptions, undefined, 800);
    } catch {
      return null;
    }
  }, [inputs, assumptions]);

  const essentialSuccess = useMemo(
    () => goalResults.filter((g) => g.goal.priority === 'essential').every((g) => g.successRate >= 0.7),
    [goalResults],
  );

  const chartData = result.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Y${s.year}`,
      nominal: s.nominal,
      real: s.real,
    }));

  const assetEvolutionData = result.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Age ${s.age}`,
      equity: s.equity,
      debt: s.debt,
      gold: s.gold,
      realestate: s.realEstate,
      liquid: s.liquid,
      other: s.other,
    }));

  const currentEquity = inputs.assets.filter((a) => a.category === 'equity').reduce((sum, a) => sum + a.value, 0);
  const equityDrift = netWorth > 0 ? (currentEquity / netWorth) * 100 - 55 : 0;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Executive Dashboard"
        subtitle="Comprehensive individual wealth planner — goals, allocation, projections, and execution quality in one command center."
        badge="Wealth OS v2"
      />

      {!result.sustainable && (
        <Alert variant="danger" icon={AlertTriangle}>
          Your current plan is not sustainable — corpus is projected to deplete at age {result.depletionAge}. Increase SIPs, extend retirement age, or reduce withdrawal needs.
        </Alert>
      )}

      {!essentialSuccess && (
        <Alert variant="warning" icon={AlertTriangle}>
          One or more essential goals have a success probability below 70%. Visit the Goal Planner to review required SIPs.
        </Alert>
      )}

      {Math.abs(equityDrift) > 10 && (
        <Alert variant="warning" icon={AlertTriangle}>
          Equity allocation is {equityDrift > 0 ? 'overweight' : 'underweight'} by {formatPercent(Math.abs(equityDrift))}. Review allocation or run the rebalancing optimizer.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Net Worth" value={formatCurrency(netWorth)} subtext="Current assets" variant="navy" />
        <MetricCard label="Annual Income" value={formatCurrency(inputs.annualIncome)} subtext={`Savings rate ${formatPercent(savingsRate)}`} variant="gold" />
        <MetricCard
          label="Terminal Corpus"
          value={formatCurrency(result.terminalCorpusNominal)}
          subtext={`At age ${inputs.retirementAge}`}
        />
        <MetricCard
          label="Plan Probability"
          value={projection ? formatPercent(projection.probabilityOfSuccess) : '—'}
          subtext="Of meeting all goals + SWP"
          variant={projection && projection.probabilityOfSuccess >= 70 ? 'success' : projection && projection.probabilityOfSuccess >= 40 ? 'default' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
          <div className="mt-4 space-y-2">
            {allocationData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center text-stone-600">
                  <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-medium text-navy">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
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
            {goalResults.map((g) => (
              <div key={g.goal.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {g.successRate >= 0.7 ? <CheckCircle2 size={16} className="text-green-600 mr-2" /> : <XCircle size={16} className="text-red-500 mr-2" />}
                    <span className="text-sm font-medium text-navy">{g.goal.name}</span>
                  </div>
                  <Badge variant={g.successRate >= 0.7 ? 'success' : g.successRate >= 0.4 ? 'default' : 'danger'}>{formatPercent(g.successRate * 100)}</Badge>
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
