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
      className="inline-flex p-1.5 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-xs overflow-x-auto max-w-full gap-1"
      style={{ scrollbarWidth: 'none' }}
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
            'flex items-center px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 cursor-pointer',
            active === tab.id
              ? 'bg-gradient-to-r from-navy via-navy to-navy-dark text-white shadow-sm scale-[1.02]'
              : 'text-slate-600 hover:text-navy hover:bg-slate-100/70',
          )}
        >
          {tab.icon && (
            <span className={cn('mr-2 transition-colors', active === tab.id ? 'text-white' : 'text-slate-500')}>
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
