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
        'inline-flex items-center p-1.5 bg-zinc-100/80 backdrop-blur-xs border border-zinc-200/70 rounded-2xl shadow-2xs overflow-x-auto max-w-full gap-1',
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
              'flex items-center px-3.5 sm:px-4 py-2 text-xs sm:text-sm rounded-xl whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 cursor-pointer active:scale-[0.98] select-none',
              isActive
                ? 'bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 font-medium border border-transparent',
            )}
          >
            {tab.icon && (
              <span
                className={cn(
                  'mr-2 transition-colors',
                  isActive ? 'text-zinc-950' : 'text-zinc-500',
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

