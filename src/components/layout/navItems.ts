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
} from 'lucide-react';

export const navItems = [
  { path: '/', label: 'Dashboard', icon: Activity },
  { path: '/risk', label: 'Risk Profile', icon: Shield },
  { path: '/master-plan', label: 'Master Plan', icon: PieChart },
  { path: '/goal', label: 'Goals', icon: Target },
  { path: '/retirement', label: 'Retirement', icon: Calculator },
  { path: '/allocation', label: 'Allocation', icon: TrendingUp },
  { path: '/mvo', label: 'MVO', icon: BarChart2 },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/ips', label: 'IPS', icon: FileText },
];

export const utilityItem = { path: '/angel-connect', label: 'Angel Connect', icon: ShieldCheck };
