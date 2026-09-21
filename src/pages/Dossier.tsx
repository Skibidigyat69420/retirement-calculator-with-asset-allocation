import { useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, FileText, ArrowUpRight, ChartNoAxesCombined, Database, LayoutTemplate, ShieldCheck } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PlanReportBody } from '../components/reports/PlanReportBody';
import { ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const Dossier = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    inputs,
    wealthResult,
    manualAllocationPolicy,
    manualTargets,
    riskProfile,
    riskScore,
    hasRiskAnswers,
    assumptions,
    loadSampleWorkspace,
  } = useCalculator();

  const targets = manualTargets || riskProfile.targets;
  const grossAssets = inputs.assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = inputs.liabilities.reduce((sum, liability) => sum + liability.principal, 0);
  const liquidAssets = inputs.assets.filter((asset) => asset.category === 'liquid').reduce((sum, asset) => sum + asset.value, 0);
  const liquidityMonths = inputs.monthlyExpenditure > 0 ? liquidAssets / inputs.monthlyExpenditure : 0;
  const targetReturn = CATEGORIES.reduce((sum, category) => sum + (targets[category] / 100) * assumptions.categories[category].mean, 0);
  const targetVariance = CATEGORIES.reduce((outer, a) => outer + CATEGORIES.reduce(
    (inner, b) => inner + (targets[a] / 100) * (targets[b] / 100) * assumptions.covariance[a][b], 0,
  ), 0);
  const targetVolatility = Math.sqrt(Math.max(0, targetVariance));
  const dataCoverage = [
    inputs.client.name,
    inputs.assets.length,
    inputs.liabilities.length,
    inputs.goals.length,
    inputs.client.familyMembers?.length,
    inputs.client.incomeSources?.length,
    inputs.client.insurancePolicies?.length,
    hasRiskAnswers,
  ].filter(Boolean).length;

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

  const handleExportPdf = () => {
    const previousTitle = document.title;
    const safeClientName = (inputs.client?.name || 'Sample Client').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    document.title = `${safeClientName}-Wealth-Dossier`;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    window.print();
    window.setTimeout(restoreTitle, 1500);
  };

  if (!wealthResult.isConfigured) {
    return (
      <EmptyState
        icon={FileText}
        display
        title="The dossier is not available yet"
        description="Configure the plan — profile, finances and goals — and the comprehensive portfolio dossier will compile here, ready for PDF export."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={loadSampleWorkspace}>
              Load sample dossier
            </Button>
            <Button variant="outline" onClick={() => navigate('/master-plan')}>
              Configure a client plan
            </Button>
          </div>
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
          <Button variant="primary" size="sm" onClick={handleExportPdf}>
            <Printer size={14} strokeWidth={1.6} /> Export PDF slide deck
          </Button>
        </div>
      </div>

      <div className="dossier-export-note print:hidden" role="note">
        <div><Printer size={16} /><strong>Ready for the client room.</strong></div>
        <p>The dossier stays live on this page. To download it, choose <b>Save as PDF</b> in the print dialog; the deck is already formatted as 16:9 landscape slides with backgrounds and zero margins.</p>
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
                ['01', 'Client & household', 'People, circumstances, mandate and scope of advice'],
                ['02', 'Financial position', 'Balance sheet, cash flow, liabilities and liquidity'],
                ['03', 'Risk & allocation', 'Capacity, current exposures, policy ranges and trades'],
                ['04', 'Goals & retirement', 'Funding confidence, conflicts and longevity'],
                ['05', 'Stress & sensitivity', 'Crisis paths and the variables that matter'],
                ['06', 'Tax & protection', 'Tax drag, currency exposure and insurance records'],
                ['07', 'Assumptions', 'Capital-market inputs, simulation and limitations'],
                ['08', 'Actions & governance', 'Recommendations, decisions and review record'],
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
                ['Governance', 'Allocation ranges, review rules, approvals and decision history'],
              ].map(([title, copy], index) => <div key={title}><span>{String(index + 1).padStart(2, '0')}</span><strong>{title}</strong><p>{copy}</p></div>)}
            </div>
          </div>
          <div className="dossier-folio"><span>Data provenance / Live planning state</span><span>03</span></div>
        </section>

        <section className="dossier-print-page dossier-signal-page">
          <div className="dossier-section-kicker">Executive signal board / Full-plan snapshot</div>
          <div className="dossier-signal-header">
            <div>
              <span>Plan status</span>
              <strong>{wealthResult.sustainable ? 'Funded through life expectancy' : `Potential depletion at age ${wealthResult.depletionAge}`}</strong>
            </div>
            <div className="dossier-signal-score">
              <span>Monte Carlo success</span>
              <strong>{formatPercent(wealthResult.monteCarlo.successRate * 100)}</strong>
            </div>
          </div>
          <div className="dossier-metric-matrix">
            {[
              ['Gross assets', formatCurrencyCompact(grossAssets), formatCurrency(grossAssets)],
              ['Liabilities', formatCurrencyCompact(totalLiabilities), formatCurrency(totalLiabilities)],
              ['Net worth', formatCurrencyCompact(wealthResult.netWorth), formatCurrency(wealthResult.netWorth)],
              ['Annual income', formatCurrencyCompact(wealthResult.annualIncome), formatCurrency(wealthResult.annualIncome)],
              ['Annual savings', formatCurrencyCompact(wealthResult.annualSavings), `${formatPercent(wealthResult.savingsRate)} savings rate`],
              ['Monthly SIP', formatCurrencyCompact(wealthResult.monthlySIP), `${formatPercent(wealthResult.investmentRate)} investment rate`],
              ['Liquid reserve', `${liquidityMonths.toFixed(1)} mo`, formatCurrency(liquidAssets)],
              ['Terminal corpus', formatCurrencyCompact(wealthResult.terminalValue), `Real CAGR ${formatPercent(wealthResult.cagrReal)}`],
              ['Goals mapped', String(wealthResult.goalResults.length), `${wealthResult.goalsAtRisk.length} currently at risk`],
              ['Risk profile', riskProfile.label, `${riskScore}/100 assessed score`],
              ['Retirement window', `${inputs.retirementAge}—${inputs.lifeExpectancy}`, `${Math.max(0, inputs.retirementAge - inputs.currentAge)} years to retirement`],
              ['Data coverage', `${dataCoverage}/8`, `${inputs.assets.length} assets · ${inputs.goals.length} goals`],
            ].map(([label, value, detail]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
            ))}
          </div>
          <div className="dossier-folio"><span>Executive signal board / Current plan state</span><span>04</span></div>
        </section>

        <section className="dossier-print-page dossier-allocation-page">
          <div className="dossier-section-kicker">Allocation X-ray / Policy, drift and implementation</div>
          <div className="dossier-allocation-lead">
            <div><span>Policy basis</span><strong>{manualTargets ? 'Advisor-authored mandate' : `${riskProfile.label} model`}</strong></div>
            <div><span>Expected return</span><strong>{formatPercent(targetReturn * 100)}</strong></div>
            <div><span>Expected volatility</span><strong>{formatPercent(targetVolatility * 100)}</strong></div>
            <div><span>Rebalance trigger</span><strong>{manualAllocationPolicy ? `±${manualAllocationPolicy.rebalanceThreshold}%` : 'Model review'}</strong></div>
          </div>
          <div className="dossier-allocation-table">
            <div className="dossier-allocation-row dossier-allocation-head"><span>Asset class</span><span>Current</span><span>Target</span><span>Range</span><span>Drift</span><span>Target value</span><span>Instruction</span></div>
            {CATEGORIES.map((category, index) => {
              const current = wealthResult.currentAllocation[category] * 100;
              const target = targets[category];
              const drift = current - target;
              const trade = wealthResult.netWorth * ((target - current) / 100);
              const range = manualAllocationPolicy?.ranges?.[category];
              return (
                <div className="dossier-allocation-row" key={category}>
                  <span><i>{String(index + 1).padStart(2, '0')}</i>{ASSET_LABELS[category]}</span>
                  <span>{formatPercent(current)}</span>
                  <span><b style={{ width: `${Math.max(2, Math.min(100, target))}%` }} />{formatPercent(target)}</span>
                  <span>{range ? `${range.min}—${range.max}%` : '—'}</span>
                  <span>{drift > 0 ? '+' : ''}{formatPercent(drift)}</span>
                  <span>{formatCurrencyCompact(wealthResult.netWorth * target / 100)}</span>
                  <span>{Math.abs(trade) < wealthResult.netWorth * .005 ? 'HOLD' : `${trade > 0 ? 'BUY' : 'REDUCE'} ${formatCurrencyCompact(Math.abs(trade))}`}</span>
                </div>
              );
            })}
          </div>
          <div className="dossier-policy-note"><span>Mandate objective</span><p>{manualAllocationPolicy?.objective || riskProfile.recommendedApproach}</p><span>Constraints</span><p>{manualAllocationPolicy?.constraints || 'Risk-profile constraints and goal-liquidity requirements apply.'}</p></div>
          <div className="dossier-folio"><span>Allocation decision ledger / Current versus policy</span><span>05</span></div>
        </section>

        <section className="dossier-print-page dossier-risk-page">
          <div className="dossier-section-kicker">Risk anatomy / Willingness, capacity and plan limits</div>
          <div className="dossier-risk-layout">
            <div className="dossier-risk-hero">
              <span>Assessed profile</span>
              <strong>{riskProfile.label}</strong>
              <div className="dossier-risk-number">{riskScore}<small>/100</small></div>
              <div className="dossier-risk-track"><i style={{ width: `${riskScore}%` }} /></div>
              <p>{riskProfile.description}</p>
              <blockquote>{riskProfile.persona}</blockquote>
            </div>
            <div className="dossier-risk-register">
              {[
                ['Assessment status', hasRiskAnswers ? 'Questionnaire complete' : 'Model default'],
                ['Permitted equity', `${riskProfile.minEquity}%—${riskProfile.maxEquity}%`],
                ['Maximum drawdown', formatPercent(riskProfile.maxDrawdown)],
                ['Target volatility', formatPercent(riskProfile.targetVolatility)],
                ['Modelled volatility', formatPercent(targetVolatility * 100)],
                ['Goal success threshold', formatPercent(riskProfile.goalSuccessThreshold)],
                ['Drawdown probability', formatPercent(wealthResult.maxDrawdownProbability * 100)],
                ['Equity at retirement', formatPercent(riskProfile.equityAtRetirement)],
                ['Simulation paths', riskProfile.monteCarloSimulations.toLocaleString('en-IN')],
                ['Median terminal value', formatCurrencyCompact(wealthResult.monteCarlo.medianTerminal)],
                ['5th—95th percentile', `${formatCurrencyCompact(wealthResult.monteCarlo.percentile5)} — ${formatCurrencyCompact(wealthResult.monteCarlo.percentile95)}`],
                ['Stress verdict', riskProfile.stressTestVerdict],
              ].map(([label, value], index) => <div key={label}><i>{String(index + 1).padStart(2, '0')}</i><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>
          <div className="dossier-folio"><span>Risk framework / Assessment and calibration</span><span>06</span></div>
        </section>

        <div className="dossier-report-content">
          <PlanReportBody />
        </div>

        <section className="dossier-print-page dossier-close">
          <div className="dossier-section-kicker">Advice record / Acknowledgement</div>
          <div className="dossier-close-grid">
            <div>
              <ShieldCheck size={25} />
              <h2>From analysis<br />to accountable action.</h2>
              <p>This dossier is a living advice record. It should be reviewed when goals, income, family circumstances, tax rules or market assumptions change materially.</p>
            </div>
            <div className="dossier-close-details">
              <div><span>Client</span><strong>{inputs.client?.name || 'Private Client'}</strong></div>
              <div><span>Advisor</span><strong>{inputs.client?.advisor || 'Sound Thesis Wealth'}</strong></div>
              <div><span>Policy status</span><strong className="capitalize">{manualAllocationPolicy?.status || 'Model allocation'}</strong></div>
              <div><span>Review cadence</span><strong className="capitalize">{manualAllocationPolicy?.reviewFrequency || 'Annual'}</strong></div>
              <div><span>Effective / review date</span><strong>{manualAllocationPolicy?.effectiveDate || inputs.client?.reviewDate || 'To be agreed'}</strong></div>
              <div><span>Approval</span><strong>{manualAllocationPolicy?.approvedBy || 'Pending client acknowledgement'}</strong></div>
            </div>
          </div>
          <div className="dossier-signatures">
            <div><span>Client acknowledgement</span><i /></div>
            <div><span>Advisor sign-off</span><i /></div>
            <div><span>Date</span><i /></div>
          </div>
          <p className="dossier-disclaimer">Illustrations are based on the information and assumptions recorded in this report and are not guarantees of future outcomes. Product suitability, legal, tax and insurance advice should be confirmed with appropriately qualified professionals before implementation.</p>
          <div className="dossier-folio"><span>Governance / Client acknowledgement</span><span>Final</span></div>
        </section>
      </div>

      <div className="dossier-endcap print:hidden">
        <ChartNoAxesCombined size={18} />
        <div><strong>Need to change the story?</strong><span>Return to any source module, update the assumptions, and this dossier will rebuild automatically.</span></div>
        <Link to="/master-plan">Open master plan <ArrowUpRight size={14} /></Link>
      </div>
    </div>
  );
};
