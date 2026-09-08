import {
  Activity,
  PieChart,
  Target,
  TrendingUp,
  BarChart3,
  FileText,
  PiggyBank,
  Printer,
  Layers,
  History,
  Users,
  CheckSquare,
  Settings,
  FolderOpen,
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
  // OVERVIEW
  {
    path: '/',
    label: 'Dashboard',
    icon: Activity,
    section: 'Overview',
    description: 'Executive overview & practice health',
  },

  // CLIENTS
  {
    path: '/clients',
    label: 'All Clients',
    icon: Users,
    section: 'Clients',
    description: 'Manage clients and practices',
  },
  {
    path: '/reviews',
    label: 'Reviews',
    icon: History,
    section: 'Clients',
    description: 'Upcoming client reviews',
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: CheckSquare,
    section: 'Clients',
    description: 'Practice task queue',
  },

  // PLANNING
  {
    path: '/master-plan',
    label: 'Plans',
    icon: FolderOpen,
    section: 'Planning',
    description: 'Wealth plans & balance sheets',
  },
  {
    path: '/goal',
    label: 'Scenario Lab',
    icon: Target,
    section: 'Planning',
    description: 'Goal scenarios and conflicts',
  },
  {
    path: '/retirement',
    label: 'Retirement',
    icon: PiggyBank,
    section: 'Planning',
    description: 'Corpus longevity & SWP',
  },

  // PORTFOLIO
  {
    path: '/allocation',
    label: 'Allocation',
    icon: PieChart,
    section: 'Portfolio',
    description: 'Asset allocation & rebalancing',
  },
  {
    path: '/advanced-portfolio',
    label: 'Optimization',
    icon: Layers,
    section: 'Portfolio',
    description: 'Advanced portfolio analytics',
  },
  {
    path: '/stress-tests',
    label: 'Stress Tests',
    icon: TrendingUp,
    section: 'Portfolio',
    description: 'Market stress & drift limits',
  },

  // DELIVER
  {
    path: '/reports',
    label: 'Reports',
    icon: BarChart3,
    section: 'Deliver',
    description: 'Client executive reports',
  },
  {
    path: '/ips',
    label: 'IPS',
    icon: FileText,
    section: 'Deliver',
    description: 'Investment Policy Statement',
  },
  {
    path: '/dossier',
    label: 'Dossiers',
    icon: Printer,
    section: 'Deliver',
    description: 'Printable dossiers',
  },

  // PRACTICE
  {
    path: '/team',
    label: 'Team',
    icon: Users,
    section: 'Practice',
    description: 'Manage practitioners',
  },
  {
    path: '/activity',
    label: 'Activity',
    icon: Activity,
    section: 'Practice',
    description: 'Audit log & practice history',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    section: 'Practice',
    description: 'Organization settings',
  },
];

/* Short micro-label names for sidebar section headers */
export const SECTION_LABELS: Record<string, string> = {
  'Overview': 'OVERVIEW',
  'Clients': 'CLIENTS',
  'Planning': 'PLANNING',
  'Portfolio': 'PORTFOLIO',
  'Deliver': 'DELIVER',
  'Practice': 'PRACTICE',
};

export const utilityItem: NavItem = {
  path: '/settings',
  label: 'Practice Settings',
  icon: Settings,
  section: 'Practice',
  description: 'Manage organization',
};
