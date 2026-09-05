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
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
  step?: string;
  description?: string;
}

export const navItems: NavItem[] = [
  // Overview
  {
    path: '/',
    label: 'Dashboard',
    icon: Activity,
    section: 'Overview',
    description: 'Executive overview & plan health check',
  },

  // 1. Discover & Inventory
  {
    path: '/master-plan',
    label: 'Client & Balance Sheet',
    icon: PieChart,
    section: '1. Discover',
    step: '01',
    description: 'Profile, assets, cashflows & liabilities',
  },
  {
    path: '/goal',
    label: 'Goal Planner',
    icon: Target,
    section: '1. Discover',
    description: 'Goal milestones & conflict matrix',
  },

  // 2. Risk & Bounds
  {
    path: '/risk',
    label: 'Risk Profile',
    icon: Shield,
    section: '2. Risk Profile',
    step: '02',
    description: 'Psychometric risk score & asset constraints',
  },

  // 3. Retirement & Cashflows
  {
    path: '/retirement',
    label: 'Retirement & SWP',
    icon: PiggyBank,
    section: '3. Retirement',
    step: '03',
    description: 'Corpus longevity, Monte Carlo & SWP',
  },
  {
    path: '/reverse-planning',
    label: 'Reverse Planning',
    icon: Compass,
    section: '3. Retirement',
    description: 'Reverse solver for required SIP & feasible age',
  },

  // 4. Portfolio & Optimization
  {
    path: '/allocation',
    label: 'Portfolio Allocation',
    icon: TrendingUp,
    section: '4. Allocation',
    step: '04',
    description: 'Current vs target rebalancing & trade orders',
  },
  {
    path: '/advanced-portfolio',
    label: 'Portfolio Lab',
    icon: Layers,
    section: '4. Allocation',
    description: 'Black-Litterman, risk parity & glide paths',
  },

  // 5. Deliverables & Governance
  {
    path: '/ips',
    label: 'Policy Statement (IPS)',
    icon: FileText,
    section: '5. Deliverables',
    step: '05',
    description: 'Investment Policy Statement with live sync toggle',
  },
  {
    path: '/meeting-workflow',
    label: 'Client Meeting',
    icon: Briefcase,
    section: '5. Deliverables',
    description: 'Stage agenda & advisory meeting log',
  },
  {
    path: '/decision-history',
    label: 'Decision Audit Log',
    icon: History,
    section: '5. Deliverables',
    description: 'Audit trail of plan modifications & reverts',
  },
  {
    path: '/reports',
    label: 'Executive Reports',
    icon: BarChart3,
    section: '5. Deliverables',
    description: 'Comprehensive client executive plan report',
  },
  {
    path: '/dossier',
    label: 'Full Dossier (PDF)',
    icon: Printer,
    section: '5. Deliverables',
    description: 'Printable institutional PDF portfolio dossier',
  },

  // Market & Tools
  {
    path: '/calculators',
    label: 'Calculators',
    icon: Calculator,
    section: 'Tools & Live Feed',
    description: 'SIP, SWP, STP, EMI & lumpsum utilities',
  },
  {
    path: '/angel-connect',
    label: 'Angel One Connect',
    icon: Zap,
    section: 'Tools & Live Feed',
    description: 'SmartAPI credentials, TOTP & authentication',
  },
  {
    path: '/angel-data',
    label: 'Angel Market Data',
    icon: Database,
    section: 'Tools & Live Feed',
    description: 'Live tick feeds & real-time quotes',
  },
];

export const utilityItem: NavItem = {
  path: '/dossier',
  label: 'Client Dossier (PDF)',
  icon: Printer,
  section: 'Deliverables',
  description: 'Complete exportable plan dossier',
};
