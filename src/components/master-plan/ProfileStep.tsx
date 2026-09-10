import { User, Calendar, ArrowRight, FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Button } from '../ui/Button';
import type { MasterPlanInputs } from '../../types';

interface ProfileStepProps {
  inputs: MasterPlanInputs;
  updateInputs: (updates: Partial<MasterPlanInputs>) => void;
  updateClient: (updates: Partial<MasterPlanInputs['client']>) => void;
  onNext: () => void;
}

export const ProfileStep = ({
  inputs,
  updateInputs,
  updateClient,
  onNext,
}: ProfileStepProps) => {
  const yearsToRetire = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const retirementSpan = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);

  return (
    <div className="space-y-6">
      {/* Intro Header Card */}
      <Card className="border border-border space-y-2">
        <div className="flex items-center gap-2">
          <User size={20} className="text-accent" />
          <h3 className="text-lg font-bold text-ink">Client Profile & Planning Horizon</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Define the client's demographic baseline, career horizon, and retirement withdrawal window. These parameters form the core timeline for all compounding calculations.
        </p>
      </Card>

      {/* Profile Form */}
      <Card className="border border-border space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Client Full Name"
            value={inputs.client?.name || ''}
            onChange={(e) => updateClient({ name: e.target.value })}
            placeholder="e.g. Vikram & Priya Malhotra"
          />

          <Input
            label="Lead Advisor / Practitioner"
            value={inputs.client?.advisor || ''}
            onChange={(e) => updateClient({ advisor: e.target.value })}
            placeholder="e.g. Sound Thesis Private Wealth"
          />

          <Input
            label="Client Email / Contact"
            type="email"
            value={inputs.client?.email || ''}
            onChange={(e) => updateClient({ email: e.target.value })}
            placeholder="e.g. client@domain.com"
          />

          <Input
            label="Annual Plan Review Date"
            type="date"
            value={inputs.client?.reviewDate || new Date().toISOString().split('T')[0]}
            onChange={(e) => updateClient({ reviewDate: e.target.value })}
          />
        </div>

        {/* Age and Horizon Grid */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-accent" />
            Demographic Timeline & Life Expectancy
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberInput
              label="Current Age"
              value={inputs.currentAge}
              onChange={(val) => updateInputs({ currentAge: val })}
              min={18}
              max={95}
              suffix="yrs"
              presets={[
                { label: '30y', value: 30 },
                { label: '35y', value: 35 },
                { label: '40y', value: 40 },
                { label: '45y', value: 45 },
              ]}
            />

            <NumberInput
              label="Target Retirement Age"
              value={inputs.retirementAge}
              onChange={(val) => updateInputs({ retirementAge: val })}
              min={inputs.currentAge + 1}
              max={95}
              suffix="yrs"
              presets={[
                { label: '50y', value: 50 },
                { label: '55y', value: 55 },
                { label: '58y', value: 58 },
                { label: '60y', value: 60 },
              ]}
            />

            <NumberInput
              label="Life Expectancy"
              value={inputs.lifeExpectancy}
              onChange={(val) => updateInputs({ lifeExpectancy: val })}
              min={inputs.retirementAge + 1}
              max={110}
              suffix="yrs"
              presets={[
                { label: '85y', value: 85 },
                { label: '90y', value: 90 },
                { label: '95y', value: 95 },
              ]}
            />
          </div>

          {/* Timeline Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border text-xs">
            <div className="p-3 rounded-xl bg-sunken border border-border">
              <span className="text-muted block text-[10px] uppercase font-bold">Accumulation Phase</span>
              <span className="text-sm font-bold font-mono text-ink">{yearsToRetire} Years Left</span>
            </div>
            <div className="p-3 rounded-xl bg-sunken border border-border">
              <span className="text-muted block text-[10px] uppercase font-bold">Distribution Phase</span>
              <span className="text-sm font-bold font-mono text-ink">{retirementSpan} Years in SWP</span>
            </div>
            <div className="p-3 rounded-xl bg-sunken border border-border">
              <span className="text-muted block text-[10px] uppercase font-bold">Retirement Year</span>
              <span className="text-sm font-bold font-mono text-ink">
                Year {new Date().getFullYear() + yearsToRetire}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sunken border border-border">
              <span className="text-muted block text-[10px] uppercase font-bold">Final Year</span>
              <span className="text-sm font-bold font-mono text-ink">
                Year {new Date().getFullYear() + (inputs.lifeExpectancy - inputs.currentAge)}
              </span>
            </div>
          </div>
        </div>

        {/* Practitioner Notes */}
        <div className="pt-4 border-t border-border space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <FileText size={13} className="text-faint" />
            Advisory Strategy & Client Discovery Notes
          </label>
          <textarea
            rows={3}
            value={inputs.client?.notes || ''}
            onChange={(e) => updateClient({ notes: e.target.value })}
            placeholder="Document key client priorities, family circumstances, risk reservations, or legacy intentions..."
            className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Step Navigation Button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onNext} className="flex items-center gap-2">
            <span>Next: Financials & Debt</span>
            <ArrowRight size={15} />
          </Button>
        </div>
      </Card>
    </div>
  );
};
