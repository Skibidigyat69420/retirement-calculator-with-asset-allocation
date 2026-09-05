import { Link, useLocation } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { navItems, utilityItem, type NavItem } from './navItems';
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
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
        active
          ? 'bg-zinc-950 text-white shadow-xs'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950',
      )}
    >
      {item.step ? (
        <span
          className={cn(
            'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors',
            active
              ? 'bg-zinc-800 text-white'
              : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-900',
          )}
        >
          {item.step}
        </span>
      ) : (
        <Icon
          size={16}
          className={cn('transition-colors', active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-900')}
        />
      )}
      <span className="truncate">{item.label}</span>
      {completed && (
        <Check
          size={13}
          className={cn('ml-auto shrink-0', active ? 'text-white' : 'text-emerald-600')}
          aria-label="Completed"
        />
      )}
    </Link>
  );
};

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
    <nav className="flex-1 space-y-5 overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>
      {Object.entries(groupedNavItems).map(([section, items]) => (
        <div key={section} className="space-y-1">
          <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {section}
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
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-zinc-200/80 bg-white/95 backdrop-blur-sm px-4 py-5">
        <Link to="/" className="flex items-center gap-3 px-2 mb-6">
          <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center shadow-xs">
            <span className="text-white font-sans font-bold text-sm">ST</span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Sound Thesis</div>
            <div className="text-xs font-semibold text-zinc-950 leading-tight">Advisory Engine</div>
          </div>
        </Link>

        {renderNavSections()}

        {/* Progress & Client Profile summary */}
        <div className="p-3 my-2 bg-zinc-50 rounded-xl border border-zinc-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 mb-1.5">
            <span>Workflow Progress</span>
            <span className="text-zinc-950 font-bold">{completedCount}/5 Steps</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full bg-zinc-950 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <Link
            to="/master-plan"
            className="flex items-center gap-2 text-left p-1 rounded-lg hover:bg-white transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-zinc-950 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {inputs.client?.name?.charAt(0) || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-zinc-950 truncate group-hover:text-zinc-700 transition-colors">
                {inputs.client?.name || 'Private Client'}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                {inputs.client?.advisor || 'Sound Thesis'}
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-2 mt-auto border-t border-zinc-200/70">
          <NavLink item={utilityItem} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-overlay-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="fixed inset-y-0 left-0 w-72 bg-white flex flex-col p-4 shadow-xl animate-drawer-in z-10"
          >
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-zinc-200">
              <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center">
                  <span className="text-white font-sans font-bold text-sm">ST</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Sound Thesis</div>
                  <div className="text-xs font-semibold text-zinc-950">Advisory Engine</div>
                </div>
              </Link>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            {renderNavSections(onClose)}

            <div className="pt-2 border-t border-zinc-200">
              <NavLink item={utilityItem} onClick={onClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
