import { useState, useEffect, useRef } from 'react';
import { Menu, ChevronRight, CheckCircle2, AlertTriangle, RotateCcw, Wallet, User, ShieldCheck, FileDown } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { navItems, utilityItem } from './navItems';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact } from '../../lib/formatters';

interface TopBarProps {
  onMenuClick: () => void;
  mobileOpen?: boolean;
}

export const TopBar = ({ onMenuClick, mobileOpen }: TopBarProps) => {
  const location = useLocation();
  const { inputs, riskProfile, riskScore, wealthResult, resetToDefaults } = useCalculator();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const current =
    navItems.find((item) => item.path === location.pathname) ||
    (utilityItem.path === location.pathname ? utilityItem : null);
  const label = current?.label || 'Overview';
  const section = current?.section || 'Advisory';

  const confirmReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
  };

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showResetConfirm) return;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowResetConfirm(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirm]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 py-2.5 transition-all shadow-xs text-ink">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto min-w-0">
          {/* Mobile hamburger & title */}
          <div className="flex items-center gap-3 lg:hidden min-w-0 flex-1">
            <button
              onClick={onMenuClick}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="p-2 -ml-2 min-h-11 min-w-11 flex items-center justify-center text-muted hover:text-ink rounded-xl hover:bg-sunken transition-colors shrink-0"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 bg-accent rounded-lg flex items-center justify-center shrink-0 shadow-2xs">
                <span className="text-white font-sans font-extrabold text-[10px]">ST</span>
              </div>
              <span className="text-sm font-sans text-ink font-bold truncate max-w-[140px] sm:max-w-[220px]">
                {label}
              </span>
            </div>
          </div>

          {/* Desktop Breadcrumbs */}
          <div className="hidden lg:flex items-center gap-2 text-xs min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-faint">
              {section}
            </span>
            <ChevronRight size={13} className="text-muted shrink-0" />
            <span className="font-sans text-ink font-bold text-sm tracking-tight">
              {label}
            </span>
          </div>

          {/* Desktop & Mobile Top Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0 min-w-0">
            {/* Client Profile Chip */}
            <Link
              to="/master-plan"
              title="Click to edit client profile in Master Plan"
              aria-label={`Client profile: ${inputs.client?.name || 'Client Plan'}`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-9 rounded-xl bg-sunken hover:bg-surface border border-border hover:border-border-strong text-xs font-semibold text-ink-soft hover:text-ink transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent/40 group"
            >
              <User size={13} className="text-muted shrink-0" />
              <span className="hidden sm:inline max-w-[120px] sm:max-w-[150px] truncate">
                {inputs.client?.name || 'Client Plan'}
              </span>
            </Link>

            {/* Risk Profile Pill (Desktop) */}
            <Link
              to="/risk"
              title={`Risk Score: ${riskScore}/100. Click to view Questionnaire`}
              aria-label={`Risk profile: ${riskProfile.label} (${riskScore})`}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 min-h-9 rounded-xl bg-sunken hover:bg-surface border border-border hover:border-border-strong text-xs font-semibold text-ink-soft hover:text-ink transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <ShieldCheck size={13} className="text-muted shrink-0" />
              <span className="capitalize">{riskProfile.label}</span>
              <span className="text-[10px] text-ink bg-raised border border-border px-1.5 py-0.5 rounded-md font-mono font-bold tabular-nums">
                {riskScore}
              </span>
            </Link>

            {/* Plan Longevity Pill */}
            <Link
              to="/retirement"
              title={wealthResult.sustainable ? 'Plan sustainable through life expectancy' : `Plan depletes at age ${wealthResult.depletionAge}`}
              aria-label={wealthResult.sustainable ? 'Plan sustainable through life expectancy' : `Plan depletes at age ${wealthResult.depletionAge}`}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 min-h-9 rounded-xl border text-xs font-semibold transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                wealthResult.sustainable
                  ? 'bg-positive-soft text-positive border-positive/30 hover:bg-positive-soft/80'
                  : 'bg-warning-soft text-warning border-warning/30 hover:bg-warning-soft/80'
              }`}
            >
              {wealthResult.sustainable ? (
                <CheckCircle2 size={13} className="text-positive shrink-0" />
              ) : (
                <AlertTriangle size={13} className="text-warning shrink-0" />
              )}
              <span>
                {wealthResult.sustainable
                  ? 'Sustainable'
                  : `Depletion: Age ${wealthResult.depletionAge ?? '—'}`}
              </span>
            </Link>

            {/* Net Worth Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border-strong text-ink text-xs font-semibold shadow-xs min-w-0">
              <Wallet size={13} className="text-accent shrink-0" />
              <span className="truncate max-w-[90px] sm:max-w-none font-mono tabular-nums font-bold">
                {formatCurrencyCompact(wealthResult.netWorth)}
              </span>
            </div>

            {/* Export Complete PDF Button */}
            <Link
              to="/dossier?autoPrint=true"
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-xl bg-accent hover:bg-accent-strong text-white text-xs font-semibold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-accent/40 shrink-0"
              title="Export complete snapshot of all pages as a PDF"
              aria-label="Export complete snapshot of all pages as a PDF"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">Export PDF</span>
            </Link>

            {/* Quick Reset Plan Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-2 min-h-11 min-w-11 flex items-center justify-center text-muted hover:text-negative rounded-xl hover:bg-negative-soft hover:border-negative/30 border border-transparent transition-all"
              title="Reset plan inputs to defaults"
              aria-label="Reset plan inputs to defaults"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm animate-overlay-in"
          role="presentation"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-drawer-in text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-negative-soft border border-negative/30 flex items-center justify-center text-negative shrink-0">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3 id="reset-title" className="text-base font-sans font-bold text-ink">
                  Reset Plan Inputs?
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed text-pretty">
                  This will revert all client profile information, assets, SIP/STP/SWP allocations, and questionnaire responses back to the default sample client.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                ref={cancelButtonRef}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink hover:bg-sunken rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-negative hover:brightness-110 rounded-xl transition-colors shadow-xs"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
