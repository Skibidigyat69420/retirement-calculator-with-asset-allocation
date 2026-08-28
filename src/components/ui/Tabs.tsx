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
    <div className="flex space-x-1 border border-stone-200 rounded-xl p-1 bg-stone-50/50 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all',
            active === tab.id
              ? 'bg-white text-navy shadow-sm'
              : 'text-stone-500 hover:text-navy hover:bg-stone-100/50',
          )}
        >
          {tab.icon && <span className={cn('mr-2', active === tab.id ? 'text-gold' : 'text-stone-400')}>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
