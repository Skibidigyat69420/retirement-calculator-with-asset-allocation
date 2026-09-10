import { Sliders, Percent, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { NumberInput } from '../ui/NumberInput';
import { Badge } from '../ui/Badge';
import type { MasterPlanInputs, AssumptionMode } from '../../types';

interface AssumptionsStepProps {
  inputs: MasterPlanInputs;
  updateInputs: (updates: Partial<MasterPlanInputs>) => void;
  assumptionMode: AssumptionMode;
  setAssumptionMode: (mode: AssumptionMode) => void;
  activeAssumptionSourceLabel: string;
  onNext: () => void;
  onBack: () => void;
}

export const AssumptionsStep = ({
  inputs,
  updateInputs,
  assumptionMode,
  setAssumptionMode,
  activeAssumptionSourceLabel,
  onNext,
  onBack,
}: AssumptionsStepProps) => {
  const inflation = inputs.inflation;

  const MODES: { id: AssumptionMode; label: string; desc: string }[] = [
    { id: 'conservative', label: 'Conservative', desc: 'Prudent buffer with lower equity return expectations (7% inflation, 10% equity).' },
    { id: 'market', label: 'Standard / Market', desc: 'RBI target aligned long-term baseline (6% inflation, 12% equity, 7% debt).' },
    { id: 'historical', label: 'Long-term Historical', desc: 'Long-run historical annualized asset class averages and realized volatility.' },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <Card className="border border-border space-y-2">
        <div className="flex items-center gap-2">
          <Sliders size={20} className="text-accent" />
          <h3 className="text-lg font-bold text-ink">Capital Market Assumptions & Inflation</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Set forward-looking baseline expected returns across asset classes and long-term purchasing power erosion (inflation).
        </p>
      </Card>

      {/* Preset Assumption Regimes */}
      <Card className="border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink">Market Regime Presets</h4>
            <span className="text-xs text-muted">Currently Active: <strong className="text-accent">{activeAssumptionSourceLabel}</strong></span>
          </div>
          <Badge variant="navy" className="text-xs capitalize">
            {assumptionMode}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map((m) => {
            const isSelected = assumptionMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setAssumptionMode(m.id)}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'bg-accent-soft border-accent ring-1 ring-accent/40 shadow-xs'
                    : 'bg-sunken border-border hover:border-border-strong hover:bg-surface'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-ink">{m.label}</span>
                  {isSelected && <Sparkles size={13} className="text-accent" />}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {m.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Primary Macro Assumptions */}
      <Card className="border border-border space-y-5">
        <h4 className="text-sm font-bold text-ink flex items-center gap-2 border-b border-border pb-3">
          <Percent size={16} className="text-warning" />
          Household Inflation & Real Return Baseline
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberInput
            label="Baseline Living Inflation Rate (%)"
            value={inputs.inflation}
            onChange={(val) => updateInputs({ inflation: val })}
            suffix="%"
            step={0.25}
            min={3}
            max={12}
            presets={[
              { label: '5.5% (Low)', value: 5.5 },
              { label: '6.0% (RBI Base)', value: 6.0 },
              { label: '7.0% (Prudent)', value: 7.0 },
              { label: '8.0% (High)', value: 8.0 },
            ]}
          />

          <div className="p-4 rounded-xl bg-sunken border border-border space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted block">
              Purchasing Power Compounding Rule
            </span>
            <p className="text-xs text-muted leading-relaxed">
              At <strong className="text-ink font-mono">{inflation}%</strong> inflation, living expenses will double every{' '}
              <strong className="text-ink font-mono">{Math.round(72 / Math.max(1, inflation))} years</strong>.
            </p>
          </div>
        </div>

        {/* Step Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft size={15} />
            <span>Back: Risk</span>
          </Button>
          <Button onClick={onNext} className="flex items-center gap-2">
            <span>Next: Projections & Scenario Lab</span>
            <ArrowRight size={15} />
          </Button>
        </div>
      </Card>
    </div>
  );
};
