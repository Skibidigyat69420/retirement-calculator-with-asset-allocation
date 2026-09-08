import { Link, useLocation } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { navItems, utilityItem, SECTION_LABELS, type NavItem } from './navItems';
import { useCalculator } from '../../context/CalculatorContext';
import { isComplete } from '../../lib/riskQuestionnaire';

interface NavLinkProps {
  item: NavItem;
  onClick?: () => void;
  completed?: boolean;
}

const NavLink = ({ item, onClick, completed }: NavLinkProps) => {
  const location = useLocation();
  const Icon = item.icon;
  const active = location.pathname === item.path;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2.5 px-3 min-h-9 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ease-out',
        active
          ? 'bg-raised text-ink'
          : 'text-muted hover:bg-raised hover:text-ink',
      )}
    >
      {item.step ? (
        <span
          className={cn(
            'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border transition-all tabular-nums',
            active
              ? 'bg-background text-accent border-border'
              : 'bg-sunken text-faint border-border group-hover:text-muted',
          )}
        >
          {item.step}
        </span>
      ) : (
        <Icon
          size={16}
          className={cn('transition-colors', active ? 'text-ink' : 'text-faint group-hover:text-ink')}
        />
      )}
      <span className="truncate">{item.label}</span>
      {completed && (
        <Check
          size={13}
          strokeWidth={2.5}
          className="ml-auto shrink-0 transition-colors text-positive"
          aria-label="Completed"
        />
      )}
    </Link>
  );
};

const BrandMark = () => (
  <div className="flex flex-col gap-1">
    <span className="font-serif text-lg text-ink leading-none tracking-tight">
      Sound Thesis<span className="text-accent">.</span>
    </span>
    <span className="text-[10px] text-faint font-medium tracking-normal truncate">Wealth Advisory Engine</span>
  </div>
);

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const { inputs, riskAnswers, wealthResult, manualTargets } = useCalculator();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Workflow completion flags for the 5-step core journey
  const completionMap: Record<string, boolean> = {
    '/master-plan': inputs.assets.length > 0 && inputs.annualIncome > 0,
    '/risk': isComplete(riskAnswers),
    '/retirement': wealthResult.sustainable,
    '/allocation': manualTargets !== null || isComplete(riskAnswers),
    '/ips': Boolean(inputs.client?.name),
    '/calculators': true,
    '/decision-history': true,
  };

  const workflowSteps = ['/master-plan', '/risk', '/retirement', '/allocation', '/ips'];
  const completedCount = workflowSteps.filter((path) => completionMap[path]).length;
  const progressPercent = Math.round((completedCount / workflowSteps.length) * 100);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        onClose();
      }
    };

    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobileOpen, onClose]);

  const groupedNavItems = navItems.reduce((acc, item) => {
    const section = item.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const renderNavSections = (onClick?: () => void) => (
    <nav className="flex-1 space-y-6 overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>
      {Object.entries(groupedNavItems).map(([section, items]) => (
        <div key={section} className="space-y-1">
          <div className="micro-label px-3 mb-1.5">
            {SECTION_LABELS[section] ?? section}
          </div>
          {items.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              onClick={onClick}
              completed={completionMap[item.path]}
            />
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-surface px-4 py-5">
        <Link to="/" className="px-2 mb-7 block">
          <BrandMark />
        </Link>

        {renderNavSections()}

        {/* Progress & Client Profile summary */}
        <div className="p-3 my-2 bg-sunken rounded-2xl border border-border">
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-soft mb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Workflow Progress
            </span>
            <span className="text-muted font-mono text-[10px] px-2 py-0.5 bg-background rounded-full border border-border tabular-nums">
              {completedCount}/5
            </span>
          </div>
          <div className="w-full h-1 bg-border rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <Link
            to="/master-plan"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-surface border border-border hover:border-border-strong transition-all group"
          >
            <div className="relative w-7 h-7 rounded-lg bg-raised text-ink text-[11px] font-bold flex items-center justify-center shrink-0 border border-border-strong">
              {inputs.client?.name?.charAt(0) || 'C'}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-ink truncate">
                {inputs.client?.name || 'Private Client'}
              </div>
              <div className="text-[10px] text-muted truncate">
                {inputs.client?.advisor || 'Sound Thesis'}
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-2 mt-auto border-t border-border">
          <NavLink item={utilityItem} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-overlay-in transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="fixed inset-y-0 left-0 w-72 bg-surface flex flex-col p-4 shadow-2xl animate-drawer-in z-10 border-r border-border"
          >
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-border">
              <Link to="/" onClick={onClose} className="px-1">
                <BrandMark />
              </Link>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-faint hover:text-ink hover:bg-raised transition-colors"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            {renderNavSections(onClose)}

            <div className="pt-2 border-t border-border">
              <NavLink item={utilityItem} onClick={onClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
