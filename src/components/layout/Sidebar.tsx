import { Link, useLocation } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { navItems, utilityItem } from './navItems';
import { useCalculator } from '../../context/CalculatorContext';
import { isComplete } from '../../lib/riskQuestionnaire';

interface NavLinkProps {
  item: typeof navItems[0];
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
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
        active
          ? 'bg-gradient-to-r from-navy to-navy-dark text-white shadow-md'
          : 'text-slate-700 hover:bg-white hover:text-navy hover:shadow-sm',
      )}
    >
      <Icon size={18} className={cn('transition-colors', active ? 'text-white' : 'text-slate-500 group-hover:text-navy')} />
      <span>{item.label}</span>
      {completed && (
        <Check
          size={14}
          className={cn('ml-auto', active ? 'text-white' : 'text-emerald-500')}
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

  // Comprehensive workflow completion flags per route
  const completionMap: Record<string, boolean> = {
    '/risk': isComplete(riskAnswers),
    '/master-plan': inputs.assets.length > 0 && inputs.annualIncome > 0,
    '/goal': inputs.goals.length > 0,
    '/retirement': wealthResult.sustainable,
    '/allocation': manualTargets !== null || isComplete(riskAnswers),
    '/mvo': true,
    '/reports': wealthResult.netWorth > 0,
    '/ips': Boolean(inputs.client?.name),
  };

  const workflowSteps = ['/risk', '/master-plan', '/goal', '/retirement', '/allocation', '/mvo', '/reports', '/ips', '/calculators'];
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
  }, {} as Record<string, typeof navItems>);

  const renderNavSections = (onClick?: () => void) => (
    <nav className="flex-1 space-y-6 overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>
      {Object.entries(groupedNavItems).map(([section, items]) => (
        <div key={section} className="space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {section}
          </div>
          {items.map((item) => (
            <NavLink key={item.path} item={item} onClick={onClick} completed={completionMap[item.path]} />
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-slate-200/80 bg-white/95 backdrop-blur-sm px-4 py-6">
        <Link to="/" className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-navy to-navy-dark rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-serif font-bold text-lg">S</span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sound Thesis</div>
            <div className="text-sm font-serif text-ink leading-tight">Wealth Planner</div>
          </div>
        </Link>

        {renderNavSections()}

        {/* Progress & Client Profile summary */}
        <div className="p-3 my-2 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1.5">
            <span>Advisor Progress</span>
            <span className="text-navy font-bold">{completedCount}/{workflowSteps.length}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2.5">
            <div className="h-full bg-gradient-to-r from-navy to-amber-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <Link
            to="/master-plan"
            className="flex items-center gap-2 text-left p-1 rounded-lg hover:bg-white transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-navy to-navy-dark text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {inputs.client?.name?.charAt(0) || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-ink truncate group-hover:text-navy transition-colors">
                {inputs.client?.name || 'Client Plan'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {inputs.client?.advisor || 'Sound Thesis'}
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-2 mt-auto border-t border-slate-200/70">
          <NavLink item={utilityItem} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="w-72 bg-white h-full shadow-elevated px-4 py-6 flex flex-col animate-drawer-in">
            <div className="flex items-center justify-between px-2 mb-8">
              <Link to="/" onClick={onClose} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-navy to-navy-dark rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-serif font-bold text-lg">S</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sound Thesis</div>
                  <div className="text-sm font-serif text-ink leading-tight">Wealth Planner</div>
                </div>
              </Link>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 text-slate-500 hover:text-navy rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30"
              >
                <X size={20} />
              </button>
            </div>

            {renderNavSections(onClose)}

            <div className="pt-4 mt-auto border-t border-slate-200/70">
              <NavLink item={utilityItem} onClick={onClose} />
            </div>
          </div>
          <div
            className="flex-1 bg-slate-900/20 backdrop-blur-sm animate-overlay-in"
            onClick={onClose}
          />
        </div>
      )}
    </>
  );
};
