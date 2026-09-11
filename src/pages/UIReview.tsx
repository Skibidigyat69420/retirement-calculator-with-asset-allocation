import { Check, Search, SlidersHorizontal } from 'lucide-react';
import { LogoMark, Lockup } from '../components/layout/BrandMark';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { FinancialMetric } from '../components/ui/FinancialMetric';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CurrencyInput } from '../components/ui/CurrencyInput';

/** Internal visual QA surface. It is intentionally not linked from primary navigation. */
export const UIReview = () => (
  <div className="space-y-10 pb-12">
    <PageHeader
      eyebrow="Internal / UI review"
      title="Editorial financial intelligence"
      description="A compact reference surface for checking the Sound Thesis language across themes, states and density levels."
      actions={<ThemeToggle variant="segmented" />}
    />

    <section className="hero-gradient grid-motif overflow-hidden rounded-xl border border-border p-6 sm:p-8">
      <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Lockup />
          <p className="mt-8 max-w-xl font-display text-4xl leading-[1.05] text-ink sm:text-5xl">
            A clearer view of wealth.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
            Quiet confidence, precise numbers and enough context to make the next decision visible.
          </p>
        </div>
          <LogoMark size={88} className="text-ink opacity-80" />
      </div>
    </section>

    <section className="space-y-4" aria-labelledby="controls-title">
      <SectionHeader title="Controls & status" description="Primary actions, semantic states and input treatment." />
      <Card className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Add client</Button>
          <Button size="sm" variant="secondary"><Search size={14} /> Search</Button>
          <Button size="sm" variant="outline"><SlidersHorizontal size={14} /> Adjust</Button>
          <Button size="sm" variant="ghost">Cancel</Button>
          <Button size="sm" variant="danger">Reset data</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="on-track" />
          <StatusBadge status="needs-review" />
          <StatusBadge status="incomplete" />
          <StatusBadge status="draft" />
          <Badge tone="brass">Reference</Badge>
          <Badge tone="info">System</Badge>
        </div>
        <div className="max-w-sm">
          <CurrencyInput label="Current annual income" value={0} onChange={() => undefined} helper="Zero is a valid starting state." />
        </div>
      </Card>
    </section>

    <section className="space-y-4" aria-labelledby="metrics-title">
      <SectionHeader title="Numbers & hierarchy" description="Financial figures use tabular numerals and never imply a result before configuration." />
      <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-4">
        <FinancialMetric label="Net worth" value={68400000} prefix="₹" size="hero" hint="Current position" />
        <FinancialMetric label="Investable" value={47200000} prefix="₹" size="lg" />
        <FinancialMetric label="Plan probability" value="82" suffix="%" size="md" delta={4.2} deltaLabel="vs last review" />
        <FinancialMetric label="Not configured" value={null} size="md" hint="Complete the profile to calculate" />
      </div>
    </section>

    <section className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-4">
        <SectionHeader title="Data states" description="The blank state should feel intentional, not broken." />
        <EmptyState
          eyebrow="No plan yet"
          title="Build the first view of the future"
          description="Add a client profile, then add the numbers that matter. Sound Thesis will keep the result honest until there is enough information to model."
          action={<Button size="sm"><Check size={14} /> Start a plan</Button>}
        />
      </div>
      <div className="space-y-4">
        <SectionHeader title="Dense practice row" description="A client directory uses hairlines and hierarchy instead of a wall of cards." />
        <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-[1.4fr_.8fr_.8fr] gap-3 border-b border-border px-4 py-3 eyebrow">
            <span>Client</span><span>Plan</span><span>Review</span>
          </div>
          {[
            ['Raj Sharma', 'On track · 82', '2 days ago'],
            ['Anita Mehta', 'Needs review', 'Tomorrow'],
            ['Vivek Shah', 'Incomplete', '—'],
          ].map(([name, plan, review]) => (
            <div key={name} className="grid grid-cols-[1.4fr_.8fr_.8fr] gap-3 border-b border-border-subtle px-4 py-4 last:border-0">
              <div><p className="text-sm font-medium text-ink">{name}</p><p className="mt-1 text-xs text-muted">Household planning workspace</p></div>
              <span className="self-center text-xs text-ink-soft">{plan}</span>
              <span className="self-center text-xs tabular-nums text-muted">{review}</span>
            </div>
          ))}
        </Card>
      </div>
    </section>
  </div>
);
