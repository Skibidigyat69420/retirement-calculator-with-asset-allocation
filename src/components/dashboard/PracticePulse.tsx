import { useCalculator } from '../../context/CalculatorContext';
import { FinancialMetric } from '../ui/FinancialMetric';
import { guardNumber, formatOrDash } from '../../lib/planState';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';

/**
 * PRACTICE PULSE — one large editorial composition. The primary metric
 * (total net worth) carries the page; everything else is deliberately
 * quieter. When the plan is not configured every value falls back to '—'.
 */
export const PracticePulse = () => {
  const { inputs, wealthResult, riskProfile, riskScore, hasRiskAnswers } = useCalculator();
  const configured = wealthResult.isConfigured;

  const netWorth = configured ? guardNumber(wealthResult.netWorth) : null;
  const terminal = configured ? guardNumber(wealthResult.terminalValue) : null;
  const terminalReal = configured ? guardNumber(wealthResult.terminalRealValue) : null;
  const monthlySIP = configured ? guardNumber(wealthResult.monthlySIP || inputs.sip.amount) : null;
  const annualIncome = configured ? guardNumber(wealthResult.annualIncome) : null;
  const savingsRate = configured ? guardNumber(wealthResult.savingsRate) : null;
  const mcSuccess = configured ? guardNumber(wealthResult.monteCarlo.successRate * 100) : null;

  const nonInrExposure = wealthResult.currencyExposure.filter((c) => c.currency !== 'INR');
  const fxLabel = configured
    ? nonInrExposure.length > 0
      ? nonInrExposure.map((c) => c.currency).join(', ')
      : '100% INR'
    : null;

  const horizonAge = inputs.lifeExpectancy > 0 ? inputs.lifeExpectancy : null;

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-surface">
      {/* Faint graph-paper accent band — the only grid-motif on the page */}
      <div className="absolute inset-x-0 top-0 h-24 grid-motif opacity-50 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-surface pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <div className="eyebrow">Practice pulse</div>
          <div className="font-mono text-[11px] text-faint tabular-nums">
            {inputs.assets.length} holding{inputs.assets.length === 1 ? '' : 's'}
            {inputs.goals.length > 0 && ` · ${inputs.goals.length} goal${inputs.goals.length === 1 ? '' : 's'}`}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Primary metric — the hero of the composition */}
          <div className="lg:col-span-5 flex flex-col">
            <FinancialMetric
              size="hero"
              label="Total net worth"
              value={netWorth === null ? null : formatCurrencyCompact(netWorth)}
              hint={
                configured
                  ? `${formatOrDash(wealthResult.totalInvested, formatCurrencyCompact)} invested across ${inputs.assets.length} holding${inputs.assets.length === 1 ? '' : 's'}`
                  : undefined
              }
            />
            <div className="mt-auto border-t border-border-subtle pt-5">
              <FinancialMetric
                size="sm"
                label={horizonAge ? `Terminal corpus · age ${horizonAge}` : 'Terminal corpus'}
                value={formatOrDash(terminal, formatCurrencyCompact)}
                hint={
                  terminalReal !== null && terminalReal > 0
                    ? `${formatCurrencyCompact(terminalReal)} in today's money`
                    : undefined
                }
              />
            </div>
          </div>

          {/* Secondary metrics — hairline column, deliberately quieter */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-x-8 gap-y-7 lg:border-l lg:border-border-subtle lg:pl-8 content-start">
            <FinancialMetric
              size="md"
              label="Monthly SIP"
              value={formatOrDash(monthlySIP, (v) => `${formatCurrencyCompact(v)}/mo`)}
              hint={inputs.sip.stepUp > 0 ? `${formatPercent(inputs.sip.stepUp, 0)} annual step-up` : undefined}
            />
            <FinancialMetric
              size="md"
              label="Annual income"
              value={formatOrDash(annualIncome, formatCurrencyCompact)}
              hint={configured ? `Age ${inputs.currentAge || '—'} → ${inputs.retirementAge || '—'}` : undefined}
            />
            <FinancialMetric
              size="md"
              label="Savings rate"
              value={formatOrDash(savingsRate, (v) => formatPercent(v))}
              hint={annualIncome !== null && monthlySIP !== null ? `${formatCurrencyCompact((monthlySIP || 0) * 12)}/yr invested` : undefined}
            />
            <FinancialMetric
              size="md"
              label="Monte Carlo success"
              value={formatOrDash(mcSuccess, (v) => formatPercent(v, 0))}
              hint={
                configured
                  ? `${wealthResult.monteCarlo.outcomes.length.toLocaleString()} scenarios to age ${horizonAge ?? '—'}`
                  : undefined
              }
            />
            <FinancialMetric
              size="md"
              label="Risk profile"
              value={hasRiskAnswers ? riskProfile.label : null}
              hint={hasRiskAnswers ? `Score ${riskScore}/100 · ${riskProfile.goalSuccessThreshold}% goal bar` : 'Assessment pending'}
            />
            <FinancialMetric size="md" label="Currency exposure" value={fxLabel} />
          </div>
        </div>
      </div>
    </section>
  );
};
