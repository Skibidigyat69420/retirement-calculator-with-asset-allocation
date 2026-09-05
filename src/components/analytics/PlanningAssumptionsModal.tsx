import { useState } from 'react';
import {
  Sliders,
  X,
  Database,
  Shield,
  History,
  Edit3,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { NumberInput } from '../ui/NumberInput';
import { useCalculator } from '../../context/CalculatorContext';
import { ASSET_LABELS } from '../../lib/constants';
import type { AssetCategory, AssumptionMode } from '../../types';

interface PlanningAssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlanningAssumptionsModal = ({ isOpen, onClose }: PlanningAssumptionsModalProps) => {
  const {
    assumptionMode,
    setAssumptionMode,
    assumptions,
    customCategoryReturns,
    setCustomCategoryReturns,
    showToast,
    logDecision,
  } = useCalculator();

  const [selectedMode, setSelectedMode] = useState<AssumptionMode>(assumptionMode);
  const [localOverrides, setLocalOverrides] = useState<Partial<Record<AssetCategory, number>>>(() => {
    return {
      equity: (customCategoryReturns.equity ?? assumptions.categories.equity.mean * 100),
      debt: (customCategoryReturns.debt ?? assumptions.categories.debt.mean * 100),
      gold: (customCategoryReturns.gold ?? assumptions.categories.gold.mean * 100),
      realestate: (customCategoryReturns.realestate ?? assumptions.categories.realestate.mean * 100),
      liquid: (customCategoryReturns.liquid ?? assumptions.categories.liquid.mean * 100),
      other: (customCategoryReturns.other ?? assumptions.categories.other.mean * 100),
    };
  });

  if (!isOpen) return null;

  const handleSave = () => {
    setAssumptionMode(selectedMode);
    if (selectedMode === 'override') {
      setCustomCategoryReturns(localOverrides);
    }
    logDecision({
      category: 'retirement',
      actionTitle: `Return Assumption Model Updated`,
      summary: `Switched planning return assumption methodology to ${selectedMode}.`,
      newValue: selectedMode.toUpperCase(),
      rationale: `Aligned cashflows and wealth engine projections under unified ${selectedMode} model.`,
      author: 'Adviser',
    });
    showToast(`Saved return assumption methodology: ${selectedMode}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-5 animate-drawer-in">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-sans font-bold text-zinc-900 flex items-center gap-2">
              <Sliders size={18} className="text-zinc-800" />
              Planning Return Assumption Architecture
            </h3>
            <p className="text-xs text-zinc-500">
              Select the standardized return assumption methodology applied across cashflows and the wealth engine.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            <X size={18} />
          </button>
        </div>

        {/* 4 Methodologies */}
        <div className="space-y-2.5">
          {[
            {
              id: 'market',
              name: 'Market-Derived Estimate (Empirical)',
              desc: 'Calibrated directly from 10-year daily historical CSV return and covariance data.',
              icon: Database,
            },
            {
              id: 'conservative',
              name: 'Conservative Advisory Benchmark',
              desc: 'Prudent institutional baseline (10% Equity, 6.5% Debt, 8% Gold) for cautious planning.',
              icon: Shield,
            },
            {
              id: 'historical',
              name: 'Long-Term Historical Indian Benchmark',
              desc: '20-year Indian capital markets historical compound asset returns (13.8% Eq, 7.2% Debt).',
              icon: History,
            },
            {
              id: 'override',
              name: 'Adviser Manual Override',
              desc: 'Specify customized expected annualized returns per asset category with audit tracking.',
              icon: Edit3,
            },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMode === m.id;
            return (
              <label
                key={m.id}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-zinc-50 border-zinc-900 shadow-2xs'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <input
                  type="radio"
                  name="assumptionMode"
                  value={m.id}
                  checked={isSelected}
                  onChange={() => setSelectedMode(m.id as any)}
                  className="mt-1 accent-slate-900"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={isSelected ? 'text-zinc-900' : 'text-zinc-500'} />
                    <span className="text-xs font-bold text-zinc-900">{m.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{m.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        {/* Manual Overrides Grid if Override Selected */}
        {selectedMode === 'override' && (
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
            <span className="text-[10px] uppercase font-bold text-zinc-700 block">
              Custom Category Return Rates (% p.a.):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as AssetCategory[]).map((cat) => (
                <NumberInput
                  key={cat}
                  label={ASSET_LABELS[cat]}
                  value={localOverrides[cat] ?? 8}
                  onChange={(v) => setLocalOverrides((prev) => ({ ...prev, [cat]: v }))}
                  suffix="%"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-zinc-900 text-white hover:bg-zinc-800">
            Apply Methodology
          </Button>
        </div>
      </div>
    </div>
  );
};
