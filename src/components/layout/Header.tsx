import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Activity, PieChart, TrendingUp, TrendingDown, Wallet, Target, Calculator, Percent, ShieldCheck, BarChart2, Database, Radio, BrainCircuit, Scissors, RefreshCcw, Grid3X3, FileText, Shield } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Activity },
  { path: '/risk', label: 'Risk Profile', icon: Shield },
  { path: '/master-plan', label: 'Master Plan', icon: PieChart },
  { path: '/goal', label: 'Goal Planner', icon: Target },
  { path: '/allocation', label: 'Allocation', icon: PieChart },
  { path: '/sip', label: 'SIP', icon: TrendingUp },
  { path: '/stp', label: 'STP', icon: Wallet },
  { path: '/swp', label: 'SWP', icon: Wallet },
  { path: '/retirement', label: 'Retirement', icon: Calculator },
  { path: '/mvo', label: 'MVO', icon: BarChart2 },
  { path: '/advanced-allocation', label: 'Advanced Allocation', icon: BrainCircuit },
  { path: '/trade-analytics', label: 'Trade Analytics', icon: Activity },
  { path: '/sequence-risk', label: 'Sequence Risk', icon: TrendingDown },
  { path: '/swr', label: 'SWR', icon: Grid3X3 },
  { path: '/rebalancing', label: 'Rebalancing', icon: RefreshCcw },
  { path: '/tax-loss-harvesting', label: 'Tax Loss', icon: Scissors },
  { path: '/ips', label: 'IPS Template', icon: FileText },
  { path: '/angel-connect', label: 'Angel SmartAPI', icon: ShieldCheck },
  { path: '/live-market', label: 'Live Market', icon: Radio },
  { path: '/market-data', label: 'Market Data', icon: Database },
  { path: '/inflation', label: 'Inflation', icon: Percent },
];

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
              <span className="text-gold font-serif font-bold text-lg">S</span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sound Thesis</div>
              <div className="text-sm font-serif text-navy leading-tight">Institutional Suite</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    active
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-stone-500 hover:text-navy hover:bg-stone-100/50',
                  )}
                >
                  <Icon size={16} className={cn('mr-1.5', active ? 'text-gold' : 'text-stone-400')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            className="lg:hidden p-2 text-stone-500 hover:text-navy"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-cream">
          <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    active
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-stone-500 hover:text-navy hover:bg-stone-100/50',
                  )}
                >
                  <Icon size={16} className={cn('mr-2', active ? 'text-gold' : 'text-stone-400')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
