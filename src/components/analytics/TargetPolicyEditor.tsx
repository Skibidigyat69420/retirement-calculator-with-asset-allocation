import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, RotateCcw, SlidersHorizontal, TrendingUp, AlertTriangle } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Slider } from '../ui/Slider';
import { useCalculator } from '../../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { AssetCategory } from '../../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

interface TargetPolicyEditorProps {
  /** Controlled by the page so trade-ticket row menus can open the drawer too. */
  drawerOpen: boolean;
  onDrawerOpen: () => void;
  onDrawerClose: () => void;
}

/**
 * Strategic policy targets — pick a basis (risk profile or manual) and edit
 * the manual mix in a drawer. Works without a portfolio: targets are policy,
 * not holdings.
 */
export const TargetPolicyEditor = ({ drawerOpen, onDrawerOpen, onDrawerClose }: TargetPolicyEditorProps) => {
  const { riskProfile, manualTargets, setManualTargets, setInputs, showToast } = useCalculator();
  const targets = manualTargets || riskProfile.targets;
  const [basis, setBasis] = useState<'profile' | 'manual'>(manualTargets ? 'manual' : 'profile');

  // External writes (MVO apply, lab apply) flip the basis to manual.
  useEffect(() => {
    if (manualTargets) setBasis('manual');
  }, [manualTargets]);

  const sum = Object.values(targets).reduce((a, b) => a + b, 0);
  const balanced = Math.abs(sum - 100) < 0.1;

  const handleBasisChange = (v: string) => {
    if (v === 'manual') {
      setManualTargets((prev) => prev || { ...riskProfile.targets });
      setBasis('manual');
      onDrawerOpen();
    } else {
      setManualTargets(null);
      setBasis('profile');
    }
  };

  const handleTargetChange = (category: AssetCategory, newValue: number) => {
    setManualTargets((prev) => ({ ...(prev || riskProfile.targets), [category]: newValue }));
  };

  const normalizeTargets = () => {
    setManualTargets((prev) => {
      const current = prev || riskProfile.targets;
      const total = Object.values(current).reduce((a, b) => a + b, 0);
      if (total <= 0) return prev;
      const scaled = { ...current };
      (Object.keys(scaled) as AssetCategory[]).forEach((cat) => {
        scaled[cat] = (scaled[cat] / total) * 100;
      });
      const investable = scaled.equity + scaled.debt;
      if (investable > 0) {
        const equitySplit = Math.round((scaled.equity / investable) * 100);
        setInputs((prevInputs) => ({
          ...prevInputs,
          sip: { ...prevInputs.sip, equitySplit, debtSplit: 100 - equitySplit },
          stp: { ...prevInputs.stp, equitySplit, debtSplit: 100 - equitySplit },
        }));
      }
      return scaled;
    });
    showToast('Targets normalized to 100% and synced to SIP/STP flows.', 'info');
  };

  const syncTargetsToCashflows = () => {
    const investable = targets.equity + targets.debt;
    const equitySplit = investable > 0 ? Math.round((targets.equity / investable) * 100) : 50;
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));
    showToast(`Synced strategic targets to monthly SIP/STP (${equitySplit}% Equity / ${100 - equitySplit}% Debt).`, 'success');
  };

  const resetToProfile = () => {
    setManualTargets(null);
    setBasis('profile');
    showToast(`Reset targets to the ${riskProfile.label} profile.`, 'info');
  };

  return (
    <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Strategic policy targets">
      <SectionHeader
        title="Strategic Policy Targets"
        description="Policy weights that define the target mix. Edit the manual basis in the drawer."
        action={
          <SegmentedControl
            ariaLabel="Target basis"
            value={basis}
            onChange={handleBasisChange}
            options={[
              { value: 'profile', label: 'Risk profile' },
              { value: 'manual', label: 'Manual' },
            ]}
          />
        }
      />

      {/* Target mix preview bar */}
      <div
        className="flex h-6 w-full overflow-hidden rounded-sm border border-border-subtle bg-sunken"
        role="img"
        aria-label={`Target mix: ${CATEGORIES.filter((c) => targets[c] > 0.5).map((c) => `${ASSET_LABELS[c]} ${targets[c].toFixed(0)}%`).join(', ')}`}
      >
        {CATEGORIES.filter((c) => targets[c] > 0.05).map((c) => (
          <div
            key={c}
            className="h-full border-r border-raised/60 last:border-r-0"
            style={{ width: `${targets[c]}%`, backgroundColor: ASSET_COLORS[c] }}
            title={`${ASSET_LABELS[c]} — ${formatPercent(targets[c], 0)}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="text-muted">
          {basis === 'profile' ? (
            <>
              Derived from the{' '}
              <Link to="/risk" className="text-accent-strong underline underline-offset-2 hover:text-accent">
                {riskProfile.label}
              </Link>{' '}
              risk profile
            </>
          ) : (
            'Manual override of the strategic policy'
          )}
        </span>
        <span className={cn('font-mono tabular-nums font-semibold', balanced ? 'text-positive' : 'text-warning')}>
          Σ {formatPercent(sum, 0)}
        </span>
      </div>

      {!balanced && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/25 bg-warning-soft/60 px-3 py-2 text-xs text-ink">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle size={13} strokeWidth={1.8} className="text-warning shrink-0" aria-hidden="true" />
            Weights sum to {formatPercent(sum, 0)} — normalize before syncing.
          </span>
          <Button size="sm" variant="outline" onClick={normalizeTargets} className="h-7 text-xs">
            Normalize to 100%
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        <Button size="sm" variant="secondary" onClick={() => {
          setManualTargets((prev) => prev || { ...riskProfile.targets });
          setBasis('manual');
          onDrawerOpen();
        }} className="gap-1.5" aria-haspopup="dialog">
          <Pencil size={13} strokeWidth={1.6} aria-hidden="true" /> Edit targets
        </Button>
        <Button size="sm" variant="outline" onClick={syncTargetsToCashflows} className="gap-1.5">
          <SlidersHorizontal size={13} strokeWidth={1.6} aria-hidden="true" /> Sync to SIP/STP
        </Button>
        {basis === 'manual' && (
          <Button size="sm" variant="ghost" onClick={resetToProfile} className="gap-1.5 text-muted hover:text-ink">
            <RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" /> Reset
          </Button>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={onDrawerClose} title="Edit Manual Targets" width={480}>
        <div className="space-y-5">
          <p className="text-xs text-muted leading-relaxed">
            Set policy weights per asset class. SIP and STP flows support Equity/Debt splits only — gold, real
            estate, and other weights shape rebalancing tickets and projections.
          </p>
          <div className="space-y-4">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                <div className="flex-1">
                  <Slider
                    label={ASSET_LABELS[cat]}
                    value={Math.round(targets[cat])}
                    onChange={(v) => handleTargetChange(cat, v)}
                    min={0}
                    max={100}
                    suffix="%"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border-subtle pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Target allocation sum</span>
              <span className={cn('font-mono tabular-nums font-semibold', balanced ? 'text-positive' : 'text-warning')}>
                {formatPercent(sum, 0)}
              </span>
            </div>
            {!balanced && (
              <Button size="sm" variant="outline" onClick={normalizeTargets} className="w-full">
                Normalize to 100% &amp; sync flows
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={syncTargetsToCashflows} className="w-full gap-1.5">
              <TrendingUp size={13} strokeWidth={1.6} aria-hidden="true" /> Sync to SIP/STP
            </Button>
            <Button size="sm" variant="ghost" onClick={resetToProfile} className="w-full gap-1.5 text-muted hover:text-ink">
              <RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" /> Reset to {riskProfile.label} profile
            </Button>
          </div>
        </div>
      </Drawer>
    </section>
  );
};
