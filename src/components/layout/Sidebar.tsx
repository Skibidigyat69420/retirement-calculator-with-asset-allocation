import { Link, useLocation } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useEffect } from 'react';
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
          ? 'bg-navy text-white shadow-md'
          : 'text-stone-500 hover:bg-white hover:text-navy hover:shadow-sm',
      )}
    >
      <Icon size={18} className={cn('transition-colors', active ? 'text-white' : 'text-stone-400 group-hover:text-ink')} />
      <span>{item.label}</span>
      {completed && (
        <Check
          size={14}
          className={cn('ml-auto', active ? 'text-gold' : 'text-emerald-500')}
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

  // Comprehensive workflow completion flags per route
  const completionMap: Record<string, boolean> = {
    '/risk': isComplete(riskAnswers),
    '/master-plan': inputs.assets.length > 0 && inputs.annualIncome > 0,
    '/goal': inputs.goals.length > 0,
    '/retirement': wealthResult.snapshots.length > 0,
    '/allocation': manualTargets !== null || isComplete(riskAnswers),
    '/mvo': true,
    '/reports': wealthResult.netWorth > 0,
    '/ips': Boolean(inputs.client?.name),
  };

  const workflowSteps = ['/risk', '/master-plan', '/goal', '/retirement', '/allocation', '/reports', '/ips'];
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
    <nav className="flex-1 space-y-6 overflow-y-auto pb-4 scrollbar-hide">
      {Object.entries(groupedNavItems).map(([section, items]) => (
        <div key={section} className="space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
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
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-stone-200/80 bg-cream/95 backdrop-blur-sm px-4 py-6">
        <Link to="/" className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-gold font-serif font-bold text-lg">S</span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sound Thesis</div>
            <div className="text-sm font-serif text-navy leading-tight">Wealth Planner</div>
          </div>
        </Link>

        {renderNavSections()}

        {/* Progress & Client Profile summary */}
        <div className="p-3 my-2 bg-paper/90 rounded-xl border border-stone-200/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1.5">
            <span>Advisor Progress</span>
            <span className="text-navy font-bold">{completedCount}/{workflowSteps.length}</span>
          </div>
          <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden mb-2.5">
            <div className="h-full bg-gold rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <Link
            to="/master-plan"
            className="flex items-center gap-2 text-left p-1 rounded-lg hover:bg-white transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-navy text-gold text-[10px] font-bold flex items-center justify-center shrink-0">
              {inputs.client?.name?.charAt(0) || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-navy truncate group-hover:text-gold transition-colors">
                {inputs.client?.name || 'Client Plan'}
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                {inputs.client?.advisor || 'Sound Thesis'}
              </div>
            </div>
          </Link>
        </div>

        <div className="pt-2 mt-auto border-t border-stone-200/70">
          <NavLink item={utilityItem} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-cream h-full shadow-elevated px-4 py-6 flex flex-col animate-drawer-in">
            <div className="flex items-center justify-between px-2 mb-8">
              <Link to="/" onClick={onClose} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-gold font-serif font-bold text-lg">S</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sound Thesis</div>
                  <div className="text-sm font-serif text-navy leading-tight">Wealth Planner</div>
                </div>
              </Link>
              <button onClick={onClose} className="p-2 text-stone-500 hover:text-navy">
                <X size={20} />
              </button>
            </div>

            {renderNavSections(onClose)}

            <div className="pt-4 mt-auto border-t border-stone-200/70">
              <NavLink item={utilityItem} onClick={onClose} />
            </div>
          </div>
          <div
            className="flex-1 bg-navy/20 backdrop-blur-sm animate-overlay-in"
            onClick={onClose}
          />
        </div>
      )}
    </>
  );
};
