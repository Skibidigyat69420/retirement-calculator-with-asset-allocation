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
        className="flex items-center gap-1.5 p-1.5 bg-sunken border border-border rounded-2xl overflow-x-auto max-w-full"
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
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 px-3.5 sm:px-4 py-2 min-h-9 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 group',
                active
                  ? 'bg-raised text-ink shadow-2xs'
                  : 'text-muted hover:text-ink hover:bg-raised/60',
              )}
            >
              <Icon
                size={15}
                className={cn(
                  'transition-colors shrink-0',
                  active ? 'text-accent' : 'text-faint group-hover:text-ink',
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
