import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  PencilLine,
  PieChart,
  RotateCcw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SectionHeader } from '../ui/SectionHeader';
import { FinancialMetric } from '../ui/FinancialMetric';
import { RiskRadar } from './RiskRadar';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatPercent } from '../../lib/formatters';
import { formatOrDash, guardNumber } from '../../lib/planState';
import {
  calculateRiskScore,
  getDimensionBreakdown,
  buildGlidePath,
  analyzeRiskGap,
  detectBehavioralBiases,
  generateActionChecklist,
  type RiskAnswers,
  type RiskProfile,
} from '../../lib/riskQuestionnaire';
import { DIMENSION_LABELS, ORDERED_DIMENSIONS } from './assessmentGroups';
import type { MasterPlanInputs, AssetCategory } from '../../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const scoreBand = (score: number): string =>
  score >= 70
    ? 'Growth-seeking band'
    : score >= 45
      ? 'Balanced band'
      : score >= 25
        ? 'Conservative-leaning band'
        : 'Capital-preservation band';

interface RiskReportProps {
  riskAnswers: RiskAnswers;
  riskProfile: RiskProfile;
  inputs: MasterPlanInputs;
  onApply: () => void;
  onEdit: () => void;
  onReset: () => void;
}

/**
 * The assessment report — rendered only once every question is answered.
 * Editorial composition: profile label and composite score up top, a
 * restrained radar, then plain-language interpretation and policy details.
 */
