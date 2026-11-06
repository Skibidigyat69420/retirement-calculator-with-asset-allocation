import { useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, FileText, ArrowUpRight, ChartNoAxesCombined, Database, Download, LayoutTemplate, ShieldCheck, Copy } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PlanReportBody } from '../components/reports/PlanReportBody';
import { ASSET_LABELS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { simulateGoalPlan } from '../lib/goalMonteCarlo';
import type { AllocationRecommendationMethod, AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const METHOD_LABELS: Record<AllocationRecommendationMethod, string> = {
  'advisor-rationale': 'Advisor rationale',
  'model-optimised': 'Suggestive optimisation',
  'goal-and-cashflow-led': 'Goals & cash-flow led',
  'risk-budget-calibrated': 'Risk-budget calibrated',
};

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
    showToast,
  } = useCalculator();

  const targets = manualTargets || riskProfile.targets;
  const allocationRecommendations = [...(manualAllocationPolicy?.recommendations || [])].reverse();
  const latestRecommendation = allocationRecommendations[0];
  // A proposal owns its sleeve map so an older advice record remains complete
  // even if the active policy is later revised. Legacy policies simply omit it.
  const policySleeves = latestRecommendation?.sleeves ?? manualAllocationPolicy?.sleeves ?? [];
  const grossAssets = inputs.assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = inputs.liabilities.reduce((sum, liability) => sum + liability.principal, 0);
  const liquidAssets = inputs.assets.filter((asset) => asset.category === 'liquid').reduce((sum, asset) => sum + asset.value, 0);
  const liquidityMonths = inputs.monthlyExpenditure > 0 ? liquidAssets / inputs.monthlyExpenditure : 0;
  const targetReturn = CATEGORIES.reduce((sum, category) => sum + (targets[category] / 100) * assumptions.categories[category].mean, 0);
  const targetVariance = CATEGORIES.reduce((outer, a) => outer + CATEGORIES.reduce(
    (inner, b) => inner + (targets[a] / 100) * (targets[b] / 100) * assumptions.covariance[a][b], 0,
  ), 0);
  const targetVolatility = Math.sqrt(Math.max(0, targetVariance));
  const goalThreshold = riskProfile.goalSuccessThreshold / 100;
  const fundedGoals = wealthResult.goalResults.filter((goal) => goal.successRate >= goalThreshold).length;
  const monthlySurplus = wealthResult.annualSavings / 12;

  const investableCorpus = inputs.assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
  const goalSimResult = useMemo(
    () =>
      simulateGoalPlan({
        goals: inputs.goals,
        currentPortfolioValue: investableCorpus,
        monthlySIP: inputs.sip.amount || 0,
        sipStepUp: inputs.sip.stepUp || 0,
        portfolioWeights: targets,
        assumptions,
        simulations: Math.min(riskProfile?.monteCarloSimulations || 1000, 1000),
        seed: 'dossier-goal-sim',
        targetConfidence: goalThreshold,
      }),
    [inputs.goals, investableCorpus, inputs.sip.amount, inputs.sip.stepUp, targets, assumptions, riskProfile?.monteCarloSimulations, goalThreshold],
  );
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

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildAccessibleDocument());
      showToast('Accessible dossier executive summary copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy dossier to clipboard.', 'error');
    }
  };

  const handleDownloadAccessibleSummary = () => {
    const safeClientName = (inputs.client?.name || 'Client').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    const documentText = buildAccessibleDocument();
    const blob = new Blob([documentText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeClientName || 'client'}-wealth-dossier-accessible.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Accessible dossier summary downloaded as Markdown.', 'success');
  };

  const buildAccessibleDocument = () => {
    const allocationLines = CATEGORIES.map((category) => {
      const current = wealthResult.currentAllocation[category] * 100;
      const proposed = latestRecommendation?.targets[category] ?? targets[category];
      return `- ${ASSET_LABELS[category]}: current ${formatPercent(current)}; policy ${formatPercent(proposed)}; change ${formatPercent(proposed - current)}`;
    });
    const goalLines = wealthResult.goalResults.length
      ? wealthResult.goalResults.map((goal) => `- ${goal.goal.name}: ${formatPercent(goal.successRate * 100)} funding confidence; ${goal.goal.yearsToGoal} year horizon`).join('\n')
      : '- No formal goals have been recorded.';
    const sleeveLines = policySleeves.length
      ? policySleeves.map((sleeve) => `- ${ASSET_LABELS[sleeve.assetClass]} / ${sleeve.category}: ${formatPercent(sleeve.target)}${sleeve.purpose ? ` — ${sleeve.purpose}` : ''}`)
      : ['- No detailed category map has been recorded.'];
    return [
      `# Wealth Dossier — ${inputs.client?.name || 'Private Client'}`,
      '',
      `Prepared: ${printDate}`,
      `Adviser: ${inputs.client?.advisor || 'SoundThesis Capital'}`,
      '',
      '## Current position',
      `- Net worth: ${formatCurrency(wealthResult.netWorth)}`,
      `- Plan outcome: ${wealthResult.sustainable ? 'Projected through life expectancy' : `Potential depletion at age ${wealthResult.depletionAge}`}`,
      `- Monte Carlo plan success: ${formatPercent(wealthResult.monteCarlo.successRate * 100)}`,
      `- Risk profile: ${riskProfile.label} (${riskScore}/100)`,
      `- Liquid reserve: ${liquidityMonths.toFixed(1)} months of expenditure`,
      `- Monthly surplus: ${formatCurrency(monthlySurplus)}`,
      `- Goals funded at the ${formatPercent(riskProfile.goalSuccessThreshold)} threshold: ${fundedGoals} of ${wealthResult.goalResults.length}`,
      '',
      '## Strategic Advisory Guidance & Suggested Priorities',
      goalLines,
      '',
      '## Goal Solvency & Monte Carlo Simulation',
      `- Consolidated plan success probability: ${formatPercent(goalSimResult.planSuccessRate * 100)} (all goals funded simultaneously)`,
      `- Target confidence threshold: ${formatPercent(goalThreshold * 100)}`,
      `- Goals achieving target confidence: ${goalSimResult.fundedGoalCount} of ${goalSimResult.goals.length}`,
      `- Simulated required monthly SIP: ${formatCurrency(goalSimResult.requiredSIP)} (current plan: ${formatCurrency(inputs.sip.amount || 0)})`,
      `- Total inflated goal commitment: ${formatCurrency(goalSimResult.totalCostAtFinalHorizon)}`,
      '',
      '### Milestone waterfall probabilities',
      ...(goalSimResult.goals.length
        ? goalSimResult.goals.map(
            (g) =>
              `- ${g.name} (${g.priority}, Year ${g.horizonYear}, Age ${inputs.currentAge + g.horizonYear}): ${formatPercent(g.successRate * 100)} probability; inflated cost ${formatCurrency(g.costAtHorizon)}; median corpus ${formatCurrency(g.medianCorpusAtHorizon)}${g.expectedShortfall > 0 ? `; expected shortfall ${formatCurrency(g.expectedShortfall)}` : ' (fully covered)'}`,
          )
        : ['- No formal goals recorded.']),
      '',
      '## Allocation recommendation',
      `- Status: ${latestRecommendation ? 'Adviser proposal recorded' : 'No adviser proposal recorded'}`,
      `- Method: ${latestRecommendation ? METHOD_LABELS[latestRecommendation.method] : 'Not yet selected'}`,
      `- Prepared by: ${latestRecommendation?.createdBy || inputs.client?.advisor || '—'}`,
      `- Rationale: ${latestRecommendation?.rationale || manualAllocationPolicy?.rationale || 'No rationale recorded.'}`,
      `- Evidence / citation: ${latestRecommendation?.evidenceCitation || 'No supporting citation recorded.'}`,
      '',
      '### Current portfolio versus proposed policy',
      ...allocationLines,
      '',
      '### Policy category map',
      ...sleeveLines,
      '',
      '## Governance',
      `- Review cadence: ${manualAllocationPolicy?.reviewFrequency || 'Annual'}`,
      `- Rebalance trigger: ${manualAllocationPolicy ? `±${manualAllocationPolicy.rebalanceThreshold}%` : 'Model review'}`,
      `- Constraints: ${manualAllocationPolicy?.constraints || 'Risk-profile constraints and goal-liquidity requirements apply.'}`,
      '',
      'This accessible summary is generated from the live planning workspace. It is an advice record, not a guarantee of investment outcomes.',
    ].join('\n');
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
            <div className="text-xs font-medium text-muted">Client dossier</div>
            <h1>{inputs.client?.name || 'Client Report'}</h1>
          </div>
        </div>
        <nav className="flex items-center gap-2" aria-label="Dossier export options">
          <span className="dossier-format-label hidden md:inline-flex"><LayoutTemplate size={13} /> 16:9 presentation</span>
          <Button variant="outline" size="sm" onClick={handleCopySummary} aria-label="Copy Markdown summary of this dossier">
            <Copy size={14} strokeWidth={1.6} /> <span className="hidden sm:inline">Copy brief</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadAccessibleSummary} aria-label="Download an accessible Markdown summary of this dossier">
            <Download size={14} strokeWidth={1.6} /> <span className="hidden sm:inline">Accessible summary</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportPdf} aria-label="Open the print dialog to save this dossier as a PDF slide deck">
            <Printer size={14} strokeWidth={1.6} /> Export PDF slide deck
          </Button>
        </nav>
      </div>

      <div className="dossier-export-note print:hidden" role="note">
        <div><Printer size={16} /><strong>Ready for the client room.</strong></div>
        <p>Choose <b>Export PDF slide deck</b>, then select <b>Save as PDF</b> in the print dialog. Prefer <b>Accessible summary</b> for a concise, semantic version that works well with screen readers, notes and document review tools.</p>
      </div>

      <div className="dossier-deck" id="dossier-deck">
        <section className="dossier-print-page dossier-cover">
          <div className="dossier-cover-top">
            <div className="dossier-wordmark"><span>ST</span><strong>SoundThesis Capital</strong></div>
            <div className="dossier-classification">Private & confidential<br />Prepared {printDate}</div>
          </div>
          <div className="dossier-cover-main">
            <div className="text-xs font-medium text-muted mb-1">Comprehensive financial plan / 2026</div>
            <h1>{inputs.client?.name || 'Private Client'}<br /><em>Wealth Dossier</em></h1>
            <p>An integrated view of the balance sheet, risk capacity, goal funding, asset allocation, tax position and retirement longevity.</p>
          </div>
          <div className="dossier-cover-grid">
            <div><span>Mandate</span><strong>{wealthResult.goalResults.length || '—'} mapped goals</strong></div>
            <div><span>Plan horizon</span><strong>Age {inputs.currentAge}—{inputs.lifeExpectancy}</strong></div>
            <div><span>Prepared by</span><strong>{inputs.client?.advisor || 'SoundThesis Capital'}</strong></div>
          </div>
          <div className="dossier-folio"><span>SoundThesis Capital / Advisory Intelligence</span><span>01</span></div>
        </section>

        <section className="dossier-print-page dossier-contents">
          <div className="dossier-contents-layout">
            <div>
              <h2>One decision system.<br /><em>Every relevant signal.</em></h2>
              <p>This report is designed for the meeting, not the archive. Start with the executive position, test the assumptions, then use the detailed exhibits to agree the next action.</p>
            </div>
            <ol>
              {[
                ['01', 'Client & household', 'People, circumstances, mandate and scope of advice'],
                ['02', 'Financial position', 'Balance sheet, cash flow, liabilities and liquidity'],
                ['03', 'Current position', 'Plan viability, surplus, risk budget and baseline metrics'],
                ['04', 'Goal solvency & Monte Carlo', 'Corpus waterfall, milestone probabilities and joint plan success'],
                ['05', 'Allocation recommendation', 'Advisor proposal, rationale, evidence and proposed changes'],
                ['06', 'Current versus policy', 'Current exposures, policy ranges and implementation trades'],
                ['07', 'Risk & calibration', 'Capacity, profile, stress testing and longevity'],
                ['08', 'Tax, protection & assumptions', 'Tax drag, currency exposure and capital-market inputs'],
                ['09', 'Actions & governance', 'Recommendations, decisions and review record'],
              ].map(([number, title, copy]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></li>)}
            </ol>
          </div>
          <div className="dossier-source-links print:hidden">
            <Link to="/client-profile">Client profile <ArrowUpRight size={14} /></Link>
            <Link to="/balance-sheet">Balance sheet <ArrowUpRight size={14} /></Link>
            <Link to="/goal">Goals <ArrowUpRight size={14} /></Link>
            <Link to="/risk">Risk profile <ArrowUpRight size={14} /></Link>
            <Link to="/planning">Allocation recommendations <ArrowUpRight size={14} /></Link>
            <Link to="/retirement">Retirement <ArrowUpRight size={14} /></Link>
          </div>
          <div className="dossier-folio"><span>Contents / Source map</span><span>02</span></div>
        </section>

        <section className="dossier-print-page dossier-data-note">
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
              ['Retirement & SWP', `${formatCurrencyCompact(inputs.swp.monthlyNeedToday)}/mo`, `Age ${inputs.retirementAge}–${inputs.lifeExpectancy} · ${wealthResult.sustainable ? 'Sustainable' : `Depletes age ${wealthResult.depletionAge}`}`],
              ['Data coverage', `${dataCoverage}/8`, `${inputs.assets.length} assets · ${inputs.goals.length} goals`],
            ].map(([label, value, detail]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
            ))}
          </div>
          <div className="dossier-folio"><span>Executive signal board / Current plan state</span><span>04</span></div>
        </section>

        <section className="dossier-print-page dossier-current-position-page">
          <div className="dossier-position-head"><div><span>Current position / Master Plan</span><h2>The facts before<br />the allocation decision.</h2></div><p>This is the baseline that flows from the live plan. Allocation recommendations below are additive advice records, never substitutes for the client’s current position.</p></div>
          <div className="dossier-position-grid">
            <div className="dossier-position-hero"><span>Plan outcome</span><strong>{wealthResult.sustainable ? 'On track through life expectancy' : `Requires action before age ${wealthResult.depletionAge}`}</strong><div><b>{formatPercent(wealthResult.monteCarlo.successRate * 100)}</b><small>Plan success probability</small></div><p>{wealthResult.sustainable ? 'Retirement cash-flow is projected to remain funded under the recorded assumptions.' : 'The current plan has a projected funding gap; allocation alone should not be treated as the remedy.'}</p></div>
            <div className="dossier-position-register">
              {[
                ['Assessed risk', `${riskProfile.label} · ${riskScore}/100`],
                ['Monthly surplus', monthlySurplus >= 0 ? formatCurrencyCompact(monthlySurplus) : `Shortfall ${formatCurrencyCompact(Math.abs(monthlySurplus))}`],
                ['Liquid reserve', `${liquidityMonths.toFixed(1)} months of expenditure`],
                ['Goals funded', `${fundedGoals} of ${wealthResult.goalResults.length || 0} at ${formatPercent(riskProfile.goalSuccessThreshold)} threshold`],
                ['Goals requiring action', wealthResult.goalsAtRisk.length ? wealthResult.goalsAtRisk.map((goal) => goal.goal.name).join(', ') : 'None flagged by the current model'],
                ['Current policy basis', manualTargets ? 'Advisor-authored client policy' : `${riskProfile.label} risk model`],
              ].map(([label, value], index) => <div key={label}><i>{String(index + 1).padStart(2, '0')}</i><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>
          <div className="dossier-folio"><span>Current position / Inputs, outcomes and funding needs</span><span>05</span></div>
        </section>

        <section className="dossier-print-page dossier-goal-mc-page">
          <div className="dossier-goal-head">
            <div>
              <span>Goal Solvency / Monte Carlo Waterfall</span>
              <h2>Probabilistic milestone<br />feasibility &amp; joint success.</h2>
            </div>
            <div className="dossier-goal-score-tag">
              <span>Consolidated plan probability</span>
              <strong>{formatPercent(goalSimResult.planSuccessRate * 100)}</strong>
              <small>Joint success: all milestones funded simultaneously without shortfall</small>
            </div>
          </div>

          <div className="dossier-goal-lead">
            <div>
              <span>Confidence target</span>
              <strong>{formatPercent(goalThreshold * 100)}</strong>
              <small>{riskProfile.label} risk standard</small>
            </div>
            <div>
              <span>Milestones on track</span>
              <strong>{goalSimResult.fundedGoalCount} of {goalSimResult.goals.length}</strong>
              <small>Meet or exceed confidence target</small>
            </div>
            <div>
              <span>Simulated required SIP</span>
              <strong>{formatCurrencyCompact(goalSimResult.requiredSIP)}/mo</strong>
              <small>
                {goalSimResult.requiredSIP > (inputs.sip.amount || 0)
                  ? `+${formatCurrencyCompact(goalSimResult.requiredSIP - (inputs.sip.amount || 0))}/mo vs plan`
                  : 'Current SIP is sufficient'}
              </small>
            </div>
            <div>
              <span>Cumulative commitment</span>
              <strong>{formatCurrencyCompact(goalSimResult.totalCostAtFinalHorizon)}</strong>
              <small>Inflated cost across all horizons</small>
            </div>
          </div>

          <div className="dossier-goal-table">
            <div className="dossier-goal-table-row dossier-goal-table-head">
              <span>Milestone / Priority</span>
              <span>Horizon</span>
              <span>Target today</span>
              <span>Inflated cost</span>
              <span>Success probability</span>
              <span>Median corpus</span>
              <span>Expected shortfall</span>
            </div>
            {goalSimResult.goals.length > 0 ? (
              goalSimResult.goals.map((g, index) => {
                const isAtTarget = g.successRate >= goalThreshold;
                const isWarning = !isAtTarget && g.successRate >= goalThreshold * 0.6;
                const originalGoal = inputs.goals.find((ig) => ig.id === g.goalId);
                const targetToday = originalGoal?.targetAmount || 0;
                return (
                  <div className="dossier-goal-table-row" key={g.goalId}>
                    <span>
                      <i>{String(index + 1).padStart(2, '0')}</i>
                      <strong>{g.name}</strong>
                      <small className={`dossier-goal-badge priority-${g.priority}`}>{g.priority}</small>
                    </span>
                    <span>Year {g.horizonYear} (Age {inputs.currentAge + g.horizonYear})</span>
                    <span>{formatCurrencyCompact(targetToday)}</span>
                    <span>{formatCurrencyCompact(g.costAtHorizon)}</span>
                    <span>
                      <div className="dossier-goal-prob-bar">
                        <div
                          className={`dossier-goal-prob-fill ${isAtTarget ? 'is-success' : isWarning ? 'is-warning' : 'is-danger'}`}
                          style={{ width: `${Math.min(100, Math.max(3, g.successRate * 100))}%` }}
                        />
                      </div>
                      <strong className={isAtTarget ? 'text-positive' : isWarning ? 'text-warning' : 'text-negative'}>
                        {formatPercent(g.successRate * 100)}
                      </strong>
                    </span>
                    <span>{formatCurrencyCompact(g.medianCorpusAtHorizon)}</span>
                    <span className={g.expectedShortfall > 0 ? 'text-negative font-semibold' : 'text-positive'}>
                      {g.expectedShortfall > 0 ? `−${formatCurrencyCompact(g.expectedShortfall)}` : 'Fully funded'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="dossier-goal-empty-row">
                <p>No individual milestones recorded in the plan. All capital remains available for general wealth preservation and retirement longevity.</p>
              </div>
            )}
          </div>

          <div className="dossier-goal-note">
            <div>
              <strong>Waterfall methodology</strong>
              <p>Simulates {goalSimResult.simulations.toLocaleString()} correlated market paths with capital deducted at each goal horizon. Subsequent milestones inherit market drawdowns and prior withdrawals, capturing sequence-of-returns risk across the lifetime plan.</p>
            </div>
            <div>
              <strong>Consolidated probability</strong>
              <p>The joint plan success rate ({formatPercent(goalSimResult.planSuccessRate * 100)}) represents paths where every commitment was completed without depleting the portfolio below zero. It is strictly less than or equal to individual milestone rates.</p>
            </div>
          </div>

          <div className="dossier-folio"><span>Goal solvency &amp; Monte Carlo / Corpus waterfall feasibility</span><span>06</span></div>
        </section>

        <section className="dossier-print-page dossier-recommendations-page">
          <div className="dossier-recommendation-head"><div><span>Allocations / Advisory proposal</span><h2>{latestRecommendation ? latestRecommendation.title : 'No allocation proposal recorded yet'}</h2><p>{latestRecommendation ? 'A traceable recommendation, shown separately from the client’s current portfolio and policy implementation table.' : 'Create an allocation proposal in the Planning workspace to record the approach, rationale and evidence used for this household.'}</p></div><div className="dossier-recommendation-tag"><span>Proposal method</span><strong>{latestRecommendation ? METHOD_LABELS[latestRecommendation.method] : 'Pending adviser input'}</strong><small>{latestRecommendation ? latestRecommendation.sourceLabel : 'No recommendation source recorded'}</small></div></div>
          <div className="dossier-recommendation-grid">
            <div className="dossier-rationale-panel"><span>Why this allocation</span><p>{latestRecommendation?.rationale || manualAllocationPolicy?.rationale || 'No rationale recorded.'}</p><div><b>Prepared by</b><strong>{latestRecommendation?.createdBy || inputs.client.advisor || '—'}</strong></div><div><b>Recorded</b><strong>{latestRecommendation ? new Date(latestRecommendation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</strong></div><div className="dossier-citation"><b>Evidence / citation</b><p>{latestRecommendation?.evidenceCitation || 'No supporting citation recorded.'}</p></div></div>
            <div className="dossier-proposed-changes"><div className="dossier-proposal-table-head"><span>Asset class</span><span>Current</span><span>Proposed</span><span>Change</span></div>{CATEGORIES.map((category) => { const current = wealthResult.currentAllocation[category] * 100; const proposed = latestRecommendation?.targets[category] ?? targets[category]; const change = proposed - current; return <div className="dossier-proposal-row" key={category}><span>{ASSET_LABELS[category]}</span><span>{formatPercent(current)}</span><span>{formatPercent(proposed)}</span><span className={change > 0.01 ? 'is-increase' : change < -0.01 ? 'is-reduction' : ''}>{Math.abs(change) < .01 ? 'Hold' : `${change > 0 ? '+' : ''}${formatPercent(change)}`}</span></div>; })}</div>
          </div>
          <div className="dossier-proposal-history"><span>Advice trail</span>{allocationRecommendations.length ? allocationRecommendations.slice(0, 3).map((item) => <div key={item.id}><strong>{item.title}</strong><small>{METHOD_LABELS[item.method]} · {new Date(item.createdAt).toLocaleDateString('en-IN')} · {item.createdBy}</small></div>) : <p>No proposal has been retained yet. The current allocation remains a baseline until an adviser records a recommendation.</p>}</div>
          <div className="dossier-folio"><span>Allocation recommendations / Rationale, evidence and proposed changes</span><span>07</span></div>
        </section>

        <section className="dossier-print-page dossier-allocation-page">
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
          <div className="dossier-sleeve-map">
            <div className="dossier-sleeve-map-head"><span>Policy category map</span><small>Investable sleeves that reconcile to the strategic asset allocation</small></div>
            {policySleeves.length ? (
              <div className="dossier-sleeve-grid">
                {CATEGORIES.map((category) => {
                  const sleeves = policySleeves.filter((sleeve) => sleeve.assetClass === category);
                  if (!sleeves.length) return null;
                  return <div className="dossier-sleeve-group" key={category}><strong>{ASSET_LABELS[category]}</strong>{sleeves.map((sleeve) => <div key={sleeve.id}><span>{sleeve.category}</span><b>{formatPercent(sleeve.target)}</b><small>{sleeve.purpose || 'Policy category'}</small></div>)}</div>;
                })}
              </div>
            ) : <p className="dossier-sleeve-empty">No category-level sleeves are recorded for this policy yet. Build them in the Strategic Allocation Studio.</p>}
          </div>
          <div className="dossier-policy-note"><span>Mandate objective</span><p>{manualAllocationPolicy?.objective || riskProfile.recommendedApproach}</p><span>Constraints</span><p>{manualAllocationPolicy?.constraints || 'Risk-profile constraints and goal-liquidity requirements apply.'}</p></div>
          <div className="dossier-folio"><span>Allocation decision ledger / Current versus policy</span><span>08</span></div>
        </section>

        <section className="dossier-print-page dossier-risk-page">
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
          <div className="dossier-folio"><span>Risk framework / Assessment and calibration</span><span>09</span></div>
        </section>

        <div className="dossier-report-content">
          <PlanReportBody />
        </div>

        <section className="dossier-print-page dossier-close">
          <div className="dossier-close-grid">
            <div>
              <ShieldCheck size={25} />
              <h2>From analysis<br />to accountable action.</h2>
              <p>This dossier is a living advice record. It should be reviewed when goals, income, family circumstances, tax rules or market assumptions change materially.</p>
            </div>
            <div className="dossier-close-details">
              <div><span>Client</span><strong>{inputs.client?.name || 'Private Client'}</strong></div>
              <div><span>Advisor</span><strong>{inputs.client?.advisor || 'SoundThesis Capital'}</strong></div>
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
