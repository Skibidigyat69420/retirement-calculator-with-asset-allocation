import { Sparkles } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { FormSection } from '../ui/FormSection';
import { formatOrDash } from '../../lib/planState';
import type { MasterPlanInputs, AssumptionMode } from '../../types';
import { useCalculator } from '../../context/CalculatorContext';

interface AssumptionsStepProps {
  inputs: MasterPlanInputs;
  updateInputs: (updates: Partial<MasterPlanInputs>) => void;
  assumptionMode: AssumptionMode;
  setAssumptionMode: (mode: AssumptionMode) => void;
  activeAssumptionSourceLabel: string;
}

export const AssumptionsStep = ({
  inputs,
  updateInputs,
  assumptionMode,
  setAssumptionMode,
  activeAssumptionSourceLabel,
}: AssumptionsStepProps) => {
  const { assumptions } = useCalculator();
  const inflation = inputs.inflation;
  const fxCurrencyCount = Object.keys(assumptions.fx).length;
  const reportingCurrency = inputs.reportingCurrency || 'INR';
  const currencyOptions = Object.keys(assumptions.fx)
    .sort((a, b) => (a === 'INR' ? -1 : b === 'INR' ? 1 : a.localeCompare(b)))
    .map((currency) => ({ value: currency, label: currency }));
  const fxSource = assumptions.fxSource === 'bundled-fallback' ? 'Bundled fallback' : 'Frankfurter reference feed';
  const fxAsOf = assumptions.fxAsOf
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(`${assumptions.fxAsOf}T00:00:00Z`))
    : 'Not yet refreshed';

  const MODES: { id: AssumptionMode; label: string; desc: string }[] = [
    { id: 'conservative', label: 'Conservative', desc: 'Prudent buffer with lower equity return expectations (7% inflation, 10% equity).' },
    { id: 'market', label: 'Standard / Market', desc: 'RBI target aligned long-term baseline (6% inflation, 12% equity, 7% debt).' },
    { id: 'historical', label: 'Long-term Historical', desc: 'Long-run historical annualized asset class averages and realized volatility.' },
  ];

  return (
    <div>
      <div className="py-2.5 pb-4 flex items-center justify-between gap-4 flex-wrap border-b border-border/60 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Economic Assumptions & Market Regimes</h2>
          <p className="text-xs text-muted max-w-prose mt-0.5">
            Forward-looking expected returns and long-term purchasing-power erosion (inflation) applied across the wealth engine.
          </p>
        </div>
      </div>

      {/* Preset regimes */}
      <FormSection
        index="01"
        title="Market regime presets"
        description={`Active source: ${activeAssumptionSourceLabel}`}
      >
        <div className="flex justify-end -mt-1 mb-3">
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
      </FormSection>

      {/* Inflation */}
      <FormSection
        index="02"
        title="Inflation & real returns"
        className="mt-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 items-start">
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
            slider
          />

          <div className="border border-border rounded-md bg-sunken px-4 py-3.5">
            <span className="text-xs font-semibold text-ink block">Purchasing power rule</span>
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
      </FormSection>

      <FormSection
        index="03"
        title="Currency normalization"
        description="Every input is normalized to INR for calculation. Select any supported currency to view live plan outputs in that currency."
        className="mt-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border">
          <div className="bg-raised px-4 py-3"><span className="block text-[10px] font-mono uppercase tracking-wide text-muted">Planning base</span><strong className="mt-1 block text-sm text-ink">INR</strong></div>
          <div className="bg-raised px-4 py-3">
            <Select
              layout="inline"
              label="Reporting currency"
              value={reportingCurrency}
              onChange={(currency) => updateInputs({ reportingCurrency: currency })}
              options={currencyOptions}
            />
          </div>
          <div className="bg-raised px-4 py-3"><span className="block text-[10px] font-mono uppercase tracking-wide text-muted">Coverage</span><strong className="mt-1 block text-sm text-ink">{fxCurrencyCount} currencies</strong></div>
          <div className="bg-raised px-4 py-3"><span className="block text-[10px] font-mono uppercase tracking-wide text-muted">Reference date</span><strong className="mt-1 block text-sm text-ink">{fxAsOf}</strong></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Output currency updates immediately and is saved with this plan. Source: {fxSource}{assumptions.fxStale ? ' (last available rate set).' : '.'} Rates are daily reference rates, not executable trading quotes.
        </p>
      </FormSection>
    </div>
  );
};
