import { ArrowRight, Plus, Trash2, UserRound } from 'lucide-react';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Button } from '../ui/Button';
import { formatOrDash, isProfileConfigured } from '../../lib/planState';
import type { FamilyMember, IncomeSource, InsurancePolicy, MasterPlanInputs } from '../../types';

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
  const profileFields = [
    inputs.client?.name,
    inputs.client?.email,
    inputs.client?.phone,
    inputs.client?.address,
    inputs.client?.occupation,
    inputs.client?.spouse,
    inputs.client?.familyComposition,
    inputs.client?.planningPurpose,
    inputs.client?.goalsSummary,
    inputs.client?.investmentPhilosophy,
  ];
  const completedFields = profileFields.filter((value) => value?.trim()).length;
  const collectionFields = [inputs.client?.familyMembers, inputs.client?.incomeSources, inputs.client?.insurancePolicies];
  const completedCollections = collectionFields.filter((value) => (value?.length || 0) > 0).length;
  const completion = Math.round(((completedFields + completedCollections) / (profileFields.length + collectionFields.length)) * 100);

  const annualIncomeFromSources = (sources: IncomeSource[]) => sources.reduce((total, source) => {
    const baseAmount = source.amountInBaseCurrency ?? (source.currency === 'INR' ? source.amount : 0);
    return total + Math.max(0, baseAmount) * (source.frequency === 'monthly' ? 12 : 1);
  }, 0);

  const updateFamilyMember = (id: string, patch: Partial<FamilyMember>) => {
    updateClient({ familyMembers: (inputs.client.familyMembers || []).map((member) => member.id === id ? { ...member, ...patch } : member) });
  };
  const updateIncomeSource = (id: string, patch: Partial<IncomeSource>) => {
    const sources = (inputs.client.incomeSources || []).map((source) => {
      if (source.id !== id) return source;
      const next = { ...source, ...patch };
      return patch.currency === 'INR' || (next.currency === 'INR' && patch.amount !== undefined)
        ? { ...next, amountInBaseCurrency: next.amount }
        : next;
    });
    updateClient({ incomeSources: sources });
    updateInputs({ annualIncome: annualIncomeFromSources(sources) });
  };
  const replaceIncomeSources = (sources: IncomeSource[]) => {
    updateClient({ incomeSources: sources });
    updateInputs({ annualIncome: annualIncomeFromSources(sources) });
  };
  const updateInsurancePolicy = (id: string, patch: Partial<InsurancePolicy>) => {
    updateClient({ insurancePolicies: (inputs.client.insurancePolicies || []).map((policy) => policy.id === id ? { ...policy, ...patch } : policy) });
  };

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
    <div className="space-y-8 client-profile-form">
      <header>
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div>
            <div className="eyebrow">Step 01 · Client profile</div>
            <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Start with the household</h2>
            <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
              Capture the story behind the numbers. These notes stay with the plan so the next review starts with context, not a blank page.
            </p>
          </div>
          <div className="profile-completion" aria-label={`${completion}% profile captured`}>
            <div className="flex items-center gap-2"><UserRound size={14} /><span>{completion}% captured</span></div>
            <div className="profile-completion-track"><span style={{ width: `${completion}%` }} /></div>
          </div>
        </div>
      </header>

      {/* Identity */}
      <section className="profile-section">
        <div className="profile-section-heading"><div><span className="eyebrow">01 · Identity</span><h3>Who is this plan for?</h3></div><span className="profile-section-hint">Required to begin</span></div>
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
          <SelectField label="Marital status" value={inputs.client?.maritalStatus || ''} onChange={(value) => updateClient({ maritalStatus: value })} options={['', 'Single', 'Married', 'Partnered', 'Divorced', 'Widowed'].map((value) => ({ value, label: value || 'Select status' }))} />
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-heading"><div><span className="eyebrow">02 · Household</span><h3>The people and responsibilities around the plan</h3></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <TextAreaField label="Household overview" value={inputs.client?.familyComposition || ''} onChange={(value) => updateClient({ familyComposition: value })} placeholder="Anything important about dependants, family structure, or support responsibilities" helper="Use the editable family rows below for individual members." />
          <TextAreaField label="Health context" value={inputs.client?.healthStatus || ''} onChange={(value) => updateClient({ healthStatus: value })} placeholder="Current health concerns, coverage gaps, or simply ‘no current concerns’" />
        </div>
        <div className="profile-repeatable-list">
          <div className="profile-subheading"><div><h4>Family members</h4><p>Add each person whose life or goals affect the plan.</p></div><button type="button" className="profile-add-button" onClick={() => updateClient({ familyMembers: [...(inputs.client.familyMembers || []), { id: `family-${Date.now()}`, name: '', relationship: '', dateOfBirth: '', status: '', goal: '' }] })}><Plus size={14} /> Add person</button></div>
          {(inputs.client.familyMembers || []).map((member) => <div className="profile-repeatable-row" key={member.id}>
            <Input label="Name" value={member.name} onChange={(event) => updateFamilyMember(member.id, { name: event.target.value })} placeholder="Full name" />
            <Input label="Relationship" value={member.relationship} onChange={(event) => updateFamilyMember(member.id, { relationship: event.target.value })} placeholder="Child, spouse…" />
            <Input label="Date of birth" type="date" value={member.dateOfBirth || ''} onChange={(event) => updateFamilyMember(member.id, { dateOfBirth: event.target.value })} />
            <Input label="Current status" value={member.status || ''} onChange={(event) => updateFamilyMember(member.id, { status: event.target.value })} placeholder="Student, working…" />
            <Input label="Goal / responsibility" value={member.goal || ''} onChange={(event) => updateFamilyMember(member.id, { goal: event.target.value })} placeholder="Education, support, legacy…" />
            <button type="button" className="profile-remove-button" onClick={() => updateClient({ familyMembers: (inputs.client.familyMembers || []).filter((item) => item.id !== member.id) })} aria-label={`Remove ${member.name || 'family member'}`}><Trash2 size={15} /></button>
          </div>)}
          {(inputs.client.familyMembers || []).length === 0 && <p className="profile-empty-row">No family members added yet.</p>}
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-heading"><div><span className="eyebrow">03 · Income sources</span><h3>Where does household cashflow come from?</h3></div></div>
        <div className="profile-repeatable-list">
          <div className="profile-subheading"><div><h4>Income sources</h4><p>Record each source separately. These values feed annual household income in Cashflow.</p></div><button type="button" className="profile-add-button" onClick={() => replaceIncomeSources([...(inputs.client.incomeSources || []), { id: `income-${Date.now()}`, name: '', amount: 0, amountInBaseCurrency: 0, currency: 'INR', frequency: 'monthly', notes: '' }])}><Plus size={14} /> Add income source</button></div>
          {(inputs.client.incomeSources || []).map((source) => <div className="profile-repeatable-row profile-income-row" key={source.id}>
            <Input label="Source" value={source.name} onChange={(event) => updateIncomeSource(source.id, { name: event.target.value })} placeholder="Salary, rental, freelance…" />
            <CurrencyInput label="Amount" value={source.amount} onChange={(value) => updateIncomeSource(source.id, { amount: value })} />
            <Select label="Currency" value={source.currency} onChange={(value) => updateIncomeSource(source.id, { currency: value })} options={['INR', 'KWD', 'USD', 'AED', 'GBP', 'EUR'].map((value) => ({ value, label: value }))} />
            <CurrencyInput label="INR equivalent" value={source.amountInBaseCurrency ?? (source.currency === 'INR' ? source.amount : 0)} onChange={(value) => updateIncomeSource(source.id, { amountInBaseCurrency: value })} helper={source.currency === 'INR' ? 'Same as amount' : 'Used in projections'} />
            <Select label="Frequency" value={source.frequency} onChange={(value) => updateIncomeSource(source.id, { frequency: value as IncomeSource['frequency'] })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
            <Input label="Notes" value={source.notes || ''} onChange={(event) => updateIncomeSource(source.id, { notes: event.target.value })} placeholder="Clients, rental property…" />
            <button type="button" className="profile-remove-button" onClick={() => replaceIncomeSources((inputs.client.incomeSources || []).filter((item) => item.id !== source.id))} aria-label={`Remove ${source.name || 'income source'}`}><Trash2 size={15} /></button>
          </div>)}
          {(inputs.client.incomeSources || []).length === 0 && <p className="profile-empty-row">No income sources added yet.</p>}
        </div>
      </section>

      {/* Timeline */}
      <section className="profile-section">
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

      <section className="profile-section">
        <div className="profile-section-heading"><div><span className="eyebrow">05 · Advisory brief</span><h3>What should the plan help decide?</h3></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <TextAreaField label="Planning purpose" value={inputs.client?.planningPurpose || ''} onChange={(value) => updateClient({ planningPurpose: value })} placeholder="e.g. Retirement security and a disciplined investment structure" />
          <TextAreaField label="Goals and milestones" value={inputs.client?.goalsSummary || ''} onChange={(value) => updateClient({ goalsSummary: value })} placeholder="Education, business, property, legacy, or other family goals" />
          <TextAreaField label="Investment philosophy" value={inputs.client?.investmentPhilosophy || ''} onChange={(value) => updateClient({ investmentPhilosophy: value })} placeholder="e.g. Capital preservation with steady growth; comfortable with measured drawdowns" />
          <TextAreaField label="Specific advice requested" value={inputs.client?.adviceRequested || ''} onChange={(value) => updateClient({ adviceRequested: value })} placeholder="Questions the client expects this plan to answer" />
          <TextAreaField label="Insurance and protection" value={inputs.client?.insuranceSummary || ''} onChange={(value) => updateClient({ insuranceSummary: value })} placeholder="Life, health, critical illness, endowment, or coverage gaps" />
          <TextAreaField label="Advisor discovery notes" value={inputs.client?.notes || ''} onChange={(value) => updateClient({ notes: value })} placeholder="Risk reservations, family circumstances, liquidity needs, or legacy intentions" />
        </div>
        <div className="profile-repeatable-list">
          <div className="profile-subheading"><div><h4>Insurance and protection</h4><p>Record every policy, cover amount, premium, and renewal detail.</p></div><button type="button" className="profile-add-button" onClick={() => updateClient({ insurancePolicies: [...(inputs.client.insurancePolicies || []), { id: `insurance-${Date.now()}`, type: '', provider: '', coverage: '', premium: 0, premiumFrequency: 'annual', notes: '' }] })}><Plus size={14} /> Add policy</button></div>
          {(inputs.client.insurancePolicies || []).map((policy) => <div className="profile-repeatable-row" key={policy.id}>
            <Input label="Policy type" value={policy.type} onChange={(event) => updateInsurancePolicy(policy.id, { type: event.target.value })} placeholder="Life, health…" />
            <Input label="Provider" value={policy.provider || ''} onChange={(event) => updateInsurancePolicy(policy.id, { provider: event.target.value })} placeholder="Insurer" />
            <Input label="Coverage" value={policy.coverage || ''} onChange={(event) => updateInsurancePolicy(policy.id, { coverage: event.target.value })} placeholder="₹1 Cr / USD 100k" />
            <CurrencyInput label="Premium" value={policy.premium || 0} onChange={(value) => updateInsurancePolicy(policy.id, { premium: value })} />
            <Select label="Frequency" value={policy.premiumFrequency || 'annual'} onChange={(value) => updateInsurancePolicy(policy.id, { premiumFrequency: value as InsurancePolicy['premiumFrequency'] })} options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }]} />
            <Input label="Notes" value={policy.notes || ''} onChange={(event) => updateInsurancePolicy(policy.id, { notes: event.target.value })} placeholder="Term, renewal, exclusions…" />
            <button type="button" className="profile-remove-button" onClick={() => updateClient({ insurancePolicies: (inputs.client.insurancePolicies || []).filter((item) => item.id !== policy.id) })} aria-label={`Remove ${policy.type || 'insurance policy'}`}><Trash2 size={15} /></button>
          </div>)}
          {(inputs.client.insurancePolicies || []).length === 0 && <p className="profile-empty-row">No insurance policies added yet.</p>}
        </div>
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

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <Select label={label} value={value} onChange={onChange} options={options} />;
}

function TextAreaField({ label, value, onChange, placeholder, helper }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; helper?: string }) {
  return <label className="space-y-1.5 block"><span className="field-label block text-xs font-medium text-ink-soft">{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full min-h-[88px] bg-surface border border-border rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-faint hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none transition-colors resize-y" />{helper && <span className="block text-xs text-faint leading-relaxed">{helper}</span>}</label>;
}
