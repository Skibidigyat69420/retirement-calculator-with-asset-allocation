import { Link } from 'react-router-dom';
import {
  Activity,
  PieChart,
  Target,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  FileText,
  TrendingUp,
  PiggyBank,
  Compass,
  Layers,
  Briefcase,
  History,
  type LucideIcon,
} from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';

interface SuiteTool {
  step: string;
  path: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}

const workflowTools: SuiteTool[] = [
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

/**
 * ADVISORY SUITE — the twelve-module workflow as a quiet editorial index.
 * Hairlines carry the structure; step numbers sit in tabular mono.
 */
export const WorkflowSuite = () => (
  <div>
    <SectionHeader
      title="Advisory suite"
      description="Twelve integrated modules from behavioural risk profiling to the investment policy statement."
      hairline
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {workflowTools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link
            key={tool.path}
            to={tool.path}
            className="group relative flex items-start gap-4 py-4 pr-4 border-b border-border-subtle sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0 transition-colors hover:bg-surface -mx-2 px-2 rounded-sm"
          >
            <span className="font-mono text-[11px] text-faint tabular-nums pt-1 w-6 shrink-0" aria-hidden="true">
              {tool.step}
            </span>
            <Icon size={17} strokeWidth={1.6} className="text-muted group-hover:text-accent-strong transition-colors mt-0.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink tracking-tight">
                {tool.label}
                <ArrowRight
                  size={12}
                  strokeWidth={1.6}
                  className="text-faint group-hover:text-ink group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </span>
              <span className="block text-xs text-muted leading-relaxed mt-0.5">{tool.desc}</span>
            </span>
          </Link>
        );
      })}
    </div>
  </div>
);
