import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X, ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { chapterMenuItems, chapterNavItems, navItems, type ChapterNavItem, type NavItem } from './navItems';
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
  item: Pick<NavItem, 'path' | 'label' | 'icon'> | ChapterNavItem;
  collapsed?: boolean;
  onClick?: () => void;
  active?: boolean;
}

const NavLink = ({ item, collapsed, onClick, active: activeOverride }: NavLinkProps) => {
  const location = useLocation();
  const Icon = item.icon;
  const active = activeOverride ?? location.pathname === item.path;

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

const NavSections = ({ collapsed, onClick }: { collapsed?: boolean; onClick?: () => void }) => {
  const location = useLocation();
  const activeChapter = chapterNavItems.find((chapter) => chapter.paths.includes(location.pathname));
  const activeChapterItems = activeChapter
    ? (chapterMenuItems[activeChapter.label] ?? [])
      .map((path) => navItems.find((item) => item.path === path))
      .filter((item): item is NavItem => Boolean(item))
    : [];
  const toolItems = navItems.filter((item) => !chapterNavItems.some((chapter) => chapter.paths.includes(item.path)));
  const currentIsTool = toolItems.some((item) => item.path === location.pathname);
  const [toolsOpen, setToolsOpen] = useState(currentIsTool);

  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
      <ul className={cn('space-y-px', collapsed && 'space-y-1')}>
        {chapterNavItems.map((chapter) => (
          <li key={chapter.path}>
            <NavLink
              item={chapter}
              collapsed={collapsed}
              onClick={onClick}
              active={chapter.paths.includes(location.pathname)}
            />
          </li>
        ))}
      </ul>
      {!collapsed && activeChapter && activeChapterItems.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            {activeChapter.label} menu
          </div>
          <ul className="space-y-px">
            {activeChapterItems.map((item) => (
              <li key={item.path}><NavLink item={item} onClick={onClick} /></li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <div className="sidebar-tool-group">
            <button
              type="button"
              onClick={() => setToolsOpen((open) => !open)}
              aria-expanded={toolsOpen}
              title={collapsed ? 'Tools & practice' : undefined}
              className={cn('sidebar-tool-group-button', collapsed && 'justify-center px-0', currentIsTool && 'text-accent-strong')}
            >
              <ArrowLeftRight size={16} strokeWidth={1.6} className="shrink-0" />
              {!collapsed && <><span className="flex-1 text-left">Tools & practice</span><ChevronDown size={14} className={cn('transition-transform duration-150', toolsOpen && 'rotate-180')} /></>}
            </button>
            {toolsOpen && <ul className={cn('mt-1 space-y-px', collapsed && 'space-y-1')}>
              {toolItems.map((item) => <li key={item.path}><NavLink item={item} collapsed={collapsed} onClick={onClick} /></li>)}
            </ul>}
        </div>
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
    <div className="flex justify-center py-2 mb-2 border-b border-border-subtle" title={`${displayName} · ${formatCurrencyCompact(netWorth)}`}>
      <Link to="/master-plan" aria-label={`View plan for ${displayName}`} className="p-1 rounded-md hover:bg-sunken transition-colors">
        <Avatar name={displayName} id={displayEmail} size="sm" />
      </Link>
    </div>
  ) : (
    <div className="pb-3 mb-2 border-b border-border-subtle">
      <div className="flex items-center justify-between gap-1 px-1 mb-1.5">
        <span className="text-[11px] font-medium text-muted">Active household</span>
        <Link
          to="/clients"
          title="Switch client household"
          className="p-0.5 rounded text-muted hover:text-ink hover:bg-sunken transition-colors flex items-center gap-1 text-[11px]"
        >
          <ArrowLeftRight size={11} />
          <span>Switch</span>
        </Link>
      </div>
      <Link
        to="/master-plan"
        className="block p-2 rounded-lg bg-surface/60 border border-border/80 hover:bg-sunken hover:border-border transition-all group overflow-hidden"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={displayName} id={displayEmail} size="sm" />
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-ink truncate group-hover:text-accent-strong transition-colors">
              {displayName}
            </span>
            <span className="block text-[11px] font-mono text-muted truncate mt-0.5">
              {formatCurrencyCompact(netWorth)}
            </span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between gap-1 min-w-0">
          <span className="text-[10px] text-faint shrink-0">Plan status</span>
          <div className="shrink-0 max-w-[120px] truncate">
            <StatusBadge status={planStatus(inputs)} />
          </div>
        </div>
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
        {/* Brand header */}
        <div className={cn('mb-3 flex items-center', collapsed ? 'justify-center' : 'justify-between gap-2 px-1')}>
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
            >
              <PanelLeftClose size={17} strokeWidth={1.7} />
            </button>
          )}
        </div>

        {/* Active household context — pinned at top */}
        {clientContext}

        {/* Scrollable navigation sections */}
        <NavSections collapsed={collapsed} />

        {/* Bottom rail actions — collapse toggle when collapsed */}
        {collapsed && (
          <div className="pt-2 mt-auto border-t border-border-subtle">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              aria-expanded="false"
              title="Expand sidebar"
              className="flex min-h-9 w-full items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
            >
              <PanelLeftOpen size={17} strokeWidth={1.7} />
            </button>
          </div>
        )}
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

            {/* Active household at top */}
            {clientContext}

            <NavSections onClick={onClose} />
          </div>
        </div>
      )}
    </>
  );
};
