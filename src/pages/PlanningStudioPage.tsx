import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, FileText, Layers3, PencilLine, ShieldCheck, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import type { AllocationRecommendationMethod, AssetCategory, ManualAllocationPolicy } from '../types';
import { formatCurrencyCompact } from '../lib/formatters';
import { addCRMInteraction, getSelectedCRMClient, saveCRMClient } from '../lib/crm';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];
const LABELS: Record<AssetCategory, string> = {
  equity: 'Equity', debt: 'Fixed income', gold: 'Gold', realestate: 'Real estate', liquid: 'Liquidity', other: 'Other',
};

type AllocationTemplate = {
  id: string;
  name: string;
  audience: string;
  description: string;
  mix: Record<AssetCategory, number>;
  objective: string;
  threshold: number;
};

const TEMPLATES: AllocationTemplate[] = [
  { id: 'capital-preservation', name: 'Capital preservation', audience: 'Practice template · lower drawdown focus', description: 'Defensive, liquidity-led policy for near-term cash-flow needs and modest growth.', mix: { equity: 30, debt: 40, gold: 10, realestate: 0, liquid: 20, other: 0 }, objective: 'Protect capital, maintain funding liquidity and target a modest real return.', threshold: 4 },
  { id: 'balanced-wealth', name: 'Balanced wealth', audience: 'Practice template · broad household mandate', description: 'A diversified all-weather starting point for long-horizon wealth building.', mix: { equity: 55, debt: 25, gold: 10, realestate: 5, liquid: 5, other: 0 }, objective: 'Compound purchasing power while preserving an explicit reserve and rebalancing discipline.', threshold: 5 },
  { id: 'growth', name: 'Long-horizon growth', audience: 'Practice template · accumulation mandate', description: 'Equity-led policy for households with a long runway and adequate reserves.', mix: { equity: 70, debt: 15, gold: 5, realestate: 5, liquid: 5, other: 0 }, objective: 'Maximise long-term real growth within a defined risk budget and liquidity floor.', threshold: 6 },
  { id: 'family-office', name: 'Multi-generational capital', audience: 'Practice template · family office mandate', description: 'Diversifies public capital, real assets and liquidity for intergenerational stewardship.', mix: { equity: 45, debt: 20, gold: 10, realestate: 15, liquid: 5, other: 5 }, objective: 'Preserve and compound multi-generational capital across liquidity, growth and legacy pools.', threshold: 5 },
];

const cloneMix = (mix: Record<AssetCategory, number>) => ({ ...mix });

const RECOMMENDATION_METHODS: { value: AllocationRecommendationMethod; label: string; detail: string }[] = [
  { value: 'advisor-rationale', label: 'Advisor rationale', detail: 'A judgement-led recommendation explained in the advice record.' },
  { value: 'model-optimised', label: 'Suggestive optimisation', detail: 'A model-informed starting point, subject to adviser suitability review.' },
  { value: 'goal-and-cashflow-led', label: 'Goals & cash-flow led', detail: 'Anchored to funding priorities, liquidity and spending needs.' },
  { value: 'risk-budget-calibrated', label: 'Risk-budget calibrated', detail: 'Anchored to the completed risk assessment and capacity.' },
];

const formatMethod = (method: AllocationRecommendationMethod) =>
  RECOMMENDATION_METHODS.find((item) => item.value === method)?.label || 'Advisor rationale';

