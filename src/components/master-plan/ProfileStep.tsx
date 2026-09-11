import { ArrowRight } from 'lucide-react';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Button } from '../ui/Button';
import { formatOrDash, isProfileConfigured } from '../../lib/planState';
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
  const configured = isProfileConfigured(inputs);
  const yearsToRetire = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const retirementSpan = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);
  const currentYear = new Date().getFullYear();

  const timeline = [
    { label: 'Accumulation phase', value: formatOrDash(configured ? yearsToRetire : null, (v) => `${v} yrs left`) },
    { label: 'Distribution phase', value: formatOrDash(configured ? retirementSpan : null, (v) => `${v} yrs in SWP`) },
    { label: 'Retirement year', value: formatOrDash(configured ? currentYear + yearsToRetire : null, (v) => String(v)) },
    {
      label: 'Final year',
      value: formatOrDash(
        configured && inputs.lifeExpectancy > 0 ? currentYear + (inputs.lifeExpectancy - inputs.currentAge) : null,
        (v) => String(v),
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Step 01 · Profile</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Client profile</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          The demographic baseline and career timeline that anchor every compounding calculation in this plan.
        </p>
      </header>

      {/* Identity */}
      <section className="border-t border-border pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <Input
            label="Client name"
            value={inputs.client?.name || ''}
            onChange={(e) => updateClient({ name: e.target.value })}
            placeholder="e.g. Vikram & Priya Malhotra"
          />
          <Input
            label="Lead advisor"
            value={inputs.client?.advisor || ''}
            onChange={(e) => updateClient({ advisor: e.target.value })}
            placeholder="e.g. Sound Thesis Private Wealth"
          />
          <Input
            label="Client email / contact"
            type="email"
            value={inputs.client?.email || ''}
            onChange={(e) => updateClient({ email: e.target.value })}
            placeholder="client@domain.com"
          />
          <Input
            label="Annual plan review"
            type="date"
            value={inputs.client?.reviewDate || ''}
            onChange={(e) => updateClient({ reviewDate: e.target.value })}
          />
          <Input label="Phone / WhatsApp" value={inputs.client?.phone || ''} onChange={(e) => updateClient({ phone: e.target.value })} placeholder="Primary contact number" />
          <Input label="Residence / address" value={inputs.client?.address || ''} onChange={(e) => updateClient({ address: e.target.value })} placeholder="City, country or full address" />
          <Input label="Occupation" value={inputs.client?.occupation || ''} onChange={(e) => updateClient({ occupation: e.target.value })} placeholder="Role, profession or business owner" />
          <Input label="Business / employer" value={inputs.client?.business || ''} onChange={(e) => updateClient({ business: e.target.value })} placeholder="Company or practice name" />
          <Input label="Spouse / partner" value={inputs.client?.spouse || ''} onChange={(e) => updateClient({ spouse: e.target.value })} placeholder="Name and occupation (optional)" />
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <div className="mb-4"><h3 className="text-[15px] font-semibold text-ink tracking-tight">Household context</h3><p className="mt-0.5 text-xs text-muted">Keep the human context beside the financial facts.</p></div>
        <Input label="Health / family notes" value={inputs.client?.notes || ''} onChange={(e) => updateClient({ notes: e.target.value })} placeholder="Dependents, health context, family priorities, or anything to carry into the review" />
      </section>

      {/* Timeline */}
      <section className="border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight">Demographic timeline</h3>
            <p className="mt-0.5 text-xs text-muted">Ages define the accumulation and distribution windows.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
          <NumberInput
            label="Current age"
            value={inputs.currentAge}
            onChange={(val) => updateInputs({ currentAge: val })}
            min={18}
            max={95}
            suffix="yrs"
            presets={[
              { label: '30', value: 30 },
              { label: '35', value: 35 },
              { label: '40', value: 40 },
              { label: '45', value: 45 },
            ]}
          />
          <NumberInput
            label="Retirement age"
            value={inputs.retirementAge}
            onChange={(val) => updateInputs({ retirementAge: val })}
            min={inputs.currentAge + 1}
            max={95}
            suffix="yrs"
            presets={[
              { label: '50', value: 50 },
              { label: '55', value: 55 },
              { label: '58', value: 58 },
              { label: '60', value: 60 },
            ]}
          />
          <NumberInput
            label="Life expectancy"
            value={inputs.lifeExpectancy}
            onChange={(val) => updateInputs({ lifeExpectancy: val })}
            min={inputs.retirementAge + 1}
            max={110}
            suffix="yrs"
            presets={[
              { label: '85', value: 85 },
              { label: '90', value: 90 },
              { label: '95', value: 95 },
            ]}
          />
        </div>

        {/* Timeline preview */}
        <div className="mt-6 divide-y divide-border border-t border-b border-border">
          {timeline.map((t) => (
            <div key={t.label} className="flex items-baseline justify-between gap-4 py-2.5">
              <span className="text-xs text-muted">{t.label}</span>
              <span className="font-mono text-sm tabular-nums text-ink">{t.value}</span>
            </div>
          ))}
        </div>
        {!configured && (
          <p className="mt-3 text-xs text-faint leading-relaxed">
            Set the current age and retirement age to preview the plan timeline.
          </p>
        )}
      </section>

      {/* Notes */}
      <section className="border-t border-border pt-6">
        <label
          htmlFor="profile-notes"
          className="block text-[11px] font-semibold uppercase tracking-wider text-muted"
        >
          Advisory strategy & discovery notes
        </label>
        <textarea
          id="profile-notes"
          rows={3}
          value={inputs.client?.notes || ''}
          onChange={(e) => updateClient({ notes: e.target.value })}
          placeholder="Document key client priorities, family circumstances, risk reservations, or legacy intentions…"
          className="mt-1.5 w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-faint hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none transition-colors resize-none"
        />
      </section>

      {/* Step navigation */}
      <div className="flex justify-end border-t border-border pt-6">
        <Button onClick={onNext} className="flex items-center gap-2">
          <span>Next · Balance sheet</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
