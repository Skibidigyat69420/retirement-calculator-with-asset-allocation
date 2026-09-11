import {
  Activity,
  Shield,
  PieChart,
  Target,
  Calculator,
  TrendingUp,
  BarChart3,
  FileText,
  PiggyBank,
  Printer,
  Compass,
  Layers,
  Briefcase,
  History,
  Zap,
  Database,
  Users,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
  description?: string;
}

export const SECTION_ORDER = ['Workspace', 'Plan', 'Portfolio', 'Deliver', 'Practice', 'Tools & Feed'] as const;

export const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Client desk',
    icon: Users,
    section: 'Workspace',
    description: 'Assigned client database and advisor workspace',
  },
  {
    path: '/overview',
    label: 'Practice overview',
    icon: Activity,
    section: 'Workspace',
    description: 'Executive overview & plan health check',
  },

  // Plan
  {
    path: '/client-profile',
    label: 'Client profile',
    icon: UserRound,
    section: 'Plan',
    description: 'Identity, horizon and planning context',
  },
  {
    path: '/balance-sheet',
    label: 'Balance sheet',
    icon: PieChart,
    section: 'Plan',
    description: 'Assets, liabilities and net worth',
  },
  {
    path: '/goal',
    label: 'Goal Planner',
    icon: Target,
    section: 'Plan',
    description: 'Goal milestones & conflict matrix',
  },
  {
    path: '/risk',
    label: 'Risk Profile',
    icon: Shield,
    section: 'Plan',
    description: 'Psychometric risk score & asset constraints',
  },
  {
    path: '/retirement',
    label: 'Retirement & SWP',
    icon: PiggyBank,
    section: 'Plan',
    description: 'Corpus longevity, Monte Carlo & SWP',
  },
  {
    path: '/reverse-planning',
    label: 'Reverse Planning',
    icon: Compass,
    section: 'Plan',
    description: 'Reverse solver for required SIP & feasible age',
  },

  // Portfolio
  {
    path: '/allocation',
    label: 'Portfolio Allocation',
    icon: TrendingUp,
    section: 'Portfolio',
    description: 'Current vs target rebalancing & trade orders',
  },
  {
    path: '/advanced-portfolio',
    label: 'Portfolio Lab',
    icon: Layers,
    section: 'Portfolio',
    description: 'Black-Litterman, risk parity & glide paths',
  },

  // Deliver
  {
    path: '/reports',
    label: 'Executive Reports',
    icon: BarChart3,
    section: 'Deliver',
    description: 'Comprehensive client executive plan report',
  },
  {
    path: '/ips',
    label: 'Policy Statement (IPS)',
    icon: FileText,
    section: 'Deliver',
    description: 'Investment Policy Statement with live sync toggle',
  },
  {
    path: '/meeting-workflow',
    label: 'Client Meeting',
    icon: Briefcase,
    section: 'Deliver',
    description: 'Stage agenda & advisory meeting log',
  },
  {
    path: '/decision-history',
    label: 'Decision Audit Log',
    icon: History,
    section: 'Deliver',
    description: 'Audit trail of plan modifications & reverts',
  },
  {
    path: '/dossier',
    label: 'Full Dossier (PDF)',
    icon: Printer,
    section: 'Deliver',
    description: 'Printable institutional PDF portfolio dossier',
  },

  // Practice
  {
    path: '/practitioner',
    label: 'Practice Clients (API)',
    icon: Briefcase,
    section: 'Practice',
    description: 'Live backend clients, plans & calculations',
  },

  // Tools & Feed
  {
    path: '/calculators',
    label: 'Calculators',
    icon: Calculator,
    section: 'Tools & Feed',
    description: 'SIP, SWP, STP, EMI & lumpsum utilities',
  },
  {
    path: '/angel-connect',
    label: 'Angel One Connect',
    icon: Zap,
    section: 'Tools & Feed',
    description: 'SmartAPI credentials, TOTP & authentication',
  },
  {
    path: '/angel-data',
    label: 'Angel Market Data',
    icon: Database,
    section: 'Tools & Feed',
    description: 'Live tick feeds & real-time quotes',
  },
];

export const groupBySection = (items: NavItem[]): [string, NavItem[]][] => {
  const groups = items.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);
  return SECTION_ORDER.filter((s) => groups[s]).map((s) => [s, groups[s]]);
};
