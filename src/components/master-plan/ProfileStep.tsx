import { UserRound } from 'lucide-react';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';

import { FormSection } from '../ui/FormSection';
import { Repeater } from '../ui/Repeater';
import { formatOrDash, isProfileConfigured } from '../../lib/planState';
import { formatCurrency } from '../../lib/formatters';
import type { FamilyMember, IncomeSource, InsurancePolicy, MasterPlanInputs } from '../../types';

interface ProfileStepProps {
  inputs: MasterPlanInputs;
  updateInputs: (updates: Partial<MasterPlanInputs>) => void;
  updateClient: (updates: Partial<MasterPlanInputs['client']>) => void;
}

const ageFromDob = (dob: string | undefined): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

export const ProfileStep = ({
  inputs,
  updateInputs,
  updateClient,
}: ProfileStepProps) => {
  const configured = isProfileConfigured(inputs);
  const yearsToRetire = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const retirementSpan = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);
  const currentYear = new Date().getFullYear();
  const familyMembers = inputs.client?.familyMembers || [];
  const incomeSources = inputs.client?.incomeSources || [];
  const insurancePolicies = inputs.client?.insurancePolicies || [];
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
    updateClient({ familyMembers: familyMembers.map((member) => member.id === id ? { ...member, ...patch } : member) });
  };
  const updateIncomeSource = (id: string, patch: Partial<IncomeSource>) => {
    const sources = incomeSources.map((source) => {
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
    updateClient({ insurancePolicies: insurancePolicies.map((policy) => policy.id === id ? { ...policy, ...patch } : policy) });
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

  const monthlyIncomeTotal = Math.round(annualIncomeFromSources(incomeSources) / 12);

  return (
    <div className="border-t border-border">
      <header className="py-4 flex items-start justify-between gap-5 flex-wrap">
        <div>
          <div className="eyebrow">Step 01 · Client profile</div>
          <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Start with the household</h2>
          <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
            Capture the story behind the numbers. These notes stay with the plan so the next review starts with context, not a blank page.
          </p>
        </div>
        <div className="w-full sm:w-44 shrink-0" aria-label={`${completion}% profile captured`}>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            <UserRound size={13} aria-hidden="true" />
            <span>{completion}% captured</span>
          </div>
          <div className="mt-1.5 h-[3px] rounded-full bg-border overflow-hidden">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </header>

      <FormSection
        index="01"
        title="Identity"
        description="Who is this plan for? Required to begin."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
          <Input
            layout="inline"
            label="Client name"
            value={inputs.client?.name || ''}
            onChange={(e) => updateClient({ name: e.target.value })}
            placeholder="e.g. Vikram & Priya Malhotra"
            className="md:col-span-2"
          />
          <Input
            layout="inline"
            label="Lead advisor"
            value={inputs.client?.advisor || ''}
            onChange={(e) => updateClient({ advisor: e.target.value })}
            placeholder="e.g. Sound Thesis Private Wealth"
          />
          <Input
            layout="inline"
            label="Email"
            type="email"
            value={inputs.client?.email || ''}
            onChange={(e) => updateClient({ email: e.target.value })}
            placeholder="client@domain.com"
          />
          <Input
            layout="inline"
            label="Plan review"
            type="date"
            value={inputs.client?.reviewDate || ''}
            onChange={(e) => updateClient({ reviewDate: e.target.value })}
          />
          <Input layout="inline" label="Phone" value={inputs.client?.phone || ''} onChange={(e) => updateClient({ phone: e.target.value })} placeholder="Primary contact number" />
          <Input layout="inline" label="Address" value={inputs.client?.address || ''} onChange={(e) => updateClient({ address: e.target.value })} placeholder="City, country or full address" className="md:col-span-2" />
          <Input layout="inline" label="Occupation" value={inputs.client?.occupation || ''} onChange={(e) => updateClient({ occupation: e.target.value })} placeholder="Role, profession or business owner" />
          <Input layout="inline" label="Business" value={inputs.client?.business || ''} onChange={(e) => updateClient({ business: e.target.value })} placeholder="Company or practice name" />
          <Input layout="inline" label="Spouse" value={inputs.client?.spouse || ''} onChange={(e) => updateClient({ spouse: e.target.value })} placeholder="Name and occupation (optional)" />
          <Select
            layout="inline"
            label="Marital status"
            value={inputs.client?.maritalStatus || ''}
            onChange={(value) => updateClient({ maritalStatus: value })}
            options={['', 'Single', 'Married', 'Partnered', 'Divorced', 'Widowed'].map((value) => ({ value, label: value || 'Select status' }))}
          />
        </div>
      </FormSection>

      <FormSection
        index="02"
        title="Household"
        description="The people and responsibilities around the plan."
        meta={`${familyMembers.length} member${familyMembers.length === 1 ? '' : 's'}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <TextAreaField label="Household overview" value={inputs.client?.familyComposition || ''} onChange={(value) => updateClient({ familyComposition: value })} placeholder="Anything important about dependants, family structure, or support responsibilities" helper="Use the editable family rows below for individual members." />
          <TextAreaField label="Health context" value={inputs.client?.healthStatus || ''} onChange={(value) => updateClient({ healthStatus: value })} placeholder="Current health concerns, coverage gaps, or simply ‘no current concerns’" />
        </div>
        <div className="mt-6">
          <Repeater<FamilyMember>
            items={familyMembers}
            getKey={(member) => member.id}
            emptyLabel="No family members added yet."
            addLabel="Add family member"
            onAdd={() => updateClient({ familyMembers: [...familyMembers, { id: `family-${Date.now()}`, name: '', relationship: '', dateOfBirth: '', status: '', goal: '' }] })}
            onRemove={(member) => updateClient({ familyMembers: familyMembers.filter((item) => item.id !== member.id) })}
            renderSummary={(member) => {
              const age = ageFromDob(member.dateOfBirth);
              return (
                <span className="flex items-baseline gap-3 min-w-0 text-sm">
                  <span className="truncate font-medium text-ink">{member.name || 'Unnamed member'}</span>
                  <span className="truncate text-xs text-muted">{member.relationship || '—'}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted">
                    {age !== null ? `${age} yrs` : member.dateOfBirth || '—'}
                  </span>
                </span>
              );
            }}
            renderEditor={(member) => (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                <Input layout="inline" label="Name" value={member.name} onChange={(event) => updateFamilyMember(member.id, { name: event.target.value })} placeholder="Full name" />
                <Input layout="inline" label="Relationship" value={member.relationship} onChange={(event) => updateFamilyMember(member.id, { relationship: event.target.value })} placeholder="Child, spouse…" />
                <Input layout="inline" label="Date of birth" type="date" value={member.dateOfBirth || ''} onChange={(event) => updateFamilyMember(member.id, { dateOfBirth: event.target.value })} />
                <Input layout="inline" label="Current status" value={member.status || ''} onChange={(event) => updateFamilyMember(member.id, { status: event.target.value })} placeholder="Student, working…" />
                <Input layout="inline" label="Goal / responsibility" value={member.goal || ''} onChange={(event) => updateFamilyMember(member.id, { goal: event.target.value })} placeholder="Education, support, legacy…" />
              </div>
            )}
          />
        </div>
      </FormSection>

      <FormSection
        index="03"
        title="Income sources"
        description="Where household cashflow comes from — feeds annual income in Cashflow."
        meta={`${incomeSources.length} source${incomeSources.length === 1 ? '' : 's'} · ${formatCurrency(monthlyIncomeTotal)}/mo`}
      >
        <Repeater<IncomeSource>
          items={incomeSources}
          getKey={(source) => source.id}
          emptyLabel="No income sources added yet."
          addLabel="Add income source"
          onAdd={() => replaceIncomeSources([...incomeSources, { id: `income-${Date.now()}`, name: '', amount: 0, amountInBaseCurrency: 0, currency: 'INR', frequency: 'monthly', notes: '' }])}
          onRemove={(source) => replaceIncomeSources(incomeSources.filter((item) => item.id !== source.id))}
          renderSummary={(source) => (
            <span className="flex items-baseline gap-3 min-w-0 text-sm">
              <span className="truncate font-medium text-ink">{source.name || 'Unnamed source'}</span>
              <span className="truncate text-xs text-muted">{source.frequency}</span>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted">
                {formatCurrency(source.amountInBaseCurrency ?? (source.currency === 'INR' ? source.amount : 0))}
                {source.currency !== 'INR' && <span className="text-faint"> {source.currency}</span>}
              </span>
            </span>
          )}
          renderEditor={(source) => (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
              <Input layout="inline" label="Source" value={source.name} onChange={(event) => updateIncomeSource(source.id, { name: event.target.value })} placeholder="Salary, rental, freelance…" />
              <NumberInput kind="currency" layout="inline" label="Amount" value={source.amount} onChange={(value) => updateIncomeSource(source.id, { amount: value })} currency={source.currency} onCurrencyChange={(value) => updateIncomeSource(source.id, { currency: value })} />
              <NumberInput kind="currency" layout="inline" label="INR equivalent" value={source.amountInBaseCurrency ?? (source.currency === 'INR' ? source.amount : 0)} onChange={(value) => updateIncomeSource(source.id, { amountInBaseCurrency: value })} helper={source.currency === 'INR' ? 'Same as amount' : 'Used in projections'} />
              <Select layout="inline" label="Frequency" value={source.frequency} onChange={(value) => updateIncomeSource(source.id, { frequency: value as IncomeSource['frequency'] })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
              <Input layout="inline" label="Notes" value={source.notes || ''} onChange={(event) => updateIncomeSource(source.id, { notes: event.target.value })} placeholder="Clients, rental property…" />
            </div>
          )}
        />
      </FormSection>

      <FormSection
        index="04"
        title="Timeline"
        description="Ages define the accumulation and distribution windows."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
          <NumberInput
            layout="inline"
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
            slider
          />
          <NumberInput
            layout="inline"
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
            slider
          />
          <NumberInput
            layout="inline"
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
            slider
          />
        </div>

        {/* Timeline preview */}
        <div className="mt-5 divide-y divide-border border-t border-b border-border">
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
      </FormSection>

      <FormSection
        index="05"
        title="Advisory brief"
        description="What should the plan help decide?"
        collapsible
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <TextAreaField label="Planning purpose" value={inputs.client?.planningPurpose || ''} onChange={(value) => updateClient({ planningPurpose: value })} placeholder="e.g. Retirement security and a disciplined investment structure" />
          <TextAreaField label="Goals and milestones" value={inputs.client?.goalsSummary || ''} onChange={(value) => updateClient({ goalsSummary: value })} placeholder="Education, business, property, legacy, or other family goals" />
          <TextAreaField label="Investment philosophy" value={inputs.client?.investmentPhilosophy || ''} onChange={(value) => updateClient({ investmentPhilosophy: value })} placeholder="e.g. Capital preservation with steady growth; comfortable with measured drawdowns" />
          <TextAreaField label="Specific advice requested" value={inputs.client?.adviceRequested || ''} onChange={(value) => updateClient({ adviceRequested: value })} placeholder="Questions the client expects this plan to answer" />
          <TextAreaField label="Insurance and protection" value={inputs.client?.insuranceSummary || ''} onChange={(value) => updateClient({ insuranceSummary: value })} placeholder="Life, health, critical illness, endowment, or coverage gaps" />
          <TextAreaField label="Advisor discovery notes" value={inputs.client?.notes || ''} onChange={(value) => updateClient({ notes: value })} placeholder="Risk reservations, family circumstances, liquidity needs, or legacy intentions" />
        </div>
        <div className="mt-6">
          <Repeater<InsurancePolicy>
            items={insurancePolicies}
            getKey={(policy) => policy.id}
            emptyLabel="No insurance policies added yet."
            addLabel="Add policy"
            onAdd={() => updateClient({ insurancePolicies: [...insurancePolicies, { id: `insurance-${Date.now()}`, type: '', provider: '', coverage: '', premium: 0, premiumFrequency: 'annual', notes: '' }] })}
            onRemove={(policy) => updateClient({ insurancePolicies: insurancePolicies.filter((item) => item.id !== policy.id) })}
            renderSummary={(policy) => (
              <span className="flex items-baseline gap-3 min-w-0 text-sm">
                <span className="truncate font-medium text-ink">{policy.type || 'Policy'}</span>
                <span className="truncate text-xs text-muted">{policy.provider || '—'}</span>
                <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted">
                  {formatCurrency(policy.premium || 0)}
                  <span className="text-faint"> {policy.premiumFrequency === 'monthly' ? '/mo' : '/yr'}</span>
                </span>
              </span>
            )}
            renderEditor={(policy) => (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                <Input layout="inline" label="Policy type" value={policy.type} onChange={(event) => updateInsurancePolicy(policy.id, { type: event.target.value })} placeholder="Life, health…" />
                <Input layout="inline" label="Provider" value={policy.provider || ''} onChange={(event) => updateInsurancePolicy(policy.id, { provider: event.target.value })} placeholder="Insurer" />
                <Input layout="inline" label="Coverage" value={policy.coverage || ''} onChange={(event) => updateInsurancePolicy(policy.id, { coverage: event.target.value })} placeholder="₹1 Cr / USD 100k" />
                <NumberInput kind="currency" layout="inline" label="Premium" value={policy.premium || 0} onChange={(value) => updateInsurancePolicy(policy.id, { premium: value })} />
                <Select layout="inline" label="Frequency" value={policy.premiumFrequency || 'annual'} onChange={(value) => updateInsurancePolicy(policy.id, { premiumFrequency: value as InsurancePolicy['premiumFrequency'] })} options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }]} />
                <Input layout="inline" label="Notes" value={policy.notes || ''} onChange={(event) => updateInsurancePolicy(policy.id, { notes: event.target.value })} placeholder="Term, renewal, exclusions…" />
              </div>
            )}
          />
        </div>
      </FormSection>
    </div>
  );
};

function TextAreaField({ label, value, onChange, placeholder, helper }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; helper?: string }) {
  return <label className="space-y-1.5 block"><span className="field-label block text-xs font-medium text-ink-soft">{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full min-h-[88px] bg-surface border border-border rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-faint hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none transition-colors resize-y" />{helper && <span className="block text-xs text-faint leading-relaxed">{helper}</span>}</label>;
}
