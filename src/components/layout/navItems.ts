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
} from 'lucide-react';

export const navItems = [
  { path: '/', label: 'Dashboard', icon: Activity, section: 'Planning' },
  { path: '/risk', label: 'Risk Profile', icon: Shield, section: 'Planning' },
  { path: '/master-plan', label: 'Master Plan', icon: PieChart, section: 'Planning' },
  { path: '/goal', label: 'Goals', icon: Target, section: 'Planning' },
  { path: '/retirement', label: 'Retirement & SWP', icon: PiggyBank, section: 'Planning' },
  { path: '/allocation', label: 'Allocation', icon: TrendingUp, section: 'Portfolio' },
  { path: '/mvo', label: 'MVO', icon: BarChart2, section: 'Portfolio' },
  { path: '/reports', label: 'Reports', icon: BarChart3, section: 'Reports' },
  { path: '/ips', label: 'IPS', icon: FileText, section: 'Reports' },
  { path: '/dossier', label: 'Full Dossier (PDF)', icon: Printer, section: 'Reports' },
  { path: '/calculators', label: 'Calculators', icon: Calculator, section: 'Tools' },
  { path: '/angel-data', label: 'Angel Data', icon: Database, section: 'Data' },
];

export const utilityItem = { path: '/angel-connect', label: 'Angel Connect', icon: ShieldCheck, section: 'Data' };
