import { Link } from 'react-router-dom';
import { ArrowRight, FilePenLine, FileText, Layers3, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrencyCompact } from '../lib/formatters';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export function PolicyCenterPage() {
  const { inputs, riskProfile, hasRiskAnswers, manualAllocationPolicy, wealthResult } = useCalculator();
  const clientName = inputs.client.name || 'Active household';
  const policyReady = Boolean(manualAllocationPolicy || wealthResult.isConfigured);

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        eyebrow="Policy / overview"
        title="Make the policy position explainable."
        description={policyReady
          ? 'Start with the household objective, then turn the recorded plan and risk evidence into a reviewable policy proposal.'
          : 'A policy needs an objective, liquidity needs and risk evidence before an allocation can be defended.'}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/planning"><Button variant="outline">Strategic Allocation <ArrowRight size={14} /></Button></Link>
            <Link to="/dossier"><Button>Proceed to Dossier <ArrowRight size={14} /></Button></Link>
          </div>
        }
      />

      <section className="grid gap-6 xl:grid-cols-12" aria-label="Policy position">
        <article className="policy-decision xl:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <span className="eyebrow">Policy intent</span>
            <span className="font-mono text-[11px] text-muted">{manualAllocationPolicy ? 'ADVISER-AUTHORED' : 'DRAFT BASIS'}</span>
          </div>
          <h2>{manualAllocationPolicy?.name || (hasRiskAnswers ? `${riskProfile.label} posture needs a documented policy.` : 'Risk and liquidity evidence are still needed.')}</h2>
          <p>{manualAllocationPolicy?.rationale || (hasRiskAnswers
            ? `Use the ${riskProfile.label.toLowerCase()} profile as a starting risk budget, then document household objectives, liquidity floor, constraints and any informed departure.`
            : 'Complete the risk assessment and record the household’s immediate funding needs before proposing a target mix.')}</p>
          <div className="policy-decision-metrics">
            <div><span>Household</span><strong>{clientName}</strong></div>
            <div><span>Risk basis</span><strong>{hasRiskAnswers ? riskProfile.label : 'Not assessed'}</strong></div>
            <div><span>Net worth</span><strong>{wealthResult.isConfigured ? formatCurrencyCompact(wealthResult.netWorth) : 'Not recorded'}</strong></div>
          </div>
        </article>

        <aside className="policy-evidence xl:col-span-5">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <span className="eyebrow">Required evidence</span>
            <h2>{hasRiskAnswers ? 'Risk profile recorded' : 'Risk profile missing'}</h2>
            <p>{hasRiskAnswers
              ? 'Risk capacity and preference are available. Review liquidity and specific constraints before issuing an IPS.'
              : 'A model allocation should not be issued until capacity, preference and liquidity are understood.'}</p>
          </div>
          <Link to="/risk" className="policy-text-action">{hasRiskAnswers ? 'Review risk evidence' : 'Assess risk'} <ArrowRight size={14} /></Link>
        </aside>
      </section>

      <section aria-labelledby="policy-routes-heading">
        <div className="section-rule-heading">
          <div><h2 id="policy-routes-heading">Choose a policy route</h2><p>Use the connected path whenever the planning facts already exist.</p></div>
        </div>
        <div className="policy-routes">
          <Link to="/planning" className="policy-route policy-route-primary">
            <span className="policy-route-icon"><Layers3 size={18} /></span>
            <span><strong>Build from the client plan</strong><small>Bring goals, cash flow, holdings and risk results into a reviewable proposal.</small></span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/planning?mode=manual" className="policy-route">
            <span className="policy-route-icon"><SlidersHorizontal size={18} /></span>
            <span><strong>Set a manual allocation</strong><small>Author targets, corridors, objective and constraints without importing a plan.</small></span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/ips/editor?mode=independent" className="policy-route">
            <span className="policy-route-icon"><FilePenLine size={18} /></span>
            <span><strong>Write an independent IPS</strong><small>Start a standalone charter when no client record should be assumed.</small></span>
            <FileText size={16} />
          </Link>
          <Link to="/dossier" className="policy-route border-accent/40 bg-accent-soft/20 hover:bg-accent-soft/35">
            <span className="policy-route-icon"><FileText size={18} className="text-accent" /></span>
            <span><strong className="text-accent-strong">Proceed to Dossier</strong><small>Publish or view the client presentation deck, solvency analysis, and PDF export.</small></span>
            <ArrowRight size={16} className="text-accent" />
          </Link>
        </div>
      </section>

      <WorkflowFooter
        prev={{ path: '/master-plan?step=results', label: 'Plan & Projections' }}
        next={{ path: '/dossier', label: 'Proceed to Dossier' }}
        stepIndicator="Chapter 03 / 05 — Policy"
      />
    </div>
  );
}
