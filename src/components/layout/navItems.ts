import {
  Activity,
  Shield,
  PieChart,
  Target,
  Calculator,
  TrendingUp,
  FileText,
  PiggyBank,
  Printer,
  Compass,
  Briefcase,
  History,
  Users,
  UserRound,
  ClipboardList,
  Layers3,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
  description?: string;
}

export interface ChapterNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
  paths: string[];
}

export const SECTION_ORDER = ['Households', 'Plan', 'Policy', 'Dossier', 'Review', 'Tools & practice'] as const;

export const navItems: NavItem[] = [
  {
    path: '/',
    label: 'IPS desk',
    icon: FileText,
    section: 'Policy',
    description: 'Mandate, relationship CRM and policy issuance',
  },
  {
    path: '/clients',
    label: 'All households',
    icon: Users,
    section: 'Households',
    description: 'Client relationships, pipeline and active households',
  },
  {
    path: '/overview',
    label: 'Attention queue',
    icon: Activity,
    section: 'Review',
    description: 'Executive overview & plan health check',
  },

  // Plan
  {
    path: '/planning',
    label: 'Strategic allocation',
    icon: Layers3,
    section: 'Policy',
    description: 'Client-specific SAA, investable categories and policy governance',
  },
  {
    path: '/master-plan',
    label: 'Overview',
    icon: ClipboardList,
    section: 'Plan',
    description: 'Guided seven-step planning wizard',
  },
  {
    path: '/client-profile',
    label: 'Profile & household',
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
    label: 'Goals',
    icon: Target,
    section: 'Plan',
    description: 'Goal milestones & conflict matrix',
  },
  {
    path: '/risk',
    label: 'Risk',
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
    label: 'Reverse planning',
    icon: Compass,
    section: 'Plan',
    description: 'Reverse solver for required SIP & feasible age',
  },

  // Portfolio
  {
    path: '/allocation',
    label: 'Current allocation',
    icon: TrendingUp,
    section: 'Policy',
    description: 'Current vs target rebalancing & trade orders',
  },

  // Deliver
  {
    path: '/policy',
    label: 'Policy & IPS',
    icon: FileText,
    section: 'Policy',
    description: 'Choose connected, manual, or standalone IPS creation',
  },
  {
    path: '/dossier',
    label: 'Dossier',
    icon: Printer,
    section: 'Dossier',
    description: 'Client-ready position, recommendations and exports',
  },
  {
    path: '/ips',
    label: 'IPS builder',
    icon: FileText,
    section: 'Policy',
    description: 'Return to the guided Investment Policy Statement desk',
  },
  {
    path: '/ips/editor',
    label: 'IPS full editor',
    icon: FileText,
    section: 'Policy',
    description: 'Clause-level policy template and saved drafts',
  },
  {
    path: '/meeting-workflow',
    label: 'Meeting prep',
    icon: Briefcase,
    section: 'Dossier',
    description: 'Stage agenda & advisory meeting log',
  },
  {
    path: '/decision-history',
    label: 'Decision history',
    icon: History,
    section: 'Review',
    description: 'Audit trail of plan modifications & reverts',
  },
  {
    path: '/reports',
    label: 'Reports & history',
    icon: Printer,
    section: 'Dossier',
    description: 'Generate reports and open the PDF dossier deck',
  },

  // Practice
  {
    path: '/practitioner',
    label: 'Client operations',
    icon: Briefcase,
    section: 'Households',
    description: 'Live client records, plans and calculations',
  },
  {
    path: '/team',
    label: 'Practice team',
    icon: Users,
    section: 'Tools & practice',
    description: 'Team members, roles and invitations',
  },

  // Tools
  {
    path: '/calculators',
    label: 'Calculators',
    icon: Calculator,
    section: 'Tools & practice',
    description: 'SIP, SWP, STP, EMI & lumpsum utilities',
  },
  {
    path: '/style-guide',
    label: 'Style guide',
    icon: Layers3,
    section: 'Tools & practice',
    description: 'Internal component and token reference',
  },
  {
    path: '/ui-review',
    label: 'UI review',
    icon: Activity,
    section: 'Tools & practice',
    description: 'Internal workflow and quality review',
  },
];

export const chapterNavItems: ChapterNavItem[] = [
  {
    path: '/clients',
    label: 'Households',
    icon: Users,
    description: 'Relationships, readiness and active households',
    paths: ['/clients', '/practitioner'],
  },
  {
    path: '/master-plan',
    label: 'Plan',
    icon: ClipboardList,
    description: 'Facts, goals, risk and plan feasibility',
    paths: ['/master-plan', '/client-profile', '/balance-sheet', '/goal', '/risk', '/retirement', '/reverse-planning'],
  },
  {
    path: '/policy',
    label: 'Policy',
    icon: Layers3,
    description: 'Allocation, policy, implementation and IPS',
    paths: ['/', '/planning', '/policy', '/allocation', '/ips', '/ips/editor'],
  },
  {
    path: '/dossier',
    label: 'Dossier',
    icon: Printer,
    description: 'Client narrative, reports and meetings',
    paths: ['/dossier', '/reports', '/meeting-workflow'],
  },
  {
    path: '/overview',
    label: 'Review',
    icon: Activity,
    description: 'Practice attention, changes and decision history',
    paths: ['/overview', '/decision-history'],
  },
];

export const toolPaths = ['/calculators', '/team', '/style-guide', '/ui-review'] as const;

/**
 * The rail stays short; this ordered local index preserves every workflow
 * underneath its chapter instead of hiding specialist work in a generic menu.
 */
export const chapterMenuItems: Record<string, string[]> = {
  Households: ['/clients', '/practitioner'],
  Plan: ['/master-plan', '/client-profile', '/balance-sheet', '/goal', '/risk', '/retirement', '/reverse-planning'],
  Policy: ['/policy', '/planning', '/allocation', '/', '/ips/editor'],
  Dossier: ['/dossier', '/reports', '/meeting-workflow'],
  Review: ['/overview', '/decision-history'],
};

export const groupBySection = (items: NavItem[]): [string, NavItem[]][] => {
  const groups = items.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);
  return SECTION_ORDER.filter((s) => groups[s]).map((s) => [s, groups[s]]);
};
