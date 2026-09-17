import { useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, FileText, ArrowUpRight, ChartNoAxesCombined, Database, LayoutTemplate } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PlanReportBody } from '../components/reports/PlanReportBody';

export const Dossier = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { inputs, wealthResult } = useCalculator();

  const autoPrint = searchParams.get('autoPrint') === 'true';

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!wealthResult.isConfigured) {
    return (
      <EmptyState
        icon={FileText}
        display
        title="The dossier is not available yet"
        description="Configure the plan — profile, finances and goals — and the comprehensive portfolio dossier will compile here, ready for PDF export."
        action={
          <Button variant="outline" onClick={() => navigate('/master-plan')}>
            Configure the plan
          </Button>
        }
      />
    );
  }

  return (
    <div className="dossier-workspace pb-12 print:pb-0">
      <div className="dossier-toolbar sticky top-0 z-40 print:hidden -mx-1">
        <div className="flex items-center gap-3">
          <button className="dossier-back" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={15} /> Back</button>
          <div className="hidden sm:block">
            <div className="eyebrow">Deliver / Client dossier</div>
            <h1>{inputs.client?.name || 'Client Report'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="dossier-format-label hidden md:inline-flex"><LayoutTemplate size={13} /> 16:9 presentation</span>
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer size={14} strokeWidth={1.6} /> Export / print dossier
          </Button>
        </div>
      </div>

      <div className="dossier-export-note print:hidden" role="note">
        <div><Printer size={16} /><strong>Ready for the client room.</strong></div>
        <p>Export uses a 16:9 slide layout with one analysis block per page. In the print dialog choose <b>Landscape</b>, enable <b>Background graphics</b>, and set margins to <b>None</b>.</p>
      </div>

      <div className="dossier-deck" id="dossier-deck">
        <section className="dossier-print-page dossier-cover">
          <div className="dossier-cover-top">
            <div className="dossier-wordmark"><span>ST</span><strong>Sound Thesis</strong></div>
            <div className="dossier-classification">Private & confidential<br />Prepared {printDate}</div>
          </div>
          <div className="dossier-cover-main">
            <div className="eyebrow">Comprehensive financial plan / 2026</div>
            <h1>{inputs.client?.name || 'Private Client'}<br /><em>Wealth Dossier</em></h1>
            <p>An integrated view of the balance sheet, risk capacity, goal funding, asset allocation, tax position and retirement longevity.</p>
          </div>
          <div className="dossier-cover-grid">
            <div><span>Mandate</span><strong>{wealthResult.goalResults.length || '—'} mapped goals</strong></div>
            <div><span>Plan horizon</span><strong>Age {inputs.currentAge}—{inputs.lifeExpectancy}</strong></div>
            <div><span>Prepared by</span><strong>{inputs.client?.advisor || 'Sound Thesis Wealth'}</strong></div>
          </div>
          <div className="dossier-folio"><span>Sound Thesis / Advisory Intelligence</span><span>01</span></div>
        </section>

        <section className="dossier-print-page dossier-contents">
          <div className="dossier-section-kicker">How to read this dossier</div>
          <div className="dossier-contents-layout">
            <div>
              <h2>One decision system.<br /><em>Every relevant signal.</em></h2>
              <p>This report is designed for the meeting, not the archive. Start with the executive position, test the assumptions, then use the detailed exhibits to agree the next action.</p>
            </div>
            <ol>
              {[
                ['01', 'Executive position', 'Net worth, savings, success rate and plan health'],
                ['02', 'Risk & allocation', 'Capacity, current exposures and target policy'],
                ['03', 'Goals & retirement', 'Funding confidence, conflicts and longevity'],
                ['04', 'Stress & sensitivity', 'Crisis paths and the variables that matter'],
                ['05', 'Tax & cash flow', 'Annual drag, currency exposure and liquidity'],
                ['06', 'Actions & governance', 'Recommendations, meeting notes and audit trail'],
              ].map(([number, title, copy]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></li>)}
            </ol>
          </div>
          <div className="dossier-source-links print:hidden">
            <Link to="/client-profile">Client profile <ArrowUpRight size={14} /></Link>
            <Link to="/balance-sheet">Balance sheet <ArrowUpRight size={14} /></Link>
            <Link to="/goal">Goals <ArrowUpRight size={14} /></Link>
            <Link to="/risk">Risk profile <ArrowUpRight size={14} /></Link>
            <Link to="/allocation">Allocation <ArrowUpRight size={14} /></Link>
            <Link to="/retirement">Retirement <ArrowUpRight size={14} /></Link>
          </div>
          <div className="dossier-folio"><span>Contents / Source map</span><span>02</span></div>
        </section>

        <section className="dossier-print-page dossier-data-note">
          <div className="dossier-section-kicker">Data report / Method</div>
          <div className="dossier-data-grid">
            <div className="dossier-data-lead">
              <Database size={24} />
              <h2>What this report<br />is built from.</h2>
              <p>Every exhibit is generated from the same live planning state. Update a source record and the dossier recomputes—no parallel spreadsheet and no copied summary.</p>
            </div>
            <div className="dossier-data-list">
              {[
                ['Household', 'Identity, ages, review date and advisory relationship'],
                ['Financial position', 'Income, expenditure, assets, liabilities and investability'],
                ['Planning assumptions', 'Inflation, return, volatility, tax and longevity inputs'],
                ['Goals', 'Priority, horizon, target value and funding probability'],
                ['Portfolio', 'Current weights, target policy, drift and currency exposure'],
                ['Simulation', 'Monte Carlo paths, stress cases and reverse-planning levers'],
              ].map(([title, copy], index) => <div key={title}><span>{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong><p>{copy}</p></div>)}
            </div>
          </div>
          <div className="dossier-folio"><span>Data provenance / Live planning state</span><span>03</span></div>
        </section>

        <div className="dossier-report-content">
          <PlanReportBody />
        </div>
      </div>

      <div className="dossier-endcap print:hidden">
        <ChartNoAxesCombined size={18} />
        <div><strong>Need to change the story?</strong><span>Return to any source module, update the assumptions, and this dossier will rebuild automatically.</span></div>
        <Link to="/master-plan">Open master plan <ArrowUpRight size={14} /></Link>
      </div>
    </div>
  );
};
