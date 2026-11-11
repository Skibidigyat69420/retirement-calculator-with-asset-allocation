import { UserRound, Plus, Trash2 } from 'lucide-react';
import { useEffect, type KeyboardEvent } from 'react';
import { NumberInput } from '../ui/NumberInput';

import { FormSection } from '../ui/FormSection';
import { formatOrDash, isProfileConfigured } from '../../lib/planState';
import { formatReportingCurrency } from '../../lib/formatters';
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

const COUNTRY_SUGGESTIONS = [
  'India', 'United Arab Emirates', 'Singapore', 'United States', 'United Kingdom',
  'Australia', 'Canada', 'Japan', 'Germany', 'France', 'Switzerland', 'Saudi Arabia',
  'Qatar', 'Hong Kong', 'New Zealand', 'Netherlands', 'Other',
];

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

const advanceCell = (
  event: React.KeyboardEvent<HTMLTableSectionElement | HTMLDivElement>,
  onAddRow?: () => void,
) => {
  if (event.key !== 'Enter' || event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (!target || !target.matches('input, select, textarea, button')) return;

  const container = event.currentTarget;
  const cells = Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type="checkbox"]), select:not([disabled]), input[type="checkbox"]:not([disabled])',
    ),
  );
  const currentIndex = cells.indexOf(target);
  if (currentIndex === -1) return;

  event.preventDefault();
  if (event.shiftKey) {
    const previous = cells[currentIndex - 1];
    previous?.focus();
    if (previous instanceof HTMLInputElement && previous.type !== 'checkbox') previous.select?.();
    return;
  }

  const next = cells[currentIndex + 1];
  if (next) {
    next.focus();
    if (next instanceof HTMLInputElement && next.type !== 'checkbox') next.select?.();
  } else if (onAddRow) {
    onAddRow();
  }
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

  const formatOutput = (amountInInr: number) =>
    formatReportingCurrency(amountInInr, inputs.reportingCurrency || 'INR', assumptions.fx);

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

  const handleQuickAddFamilyMember = () => {
    updateClient({
      familyMembers: [
        ...familyMembers,
        {
          id: `family-${Date.now()}`,
          name: '',
          relationship: '',
          dateOfBirth: '',
          status: '',
          goal: '',
        },
      ],
    });
  };

  const handleQuickAddIncome = () => {
    replaceIncomeSources([
      ...incomeSources,
      {
        id: `income-${Date.now()}`,
        name: '',
        amount: 0,
        amountInBaseCurrency: 0,
        currency: inputs.reportingCurrency || 'INR',
        frequency: 'monthly',
        notes: '',
      },
    ]);
  };

  const handleQuickAddPolicy = () => {
    updateClient({
      insurancePolicies: [
        ...insurancePolicies,
        {
          id: `insurance-${Date.now()}`,
          type: '',
          provider: '',
          coverage: '',
          premium: 0,
          currency: inputs.reportingCurrency || 'INR',
          premiumFrequency: 'annual',
          notes: '',
        },
      ],
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleQuickAddFamilyMember();
      } else if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        handleQuickAddIncome();
      } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handleQuickAddPolicy();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [familyMembers, incomeSources, insurancePolicies, inputs.reportingCurrency]);

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
            <input data-identity-cell className="identity-sheet-control" list="country-suggestions" value={inputs.client?.country || ''} onChange={(e) => updateClient({ country: e.target.value })} placeholder="India" autoComplete="country-name" />
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
        <datalist id="country-suggestions">
          {COUNTRY_SUGGESTIONS.map((country) => <option key={country} value={country} />)}
        </datalist>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 mb-5">
          <TextAreaField label="Household overview" value={inputs.client?.familyComposition || ''} onChange={(value) => updateClient({ familyComposition: value })} placeholder="Anything important about dependants, family structure, or support responsibilities" helper="Use the editable family rows below for individual members." />
          <TextAreaField label="Health context" value={inputs.client?.healthStatus || ''} onChange={(value) => updateClient({ healthStatus: value })} placeholder="Current health concerns, coverage gaps, or simply ‘no current concerns’" />
        </div>

        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <p className="text-xs text-muted">
            Family members and dependants. Add rows directly and move with <kbd className="font-mono">Enter</kbd>.
          </p>
          <button
            type="button"
            onClick={handleQuickAddFamilyMember}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill hover:bg-accent-strong transition-colors cursor-pointer"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add member</span>
            <kbd className="ml-1 text-[10px] font-mono opacity-80">Alt+F</kbd>
          </button>
        </div>

        <div className="spreadsheet-wrap" tabIndex={0} role="region" aria-label="Family members table">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th className="spreadsheet-th w-10 text-center">#</th>
                <th className="spreadsheet-th min-w-[160px]">Full Name</th>
                <th className="spreadsheet-th w-36">Relationship</th>
                <th className="spreadsheet-th w-40">Date of Birth</th>
                <th className="spreadsheet-th w-36">Status</th>
                <th className="spreadsheet-th min-w-[200px]">Goal / Responsibility</th>
                <th className="spreadsheet-th w-12 text-center">Del</th>
              </tr>
            </thead>
            <tbody onKeyDown={(e) => advanceCell(e, handleQuickAddFamilyMember)}>
              {familyMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-xs text-muted">
                    No family members added yet. Press <button type="button" onClick={handleQuickAddFamilyMember} className="text-accent underline font-semibold">Add member</button> or <kbd className="font-mono bg-sunken px-1 rounded">Alt+F</kbd> to begin.
                  </td>
                </tr>
              ) : (
                familyMembers.map((member, index) => {
                  const age = ageFromDob(member.dateOfBirth);
                  return (
                    <tr key={member.id} className="spreadsheet-tr">
                      <td className="spreadsheet-td text-center text-xs text-muted font-mono">{index + 1}</td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateFamilyMember(member.id, { name: e.target.value })}
                          placeholder="Full name"
                          className="spreadsheet-control font-medium"
                        />
                      </td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          value={member.relationship}
                          onChange={(e) => updateFamilyMember(member.id, { relationship: e.target.value })}
                          placeholder="e.g. Spouse, Child"
                          className="spreadsheet-control"
                        />
                      </td>
                      <td className="spreadsheet-td">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            value={member.dateOfBirth || ''}
                            onChange={(e) => updateFamilyMember(member.id, { dateOfBirth: e.target.value })}
                            className="spreadsheet-control w-auto flex-1"
                          />
                          {age !== null && (
                            <span className="spreadsheet-pill shrink-0">
                              {age}y
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          value={member.status || ''}
                          onChange={(e) => updateFamilyMember(member.id, { status: e.target.value })}
                          placeholder="Student, Working…"
                          className="spreadsheet-control"
                        />
                      </td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          value={member.goal || ''}
                          onChange={(e) => updateFamilyMember(member.id, { goal: e.target.value })}
                          placeholder="Education, support, legacy…"
                          className="spreadsheet-control"
                        />
                      </td>
                      <td className="spreadsheet-td text-center">
                        <button
                          type="button"
                          onClick={() => updateClient({ familyMembers: familyMembers.filter((item) => item.id !== member.id) })}
                          className="spreadsheet-delete-btn"
                          title="Delete member"
                          aria-label={`Delete ${member.name || 'member'}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </FormSection>

      <FormSection
        index="03"
        title="Income sources"
        description="Where household cashflow comes from — feeds annual income in Cashflow."
        meta={`${incomeSources.length} source${incomeSources.length === 1 ? '' : 's'} · ${formatOutput(monthlyIncomeTotal)}/mo`}
      >
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <p className="text-xs text-muted">
            Track all inflow streams in their native currency. Annual totals convert to plan base automatically.
          </p>
          <button
            type="button"
            onClick={handleQuickAddIncome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill hover:bg-accent-strong transition-colors cursor-pointer"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add income</span>
            <kbd className="ml-1 text-[10px] font-mono opacity-80">Alt+I</kbd>
          </button>
        </div>

        <div className="spreadsheet-wrap" tabIndex={0} role="region" aria-label="Income sources table">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th className="spreadsheet-th w-10 text-center">#</th>
                <th className="spreadsheet-th min-w-[160px]">Source / Earner</th>
                <th className="spreadsheet-th w-36">Amount</th>
                <th className="spreadsheet-th w-24">Curr</th>
                <th className="spreadsheet-th w-32">Frequency</th>
                <th className="spreadsheet-th w-36">Plan Equiv</th>
                <th className="spreadsheet-th min-w-[180px]">Notes</th>
                <th className="spreadsheet-th w-12 text-center">Del</th>
              </tr>
            </thead>
            <tbody onKeyDown={(e) => advanceCell(e, handleQuickAddIncome)}>
              {incomeSources.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-xs text-muted">
                    No income sources recorded yet. Press <button type="button" onClick={handleQuickAddIncome} className="text-accent underline font-semibold">Add income</button> or <kbd className="font-mono bg-sunken px-1 rounded">Alt+I</kbd> to begin.
                  </td>
                </tr>
              ) : (
                incomeSources.map((source, index) => {
                  const inrEquiv = toInr(source.amount, source.currency);
                  return (
                    <tr key={source.id} className="spreadsheet-tr">
                      <td className="spreadsheet-td text-center text-xs text-muted font-mono">{index + 1}</td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          value={source.name}
                          onChange={(e) => updateIncomeSource(source.id, { name: e.target.value })}
                          placeholder="Salary, rental, consulting…"
                          className="spreadsheet-control font-medium"
                        />
                      </td>
                      <td className="spreadsheet-td">
                        <input
                          type="number"
                          value={source.amount || ''}
                          onChange={(e) => updateIncomeSource(source.id, { amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          className="spreadsheet-control text-right font-mono"
                        />
                      </td>
                      <td className="spreadsheet-td">
                        <select
                          value={source.currency || 'INR'}
                          onChange={(e) => updateIncomeSource(source.id, { currency: e.target.value })}
                          className="spreadsheet-control font-mono text-xs"
                        >
                          {currencyOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="spreadsheet-td">
                        <select
                          value={source.frequency}
                          onChange={(e) => updateIncomeSource(source.id, { frequency: e.target.value as IncomeSource['frequency'] })}
                          className="spreadsheet-control text-xs"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="annual">Annual</option>
                        </select>
                      </td>
                      <td className="spreadsheet-td">
                        <span className="spreadsheet-pill font-mono">
                          {formatOutput(inrEquiv)}
                          <span className="text-[10px] opacity-70 ml-1">/{source.frequency === 'monthly' ? 'mo' : 'yr'}</span>
                        </span>
                      </td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          value={source.notes || ''}
                          onChange={(e) => updateIncomeSource(source.id, { notes: e.target.value })}
                          placeholder="Employer, tax treatment, bonus…"
                          className="spreadsheet-control text-xs"
                        />
                      </td>
                      <td className="spreadsheet-td text-center">
                        <button
                          type="button"
                          onClick={() => replaceIncomeSources(incomeSources.filter((item) => item.id !== source.id))}
                          className="spreadsheet-delete-btn"
                          title="Delete source"
                          aria-label={`Delete ${source.name || 'source'}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-ink">Insurance Coverage & Policies</h3>
              <p className="text-xs text-muted">
                Life, health, and asset protection. Add coverage rows directly.
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickAddPolicy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill hover:bg-accent-strong transition-colors cursor-pointer"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add policy</span>
              <kbd className="ml-1 text-[10px] font-mono opacity-80">Alt+P</kbd>
            </button>
          </div>

          <div className="spreadsheet-wrap" tabIndex={0} role="region" aria-label="Insurance policies table">
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th className="spreadsheet-th w-10 text-center">#</th>
                  <th className="spreadsheet-th w-36">Policy Type</th>
                  <th className="spreadsheet-th w-36">Provider</th>
                  <th className="spreadsheet-th w-36">Coverage / Sum</th>
                  <th className="spreadsheet-th w-32">Premium</th>
                  <th className="spreadsheet-th w-24">Curr</th>
                  <th className="spreadsheet-th w-28">Frequency</th>
                  <th className="spreadsheet-th w-36">Plan Equiv</th>
                  <th className="spreadsheet-th min-w-[160px]">Notes</th>
                  <th className="spreadsheet-th w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody onKeyDown={(e) => advanceCell(e, handleQuickAddPolicy)}>
                {insurancePolicies.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-xs text-muted">
                      No insurance policies added yet. Press <button type="button" onClick={handleQuickAddPolicy} className="text-accent underline font-semibold">Add policy</button> or <kbd className="font-mono bg-sunken px-1 rounded">Alt+P</kbd> to begin.
                    </td>
                  </tr>
                ) : (
                  insurancePolicies.map((policy, index) => {
                    const inrPremium = toInr(policy.premium || 0, policy.currency || 'INR');
                    return (
                      <tr key={policy.id} className="spreadsheet-tr">
                        <td className="spreadsheet-td text-center text-xs text-muted font-mono">{index + 1}</td>
                        <td className="spreadsheet-td">
                          <input
                            type="text"
                            value={policy.type}
                            onChange={(e) => updateInsurancePolicy(policy.id, { type: e.target.value })}
                            placeholder="e.g. Term Life, Health"
                            className="spreadsheet-control font-medium"
                          />
                        </td>
                        <td className="spreadsheet-td">
                          <input
                            type="text"
                            value={policy.provider || ''}
                            onChange={(e) => updateInsurancePolicy(policy.id, { provider: e.target.value })}
                            placeholder="e.g. HDFC Life"
                            className="spreadsheet-control"
                          />
                        </td>
                        <td className="spreadsheet-td">
                          <input
                            type="text"
                            value={policy.coverage || ''}
                            onChange={(e) => updateInsurancePolicy(policy.id, { coverage: e.target.value })}
                            placeholder="₹1 Cr / $500k"
                            className="spreadsheet-control"
                          />
                        </td>
                        <td className="spreadsheet-td">
                          <input
                            type="number"
                            value={policy.premium || ''}
                            onChange={(e) => updateInsurancePolicy(policy.id, { premium: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="spreadsheet-control text-right font-mono"
                          />
                        </td>
                        <td className="spreadsheet-td">
                          <select
                            value={policy.currency || 'INR'}
                            onChange={(e) => updateInsurancePolicy(policy.id, { currency: e.target.value })}
                            className="spreadsheet-control font-mono text-xs"
                          >
                            {currencyOptions.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="spreadsheet-td">
                          <select
                            value={policy.premiumFrequency || 'annual'}
                            onChange={(e) => updateInsurancePolicy(policy.id, { premiumFrequency: e.target.value as InsurancePolicy['premiumFrequency'] })}
                            className="spreadsheet-control text-xs"
                          >
                            <option value="annual">Annual</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </td>
                        <td className="spreadsheet-td">
                          <span className="spreadsheet-pill font-mono">
                            {formatOutput(inrPremium)}
                            <span className="text-[10px] opacity-70 ml-1">/{policy.premiumFrequency === 'monthly' ? 'mo' : 'yr'}</span>
                          </span>
                        </td>
                        <td className="spreadsheet-td">
                          <input
                            type="text"
                            value={policy.notes || ''}
                            onChange={(e) => updateInsurancePolicy(policy.id, { notes: e.target.value })}
                            placeholder="Term, renewal date…"
                            className="spreadsheet-control text-xs"
                          />
                        </td>
                        <td className="spreadsheet-td text-center">
                          <button
                            type="button"
                            onClick={() => updateClient({ insurancePolicies: insurancePolicies.filter((item) => item.id !== policy.id) })}
                            className="spreadsheet-delete-btn"
                            title="Delete policy"
                            aria-label={`Delete ${policy.type || 'policy'}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FormSection>
    </div>
  );
};

function TextAreaField({ label, value, onChange, placeholder, helper }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; helper?: string }) {
  return <label className="space-y-1.5 block"><span className="field-label block text-xs font-medium text-ink-soft">{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full min-h-[88px] bg-surface border border-border rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-faint hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none transition-colors resize-y" />{helper && <span className="block text-xs text-faint leading-relaxed">{helper}</span>}</label>;
}
