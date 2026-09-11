import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { NumberInput } from '../ui/NumberInput';
import { Badge } from '../ui/Badge';
import { formatOrDash } from '../../lib/planState';
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
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Step 06 · Assumptions</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Market assumptions</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Forward-looking expected returns and long-term purchasing-power erosion (inflation) applied across the wealth engine.
        </p>
      </header>

      {/* Preset regimes */}
      <section className="border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
          <div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight">Market regime presets</h3>
            <p className="mt-0.5 text-xs text-muted">
              Active source: <span className="text-accent">{activeAssumptionSourceLabel}</span>
            </p>
          </div>
          <Badge tone="brass" className="capitalize">{assumptionMode}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map((m) => {
            const isSelected = assumptionMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setAssumptionMode(m.id)}
                aria-pressed={isSelected}
                className={`p-4 rounded-md text-left border transition-colors duration-150 cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'bg-accent-soft border-accent'
                    : 'bg-surface border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-ink">{m.label}</span>
                  {isSelected && <Sparkles size={13} strokeWidth={1.7} className="text-accent" aria-hidden="true" />}
                </div>
                <p className="text-[11px] text-muted leading-relaxed">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Inflation */}
      <section className="border-t border-border pt-6">
        <h3 className="text-[15px] font-semibold text-ink tracking-tight">Inflation & real returns</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5 items-start">
          <NumberInput
            label="Baseline living inflation rate"
            value={inputs.inflation}
            onChange={(val) => updateInputs({ inflation: val })}
            suffix="%"
            step={0.25}
            min={0}
            max={12}
            presets={[
              { label: '5.5%', value: 5.5 },
              { label: '6.0% RBI', value: 6.0 },
              { label: '7.0% prudent', value: 7.0 },
              { label: '8.0% high', value: 8.0 },
            ]}
          />

          <div className="border border-border rounded-md bg-sunken px-4 py-3.5">
            <span className="eyebrow block">Purchasing power rule</span>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              At{' '}
              <span className="font-mono tabular-nums text-ink">
                {formatOrDash(inflation > 0 ? inflation : null, (v) => `${v}%`)}
              </span>{' '}
              inflation, living expenses double every{' '}
              <span className="font-mono tabular-nums text-ink">
                {formatOrDash(inflation > 0 ? Math.round(72 / inflation) : null, (v) => `${v} years`)}
              </span>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Step navigation */}
      <div className="flex justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back · Risk</span>
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2">
          <span>Next · Outlook</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
