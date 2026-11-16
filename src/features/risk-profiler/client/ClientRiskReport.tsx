import { useMemo } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { RiskRadar } from '../../../components/risk/RiskRadar';
import {
  calculateRiskScore,
  getDimensionBreakdown,
  getRiskProfile,
  type RiskAnswers,
} from '../../../lib/riskQuestionnaire';
import { DIMENSION_LABELS, ORDERED_DIMENSIONS } from '../../../components/risk/assessmentGroups';

const scoreBand = (score: number): string =>
  score >= 70 ? 'Growth-seeking band' : score >= 45 ? 'Balanced band' : score >= 25 ? 'Conservative-leaning band' : 'Capital-preservation band';

/**
 * The client-safe counterpart to the adviser report. It reuses the exact same
 * questionnaire calculation, profile and eight-dimension radar, but never
 * shows an allocation, portfolio constraint, security, or investment action.
 */
export function ClientRiskReport({ answers }: { answers: RiskAnswers }) {
  const score = useMemo(() => calculateRiskScore(answers), [answers]);
  const profile = useMemo(() => getRiskProfile(score), [score]);
  const dimensions = useMemo(() => getDimensionBreakdown(answers), [answers]);
  const radarData = useMemo(() => ORDERED_DIMENSIONS.map((dimension) => ({
    dimension: DIMENSION_LABELS[dimension],
    score: Math.round(dimensions[dimension]?.percentage ?? 0),
  })), [dimensions]);
  const lowest = radarData.reduce((current, item) => item.score < current.score ? item : current, radarData[0]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-border hero-gradient px-6 py-8 sm:px-10 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="eyebrow mb-3">Your risk profile</div>
            <h1 className="font-display text-5xl sm:text-6xl text-ink">{profile.label}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="accent">{scoreBand(score)}</Badge>
              <Badge tone="neutral">14 of 14 responses recorded</Badge>
            </div>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">{profile.description}</p>
          </div>
          <div className="risk-score-card w-full lg:max-w-[19rem]" aria-label={`Composite risk score ${score} out of 100.`}>
            <div className="flex items-center justify-between gap-3">
              <span>Risk-o-meter</span>
              <span className="risk-score-card-band">{profile.scoreMin}–{profile.scoreMax} band</span>
            </div>
            <div className="risk-score-card-value">{score}<small>/100</small></div>
            <div className="risk-score-card-track" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div>
            <p>This score reflects your capacity, comfort and experience with financial risk.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-raised p-5 lg:col-span-2">
          <SectionHeader title="Your risk dimensions" description="A view across the eight inputs that informed this profile." />
          <RiskRadar data={radarData} caption={`Your eight risk dimensions. Lowest dimension: ${lowest?.dimension ?? 'not available'}.`} />
        </div>
        <div className="rounded-lg border border-border bg-raised p-5 lg:col-span-3">
          <SectionHeader title="What this means" description="A starting point for a conversation, not an investment recommendation." />
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-ink-soft">
            <p>{profile.persona}</p>
            <div className="flex gap-3 border-t border-border-subtle pt-4">
              <ShieldCheck className="mt-0.5 shrink-0 text-accent" size={18} strokeWidth={1.7} aria-hidden="true" />
              <p>Your adviser will review this profile alongside your goals, time horizon, cash-flow needs and complete financial position before discussing any plan.</p>
            </div>
            <div className="flex gap-3 border-t border-border-subtle pt-4">
              <CheckCircle2 className="mt-0.5 shrink-0 text-positive" size={18} strokeWidth={1.7} aria-hidden="true" />
              <p>Your completed responses have been recorded. You do not need to take any further action unless your adviser asks you to revisit them.</p>
            </div>
          </div>
        </div>
      </section>

      <p className="border-t border-border-subtle pt-4 text-xs leading-relaxed text-faint">
        This risk profile is for planning and discussion purposes only. It is not investment advice and does not recommend any allocation, product or transaction.
      </p>
    </div>
  );
}
