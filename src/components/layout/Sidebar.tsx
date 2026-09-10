import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { navItems, groupBySection, type NavItem } from './navItems';
import { Lockup, LogoMark } from './BrandMark';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';
import { useCalculator } from '../../context/CalculatorContext';
import { isProfileConfigured, planStatus } from '../../lib/planState';

const NAV_STORAGE_KEY = 'soundthesis_nav';
const EXPANDED_WIDTH = 250;
const COLLAPSED_WIDTH = 72;

const loadCollapsed = (): boolean => {
  try {
    return localStorage.getItem(NAV_STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
};

interface NavLinkProps {
  item: NavItem;
  collapsed?: boolean;
  onClick?: () => void;
}

const NavLink = ({ item, collapsed, onClick }: NavLinkProps) => {
  const location = useLocation();
  const Icon = item.icon;
  const active = location.pathname === item.path;

  const link = (
    <Link
      to={item.path}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 min-h-9 rounded-md text-[13px] font-medium transition-colors duration-150',
        collapsed ? 'justify-center px-0 py-2' : 'px-3 py-1.5',
        active
          ? 'bg-accent-soft text-ink'
          : 'text-muted hover:bg-sunken hover:text-ink',
      )}
    >
      <Icon
        size={17}
        strokeWidth={1.7}
        className={cn('shrink-0 transition-colors', active ? 'text-accent-strong' : 'text-faint group-hover:text-ink')}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  return link;
};

const NavSections = ({ collapsed, onClick }: { collapsed?: boolean; onClick?: () => void }) => (
  <nav aria-label="Primary" className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
    {groupBySection(navItems).map(([section, items]) => (
      <div key={section} className={cn(collapsed ? 'mt-1 first:mt-0' : 'mt-4 first:mt-1')}>
        {!collapsed && (
          <div className="px-3 mb-1">
            <span className="eyebrow">{section}</span>
          </div>
        )}
        <ul className={cn('space-y-px', collapsed && 'space-y-1')}>
          {items.map((item) => (
            <li key={item.path}>
              <NavLink item={item} collapsed={collapsed} onClick={onClick} />
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
);

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const { inputs } = useCalculator();
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NAV_STORAGE_KEY, next ? 'collapsed' : 'expanded');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) onClose();
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

  const configured = isProfileConfigured(inputs);

  const clientContext = collapsed ? (
    configured ? (
      <div className="flex justify-center pt-3 border-t border-border-subtle" title={inputs.client.name}>
        <Avatar name={inputs.client.name} id={inputs.client.email} size="sm" />
      </div>
    ) : null
  ) : (
    <div className="pt-3 border-t border-border-subtle">
      {configured ? (
        <Link
          to="/master-plan"
          className="flex items-center gap-2.5 p-2 rounded-md hover:bg-sunken transition-colors group"
        >
          <Avatar name={inputs.client.name} id={inputs.client.email} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium text-ink truncate group-hover:text-accent-strong transition-colors">
              {inputs.client.name}
            </span>
            <span className="block mt-0.5">
              <StatusBadge status={planStatus(inputs)} />
            </span>
          </span>
        </Link>
      ) : (
        <Link
          to="/master-plan"
          className="block px-2 py-1.5 text-xs text-muted hover:text-ink transition-colors"
        >
          No client selected
        </Link>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 border-r border-border bg-surface px-3 py-4 text-ink transition-[width] duration-200 ease-standard"
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        aria-label="Sidebar navigation"
      >
        <Link
          to="/"
          className={cn('mb-4 block', collapsed ? 'px-0 flex justify-center' : 'px-2')}
          aria-label="Sound Thesis home"
        >
          {collapsed ? <LogoMark size={28} /> : <Lockup />}
        </Link>

        <NavSections collapsed={collapsed} />

        <div className="mt-2 space-y-1">
          {clientContext}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center gap-2.5 min-h-9 w-full rounded-md text-muted hover:text-ink hover:bg-sunken transition-colors text-[13px] font-medium',
              collapsed ? 'justify-center px-0 py-2' : 'px-3 py-1.5',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} strokeWidth={1.7} />
            ) : (
              <>
                <PanelLeftClose size={17} strokeWidth={1.7} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-overlay backdrop-blur-sm animate-overlay-in"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 w-[280px] bg-surface flex flex-col px-4 py-4 shadow-popover animate-drawer-in z-10 border-r border-border text-ink"
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border-subtle">
              <Link to="/" onClick={onClose} aria-label="Sound Thesis home">
                <Lockup />
              </Link>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 min-h-11 min-w-11 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-sunken transition-colors"
                aria-label="Close navigation menu"
              >
                <X size={18} strokeWidth={1.7} />
              </button>
            </div>

            <NavSections onClick={onClose} />

            <div className="pt-3 mt-1 border-t border-border-subtle">{clientContext}</div>
          </div>
        </div>
      )}
    </>
  );
};
