import { Link } from 'react-router-dom';
import { TrendingUp, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PortfolioNavTabsProps {
  currentPath: '/allocation' | '/advanced-portfolio';
}

const TABS = [
  {
    path: '/allocation',
    label: 'Strategic Asset Allocation',
    shortLabel: 'SAA & Rebalancing',
    icon: TrendingUp,
    description: 'Current vs Target SAA & Transition Plan',
  },
  {
    path: '/advanced-portfolio',
    label: 'Portfolio Engineering Lab',
    shortLabel: 'Portfolio Lab',
    icon: Layers,
    description: 'Black-Litterman, Risk Parity & Glide Paths',
  },
];

export const PortfolioNavTabs = ({ currentPath }: PortfolioNavTabsProps) => {
  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Portfolio & Allocation navigation"
        className="flex items-center gap-1.5 p-1.5 bg-zinc-100/90 border border-zinc-200/80 rounded-2xl overflow-x-auto max-w-full"
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map((tab) => {
          const active = currentPath === tab.path;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              role="tab"
              aria-selected={active}
              className={cn(
                'flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 group',
                active
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70',
              )}
            >
              <Icon
                size={15}
                className={cn(
                  'transition-colors shrink-0',
                  active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-950',
                )}
              />
              <span className="hidden md:inline">{tab.label}</span>
              <span className="inline md:hidden">{tab.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
