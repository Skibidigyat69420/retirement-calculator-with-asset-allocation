import { Link } from 'react-router-dom';
import {
  Activity,
  PieChart,
  BarChart3,
  TrendingUp,
  Wallet,
  Target,
  Calculator,
  Percent,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  Database,
  Radio,
  LineChart,
  BrainCircuit,
  Scissors,
  RefreshCcw,
  Grid3X3,
  AlertTriangle,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Alert } from '../components/ui/Alert';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { cn } from '../lib/utils';

const tools = [
  { path: '/angel-connect', label: 'Angel One SmartAPI', icon: ShieldCheck, desc: 'Live broker sync, network IP, auto-TOTP & holdings.' },
  { path: '/live-market', label: 'Live Market Watch', icon: Radio, desc: 'Real-time streaming quotes and watchlists.' },
  { path: '/master-plan', label: 'Master Plan', icon: Activity, desc: 'Unified accumulation + distribution timeline.' },
  { path: '/scenarios', label: 'Scenario Comparator', icon: BarChart3, desc: 'Compare retain-land vs sell-land strategies.' },
  { path: '/sip', label: 'SIP Engine', icon: TrendingUp, desc: 'Project monthly SIPs with annual step-ups.' },
  { path: '/stp', label: 'STP Deployment', icon: Wallet, desc: 'Deploy lumpsum via liquid-fund staging.' },
  { path: '/swp', label: 'SWP Engine', icon: Wallet, desc: 'Inflation-indexed withdrawal longevity.' },
  { path: '/allocation', label: 'Asset Allocation', icon: PieChart, desc: 'Current vs target allocation & rebalance.' },
  { path: '/mvo', label: 'MVO Optimizer', icon: BarChart2, desc: 'Mean-variance optimization with live data.' },
  { path: '/advanced-allocation', label: 'Advanced Allocation', icon: BrainCircuit, desc: 'Black-Litterman, risk parity & glide path.' },
  { path: '/portfolio-analytics', label: 'Portfolio Analytics', icon: LineChart, desc: 'Risk metrics, attribution & stress tests.' },
  { path: '/trade-analytics', label: 'Trade Analytics', icon: Zap, desc: 'Implementation shortfall & market impact.' },
  { path: '/rebalancing', label: 'Rebalancing', icon: RefreshCcw, desc: 'Drift-band rebalancing optimizer.' },
  { path: '/sequence-risk', label: 'Sequence Risk', icon: TrendingDown, desc: 'Early-retirement return shock analysis.' },
  { path: '/swr', label: 'SWR Matrix', icon: Grid3X3, desc: 'Safe withdrawal rate probability grid.' },
  { path: '/tax-loss-harvesting', label: 'Tax Loss Harvest', icon: Scissors, desc: 'Harvest losses and estimate tax alpha.' },
  { path: '/goal', label: 'Goal Planner', icon: Target, desc: 'Reverse-calculate required SIP / lumpsum.' },
  { path: '/retirement', label: 'Retirement Readiness', icon: Calculator, desc: 'FIRE-style readiness check.' },
  { path: '/inflation', label: 'Inflation Impact', icon: Percent, desc: 'Purchasing-power erosion over time.' },
  { path: '/market-data', label: 'Market Data', icon: Database, desc: 'Explore and download price history.' },
];

const quickActions = [
  { path: '/mvo', label: 'Run MVO', icon: BarChart2 },
  { path: '/portfolio-analytics', label: 'Check Risk', icon: LineChart },
  { path: '/advanced-allocation', label: 'Allocate', icon: BrainCircuit },
  { path: '/trade-analytics', label: 'Trade IS', icon: Zap },
];

export const Dashboard = () => {
  const { result, inputs } = useCalculator();

  const chartData = result.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Y${s.year}`,
      nominal: s.nominal,
      real: s.real,
    }));

  const netWorth = inputs.assets.reduce((sum, a) => sum + a.value, 0);
  const currentEquity = inputs.assets.filter((a) => a.category === 'equity').reduce((sum, a) => sum + a.value, 0);
  const equityDrift = netWorth > 0 ? (currentEquity / netWorth) * 100 - 55 : 0;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Executive Dashboard"
        subtitle="Institutional-grade wealth intelligence: live data, analytics, allocation models, and execution quality in one place."
        badge="Quant Lab Enabled"
      />

      {!result.sustainable && (
        <Alert variant="danger" icon={AlertTriangle}>
          Your current plan is not sustainable — corpus is projected to deplete at age {result.depletionAge}. Increase SIPs, extend retirement age, or reduce withdrawal needs.
        </Alert>
      )}

      {Math.abs(equityDrift) > 10 && (
        <Alert variant="warning" icon={AlertTriangle}>
          Equity allocation is {equityDrift > 0 ? 'overweight' : 'underweight'} by {formatPercent(Math.abs(equityDrift))}. Review allocation or run the rebalancing optimizer.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Net Worth" value={formatCurrency(netWorth)} subtext="Current assets" variant="navy" />
        <MetricCard
          label="Terminal Corpus"
          value={formatCurrency(result.terminalCorpusNominal)}
          subtext={`At age ${inputs.retirementAge}`}
          variant="gold"
        />
        <MetricCard label="Portfolio CAGR" value={formatPercent(result.cagrNominal)} subtext={`Real: ${formatPercent(result.cagrReal)}`} />
        <MetricCard
          label="SWP Sustainability"
          value={result.sustainable ? 'Sustainable' : result.depletionAge ? `Until ${result.depletionAge}` : 'N/A'}
          subtext={result.sustainable ? 'Outlasts life expectancy' : 'Corpus depletes early'}
          variant={result.sustainable ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <h3 className="text-lg font-serif text-navy mb-6">Accumulation Trajectory</h3>
          <NominalRealChart data={chartData} xKey="label" />
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4">Platform Modules</h3>
          <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className={cn(
                    'flex items-center p-2.5 rounded-xl transition-colors group',
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
    </div>
  );
};
