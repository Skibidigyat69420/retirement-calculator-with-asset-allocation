import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Download, FileText, PencilLine, Printer, Save, SlidersHorizontal, UserRound, WalletCards } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { categoryLabels, defaultState, generateIPSMarkdown, type IPSState } from '../lib/ipsMarkdown';
import type { AssetCategory } from '../types';
import { formatCurrency } from '../lib/formatters';

type StepId = 'client' | 'position' | 'policy' | 'document';

const steps: { id: StepId; number: string; label: string; description: string }[] = [
  { id: 'client', number: '01', label: 'Client', description: 'Who is this policy for?' },
  { id: 'position', number: '02', label: 'Position', description: 'What needs protecting?' },
  { id: 'policy', number: '03', label: 'Policy', description: 'Set the investment rules.' },
  { id: 'document', number: '04', label: 'Document', description: 'Review and issue the IPS.' },
];

const categories: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const riskText = (id: string): 'low' | 'moderate' | 'high' => {
  if (id === 'conservative' || id === 'moderate') return 'low';
  if (id === 'balanced') return 'moderate';
  return 'high';
};

export function IPSWorkspacePage() {
  const {
    inputs,
    updateInputs,
    updateClient,
    addGoal,
    updateGoal,
    manualTargets,
    setManualTargets,
    riskProfile,
    hasRiskAnswers,
    wealthResult,
    saveCurrentPlan,
    showToast,
  } = useCalculator();
  const [step, setStep] = useState<StepId>('client');
  const [saving, setSaving] = useState(false);
  const [primaryGoal, setPrimaryGoal] = useState(() => inputs.goals[0]?.name ?? '');
  const [policyNote, setPolicyNote] = useState(() => inputs.client.notes ?? '');

  const allocation = manualTargets ?? riskProfile.targets;
  const allocationTotal = categories.reduce((total, category) => total + (allocation[category] || 0), 0);
  const clientReady = Boolean(inputs.client.name.trim() && inputs.currentAge > 0 && inputs.retirementAge > inputs.currentAge);
  const positionReady = inputs.assets.length > 0 || inputs.monthlyLivingExpenses > 0 || inputs.goals.length > 0;
  const policyReady = Math.abs(allocationTotal - 100) < 0.1;
  const completed: Record<StepId, boolean> = {
    client: clientReady,
    position: positionReady,
    policy: policyReady,
    document: clientReady && policyReady,
  };

  const ipsState = useMemo<IPSState>(() => {
    const base = defaultState();
    const currentAllocation = categories.reduce<Record<AssetCategory, number>>((result, category) => {
      result[category] = Number(((wealthResult.currentAllocation?.[category] || 0) * 100).toFixed(1));
      return result;
    }, { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 });
    return {
      ...base,
      client: {
        name: inputs.client.name,
        advisor: inputs.client.advisor || 'Sound Thesis Wealth Advisory',
        reviewDate: inputs.client.reviewDate || new Date().toISOString().slice(0, 10),
        currentAge: inputs.currentAge,
        retirementAge: inputs.retirementAge,
        lifeExpectancy: inputs.lifeExpectancy,
        inflation: inputs.inflation,
      },
      riskTolerance: riskText(riskProfile.id),
      maxDrawdown: riskProfile.maxDrawdown,
      allocation,
      currentAllocation,
      goals: inputs.goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        priority: goal.priority,
        yearsToGoal: goal.yearsToGoal,
        targetAmount: goal.targetAmount,
      })),
      assets: inputs.assets.map((asset) => ({ id: asset.id, name: asset.name, category: asset.category, value: asset.value })),
      notes: policyNote,
    };
  }, [allocation, inputs, policyNote, riskProfile, wealthResult.currentAllocation]);

  const documentText = useMemo(() => generateIPSMarkdown(ipsState, wealthResult.netWorth), [ipsState, wealthResult.netWorth]);

  const advance = (next: StepId) => {
    if (step === 'position') persistGoal();
    if (step === 'policy') updateClient({ notes: policyNote });
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const persistGoal = () => {
    if (!primaryGoal.trim()) return;
    const current = inputs.goals[0];
    if (current) updateGoal(current.id, { name: primaryGoal.trim() });
    else addGoal({ name: primaryGoal.trim(), priority: 'essential', yearsToGoal: Math.max(1, inputs.retirementAge - inputs.currentAge), targetAmount: 0 });
  };

  const setManualTarget = (category: AssetCategory, value: number) => {
    setManualTargets({ ...allocation, [category]: Math.max(0, value) });
  };

  const saveAndNotify = async () => {
    setSaving(true);
    try {
      await saveCurrentPlan(`${inputs.client.name || 'Untitled'} IPS`);
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    const safeName = (inputs.client.name || 'client').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    const file = new Blob([documentText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName || 'client'}-investment-policy-statement.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('IPS downloaded as Markdown.', 'success');
  };

  return (
    <div className="ips-workspace">
      <header className="ips-workspace-header">
        <div>
          <span className="eyebrow">IPS builder</span>
          <h1>Turn a client conversation into a clear investment policy.</h1>
          <p>Only enter what is needed to issue the first draft. Detailed planning tools remain available when the conversation needs them.</p>
        </div>
        <div className="ips-header-actions">
          <Link to="/practitioner" className="ips-quiet-link"><UserRound size={15} /> Clients</Link>
          <button type="button" onClick={() => void saveAndNotify()} disabled={saving} className="ips-save-button"><Save size={15} /> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </header>

      <nav className="ips-stepper" aria-label="Create investment policy statement">
        {steps.map((item, index) => {
          const active = step === item.id;
          return <button key={item.id} type="button" onClick={() => setStep(item.id)} className={`ips-step ${active ? 'active' : ''} ${completed[item.id] ? 'complete' : ''}`} aria-current={active ? 'step' : undefined}>
            <span className="ips-step-number">{completed[item.id] ? <Check size={14} /> : item.number}</span>
            <span><strong>{item.label}</strong><small>{item.description}</small></span>
            {index < steps.length - 1 && <ChevronRight size={16} className="ips-step-chevron" />}
          </button>;
        })}
      </nav>

      <section className="ips-builder-card">
        {step === 'client' && <div className="ips-builder-section">
          <div className="ips-section-heading"><span className="ips-section-icon"><UserRound size={18} /></span><div><span className="eyebrow">Step 01</span><h2>Start with the household</h2><p>These details appear in the policy and set its time horizon.</p></div></div>
          <div className="ips-form-grid">
            <label className="ips-field wide"><span>Client or household name</span><input value={inputs.client.name} onChange={(event) => updateClient({ name: event.target.value })} placeholder="e.g. Rhea and Karan Shah" autoFocus /></label>
            <label className="ips-field"><span>Current age</span><input type="number" min="0" max="120" value={inputs.currentAge || ''} onChange={(event) => updateInputs({ currentAge: number(event.target.value) })} placeholder="42" /></label>
            <label className="ips-field"><span>Retirement age</span><input type="number" min="0" max="120" value={inputs.retirementAge || ''} onChange={(event) => updateInputs({ retirementAge: number(event.target.value) })} placeholder="60" /></label>
            <label className="ips-field"><span>Life expectancy</span><input type="number" min="0" max="120" value={inputs.lifeExpectancy || ''} onChange={(event) => updateInputs({ lifeExpectancy: number(event.target.value) })} placeholder="90" /></label>
            <label className="ips-field"><span>Next review date</span><input type="date" value={inputs.client.reviewDate || ''} onChange={(event) => updateClient({ reviewDate: event.target.value })} /></label>
            <label className="ips-field wide"><span>Lead adviser</span><input value={inputs.client.advisor} onChange={(event) => updateClient({ advisor: event.target.value })} placeholder="Adviser or firm name" /></label>
          </div>
          <div className="ips-card-footer"><p>{clientReady ? 'Household details are ready.' : 'Add a name and a sensible planning horizon to continue.'}</p><button type="button" onClick={() => advance('position')} className="ips-primary-button">Continue <ArrowRight size={16} /></button></div>
        </div>}

        {step === 'position' && <div className="ips-builder-section">
          <div className="ips-section-heading"><span className="ips-section-icon"><WalletCards size={18} /></span><div><span className="eyebrow">Step 02</span><h2>Capture what the policy must protect</h2><p>Use a few headline inputs now. You can add holdings, loans and detailed goals later.</p></div></div>
          <div className="ips-form-grid">
            <label className="ips-field"><span>Annual household income</span><input type="number" min="0" value={inputs.annualIncome || ''} onChange={(event) => updateInputs({ annualIncome: number(event.target.value) })} placeholder="0" /></label>
            <label className="ips-field"><span>Monthly living expenses</span><input type="number" min="0" value={inputs.monthlyLivingExpenses || ''} onChange={(event) => updateInputs({ monthlyLivingExpenses: number(event.target.value), monthlyExpenditure: number(event.target.value) })} placeholder="0" /></label>
            <label className="ips-field"><span>Inflation assumption</span><div className="ips-suffix-input"><input type="number" min="0" max="25" step="0.1" value={inputs.inflation || ''} onChange={(event) => updateInputs({ inflation: number(event.target.value) })} placeholder="6" /><span>%</span></div></label>
            <label className="ips-field"><span>Primary goal</span><input value={primaryGoal} onChange={(event) => setPrimaryGoal(event.target.value)} onBlur={persistGoal} placeholder="e.g. Retirement income" /></label>
          </div>
          <div className="ips-position-summary"><div><span>Current recorded assets</span><strong>{formatCurrency(wealthResult.netWorth)}</strong><small>{inputs.assets.length ? `${inputs.assets.length} holding${inputs.assets.length === 1 ? '' : 's'} captured` : 'No holdings captured yet'}</small></div><Link to="/master-plan?step=financials">Add detailed holdings <ArrowRight size={15} /></Link></div>
          <div className="ips-card-footer"><p>{positionReady ? 'The policy has enough context for a first draft.' : 'This step is optional, but adding a goal or cashflow makes the policy more useful.'}</p><button type="button" onClick={() => advance('policy')} className="ips-primary-button">Set policy <ArrowRight size={16} /></button></div>
        </div>}

        {step === 'policy' && <div className="ips-builder-section">
          <div className="ips-section-heading"><span className="ips-section-icon"><SlidersHorizontal size={18} /></span><div><span className="eyebrow">Step 03</span><h2>Set the rules of investing</h2><p>The recommendation is based on the saved risk profile. Turn on manual override only when the adviser is defining a policy directly.</p></div></div>
          <div className="ips-policy-source"><div><strong>{manualTargets ? 'Manual policy override' : hasRiskAnswers ? `${riskProfile.label} policy` : 'Balanced starter policy'}</strong><span>{manualTargets ? 'This allocation will be used in the IPS and stored with the plan.' : hasRiskAnswers ? 'This recommendation comes from the saved risk profile.' : 'Complete the risk questionnaire later to replace this starter policy with a client-specific recommendation.'}</span></div><button type="button" onClick={() => setManualTargets(manualTargets ? null : { ...riskProfile.targets })}>{manualTargets ? 'Use recommended policy' : 'Enable manual override'}</button></div>
          <div className="ips-allocation-grid">
            {categories.map((category) => <label key={category} className="ips-allocation-field"><span>{categoryLabels[category]}</span><div className="ips-suffix-input"><input type="number" min="0" max="100" value={allocation[category] || 0} onChange={(event) => setManualTarget(category, number(event.target.value))} disabled={!manualTargets} /><span>%</span></div></label>)}
          </div>
          <div className={`ips-allocation-total ${policyReady ? 'valid' : 'invalid'}`}><span>Policy allocation total</span><strong>{allocationTotal.toFixed(0)}%</strong><small>{policyReady ? 'Ready to issue' : 'The target allocation must equal 100%.'}</small></div>
          <label className="ips-field wide ips-notes-field"><span>Policy notes, exclusions or constraints</span><textarea value={policyNote} onChange={(event) => setPolicyNote(event.target.value)} onBlur={() => updateClient({ notes: policyNote })} placeholder="For example: avoid direct equity, retain 12 months of spending in liquid assets, or exclude a specific sector." rows={4} /></label>
          <div className="ips-card-footer"><p>{manualTargets ? 'Manual override is active and recorded with this plan.' : 'The policy uses the current risk-profile targets.'}</p><button type="button" onClick={() => advance('document')} className="ips-primary-button" disabled={!policyReady}>Review IPS <ArrowRight size={16} /></button></div>
        </div>}

        {step === 'document' && <div className="ips-builder-section ips-document-section">
          <div className="ips-section-heading"><span className="ips-section-icon"><FileText size={18} /></span><div><span className="eyebrow">Step 04</span><h2>Review the Investment Policy Statement</h2><p>The generated document uses the inputs above. Edit the full template only if you need clause-level control.</p></div></div>
          {!completed.document && <div className="ips-readiness-warning">Add the client’s name, age and retirement age, then ensure policy weights total 100% before issuing this document.</div>}
          <div className="ips-document-actions"><button type="button" className="ips-primary-button" onClick={download} disabled={!completed.document}><Download size={16} /> Download IPS</button><button type="button" className="ips-secondary-button" onClick={() => window.print()}><Printer size={16} /> Print</button><Link to="/ips/editor" className="ips-secondary-button"><PencilLine size={16} /> Full editor</Link></div>
          <pre className="ips-document-preview" aria-label="Investment policy statement preview">{documentText}</pre>
        </div>}
      </section>
      <footer className="ips-workspace-help"><span>Need a deeper plan?</span><Link to="/master-plan">Open the complete planning workspace <ArrowRight size={14} /></Link></footer>
    </div>
  );
}
