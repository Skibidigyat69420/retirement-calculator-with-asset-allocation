import { Link } from 'react-router-dom';
import { ArrowRight, FilePenLine, FileText, Layers3, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrencyCompact } from '../lib/formatters';

export function PolicyCenterPage() {
  const { inputs, riskProfile, hasRiskAnswers, manualAllocationPolicy, wealthResult } = useCalculator();
  const clientName = inputs.client.name || 'Active client';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
      <header className="border-b border-border pb-6 flex flex-col lg:flex-row justify-between lg:items-end gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Policy & IPS module</div>
          <h1 className="text-3xl font-bold tracking-tight text-ink mt-2">Choose how to create the mandate.</h1>
          <p className="text-sm text-muted max-w-2xl mt-2">Use the full financial plan when it exists, set a deliberate manual allocation when it does not, or write an independent IPS from a blank document. These paths are explicit so no client data is silently assumed.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 min-w-[250px]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Active context</span>
          <div className="font-semibold text-ink mt-1">{clientName}</div>
          <div className="text-xs text-muted mt-1">{formatCurrencyCompact(wealthResult.netWorth)} net worth · {manualAllocationPolicy?.name || 'No client policy saved'}</div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Mandate creation methods">
        <article className="rounded-2xl border border-accent bg-accent-soft/25 p-5 flex flex-col">
          <div className="w-9 h-9 rounded-lg grid place-items-center bg-accent text-white"><Layers3 size={18} /></div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">Connected path</div>
          <h2 className="font-semibold text-ink text-lg mt-1">Build from the client plan</h2>
          <p className="text-sm text-muted leading-relaxed mt-2">Bring goals, cash flow, holdings, risk results and selected allocation into a governed policy, IPS and dossier.</p>
          <div className="mt-auto pt-5"><Link to="/planning" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-strong">Open planning studio <ArrowRight size={14} /></Link></div>
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5 flex flex-col">
          <div className="w-9 h-9 rounded-lg grid place-items-center bg-sunken text-ink"><SlidersHorizontal size={18} /></div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Adviser-authored path</div>
          <h2 className="font-semibold text-ink text-lg mt-1">Set a manual allocation</h2>
          <p className="text-sm text-muted leading-relaxed mt-2">Start from a practice template or enter each target yourself. Add corridors, review cadence, objective and mandate restrictions before issuing.</p>
          <div className="mt-auto pt-5"><Link to="/planning?mode=manual" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink hover:bg-sunken">Author allocation <ArrowRight size={14} /></Link></div>
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5 flex flex-col">
          <div className="w-9 h-9 rounded-lg grid place-items-center bg-sunken text-ink"><FilePenLine size={18} /></div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Standalone document path</div>
          <h2 className="font-semibold text-ink text-lg mt-1">Write an IPS from scratch</h2>
          <p className="text-sm text-muted leading-relaxed mt-2">Open a blank charter and enter client, objectives, allocation, holdings and constraints directly. It stays independent until you choose to link it.</p>
          <div className="mt-auto pt-5"><Link to="/ips/editor?mode=independent" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink hover:bg-sunken">Create blank IPS <FileText size={14} /></Link></div>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 grid lg:grid-cols-[1fr_auto] gap-5 items-center">
        <div className="flex gap-3"><div className="w-9 h-9 rounded-lg grid place-items-center bg-accent-soft text-accent shrink-0"><ShieldCheck size={18} /></div><div><h2 className="font-semibold text-ink">Risk profile is a decision input—not a locked allocation.</h2><p className="text-sm text-muted leading-relaxed mt-1">{hasRiskAnswers ? `${riskProfile.label} profile ready: use it as the starting risk budget, then document any client-specific manual departure in the allocation policy.` : 'Complete the risk assessment first to establish capacity, tolerance, liquidity constraints and a recommended risk budget.'}</p></div></div>
        <Link to="/risk" className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-ink hover:bg-sunken whitespace-nowrap">{hasRiskAnswers ? 'Review risk profile' : 'Assess risk'} <Sparkles size={14} /></Link>
      </section>
    </div>
  );
}
