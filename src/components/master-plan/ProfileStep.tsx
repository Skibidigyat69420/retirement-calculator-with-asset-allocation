import { UserRound } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';

import { FormSection } from '../ui/FormSection';
import { Repeater } from '../ui/Repeater';
import { formatOrDash, isProfileConfigured } from '../../lib/planState';
import { formatCurrency } from '../../lib/formatters';
import type { FamilyMember, IncomeSource, InsurancePolicy, MasterPlanInputs } from '../../types';
import { useCalculator } from '../../context/CalculatorContext';

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

const advanceIdentityCell = (event: KeyboardEvent<HTMLDivElement>) => {
  if (
    event.key !== 'Enter'
    || event.nativeEvent.isComposing
    || event.ctrlKey
    || event.metaKey
    || event.altKey
    || !(event.target instanceof HTMLInputElement)
  ) return;

  const cells = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-identity-cell]'));
  const currentIndex = cells.indexOf(event.target);
  if (currentIndex < 0) return;

  event.preventDefault();
  const nextIndex = event.shiftKey
    ? Math.max(0, currentIndex - 1)
    : Math.min(cells.length - 1, currentIndex + 1);
  cells[nextIndex]?.focus();
};

export const ProfileStep = ({
  inputs,
  updateInputs,
  updateClient,
}: ProfileStepProps) => {
  const { assumptions } = useCalculator();
  const currencyOptions = Object.keys(assumptions.fx);
  const configured = isProfileConfigured(inputs);
  const yearsToRetire = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const retirementSpan = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);
  const currentYear = new Date().getFullYear();
  const familyMembers = inputs.client?.familyMembers || [];
  const incomeSources = inputs.client?.incomeSources || [];
  const insurancePolicies = inputs.client?.insurancePolicies || [];
  const toInr = (amount: number, currency: string) =>
    amount * (assumptions.fx[currency || 'INR']?.spotRate ?? 0);
  const profileFields = [
    inputs.client?.name,
    inputs.client?.email,
    inputs.client?.phone,
    inputs.client?.address,
    inputs.client?.country,
    inputs.client?.pan,
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
    const spotRate = assumptions.fx[source.currency || 'INR']?.spotRate ?? 0;
    const baseAmount = source.amount * spotRate;
    return total + Math.max(0, baseAmount) * (source.frequency === 'monthly' ? 12 : 1);
  }, 0);

  const updateFamilyMember = (id: string, patch: Partial<FamilyMember>) => {
    updateClient({ familyMembers: familyMembers.map((member) => member.id === id ? { ...member, ...patch } : member) });
  };
  const updateIncomeSource = (id: string, patch: Partial<IncomeSource>) => {
    const sources = incomeSources.map((source) => {
      if (source.id !== id) return source;
      const next = { ...source, ...patch };
      const spotRate = assumptions.fx[next.currency || 'INR']?.spotRate ?? 0;
      return { ...next, amountInBaseCurrency: next.amount * spotRate };
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
    <div>
      <div className="py-2.5 pb-4 flex items-center justify-between gap-4 flex-wrap border-b border-border/60 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Client Identity & Household Structure</h2>
          <p className="text-xs text-muted max-w-prose mt-0.5">
            Capture family members, timeline horizon, cash inflows, and insurance protection.
          </p>
        </div>
        <div className="w-full sm:w-48 shrink-0" aria-label={`${completion}% profile captured`}>
          <div className="flex items-center justify-between text-xs text-muted mb-1 font-medium">
            <span className="flex items-center gap-1.5">
              <UserRound size={13} aria-hidden="true" />
              <span>Profile capture</span>
            </span>
            <span className="font-semibold text-ink">{completion}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-sunken overflow-hidden border border-border/50">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      <FormSection
        index="01"
        title="Identity"
        description="Enter the core relationship details directly."
      >
        <div className="identity-sheet" onKeyDown={advanceIdentityCell}>
          <label className="identity-sheet-cell identity-sheet-cell--wide">
            <span>Client or household name</span>
            <input data-identity-cell className="identity-sheet-control" value={inputs.client?.name || ''} onChange={(e) => updateClient({ name: e.target.value })} placeholder="e.g. Vikram & Priya Malhotra" autoComplete="name" />
          </label>
          <label className="identity-sheet-cell">
            <span>Lead advisor</span>
            <input data-identity-cell className="identity-sheet-control" value={inputs.client?.advisor || ''} onChange={(e) => updateClient({ advisor: e.target.value })} placeholder="e.g. SoundThesis Capital" autoComplete="organization" />
          </label>
          <label className="identity-sheet-cell">
            <span>Email</span>
            <input data-identity-cell className="identity-sheet-control" type="email" value={inputs.client?.email || ''} onChange={(e) => updateClient({ email: e.target.value })} placeholder="client@domain.com" autoComplete="email" />
          </label>
          <label className="identity-sheet-cell">
            <span>Plan review</span>
            <input data-identity-cell className="identity-sheet-control" type="date" value={inputs.client?.reviewDate || ''} onChange={(e) => updateClient({ reviewDate: e.target.value })} />
          </label>
          <label className="identity-sheet-cell">
            <span>Phone</span>
            <input data-identity-cell className="identity-sheet-control" type="tel" value={inputs.client?.phone || ''} onChange={(e) => updateClient({ phone: e.target.value })} placeholder="Primary contact number" autoComplete="tel" />
          </label>
          <label className="identity-sheet-cell">
            <span>PAN / tax ID</span>
            <input data-identity-cell className="identity-sheet-control font-mono uppercase" value={inputs.client?.pan || ''} onChange={(e) => updateClient({ pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="ABCDE1234F" maxLength={10} autoCapitalize="characters" autoComplete="off" spellCheck={false} />
          </label>
          <label className="identity-sheet-cell">
            <span>Country</span>
            <input data-identity-cell className="identity-sheet-control" value={inputs.client?.country || ''} onChange={(e) => updateClient({ country: e.target.value })} placeholder="India" autoComplete="country-name" />
          </label>
          <label className="identity-sheet-cell">
            <span>Address</span>
            <input data-identity-cell className="identity-sheet-control" value={inputs.client?.address || ''} onChange={(e) => updateClient({ address: e.target.value })} placeholder="Street address, city or state" autoComplete="street-address" />
          </label>
          <label className="identity-sheet-cell">
            <span>Occupation</span>
            <input data-identity-cell className="identity-sheet-control" value={inputs.client?.occupation || ''} onChange={(e) => updateClient({ occupation: e.target.value })} placeholder="Role, profession or business owner" autoComplete="organization-title" />
          </label>
          <label className="identity-sheet-cell">
            <span>Business</span>
            <input data-identity-cell className="identity-sheet-control" value={inputs.client?.business || ''} onChange={(e) => updateClient({ business: e.target.value })} placeholder="Company or practice name" autoComplete="organization" />
          </label>
          <label className="identity-sheet-cell">
            <span>Spouse</span>
            <input data-identity-cell className="identity-sheet-control" value={inputs.client?.spouse || ''} onChange={(e) => updateClient({ spouse: e.target.value })} placeholder="Name and occupation (optional)" />
          </label>
          <label className="identity-sheet-cell">
            <span>Marital status</span>
            <select data-identity-cell className="identity-sheet-control" value={inputs.client?.maritalStatus || ''} onChange={(e) => updateClient({ maritalStatus: e.target.value })}>
              {['', 'Single', 'Married', 'Partnered', 'Divorced', 'Widowed'].map((value) => <option key={value} value={value}>{value || 'Select status'}</option>)}
            </select>
          </label>
        </div>
        <p className="identity-sheet-shortcuts">
          <span>Fast entry</span>
          <span><kbd>Enter</kbd> next cell <i>·</i> <kbd>Shift</kbd> + <kbd>Enter</kbd> previous <i>·</i> <kbd>Tab</kbd> standard navigation <i>·</i> <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>S</kbd> save</span>
        </p>
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
                {formatCurrency(toInr(source.amount, source.currency))}
                {source.currency !== 'INR' && <span className="text-faint"> {source.currency}</span>}
              </span>
            </span>
          )}
          renderEditor={(source) => (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
              <Input layout="inline" label="Source" value={source.name} onChange={(event) => updateIncomeSource(source.id, { name: event.target.value })} placeholder="Salary, rental, freelance…" />
              <NumberInput kind="currency" layout="inline" label="Amount" value={source.amount} onChange={(value) => updateIncomeSource(source.id, { amount: value })} currency={source.currency} currencyOptions={currencyOptions} onCurrencyChange={(value) => updateIncomeSource(source.id, { currency: value })} />
              <NumberInput kind="currency" layout="inline" label="INR equivalent" value={toInr(source.amount, source.currency)} onChange={() => {}} disabled helper="Live reference rate · all plan outputs use INR" />
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
