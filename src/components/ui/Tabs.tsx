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
}

export const Tabs = ({ tabs, active, onChange, className }: TabsProps) => {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center p-1.5 bg-sunken/80 border border-border rounded-2xl shadow-2xs overflow-x-auto max-w-full gap-1',
        className,
      )}
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
              'flex items-center px-3.5 sm:px-4 py-2 min-h-9 text-xs sm:text-sm rounded-xl whitespace-nowrap transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 cursor-pointer active:scale-[0.98] select-none',
              isActive
                ? 'bg-raised text-ink font-semibold shadow-xs border border-border-strong'
                : 'text-muted hover:text-ink hover:bg-raised/60 font-medium border border-transparent',
            )}
          >
            {tab.icon && (
              <span
                className={cn(
                  'mr-2 transition-colors',
                  isActive ? 'text-ink' : 'text-muted',
                )}
              >
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

