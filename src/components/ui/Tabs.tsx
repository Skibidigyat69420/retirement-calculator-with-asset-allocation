import React from 'react';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

/** Hairline underline tabs — active tab gets a 2px moss underline, not a pill. */
export const Tabs = ({ tabs, active, onChange, className, ariaLabel }: TabsProps) => {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-1 border-b border-border max-w-full overflow-x-auto', className)}
      style={{ scrollbarWidth: 'none' }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 -mb-px whitespace-nowrap text-sm font-medium border-b-2 transition-colors cursor-pointer select-none',
              isActive
                ? 'border-accent text-ink'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {tab.icon && (
              <span className={cn(isActive ? 'text-accent' : 'text-faint')}>{tab.icon}</span>
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
