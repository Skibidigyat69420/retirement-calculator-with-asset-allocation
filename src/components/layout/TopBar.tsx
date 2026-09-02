import { useState, useEffect, useRef } from 'react';
import { Menu, ChevronRight, CheckCircle2, AlertTriangle, RotateCcw, Printer, Wallet, User, ShieldCheck } from 'lucide-react';
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

  const isPrintablePage = location.pathname === '/reports' || location.pathname === '/ips';

  const handlePrint = () => {
    window.print();
  };

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
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-3 transition-all">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto min-w-0">
          {/* Mobile hamburger & title */}
          <div className="flex items-center gap-3 lg:hidden min-w-0 flex-1">
            <button
              onClick={onMenuClick}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="p-2 -ml-2 text-stone-700 hover:text-navy rounded-xl hover:bg-stone-100 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center shrink-0">
                <span className="text-gold font-serif font-bold text-xs">S</span>
              </div>
              <span className="text-sm font-serif text-navy font-semibold truncate max-w-[120px] sm:max-w-[200px]">{label}</span>
            </div>
          </div>

          {/* Desktop Breadcrumbs */}
          <div className="hidden lg:flex items-center gap-2 text-xs min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">{section}</span>
            <ChevronRight size={14} className="text-stone-300" />
            <span className="font-serif text-navy font-semibold text-sm">{label}</span>
          </div>

          {/* Desktop & Mobile Top Badges */}
          <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0 min-w-0">
            {/* Client Profile Chip */}
            <Link
              to="/master-plan"
              title="Click to edit client profile in Master Plan"
              aria-label={`Client profile: ${inputs.client?.name || 'Client Plan'}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:border-gold/60 text-xs font-medium text-navy transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <User size={13} className="text-gold shrink-0" />
              <span className="hidden sm:inline max-w-[120px] sm:max-w-[160px] truncate">
                {inputs.client?.name || 'Client Plan'}
              </span>
            </Link>

            {/* Risk Profile Pill (Desktop) */}
            <Link
              to="/risk"
              title={`Risk Score: ${riskScore}/100. Click to view Questionnaire`}
              aria-label={`Risk profile: ${riskProfile.label} (${riskScore})`}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:border-navy/40 text-xs font-medium text-stone-700 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              <ShieldCheck size={13} className="text-navy shrink-0" />
              <span className="capitalize">{riskProfile.label}</span>
              <span className="text-[10px] text-stone-600 font-mono">({riskScore})</span>
            </Link>

            {/* Plan Longevity Pill */}
            <Link
              to="/retirement"
              title={wealthResult.sustainable ? 'Plan sustainable through life expectancy' : `Plan depletes at age ${wealthResult.depletionAge}`}
              aria-label={wealthResult.sustainable ? 'Plan sustainable through life expectancy' : `Plan depletes at age ${wealthResult.depletionAge}`}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-navy/30 ${
                wealthResult.sustainable
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/80'
              }`}
            >
              {wealthResult.sustainable ? (
                <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
              )}
              <span>
                {wealthResult.sustainable
                  ? 'Sustainable'
                  : `Depletion: Age ${wealthResult.depletionAge ?? '—'}`}
              </span>
            </Link>

            {/* Net Worth Chip */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy text-white text-xs font-semibold shadow-xs min-w-0">
              <Wallet size={13} className="text-gold shrink-0" />
              <span className="truncate max-w-[90px] sm:max-w-none">{formatCurrencyCompact(wealthResult.netWorth)}</span>
            </div>

            {/* Print button on Reports/IPS */}
            {isPrintablePage && (
              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 hover:border-navy text-stone-600 hover:text-navy text-xs font-medium transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-navy/30"
                title="Print or export as PDF"
                aria-label="Print or export as PDF"
              >
                <Printer size={13} />
                <span className="hidden md:inline">Print</span>
              </button>
            )}

            {/* Quick Reset Plan Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-1.5 text-stone-600 hover:text-rose-600 rounded-lg hover:bg-white hover:border-stone-200 border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-xs"
          role="presentation"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reset-title" className="text-base font-serif font-bold text-navy mb-2">
              Reset Plan Inputs?
            </h3>
            <p className="text-xs text-stone-700 mb-6 leading-relaxed">
              This will revert all client profile information, assets, SIP/STP/SWP allocations, and questionnaire responses back to the default sample client.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                ref={cancelButtonRef}
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
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
