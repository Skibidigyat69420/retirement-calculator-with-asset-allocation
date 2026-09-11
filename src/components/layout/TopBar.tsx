import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Wallet, ShieldCheck, User, FlaskConical, RotateCcw, ChevronDown, LogOut } from 'lucide-react';
import { navItems } from './navItems';
import { LogoMark } from './BrandMark';
import { CommandPalette } from './CommandPalette';
import { Avatar } from '../ui/Avatar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact } from '../../lib/formatters';
import { useAuth } from '../../context/AuthContext';

interface TopBarProps {
  onMenuClick: () => void;
  mobileOpen?: boolean;
}

const isEditableTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(
    el.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'),
  );
};

export const TopBar = ({ onMenuClick, mobileOpen }: TopBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { inputs, riskProfile, riskScore, hasRiskAnswers, wealthResult, loadDemoWorkspace, resetToDefaults } =
    useCalculator();
  const { user, organizationName, logout } = useAuth();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const current = navItems.find((item) => item.path === location.pathname);
  const label = current?.label || 'Dashboard';
  const section = current?.section || 'Workspace';

  // Global ⌘K / Ctrl+K — ignored while typing in a field.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Close the profile menu on outside interaction.
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const menuItems: { label: string; icon: typeof User; run: () => void; danger?: boolean }[] = [
    {
      label: 'Client profile',
      icon: User,
      run: () => navigate('/master-plan'),
    },
    {
      label: 'Load demo workspace',
      icon: FlaskConical,
      run: () => loadDemoWorkspace(),
    },
    {
      label: 'Reset workspace…',
      icon: RotateCcw,
      run: () => setShowResetConfirm(true),
      danger: true,
    },
    {
      label: 'Sign out',
      icon: LogOut,
      run: () => logout(),
      danger: true,
    },
  ];

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    if (buttons.length === 0) return;
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === 'ArrowDown'
        ? (idx + 1) % buttons.length
        : (idx - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  return (
    <>
      <header className="sticky top-0 z-30 glass-header px-4 sm:px-6 lg:px-10 py-2.5 text-ink">
        <div className="flex items-center gap-3 max-w-[1440px] mx-auto w-full min-w-0">
          {/* Mobile: hamburger + mark */}
          <div className="flex items-center gap-2 lg:hidden min-w-0 flex-1">
            <button
              onClick={onMenuClick}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="p-2 -ml-2 min-h-11 min-w-11 flex items-center justify-center text-muted hover:text-ink rounded-md hover:bg-sunken transition-colors shrink-0"
            >
              <Menu size={18} strokeWidth={1.7} />
            </button>
            <Link to="/" aria-label="Sound Thesis home" className="shrink-0 text-ink">
              <LogoMark size={24} />
            </Link>
            <span className="text-[13px] font-medium text-ink truncate">{label}</span>
          </div>

          {/* Desktop: breadcrumb */}
          <div className="hidden lg:flex items-baseline gap-2 min-w-0">
            <span className="eyebrow">{section}</span>
            <span className="text-muted text-xs" aria-hidden="true">/</span>
            <span className="text-sm font-medium text-ink tracking-tight truncate">{label}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0 min-w-0">
            {/* Command palette trigger */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 pl-2.5 pr-2 py-1.5 min-h-8 rounded-md border border-border bg-surface text-muted hover:text-ink hover:border-border-strong transition-colors"
              aria-label="Open search (Command K)"
            >
              <Search size={14} strokeWidth={1.7} />
              <span className="text-[13px]">Search</span>
              <kbd className="text-[10px] text-muted border border-border rounded-sm px-1 font-mono leading-[14px]">
                ⌘K
              </kbd>
            </button>

            {/* Net worth — only when a plan is configured */}
            {wealthResult.isConfigured && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink"
                title="Net worth"
              >
                <Wallet size={14} strokeWidth={1.7} className="text-accent-strong shrink-0" />
                <span className="text-[13px] font-medium tabular-nums">
                  {formatCurrencyCompact(wealthResult.netWorth)}
                </span>
              </div>
            )}

            {/* Risk profile — only when the questionnaire has real answers */}
            {hasRiskAnswers && (
              <Link
                to="/risk"
                title={`Risk profile: ${riskProfile.label} (${riskScore}/100)`}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface text-ink hover:border-border-strong transition-colors"
              >
                <ShieldCheck size={14} strokeWidth={1.7} className="text-accent-strong shrink-0" />
                <span className="text-[13px] font-medium capitalize">{riskProfile.label}</span>
                <span className="text-[11px] text-muted tabular-nums">{riskScore}</span>
              </Link>
            )}

            <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />

            {/* Profile menu */}
            <div ref={menuRef} className="relative">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Workspace menu"
                className="flex items-center rounded-md transition-colors hover:bg-sunken"
              >
                <Avatar name={user?.fullName || inputs.client.advisor || 'Sound Thesis'} id={user?.email || inputs.client.email} size="sm" />
                <ChevronDown
                  size={13}
                  strokeWidth={1.7}
                  className="hidden sm:block text-faint ml-0.5 transition-transform duration-150"
                  style={{ transform: menuOpen ? 'rotate(180deg)' : undefined }}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Workspace menu"
                  onKeyDown={handleMenuKeyDown}
                  className="absolute right-0 top-full mt-1.5 w-56 bg-raised border border-border rounded-md shadow-popover py-1 z-50"
                >
                  {menuItems.map((item, i) => (
                    <div key={item.label}>
                      {i === menuItems.length - 2 && (
                        <div className="my-1 border-t border-border-subtle" role="separator" />
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          closeMenu();
                          item.run();
                        }}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                          item.danger
                            ? 'text-negative hover:bg-negative-soft'
                            : 'text-ink hover:bg-sunken'
                        }`}
                      >
                        <item.icon size={15} strokeWidth={1.7} className={item.danger ? 'text-negative' : 'text-faint'} />
                        {item.label}
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-border-subtle px-3 py-2">
                    <p className="truncate text-[11px] text-muted">{user?.email ?? 'Local workspace'}</p>
                    <p className="mt-0.5 truncate text-[11px] text-faint">{organizationName ?? 'Personal practice'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onRequestReset={() => setShowResetConfirm(true)}
      />

      <ConfirmDialog
        open={showResetConfirm}
        onConfirm={() => {
          resetToDefaults();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
        title="Reset this planning workspace?"
        description="This will clear current inputs and return the workspace to a blank planning state."
        confirmLabel="Reset"
        danger
      />
    </>
  );
};
