import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, RotateCcw, SlidersHorizontal, TrendingUp, AlertTriangle, FileCheck2 } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Slider } from '../ui/Slider';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useCalculator } from '../../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { AssetCategory, ManualAllocationPolicy } from '../../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const makePolicy = (targets: Record<AssetCategory, number>, clientName: string): ManualAllocationPolicy => ({
  name: `${clientName || 'Client'} Strategic Allocation`,
  objective: 'Long-term capital growth with disciplined downside and liquidity management.',
  rationale: '',
  constraints: '',
  reviewFrequency: 'semiannual',
  rebalanceThreshold: 5,
  status: 'draft',
  effectiveDate: new Date().toISOString().slice(0, 10),
  approvedBy: '',
  ranges: Object.fromEntries(CATEGORIES.map((cat) => [cat, {
    min: Math.max(0, Math.round(targets[cat] - 5)),
    max: Math.min(100, Math.round(targets[cat] + 5)),
  }])) as ManualAllocationPolicy['ranges'],
  updatedAt: new Date().toISOString(),
});

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
  const { inputs, riskProfile, manualTargets, setManualTargets, manualAllocationPolicy, setManualAllocationPolicy, setInputs, showToast } = useCalculator();
  const targets = manualTargets || riskProfile.targets;
  const [basis, setBasis] = useState<'profile' | 'manual'>(manualTargets ? 'manual' : 'profile');

  // External writes (MVO apply, lab apply) flip the basis to manual.
  useEffect(() => {
    if (manualTargets) setBasis('manual');
  }, [manualTargets]);

  const sum = Object.values(targets).reduce((a, b) => a + b, 0);
  const balanced = Math.abs(sum - 100) < 0.1;
  const invalidRanges = manualAllocationPolicy
    ? CATEGORIES.filter((cat) => {
        const range = manualAllocationPolicy.ranges?.[cat];
        if (!range) return false;
        return range.min > range.max || targets[cat] < range.min || targets[cat] > range.max;
      })
    : [];

  const handleBasisChange = (v: string) => {
    if (v === 'manual') {
      setManualTargets((prev) => prev || { ...riskProfile.targets });
      setManualAllocationPolicy((prev) => prev || makePolicy(manualTargets || riskProfile.targets, inputs.client?.name || 'Client'));
      setBasis('manual');
      onDrawerOpen();
    } else {
      setManualTargets(null);
      setManualAllocationPolicy(null);
      setBasis('profile');
    }
  };

  const handleTargetChange = (category: AssetCategory, newValue: number) => {
    setManualTargets((prev) => ({ ...(prev || riskProfile.targets), [category]: newValue }));
  };

  const updatePolicy = (patch: Partial<ManualAllocationPolicy>) => {
    setManualAllocationPolicy((prev) => ({
      ...(prev || makePolicy(targets, inputs.client?.name || 'Client')),
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateRange = (category: AssetCategory, edge: 'min' | 'max', value: number) => {
    const policy = manualAllocationPolicy || makePolicy(targets, inputs.client?.name || 'Client');
    const fallback = { min: Math.max(0, targets[category] - 5), max: Math.min(100, targets[category] + 5) };
    updatePolicy({ ranges: { ...policy.ranges, [category]: { ...(policy.ranges?.[category] || fallback), [edge]: value } } });
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
    setManualAllocationPolicy(null);
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
            manualAllocationPolicy?.name || 'Manual client allocation'
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

      {basis === 'manual' && manualAllocationPolicy && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border-subtle bg-sunken/40 p-3 text-xs">
          <div><span className="block text-[10px] font-mono uppercase tracking-wider text-faint">Status</span><strong className="mt-1 block capitalize text-ink">{manualAllocationPolicy.status}</strong></div>
          <div><span className="block text-[10px] font-mono uppercase tracking-wider text-faint">Governance</span><strong className="mt-1 block text-ink">{manualAllocationPolicy.reviewFrequency} · ±{manualAllocationPolicy.rebalanceThreshold}%</strong></div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        <Button size="sm" variant="secondary" onClick={() => {
          setManualTargets((prev) => prev || { ...riskProfile.targets });
          setManualAllocationPolicy((prev) => prev || makePolicy(manualTargets || riskProfile.targets, inputs.client?.name || 'Client'));
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

      <Drawer open={drawerOpen} onClose={onDrawerClose} title="Create Client Allocation" width={520}>
        <div className="space-y-5">
          <p className="text-xs text-muted leading-relaxed">
            Set policy weights per asset class. SIP and STP flows support Equity/Debt splits only — gold, real
            estate, and other weights shape rebalancing tickets and projections.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-border bg-sunken/40 p-4">
            <Input
              label="Allocation name"
              value={manualAllocationPolicy?.name || ''}
              onChange={(e) => updatePolicy({ name: e.currentTarget.value })}
              className="sm:col-span-2"
              placeholder="Client strategic allocation"
            />
            <Select
              label="Policy status"
              value={manualAllocationPolicy?.status || 'draft'}
              onChange={(value) => updatePolicy({ status: value as ManualAllocationPolicy['status'] })}
              options={[{ value: 'draft', label: 'Draft' }, { value: 'proposed', label: 'Proposed to client' }, { value: 'approved', label: 'Client approved' }]}
            />
            <Input
              label="Effective date"
              type="date"
              value={manualAllocationPolicy?.effectiveDate || ''}
              onChange={(e) => updatePolicy({ effectiveDate: e.currentTarget.value })}
            />
            <Select
              label="Review frequency"
              value={manualAllocationPolicy?.reviewFrequency || 'semiannual'}
              onChange={(value) => updatePolicy({ reviewFrequency: value as ManualAllocationPolicy['reviewFrequency'] })}
              options={[{ value: 'quarterly', label: 'Quarterly' }, { value: 'semiannual', label: 'Semiannual' }, { value: 'annual', label: 'Annual' }]}
            />
            <Input
              label="Rebalance threshold"
              type="number"
              min={1}
              max={25}
              suffix="%"
              value={manualAllocationPolicy?.rebalanceThreshold ?? 5}
              onChange={(e) => updatePolicy({ rebalanceThreshold: Number(e.currentTarget.value) || 0 })}
            />
          </div>
          <div className="space-y-4">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="rounded-md border border-border-subtle bg-surface p-3">
                <div className="flex items-center gap-3">
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
                <div className="mt-2 grid grid-cols-2 gap-2 pl-5">
                  <Input label="Minimum" type="number" min={0} max={100} suffix="%" value={manualAllocationPolicy?.ranges?.[cat]?.min ?? Math.max(0, targets[cat] - 5)} onChange={(e) => updateRange(cat, 'min', Number(e.currentTarget.value) || 0)} />
                  <Input label="Maximum" type="number" min={0} max={100} suffix="%" value={manualAllocationPolicy?.ranges?.[cat]?.max ?? Math.min(100, targets[cat] + 5)} onChange={(e) => updateRange(cat, 'max', Number(e.currentTarget.value) || 0)} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-ink-soft">Mandate objective<textarea className="input mt-1.5 min-h-20 resize-y" value={manualAllocationPolicy?.objective || ''} onChange={(e) => updatePolicy({ objective: e.currentTarget.value })} placeholder="What this allocation is designed to achieve" /></label>
            <label className="block text-xs font-medium text-ink-soft">Advisor rationale<textarea className="input mt-1.5 min-h-24 resize-y" value={manualAllocationPolicy?.rationale || ''} onChange={(e) => updatePolicy({ rationale: e.currentTarget.value })} placeholder="Why this mix suits the client's goals, capacity and preferences" /></label>
            <label className="block text-xs font-medium text-ink-soft">Constraints &amp; exclusions<textarea className="input mt-1.5 min-h-20 resize-y" value={manualAllocationPolicy?.constraints || ''} onChange={(e) => updatePolicy({ constraints: e.currentTarget.value })} placeholder="Liquidity floor, prohibited assets, tax or concentration constraints" /></label>
            <Input label="Approved by" value={manualAllocationPolicy?.approvedBy || ''} onChange={(e) => updatePolicy({ approvedBy: e.currentTarget.value })} placeholder="Client / committee name" />
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
            {invalidRanges.length > 0 && (
              <div className="rounded-md border border-negative/25 bg-negative-soft p-3 text-xs text-negative">
                Fix the permitted range for {invalidRanges.map((cat) => ASSET_LABELS[cat]).join(', ')}. Each target must sit between its minimum and maximum.
              </div>
            )}
            <Button size="sm" variant="secondary" onClick={syncTargetsToCashflows} className="w-full gap-1.5">
              <TrendingUp size={13} strokeWidth={1.6} aria-hidden="true" /> Sync to SIP/STP
            </Button>
            <Button size="sm" variant="primary" disabled={!balanced || invalidRanges.length > 0} onClick={() => {
              updatePolicy({ status: manualAllocationPolicy?.status || 'draft' });
              syncTargetsToCashflows();
              onDrawerClose();
              showToast('Client allocation policy saved and included in the dossier.', 'success');
            }} className="w-full gap-1.5">
              <FileCheck2 size={13} strokeWidth={1.6} aria-hidden="true" /> Save client allocation
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