export function PlanningStudioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { inputs, wealthResult, manualTargets, manualAllocationPolicy, riskProfile, setManualTargets, setManualAllocationPolicy, updateClient, showToast } = useCalculator();
  const [activeClient, setActiveClient] = useState(() => getSelectedCRMClient());
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [mix, setMix] = useState<Record<AssetCategory, number>>(() => cloneMix(manualTargets || riskProfile.targets));
  const [policyName, setPolicyName] = useState(manualAllocationPolicy?.name || 'Strategic allocation mandate');
  const [objective, setObjective] = useState(manualAllocationPolicy?.objective || '');
  const [constraints, setConstraints] = useState(manualAllocationPolicy?.constraints || inputs.client.notes || '');
  const [reviewFrequency, setReviewFrequency] = useState<ManualAllocationPolicy['reviewFrequency']>(manualAllocationPolicy?.reviewFrequency || 'quarterly');
  const [rebalanceThreshold, setRebalanceThreshold] = useState(manualAllocationPolicy?.rebalanceThreshold || 5);
  const [recommendationMethod, setRecommendationMethod] = useState<AllocationRecommendationMethod>(manualAllocationPolicy?.recommendations?.at(-1)?.method || (manualTargets ? 'advisor-rationale' : 'risk-budget-calibrated'));
  const [rationale, setRationale] = useState(manualAllocationPolicy?.rationale || '');
  const [evidenceCitation, setEvidenceCitation] = useState(manualAllocationPolicy?.recommendations?.at(-1)?.evidenceCitation || '');

  useEffect(() => {
    if (searchParams.get('mode') !== 'manual') return;
    setSelectedTemplate(null);
    setPolicyName(manualAllocationPolicy?.name || 'Custom client allocation');
  }, [manualAllocationPolicy?.name, searchParams]);

  useEffect(() => {
    const refresh = () => setActiveClient(getSelectedCRMClient());
    window.addEventListener('stw:active-client-changed', refresh);
    window.addEventListener('stw:clients-updated', refresh);
    return () => {
      window.removeEventListener('stw:active-client-changed', refresh);
      window.removeEventListener('stw:clients-updated', refresh);
    };
  }, []);

  useEffect(() => {
    setMix(cloneMix(manualTargets || riskProfile.targets));
    setPolicyName(manualAllocationPolicy?.name || 'Strategic allocation mandate');
    setObjective(manualAllocationPolicy?.objective || '');
    setConstraints(manualAllocationPolicy?.constraints || inputs.client.notes || '');
    setReviewFrequency(manualAllocationPolicy?.reviewFrequency || 'quarterly');
    setRebalanceThreshold(manualAllocationPolicy?.rebalanceThreshold || 5);
    setRecommendationMethod(manualAllocationPolicy?.recommendations?.at(-1)?.method || (manualTargets ? 'advisor-rationale' : 'risk-budget-calibrated'));
    setRationale(manualAllocationPolicy?.rationale || '');
    setEvidenceCitation(manualAllocationPolicy?.recommendations?.at(-1)?.evidenceCitation || '');
  }, [activeClient?.id, inputs.client.notes, manualAllocationPolicy, manualTargets, riskProfile.targets]);

  const total = useMemo(() => CATEGORIES.reduce((sum, category) => sum + (Number(mix[category]) || 0), 0), [mix]);
  const isValid = Math.abs(total - 100) < 0.01;
  const clientName = inputs.client.name || activeClient?.name || 'Select a client';

  const chooseTemplate = (template: AllocationTemplate) => {
    setSelectedTemplate(template.id);
    setMix(cloneMix(template.mix));
    setPolicyName(template.name);
    setObjective(template.objective);
    setRebalanceThreshold(template.threshold);
    setRecommendationMethod('model-optimised');
    setRationale(`Adapted from the practice-wide ${template.name} template for this household's plan, risk budget and liquidity needs.`);
  };

  const updateMix = (category: AssetCategory, value: number) => {
    setSelectedTemplate(null);
    setMix((current) => ({ ...current, [category]: Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) }));
  };

  const publishPolicy = (openIPS: boolean) => {
    if (!isValid) {
      showToast('Allocation must total exactly 100% before it can be used in an IPS.', 'warning');
      return;
    }
    const now = new Date().toISOString();
    const sourceLabel = selectedTemplate
      ? `Practice template · ${TEMPLATES.find((template) => template.id === selectedTemplate)?.name || 'Allocation library'}`
      : 'Client-specific allocation';
    const recommendation = {
      id: `allocation-proposal-${Date.now()}`,
      title: policyName.trim() || 'Strategic allocation mandate',
      method: recommendationMethod,
      sourceLabel,
      rationale: rationale.trim() || 'Advisor recommendation recorded against the client plan and current allocation.',
      evidenceCitation: evidenceCitation.trim(),
      createdAt: now,
      createdBy: inputs.client.advisor || 'SoundThesis Capital',
      targets: cloneMix(mix),
    };
    const policy: ManualAllocationPolicy = {
      name: policyName.trim() || 'Strategic allocation mandate',
      objective: objective.trim() || 'Client-specific strategic allocation policy.',
      rationale: recommendation.rationale,
      constraints: constraints.trim(),
      reviewFrequency,
      rebalanceThreshold,
      status: 'proposed',
      effectiveDate: new Date().toISOString().slice(0, 10),
      approvedBy: inputs.client.advisor || 'SoundThesis Capital',
      ranges: Object.fromEntries(CATEGORIES.map((category) => [category, { min: Math.max(0, mix[category] - rebalanceThreshold), max: Math.min(100, mix[category] + rebalanceThreshold) }])) as ManualAllocationPolicy['ranges'],
      updatedAt: now,
      recommendations: [...(manualAllocationPolicy?.recommendations || []), recommendation].slice(-12),
    };
    setManualTargets(cloneMix(mix));
    setManualAllocationPolicy(policy);
    updateClient({ notes: policy.constraints });
    const client = getSelectedCRMClient();
    if (client) {
      saveCRMClient({ ...client, stage: client.stage === 'Active Mandate' ? client.stage : 'IPS Draft', targetAllocation: cloneMix(mix), policyNotes: policy.constraints });
      addCRMInteraction(client.id, {
        clientId: client.id,
        date: new Date().toISOString().slice(0, 10),
        type: 'note',
        title: 'Strategic allocation policy prepared',
        notes: `${policy.name}: ${policy.objective}`,
        nextAction: 'Review and issue the Investment Policy Statement',
        actionCompleted: false,
        advisorName: inputs.client.advisor || 'SoundThesis Capital',
      });
    }
    showToast(openIPS ? 'Allocation proposal recorded. Opening the IPS with this policy.' : 'Allocation proposal recorded in the client plan and dossier.', 'success');
    if (openIPS) navigate('/ips?step=document');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-border pb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Client planning workspace</div>
          <h1 className="text-3xl font-bold tracking-tight text-ink mt-2">Turn a plan into a policy.</h1>
          <p className="text-sm text-muted max-w-2xl mt-2">Practice-wide allocation ideas stay in the library. Here, an adviser adapts one for a single household, saves it to the client plan, then issues the IPS from the same live state.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 min-w-[250px]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Working for</div>
          <div className="font-semibold text-ink mt-1">{clientName}</div>
          <div className="text-xs text-muted mt-1">{activeClient?.stage || 'Discovery'} · {formatCurrencyCompact(wealthResult.netWorth || activeClient?.financialSummary?.netWorth || 0)} net worth</div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Planning sequence">
        {[
          ['01', 'Client plan', 'Household, goals, cash flow and risk profile inform the mandate.'],
          ['02', 'Allocation policy', 'Choose a practice template or author a client-specific allocation.'],
          ['03', 'IPS & dossier', 'The saved policy is reused directly in the IPS and client dossier.'],
        ].map(([number, title, copy], index) => <div key={title} className={`rounded-xl border p-4 ${index === 1 ? 'border-accent bg-accent-soft/30' : 'border-border bg-surface'}`}><span className="font-mono text-xs text-accent">{number}</span><h2 className="font-semibold text-ink mt-2">{title}</h2><p className="text-xs text-muted mt-1 leading-relaxed">{copy}</p></div>)}
      </section>

      <div className="grid gap-7 xl:grid-cols-[0.9fr_1.4fr]">
        <section className="space-y-4">
          <div className="flex items-center gap-2"><Layers3 size={17} className="text-accent" /><div><h2 className="font-semibold text-ink">Practice allocation library</h2><p className="text-xs text-muted">Reusable starting points. Selecting one never changes another client.</p></div></div>
          <div className="space-y-3">
            {TEMPLATES.map((template) => <button key={template.id} type="button" onClick={() => chooseTemplate(template)} className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedTemplate === template.id ? 'border-accent bg-accent-soft/40' : 'border-border bg-surface hover:bg-sunken'}`}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-sm text-ink">{template.name}</h3><p className="text-[11px] text-accent mt-0.5">{template.audience}</p></div>{selectedTemplate === template.id && <Check size={16} className="text-accent shrink-0" />}</div>
              <p className="text-xs text-muted leading-relaxed mt-2">{template.description}</p>
              <div className="font-mono text-[11px] text-ink mt-3">Eq {template.mix.equity}% · FI {template.mix.debt}% · Gold {template.mix.gold}% · Liquid {template.mix.liquid}%</div>
            </button>)}
          </div>
          <div className="rounded-xl border border-border bg-sunken p-4 text-xs text-muted"><div className="flex gap-2"><Users size={15} className="text-faint shrink-0" /><p><strong className="text-ink">Practice vs client separation:</strong> templates are starting points; only the policy at right is written to {clientName}'s record.</p></div></div>
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-card p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div className="flex items-center gap-2.5"><div className="w-9 h-9 grid place-items-center rounded-lg bg-accent-soft text-accent"><SlidersHorizontal size={18} /></div><div><h2 className="font-semibold text-ink">Client allocation policy</h2><p className="text-xs text-muted">Edit this allocation freely. It becomes the IPS policy target after saving.</p></div></div><div className={`rounded-md px-3 py-1.5 text-xs font-mono font-semibold ${isValid ? 'bg-positive-soft text-positive' : 'bg-warning-soft text-warning'}`}>{total.toFixed(0)}% / 100%</div></div>

          <div className="grid sm:grid-cols-2 gap-4"><label className="space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Policy name</span><input value={policyName} onChange={(event) => setPolicyName(event.target.value)} className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent" /></label><label className="space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Review cadence</span><select value={reviewFrequency} onChange={(event) => setReviewFrequency(event.target.value as ManualAllocationPolicy['reviewFrequency'])} className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"><option value="quarterly">Quarterly</option><option value="semiannual">Semiannual</option><option value="annual">Annual</option></select></label></div>
          <label className="block space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Investment objective</span><textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={2} placeholder="What must this allocation accomplish for this household?" className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent resize-y" /></label>

          <div className="border border-border rounded-xl overflow-hidden"><div className="grid grid-cols-[1fr_86px_92px] gap-3 px-4 py-2.5 bg-sunken text-[11px] font-semibold uppercase tracking-wide text-muted"><span>Asset class</span><span className="text-right">Target</span><span className="text-right">Corridor</span></div>{CATEGORIES.map((category) => <div key={category} className="grid grid-cols-[1fr_86px_92px] gap-3 items-center px-4 py-3 border-t border-border"><div><div className="text-sm font-medium text-ink">{LABELS[category]}</div><input type="range" min="0" max="100" value={mix[category]} onChange={(event) => updateMix(category, Number(event.target.value))} className="w-full accent-[var(--color-accent)] mt-1" aria-label={`${LABELS[category]} allocation`} /></div><input type="number" min="0" max="100" value={mix[category]} onChange={(event) => updateMix(category, Number(event.target.value))} className="w-full rounded-md border border-border bg-raised px-2 py-1.5 text-right font-mono text-sm text-ink focus:outline-none focus:border-accent" /><span className="text-right font-mono text-xs text-muted">±{rebalanceThreshold}%</span></div>)}</div>
          <div className="grid sm:grid-cols-[1fr_150px] gap-4"><label className="space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Client constraints & exclusions</span><textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} rows={3} placeholder="Liquidity floor, securities exclusions, tax or legacy constraints…" className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent resize-y" /></label><label className="space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Rebalance trigger</span><input type="number" min="1" max="20" value={rebalanceThreshold} onChange={(event) => setRebalanceThreshold(Math.max(1, Math.min(20, Number(event.target.value) || 1)))} className="w-full rounded-lg border border-border bg-raised px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:border-accent" /><p className="text-[11px] text-muted leading-relaxed">Absolute drift from target before a review is required.</p></label></div>

          <section className="rounded-xl border border-border bg-sunken/40 p-4 space-y-4" aria-label="Allocation proposal record">
            <div><h3 className="text-sm font-semibold text-ink">Record the recommendation</h3><p className="text-xs text-muted mt-1">This creates a dated advisory proposal in the dossier. It preserves how the allocation was chosen, not just the final weights.</p></div>
            <div className="grid sm:grid-cols-2 gap-4"><label className="space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Suggestion type</span><select value={recommendationMethod} onChange={(event) => setRecommendationMethod(event.target.value as AllocationRecommendationMethod)} className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent">{RECOMMENDATION_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select><p className="text-[11px] leading-relaxed text-muted">{RECOMMENDATION_METHODS.find((method) => method.value === recommendationMethod)?.detail}</p></label><label className="space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Proposed by</span><div className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink">{inputs.client.advisor || 'SoundThesis Capital'}</div><p className="text-[11px] leading-relaxed text-muted">Recorded with a timestamp when this proposal is saved.</p></label></div>
            <label className="block space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Advisor rationale</span><textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={3} placeholder="Explain why this mix is suitable, including the trade-offs being accepted." className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent resize-y" /></label>
            <label className="block space-y-1.5"><span className="text-xs font-semibold text-ink-soft">Evidence / citation</span><input value={evidenceCitation} onChange={(event) => setEvidenceCitation(event.target.value)} placeholder="Research note, committee paper, policy reference or URL" className="w-full rounded-lg border border-border bg-raised px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent" /><p className="text-[11px] text-muted">Optional, but shown verbatim in the dossier so the source can be reviewed later.</p></label>
            {manualAllocationPolicy?.recommendations?.length ? <p className="border-t border-border pt-3 text-[11px] text-muted"><span className="font-semibold text-ink">Traceability:</span> {manualAllocationPolicy.recommendations.length} earlier proposal{manualAllocationPolicy.recommendations.length === 1 ? '' : 's'} retained with this client policy. Current selection: {formatMethod(recommendationMethod)}.</p> : null}
          </section>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-5"><p className="text-xs text-muted flex gap-2"><ShieldCheck size={15} className="text-accent shrink-0" />Saving records the proposal, then updates the active client's policy, IPS and dossier source state.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => publishPolicy(false)} className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink hover:bg-sunken">Record & save</button><button type="button" onClick={() => publishPolicy(true)} disabled={!isValid} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-strong disabled:opacity-40"><FileText size={14} /> Record & issue IPS <ArrowRight size={14} /></button></div></div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 className="font-semibold text-sm text-ink">Already have a full financial plan?</h2><p className="text-xs text-muted mt-1">Complete household facts, cash flow and goals before setting the strategic policy.</p></div><div className="flex gap-2"><Link to="/master-plan" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-sunken"><PencilLine size={14} /> Open plan</Link><Link to="/dossier" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-sunken"><Sparkles size={14} /> View dossier</Link></div></section>
    </div>
  );
}
