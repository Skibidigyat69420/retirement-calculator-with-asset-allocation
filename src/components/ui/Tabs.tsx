import { cn } from '../../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export const Tabs = ({ tabs, active, onChange }: TabsProps) => {
  return (
    <div
      role="tablist"
      className="inline-flex p-1.5 bg-white border border-slate-200/70 rounded-2xl shadow-sm overflow-x-auto max-w-full"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-label={tab.label}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
            active === tab.id
              ? 'bg-gradient-to-r from-navy to-navy-dark text-white shadow-sm'
              : 'text-slate-600 hover:text-navy hover:bg-slate-100/60',
          )}
        >
          {tab.icon && (
            <span className={cn('mr-2', active === tab.id ? 'text-white/80' : 'text-slate-500')}>
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
