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
          ? 'bg-zinc-950 text-white shadow-xs ring-1 ring-zinc-800/80'
          : 'text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-950',
      )}
    >
      {item.step ? (
        <span
          className={cn(
            'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-all tabular-nums',
            active
              ? 'bg-zinc-800 text-white ring-1 ring-zinc-700/60'
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
          strokeWidth={2.5}
          className={cn(
            'ml-auto shrink-0 transition-colors',
            active ? 'text-emerald-400' : 'text-emerald-600'
          )}
          aria-label="Completed"
        />
      )}
    </Link>
  );
};

const BrandMark = () => (
  <div className="flex items-center gap-3">
    <div className="relative group/logo">
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20 rounded-2xl blur-xs opacity-75 group-hover/logo:opacity-100 transition-opacity duration-300" />
      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-b from-zinc-900 to-black p-[1px] shadow-sm ring-1 ring-white/10">
        <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.15),transparent_70%)]" />
          <span className="relative text-white font-sans font-extrabold text-xs tracking-tight">ST</span>
        </div>
      </div>
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-sans font-bold text-sm text-zinc-950 tracking-tight leading-none">Sound Thesis</span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 leading-none">PRO</span>
      </div>
      <div className="text-[10px] text-zinc-400 font-medium tracking-normal mt-0.5 truncate">Wealth Advisory Engine</div>
    </div>
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
        <Link to="/" className="px-2 mb-6 block">
          <BrandMark />
        </Link>

        {renderNavSections()}

        {/* Progress & Client Profile summary */}
        <div className="p-3 my-2 bg-gradient-to-b from-zinc-50 to-zinc-100/70 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Workflow Progress
            </span>
            <span className="text-zinc-900 font-mono text-[10px] px-2 py-0.5 bg-white rounded-full border border-zinc-200/80 font-bold shadow-2xs tabular-nums">
              {completedCount}/5 Steps
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-200/80 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-zinc-950 via-emerald-600 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <Link
            to="/master-plan"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-zinc-200/70 hover:border-zinc-300 hover:shadow-2xs transition-all group"
          >
            <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 text-white text-[11px] font-bold flex items-center justify-center shrink-0 ring-1 ring-zinc-700/50 shadow-2xs">
              {inputs.client?.name?.charAt(0) || 'C'}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-zinc-950 truncate group-hover:text-emerald-700 transition-colors">
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-overlay-in transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl flex flex-col p-4 shadow-2xl animate-drawer-in z-10 border-r border-zinc-200/80"
          >
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-zinc-200/80">
              <Link to="/" onClick={onClose} className="px-1">
                <BrandMark />
              </Link>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            {renderNavSections(onClose)}

            <div className="pt-2 border-t border-zinc-200/80">
              <NavLink item={utilityItem} onClick={onClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
