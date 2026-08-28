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
    <div className="inline-flex p-1.5 bg-white border border-stone-200/70 rounded-2xl shadow-sm overflow-x-auto max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150',
            active === tab.id
              ? 'bg-navy text-white shadow-sm'
              : 'text-stone-500 hover:text-navy hover:bg-stone-100/60',
          )}
        >
          {tab.icon && (
            <span className={cn('mr-2', active === tab.id ? 'text-gold' : 'text-stone-400')}>
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
