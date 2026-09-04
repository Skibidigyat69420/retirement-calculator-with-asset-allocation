import {
  Activity,
  Shield,
  PieChart,
  Target,
  Calculator,
  TrendingUp,
  BarChart2,
  BarChart3,
  FileText,
  ShieldCheck,
  Database,
  PiggyBank,
  Printer,
  Compass,
  Layers,
  Briefcase,
  History,
} from 'lucide-react';

export const navItems = [
  { path: '/', label: 'Dashboard', icon: Activity, section: 'Overview' },
  { path: '/risk', label: 'Risk Profile', icon: Shield, section: '1. Discover' },
  { path: '/master-plan', label: 'Master Plan', icon: PieChart, section: '1. Discover' },
  { path: '/goal', label: 'Goals', icon: Target, section: '2. Diagnose' },
  { path: '/retirement', label: 'Retirement & SWP', icon: PiggyBank, section: '2. Diagnose' },
  { path: '/reverse-planning', label: 'Reverse Planning', icon: Compass, section: '3. Plan' },
  { path: '/allocation', label: 'Allocation', icon: TrendingUp, section: '4. Portfolio' },
  { path: '/mvo', label: 'MVO Frontier', icon: BarChart2, section: '4. Portfolio' },
  { path: '/advanced-portfolio', label: 'Portfolio Lab', icon: Layers, section: '4. Portfolio' },
  { path: '/meeting-workflow', label: 'Client Meeting', icon: Briefcase, section: '5. Implement' },
  { path: '/decision-history', label: 'Decision Audit', icon: History, section: '5. Implement' },
  { path: '/reports', label: 'Reports', icon: BarChart3, section: '6. Deliver' },
  { path: '/ips', label: 'IPS', icon: FileText, section: '6. Deliver' },
  { path: '/dossier', label: 'Full Dossier (PDF)', icon: Printer, section: '6. Deliver' },
  { path: '/calculators', label: 'Calculators', icon: Calculator, section: 'Tools & Data' },
  { path: '/angel-data', label: 'Angel Data', icon: Database, section: 'Tools & Data' },
];

export const utilityItem = { path: '/angel-connect', label: 'Angel Connect', icon: ShieldCheck, section: 'Tools & Data' };

