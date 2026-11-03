import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X, ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { navItems, type NavItem } from './navItems';
import { Lockup, LogoMark } from './BrandMark';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';
import { useCalculator } from '../../context/CalculatorContext';
import { planStatus } from '../../lib/planState';
import { getActiveCRMClient } from '../../lib/crm';
import { formatCurrencyCompact } from '../../lib/formatters';

const NAV_STORAGE_KEY = 'soundthesis_nav';
const EXPANDED_WIDTH = 248;
const COLLAPSED_WIDTH = 68;

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
        'group relative flex items-center gap-2.5 min-h-9 rounded-md text-[13px] transition-all duration-150',
        collapsed ? 'justify-center px-0 py-2' : 'px-3 py-1.5',
        active
          ? 'bg-accent-soft text-accent-strong font-semibold'
          : 'text-muted hover:bg-sunken hover:text-ink font-medium',
      )}
    >
      <Icon
        size={17}
        strokeWidth={1.6}
        className={cn(
          'shrink-0 transition-colors',
          active ? 'text-accent-strong' : 'text-faint group-hover:text-ink',
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  return link;
};

const PRIMARY_PATHS = ['/overview', '/', '/master-plan', '/ips', '/meeting-workflow', '/reports'];

const TOOL_GROUPS: { id: string; label: string; paths: string[] }[] = [
  {
    id: 'analytics',
    label: 'Analytics & Labs',
    paths: ['/allocation', '/advanced-portfolio', '/retirement', '/goal', '/reverse-planning', '/decision-history'],
  },
  {
    id: 'utilities',
    label: 'Calculators & Feeds',
    paths: ['/calculators', '/angel-connect', '/angel-data'],
  },
];

const NavSections = ({ collapsed, onClick }: { collapsed?: boolean; onClick?: () => void }) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const current = TOOL_GROUPS.find((group) => group.paths.includes(location.pathname));
    return current ? [current.id] : ['analytics'];
  });
  const primary = navItems.filter((item) => PRIMARY_PATHS.includes(item.path));
  // Sort primary according to PRIMARY_PATHS order
  const sortedPrimary = [...primary].sort((a, b) => PRIMARY_PATHS.indexOf(a.path) - PRIMARY_PATHS.indexOf(b.path));
  const toggleGroup = (id: string) => setOpenGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
      <ul className={cn('space-y-px', collapsed && 'space-y-1')}>
        {sortedPrimary.map((item) => <li key={item.path}><NavLink item={item} collapsed={collapsed} onClick={onClick} /></li>)}
      </ul>
      <div className="mt-4 pt-3 border-t border-border-subtle space-y-1">
        {TOOL_GROUPS.map((group) => {
          const items = navItems.filter((item) => group.paths.includes(item.path));
          const groupActive = group.paths.includes(location.pathname);
          const open = openGroups.includes(group.id);
          const GroupIcon = items[0]?.icon;
          return <div key={group.id} className="sidebar-tool-group">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={open}
              title={collapsed ? group.label : undefined}
              className={cn('sidebar-tool-group-button', collapsed && 'justify-center px-0', groupActive && 'text-accent-strong')}
            >
              {GroupIcon && <GroupIcon size={16} strokeWidth={1.6} className="shrink-0" />}
              {!collapsed && <><span className="flex-1 text-left">{group.label}</span><ChevronDown size={14} className={cn('transition-transform duration-150', open && 'rotate-180')} /></>}
            </button>
            {open && <ul className={cn('mt-1 space-y-px', collapsed && 'space-y-1')}>
              {items.map((item) => <li key={item.path}><NavLink item={item} collapsed={collapsed} onClick={onClick} /></li>)}
            </ul>}
          </div>;
        })}
      </div>
    </nav>
  );
};

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const { inputs, wealthResult } = useCalculator();
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activeCRM = getActiveCRMClient();

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

  const displayName = inputs.client.name?.trim() || activeCRM?.name || 'Sharma Family';
  const displayEmail = inputs.client.email || activeCRM?.email;
  const netWorth = wealthResult.isConfigured ? wealthResult.netWorth : (activeCRM?.financialSummary?.netWorth || 0);

  const clientContext = collapsed ? (
    <div className="flex justify-center pt-3 border-t border-border-subtle" title={`${displayName} · ${formatCurrencyCompact(netWorth)}`}>
      <Link to="/master-plan" aria-label={`View plan for ${displayName}`}>
        <Avatar name={displayName} id={displayEmail} size="sm" />
      </Link>
    </div>
  ) : (
    <div className="pt-3 border-t border-border-subtle">
      <div className="flex items-center justify-between gap-1 px-1 mb-1.5">
        <span className="text-xs font-medium text-muted">Active household</span>
        <Link
          to="/"
          title="Switch client household"
          className="p-1 rounded text-muted hover:text-ink hover:bg-sunken transition-colors flex items-center gap-1 text-xs"
        >
          <ArrowLeftRight size={12} />
          <span>Switch</span>
        </Link>
      </div>
      <Link
        to="/master-plan"
        className="flex items-center gap-2.5 p-2 rounded-lg bg-surface/50 border border-border/60 hover:bg-sunken hover:border-border transition-all group"
      >
        <Avatar name={displayName} id={displayEmail} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink truncate group-hover:text-accent-strong transition-colors">
            {displayName}
          </span>
          <span className="flex items-center justify-between mt-0.5 text-xs text-muted">
            <span className="font-mono font-medium text-ink">{formatCurrencyCompact(netWorth)}</span>
            <StatusBadge status={planStatus(inputs)} />
          </span>
        </span>
      </Link>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="brand-rail hidden lg:flex flex-col h-screen sticky top-0 shrink-0 border-r px-3 py-4 text-ink transition-[width] duration-200 ease-standard"
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        aria-label="Sidebar navigation"
      >
        <div className={cn('mb-4 flex items-center', collapsed ? 'justify-center' : 'justify-between gap-2 px-1')}>
          <Link
            to="/"
            className={cn('block', collapsed ? 'px-0' : 'px-1')}
            aria-label="SoundThesis Capital home"
          >
            {collapsed ? <LogoMark size={28} /> : <Lockup />}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded="true"
              title="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink transition-colors"
            >
              <PanelLeftClose size={17} strokeWidth={1.7} />
            </button>
          )}
        </div>

        <NavSections collapsed={collapsed} />

        <div className="mt-2 space-y-1">
          {clientContext}
          {collapsed && <button type="button" onClick={toggleCollapsed} aria-label="Expand sidebar" aria-expanded="false" title="Expand sidebar" className="flex min-h-9 w-full items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink transition-colors"><PanelLeftOpen size={17} strokeWidth={1.7} /></button>}
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
            className="brand-rail fixed inset-y-0 left-0 w-[280px] flex flex-col px-4 py-4 shadow-popover animate-drawer-in z-10 border-r text-ink"
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border-subtle">
              <Link to="/" onClick={onClose} aria-label="SoundThesis Capital home">
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