export const RiskReport = ({
  riskAnswers,
  riskProfile,
  inputs,
  onApply,
  onEdit,
  onReset,
}: RiskReportProps) => {
  const score = useMemo(() => calculateRiskScore(riskAnswers), [riskAnswers]);
  const dimensionBreakdown = useMemo(() => getDimensionBreakdown(riskAnswers), [riskAnswers]);

  const radarData = useMemo(
    () =>
      ORDERED_DIMENSIONS.map((dim) => ({
        dimension: DIMENSION_LABELS[dim],
        score: Math.round(dimensionBreakdown[dim]?.percentage ?? 0),
      })),
    [dimensionBreakdown],
  );

  const weakestDimension = useMemo(
    () => radarData.reduce((a, b) => (b.score < a.score ? b : a), radarData[0]),
    [radarData],
  );

  const gapAnalysis = useMemo(() => analyzeRiskGap(riskAnswers), [riskAnswers]);
  const biases = useMemo(() => detectBehavioralBiases(riskAnswers), [riskAnswers]);
  const actionChecklist = useMemo(
    () => generateActionChecklist(riskProfile, gapAnalysis, biases),
    [riskProfile, gapAnalysis, biases],
  );

  // Glide path only makes sense with a real timeline — never invent one.
  const glidePath = useMemo(() => {
    if (inputs.currentAge <= 0 || inputs.retirementAge <= inputs.currentAge) return [];
    const full = buildGlidePath(inputs.currentAge, inputs.retirementAge, riskProfile);
    const stride = Math.max(1, Math.ceil(full.length / 24));
    return full.filter((_, i) => i % stride === 0 || i === full.length - 1);
  }, [inputs.currentAge, inputs.retirementAge, riskProfile]);

  const targetTotal = CATEGORIES.reduce((sum, cat) => sum + riskProfile.targets[cat], 0);
  const tolerancePct = formatOrDash(gapAnalysis.tolerancePct, (n) => `${Math.round(n)}%`);
  const capacityPct = formatOrDash(gapAnalysis.capacityPct, (n) => `${Math.round(n)}%`);

  return (
    <div className="space-y-10">
      {/* ── Report masthead: label, score, band ─────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden rounded-xl border border-border hero-gradient px-6 py-8 sm:px-10 sm:py-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
          <div className="min-w-0">
            <div className="eyebrow">Risk Profile</div>
            <h1 className="font-display text-5xl sm:text-6xl text-ink mt-3">{riskProfile.label}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="accent">{scoreBand(score)}</Badge>
              <Badge tone="neutral">{Object.keys(riskAnswers).length} of 14 questions</Badge>
            </div>
            <p className="mt-4 text-sm sm:text-[15px] text-muted max-w-prose leading-relaxed">
              {riskProfile.description}
            </p>
          </div>
          <div className="lg:text-right">
            <div className="num-hero text-6xl sm:text-7xl text-ink">
              {formatOrDash(score, (n) => String(n))}
              <span className="text-2xl sm:text-3xl text-faint">/100</span>
            </div>
            <div className="eyebrow mt-2">Composite risk score</div>
            <div className="flex lg:justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <PencilLine size={14} strokeWidth={1.7} className="mr-1" aria-hidden="true" />
                Edit answers
              </Button>
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw size={14} strokeWidth={1.7} className="mr-1" aria-hidden="true" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Radar + interpretation + target allocation ──────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-raised border border-border rounded-lg p-5">
          <SectionHeader
            title="Dimension radar"
            description="Eight weighted dimensions, scored 0–100."
          />
          <RiskRadar
            data={radarData}
            caption={`Radar chart of the eight risk dimensions. ${
              weakestDimension
                ? `Weakest dimension: ${weakestDimension.dimension} at ${weakestDimension.score} percent.`
                : ''
            }`}
          />
          <p className="text-xs text-muted leading-relaxed mt-2">
            {weakestDimension
              ? `${weakestDimension.dimension} is the binding constraint at ${weakestDimension.score}% — the profile cannot be more aggressive than this dimension supports.`
              : ''}
          </p>
        </div>

        <div className="lg:col-span-3 bg-raised border border-border rounded-lg p-5 sm:p-6 flex flex-col">
          <SectionHeader title="What this means" description="Tolerance versus capacity, in plain language." />
          <p className="text-sm sm:text-[15px] text-ink-soft leading-relaxed text-pretty">
            Two different things are measured here, and the plan has to respect both.{' '}
            <strong className="text-ink font-medium">Tolerance</strong> is emotional — the size of
            the loss the investor can watch without abandoning the strategy.{' '}
            <strong className="text-ink font-medium">Capacity</strong> is financial — the losses that
            income, reserves and the time horizon can genuinely absorb. Tolerance reads at{' '}
            <span className="font-mono tabular-nums text-ink">{tolerancePct}</span> and capacity at{' '}
            <span className="font-mono tabular-nums text-ink">{capacityPct}</span>. {gapAnalysis.verdict}
          </p>

          <div className="mt-auto pt-6">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="eyebrow">Target strategic allocation</div>
              <div className="text-xs text-faint font-mono tabular-nums">
                {formatPercent(riskProfile.targets.equity)} equity core
              </div>
            </div>
            {/* Quiet stacked bar */}
            <div
              className="h-3 w-full rounded-sm overflow-hidden flex bg-sunken"
              role="img"
              aria-label={`Target allocation: ${CATEGORIES.filter((c) => riskProfile.targets[c] > 0)
                .map((c) => `${ASSET_LABELS[c]} ${riskProfile.targets[c]} percent`)
                .join(', ')}.`}
            >
              {CATEGORIES.filter((cat) => riskProfile.targets[cat] > 0).map((cat) => (
                <div
                  key={cat}
                  style={{
                    width: `${targetTotal > 0 ? (riskProfile.targets[cat] / targetTotal) * 100 : 0}%`,
                    backgroundColor: ASSET_COLORS[cat],
                  }}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              {CATEGORIES.filter((cat) => riskProfile.targets[cat] > 0).map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-border-subtle"
                >
                  <span className="flex items-center gap-2 text-xs text-ink-soft min-w-0">
                    <span
                      className="w-2 h-2 rounded-[2px] shrink-0"
                      style={{ backgroundColor: ASSET_COLORS[cat] }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{ASSET_LABELS[cat]}</span>
                  </span>
                  <span className="text-xs font-mono tabular-nums text-ink">
                    {formatPercent(riskProfile.targets[cat])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Policy constraints ──────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Policy constraints" description="The limits this profile places on the plan." hairline />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 mt-5">
          <FinancialMetric
            label="Equity band"
            value={`${riskProfile.minEquity}–${riskProfile.maxEquity}%`}
            hint="Strategic range"
            size="sm"
          />
          <FinancialMetric
            label="Max drawdown"
            value={guardNumber(riskProfile.maxDrawdown)}
            suffix="%"
            hint="Tolerable peak-to-trough"
            size="sm"
          />
          <FinancialMetric
            label="Target volatility"
            value={guardNumber(riskProfile.targetVolatility)}
            suffix="%"
            hint="Annualised"
            size="sm"
          />
          <FinancialMetric
            label="Goal success threshold"
            value={guardNumber(riskProfile.goalSuccessThreshold)}
            suffix="%"
            hint="Minimum acceptable probability"
            size="sm"
          />
        </div>
      </section>

      {/* ── Dimension scores ────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Dimension scores"
          description="Weighted 0–100. Tolerance (25%) and capacity (20%) carry the most weight — a high-risk profile requires both the willingness to accept volatility and the financial ability to recover from it."
          hairline
        />
        <div className="mt-2">
          {ORDERED_DIMENSIONS.map((dim) => {
            const data = dimensionBreakdown[dim];
            const pct = data?.percentage ?? 0;
            return (
              <div
                key={dim}
                className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[220px_minmax(0,1fr)_64px] items-center gap-x-6 gap-y-1.5 py-3 border-b border-border-subtle"
              >
                <div className="min-w-0">
                  <div className="text-sm text-ink">{DIMENSION_LABELS[dim]}</div>
                  <div className="text-[11px] text-faint font-mono tabular-nums">
                    weight {Math.round(data?.weight ? data.weight * 100 : 0)}%
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 h-1.5 rounded-full bg-sunken overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full bg-accent"
                  />
                </div>
                <div className="text-sm font-mono tabular-nums text-ink text-right">
                  {formatOrDash(pct, (n) => `${Math.round(n)}%`)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Tolerance vs capacity + biases + checklist ──────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-raised border border-border rounded-lg p-5">
          <SectionHeader title="Tolerance vs capacity" />
          {[
            { label: 'Risk tolerance', pct: gapAnalysis.tolerancePct, color: 'var(--color-accent)' },
            { label: 'Risk capacity', pct: gapAnalysis.capacityPct, color: 'var(--color-brass)' },
          ].map((row) => (
            <div key={row.label} className="mb-4 last:mb-0">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-xs text-ink-soft">{row.label}</span>
                <span className="text-sm font-mono tabular-nums text-ink">
                  {formatOrDash(row.pct, (n) => `${Math.round(n)}%`)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-sunken overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted leading-relaxed mt-4 pt-4 border-t border-border-subtle">
            {gapAnalysis.gap > 20 || gapAnalysis.gap < -20 ? (
              <>
                Gap:{' '}
                <span className="font-mono tabular-nums text-ink">
                  {formatOrDash(Math.abs(gapAnalysis.gap), (n) => `${n.toFixed(1)}%`)}
                </span>{' '}
                between the two.
              </>
            ) : (
              'The two are reasonably aligned.'
            )}
          </p>
        </div>

        <div className="bg-raised border border-border rounded-lg p-5">
          <SectionHeader title="Behavioural biases" description="Patterns detected in the answers." />
          {biases.length > 0 ? (
            <div className="space-y-4">
              {biases.map((b) => (
                <div key={b.bias} className="border-l-2 border-brass pl-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-ink">{b.bias}</div>
                    <Badge tone={b.level === 'high' ? 'warning' : 'brass'} dot={false}>
                      {b.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted leading-relaxed mt-1">{b.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No significant biases detected in the answers.</p>
          )}
        </div>

        <div className="bg-raised border border-border rounded-lg p-5">
          <SectionHeader title="Action checklist" description="What this profile implies for the plan." />
          <ul className="space-y-3">
            {actionChecklist.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-soft leading-snug">
                <CheckCircle2
                  size={15}
                  strokeWidth={1.6}
                  className="shrink-0 mt-0.5 text-accent"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Persona + glide path ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-raised border border-border rounded-lg p-5 sm:p-6">
          <SectionHeader title="Investor persona" />
          <p className="text-sm sm:text-[15px] text-ink-soft leading-relaxed text-pretty">
            {riskProfile.persona}
          </p>
          <div className="mt-5 p-4 rounded-md bg-brass-soft border border-brass/25">
            <div className="eyebrow mb-1.5">Recommended approach</div>
            <p className="text-sm text-ink leading-relaxed">{riskProfile.recommendedApproach}</p>
          </div>
        </div>

        <div className="bg-raised border border-border rounded-lg p-5 sm:p-6">
          <SectionHeader
            title="Glide path to retirement"
            description="Strategic equity weight de-risking from today to the retirement date."
          />
          {glidePath.length > 1 ? (
            <>
              <div className="h-56 w-full">
                <svg
                  viewBox={`-34 0 ${glidePath.length * 40 + 10} 200`}
                  className="w-full h-full"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Glide path from age ${glidePath[0].age} to age ${glidePath[glidePath.length - 1].age}: equity de-risks from ${glidePath[0].equity}% to ${glidePath[glidePath.length - 1].equity}%.`}
                >
                  {[0, 25, 50, 75, 100].map((pct) => (
                    <g key={pct}>
                      <text
                        x="-6"
                        y={180 - pct * 1.8}
                        fontSize="10"
                        fill="var(--color-faint)"
                        textAnchor="end"
                        alignmentBaseline="middle"
                      >
                        {pct}%
                      </text>
                      <line
                        x1="0"
                        y1={180 - pct * 1.8}
                        x2={glidePath.length * 40}
                        y2={180 - pct * 1.8}
                        stroke="var(--color-border-subtle)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    </g>
                  ))}
                  {glidePath.map((p, i) => (
                    <g key={p.age} transform={`translate(${i * 40}, 0)`}>
                      <rect
                        y={180 - p.equity * 1.8}
                        width="30"
                        height={p.equity * 1.8}
                        fill={ASSET_COLORS.equity}
                        opacity={0.85}
                        rx="3"
                      />
                      <rect
                        y={180 - (p.equity + p.debt) * 1.8}
                        width="30"
                        height={p.debt * 1.8}
                        fill={ASSET_COLORS.debt}
                        opacity={0.85}
                        rx="3"
                      />
                      <text
                        x="15"
                        y="195"
                        fontSize="10"
                        fill="var(--color-faint)"
                        textAnchor="middle"
                      >
                        {p.age}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: ASSET_COLORS.equity }} aria-hidden="true" />
                  Equity
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: ASSET_COLORS.debt }} aria-hidden="true" />
                  Debt
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted leading-relaxed">
              Set the client&apos;s current age and a retirement age after it to see how the
              strategic equity weight de-risks over time.
            </p>
          )}
        </div>
      </section>

      {/* ── How this connects to the plan ───────────────────────────────── */}
      <section className="bg-raised border border-border rounded-lg p-5 sm:p-6">
        <SectionHeader title="How this connects to your plan" hairline />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mt-5">
          {[
            {
              icon: PieChart,
              title: 'Allocation',
              body: `Targets are set to ${riskProfile.label.toLowerCase()} weights and can be applied to SIP/STP splits.`,
            },
            {
              icon: BarChart3,
              title: 'MVO',
              body: `Risk-free rate and portfolio constraints align with the ${formatPercent(riskProfile.targetVolatility)} volatility target.`,
            },
            {
              icon: Target,
              title: 'Goals',
              body: `Goal-planner success thresholds use ${formatPercent(riskProfile.goalSuccessThreshold)} as the minimum acceptable probability.`,
            },
          ].map((item) => (
            <div key={item.title} className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
                <span className="text-sm font-medium text-ink">{item.title}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <Button onClick={onApply} className="sm:min-w-56">
          <ShieldCheck size={16} strokeWidth={1.7} className="mr-2" aria-hidden="true" />
          Apply to allocation
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <ArrowLeft size={15} strokeWidth={1.7} className="mr-1.5" aria-hidden="true" />
          Back to questionnaire
        </Button>
        <Button variant="ghost" onClick={onReset} className="sm:ml-auto">
          <RotateCcw size={15} strokeWidth={1.7} className="mr-1.5" aria-hidden="true" />
          Reset all answers
        </Button>
      </section>
    </div>
  );
};
