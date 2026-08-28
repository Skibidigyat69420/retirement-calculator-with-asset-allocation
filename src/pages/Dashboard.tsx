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
} from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { cn } from '../lib/utils';

const tools = [
  { path: '/angel-connect', label: 'Angel One SmartAPI', icon: ShieldCheck, desc: 'Live broker sync, network IP, auto-TOTP & holdings.' },
  { path: '/master-plan', label: 'Master Plan', icon: Activity, desc: 'Unified accumulation + distribution timeline.' },
  { path: '/scenarios', label: 'Scenario Comparator', icon: BarChart3, desc: 'Compare retain-land vs sell-land strategies.' },
  { path: '/sip', label: 'SIP Engine', icon: TrendingUp, desc: 'Project monthly SIPs with annual step-ups.' },
  { path: '/stp', label: 'STP Deployment', icon: Wallet, desc: 'Deploy lumpsum via liquid-fund staging.' },
  { path: '/swp', label: 'SWP Engine', icon: Wallet, desc: 'Inflation-indexed withdrawal longevity.' },
  { path: '/allocation', label: 'Asset Allocation', icon: PieChart, desc: 'Current vs target allocation & rebalance.' },
  { path: '/goal', label: 'Goal Planner', icon: Target, desc: 'Reverse-calculate required SIP / lumpsum.' },
  { path: '/retirement', label: 'Retirement Readiness', icon: Calculator, desc: 'FIRE-style readiness check.' },
  { path: '/inflation', label: 'Inflation Impact', icon: Percent, desc: 'Purchasing-power erosion over time.' },
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

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Wealth Planning Suite"
        subtitle="A comprehensive set of interconnected calculators for institutional-grade retirement and corpus planning."
        badge="Sound Thesis Capital"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Terminal Corpus (Nominal)"
          value={formatCurrency(result.terminalCorpusNominal)}
          subtext={`At Age ${inputs.retirementAge}`}
          variant="navy"
        />
        <MetricCard
          label="Terminal Corpus (Real)"
          value={formatCurrency(result.terminalCorpusReal)}
          subtext="Inflation-adjusted purchasing power"
          variant="gold"
        />
        <MetricCard
          label="Portfolio CAGR"
          value={formatPercent(result.cagrNominal)}
          subtext={`Real: ${formatPercent(result.cagrReal)}`}
          variant="default"
        />
        <MetricCard
          label="SWP Sustainability"
          value={result.sustainable ? 'Sustainable' : result.depletionAge ? `Until ${result.depletionAge}` : 'N/A'}
          subtext={result.sustainable ? 'Outlasts life expectancy' : 'Corpus depletes early'}
          variant={result.sustainable ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-serif text-navy mb-6">Accumulation Trajectory</h3>
          <NominalRealChart data={chartData} xKey="label" />
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4">Calculator Suite</h3>
          <div className="space-y-2">
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
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center mr-3 group-hover:bg-gold/10">
                    <Icon size={18} className="text-navy group-hover:text-gold" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-navy">{tool.label}</div>
                    <div className="text-xs text-stone-500">{tool.desc}</div>
                  </div>
                  <ArrowRight size={16} className="text-stone-300 group-hover:text-gold" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
