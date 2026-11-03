import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PieChart } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusBadge, type Status } from '../components/ui/StatusBadge';
import { Alert } from '../components/ui/Alert';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Field, FieldGrid } from '../components/ui/Field';
import { NumberInput } from '../components/ui/NumberInput';
import { Select } from '../components/ui/Select';
import { Slider } from '../components/ui/Slider';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SaveIndicator } from '../components/ui/SaveIndicator';
import { ProgressBar } from '../components/ui/ProgressBar';
import { InfoTip } from '../components/ui/InfoTip';
import { Drawer } from '../components/ui/Drawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { FinancialMetric } from '../components/ui/FinancialMetric';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useTheme } from '../lib/theme';
import { getChartTheme } from '../lib/chartTheme';

/* ── Color reference ───────────────────────────────────────────
   The ONLY place raw hex is permitted in the product: these fills
   are the documented token values from src/index.css. Everything
   else on this page uses semantic classes. */

interface Swatch {
  name: string;
  bg: string;
  pair: string;
  pairHex: string;
}

const SURFACES: Swatch[] = [
  { name: 'canvas', bg: '#F8FAFC', pair: 'ink', pairHex: '#0F172A' },
  { name: 'surface', bg: '#FFFFFF', pair: 'ink', pairHex: '#0F172A' },
  { name: 'raised', bg: '#FFFFFF', pair: 'ink', pairHex: '#0F172A' },
  { name: 'sunken', bg: '#F1F5F9', pair: 'ink-soft', pairHex: '#334155' },
  { name: 'inset', bg: '#F8FAFC', pair: 'muted', pairHex: '#64748B' },
  { name: 'elevated', bg: '#FFFFFF', pair: 'ink', pairHex: '#0F172A' },
  { name: 'deep', bg: '#0F172A', pair: 'inverted ink', pairHex: '#F8FAFC' },
];

const HAIRLINES: Swatch[] = [
  { name: 'border', bg: '#E2E8F0', pair: 'ink', pairHex: '#0F172A' },
  { name: 'border-strong', bg: '#CBD5E1', pair: 'ink', pairHex: '#0F172A' },
  { name: 'border-subtle', bg: '#F1F5F9', pair: 'ink-soft', pairHex: '#334155' },
];

const INKS: Swatch[] = [
  { name: 'ink', bg: '#0F172A', pair: 'canvas', pairHex: '#F8FAFC' },
  { name: 'ink-soft', bg: '#334155', pair: 'canvas', pairHex: '#F8FAFC' },
  { name: 'muted', bg: '#64748B', pair: 'raised', pairHex: '#FFFFFF' },
  { name: 'faint', bg: '#94A3B8', pair: 'raised', pairHex: '#FFFFFF' },
];

const ACCENTS: Swatch[] = [
  { name: 'accent', bg: '#2563EB', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'accent-strong', bg: '#1D4ED8', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'accent-soft', bg: '#EFF6FF', pair: 'accent-strong', pairHex: '#1D4ED8' },
  { name: 'accent-softer', bg: '#F8FAFC', pair: 'accent-strong', pairHex: '#1D4ED8' },
  { name: 'brass', bg: '#D97706', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'brass-strong', bg: '#B45309', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'brass-soft', bg: '#FEF3C7', pair: 'brass-strong', pairHex: '#B45309' },
];

const STATUS: Swatch[] = [
  { name: 'positive', bg: '#16A34A', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'positive-soft', bg: '#F0FDF4', pair: 'positive', pairHex: '#16A34A' },
  { name: 'negative', bg: '#DC2626', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'negative-soft', bg: '#FEF2F2', pair: 'negative', pairHex: '#DC2626' },
  { name: 'warning', bg: '#D97706', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'warning-soft', bg: '#FFFBEB', pair: 'warning', pairHex: '#D97706' },
  { name: 'info', bg: '#0284C7', pair: 'white', pairHex: '#FFFFFF' },
  { name: 'info-soft', bg: '#F0F9FF', pair: 'info', pairHex: '#0284C7' },
];

const SwatchGrid = ({ title, items }: { title: string; items: Swatch[] }) => (
  <div>
    <SectionHeader title={title} />
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {items.map(({ name, bg, pair, pairHex }) => (
        <div key={name} className="rounded-md border border-border overflow-hidden">
          <div className="h-14 flex items-end p-2" style={{ backgroundColor: bg }}>
            <span className="text-[10px] font-mono" style={{ color: pairHex }}>{name}</span>
          </div>
          <div className="px-2 py-1.5 bg-surface">
            <span className="text-[10px] text-muted font-mono">pair: {pair}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Chart demo data (inline constants — presentation only) ─── */

const CORPUS_PROJECTION = [
  { year: '2026', projected: 8200000, required: 5400000 },
  { year: '2030', projected: 12800000, required: 8600000 },
  { year: '2034', projected: 18100000, required: 12500000 },
  { year: '2038', projected: 24300000, required: 17100000 },
  { year: '2042', projected: 31200000, required: 22400000 },
  { year: '2046', projected: 38600000, required: 28500000 },
];

const ALL_STATUSES: Status[] = [
  'on-track', 'needs-review', 'at-risk', 'incomplete', 'stale', 'saved', 'saving', 'error', 'draft',
  'review', 'approved', 'archived', 'not-started', 'in-progress', 'ready-for-review', 'active',
];

export const StyleGuide = () => {
  const { resolved } = useTheme();
  const [segment, setSegment] = useState('overview');
  const [currency, setCurrency] = useState(5000000);
  const [fieldYears, setFieldYears] = useState(58);
  const [fieldAmount, setFieldAmount] = useState(75000);
  const [years, setYears] = useState(25);
  const [horizon, setHorizon] = useState('2046');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const chart = getChartTheme();

  return (
    <div className="max-w-[1200px] mx-auto py-10 px-4 sm:px-6 space-y-16">
      <PageHeader
        title="Design system"
        description="Every token, type style, component, and motif in the SoundThesis Capital interface. Not linked in navigation — visit at /style-guide. See docs/UI_SYSTEM.md for the written contract."
        variant="hero"
      />

      {/* ── Theme ── */}
      <section className="space-y-6">
        <SectionTitle title="Theme" subtitle="Dark is the default — a private study. Light is the parchment companion. System follows the OS. The preference persists in localStorage and is applied before first paint." />
        <div className="flex flex-wrap items-center gap-4">
          <ThemeToggle variant="segmented" />
          <ThemeToggle variant="icon" />
          <span className="text-sm text-muted">
            Resolved theme: <span className="font-mono tabular-nums text-ink">{resolved}</span>
          </span>
        </div>
      </section>

      {/* ── Color ── */}
      <section className="space-y-8">
        <SectionTitle title="Color" subtitle="Semantic tokens only — never raw hex in product code. Light values shown; the dark set mirrors them as the private study. Brass marks reference, never action." />
        <SwatchGrid title="Surfaces" items={SURFACES} />
        <SwatchGrid title="Hairlines" items={HAIRLINES} />
        <SwatchGrid title="Ink" items={INKS} />
        <SwatchGrid title="Accents & References" items={ACCENTS} />
        <SwatchGrid title="Status" items={STATUS} />
      </section>

      {/* ── Typography ── */}
      <section className="space-y-6">
        <SectionTitle title="Typography" subtitle="Inter carries the entire system — UI, headings, labels, and tabular figures for numerical amounts." />
        <div className="border border-border rounded-lg divide-y divide-border">
          <div className="p-6">
            <p className="text-xs font-medium text-muted mb-2">num-hero · system display · 48–72</p>
            <p className="num-hero text-ink text-5xl sm:text-6xl">₹5.32 Cr</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-muted mb-2">Page title · semibold · 34–42</p>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">Retirement &amp; SWP</h2>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-muted mb-2">Section · semibold · 21–26</p>
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-ink">Corpus longevity</h3>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-muted mb-2">Body · 14–16</p>
            <p className="text-sm sm:text-[15px] text-muted max-w-prose leading-relaxed">
              We use your current expenditure to estimate the monthly income the corpus
              must replace. Inflation assumptions can be reviewed in the scenario panel.
            </p>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-xs font-medium text-muted">Mono tabular · all amounts</p>
            <div className="font-mono tabular-nums text-sm text-ink space-y-1 max-w-xs">
              <div className="flex justify-between border-b border-border-subtle pb-1"><span>Corpus</span><span>₹5,32,00,000</span></div>
              <div className="flex justify-between border-b border-border-subtle pb-1"><span>Required</span><span>₹2,85,00,000</span></div>
              <div className="flex justify-between"><span>Surplus</span><span className="text-positive">₹2,47,00,000</span></div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-muted mb-2">Metadata · 12–13</p>
            <p className="text-xs text-faint">Last reviewed 04 Sep 2026 · Advisor notes synced</p>
          </div>
        </div>
      </section>

      {/* ── Buttons & controls ── */}
      <section className="space-y-8">
        <SectionTitle title="Buttons & status" subtitle="Verbs name the object: Create client, Save scenario, Generate report. Never Submit or OK." />
        <div className="space-y-6">
          {(['primary', 'secondary', 'outline', 'ghost', 'danger'] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted w-20 shrink-0">{variant}</span>
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {variant === 'danger' ? 'Delete scenario' : 'Save scenario'}
                </Button>
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div>
            <SectionHeader title="SegmentedControl" description="Radiogroup semantics — arrows cycle, active option holds the tab stop." />
            <SegmentedControl
              ariaLabel="View"
              value={segment}
              onChange={setSegment}
              options={[
                { value: 'overview', label: 'Overview' }, { value: 'cashflows', label: 'Cashflows' },
                { value: 'stress', label: 'Stress test' },
              ]}
            />
          </div>
          <div>
            <SectionHeader title="StatusBadge — all 16 statuses" description="Icon + label, never color alone." />
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Inputs ── */}
      <section className="space-y-6">
        <SectionTitle title="Inputs" subtitle="Zeros are real zeros. Errors are sentence-case. Helpers explain why we ask." />
        <div className="border border-border rounded-lg p-5 md:p-6 grid sm:grid-cols-2 gap-6">
          <Input label="Client name" helper="Used on the cover of every generated report." placeholder="e.g. Meera Krishnan" />
          <Input label="Email address" error="That email address doesn’t look complete." defaultValue="meera@" />
          <NumberInput
            kind="currency"
            label="Monthly SIP"
            value={currency}
            onChange={setCurrency}
            presets={[
              { label: '₹25k', value: 25000 },
              { label: '₹50k', value: 50000 },
              { label: '₹1L', value: 100000 },
            ]}
            helper="Steppers and presets keep large amounts editable."
          />
          <NumberInput
            label="Retirement age"
            value={years}
            onChange={setYears}
            suffix="yrs"
            min={40}
            max={75}
            helper="We use this to set the accumulation window."
          />
          <Select
            label="Projection horizon"
            value={horizon}
            onChange={setHorizon}
            options={[
              { value: '2036', label: 'To 2036 (10 years)' }, { value: '2046', label: 'To 2046 (20 years)' },
              { value: '2056', label: 'To 2056 (30 years)' },
            ]}
            helper="How far out the projection chart runs."
          />
          <Slider label="Equity allocation" value={65} onChange={() => {}} min={0} max={100} suffix="%" />
        </div>
      </section>

      {/* ── Fields ── */}
      <section className="space-y-6">
        <SectionTitle title="Fields" subtitle="Field owns the label, helper, error, and hint slots; FieldGrid owns the responsive grid. NumberInput with kind=&quot;currency&quot; replaces the old CurrencyInput." />
        <div className="border border-border rounded-lg p-5 md:p-6 space-y-8">
          <FieldGrid cols={{ sm: 2 }}>
            <Field
              label="Stacked field"
              htmlFor="sg-field-stack"
              helper="Default layout — label above the control."
            >
              <Input id="sg-field-stack" placeholder="e.g. Meera Krishnan" />
            </Field>
            <Field
              label="Inline field"
              htmlFor="sg-field-inline"
              layout="inline"
              helper="Small mono label left of the control, for dense grids."
            >
              <Input id="sg-field-inline" placeholder="e.g. 45" />
            </Field>
          </FieldGrid>
          <FieldGrid cols={{ sm: 2, lg: 3 }}>
            <NumberInput
              label="With presets + slider"
              value={fieldYears}
              onChange={setFieldYears}
              suffix="yrs"
              min={40}
              max={75}
              presets={[
                { label: '50', value: 50 },
                { label: '60', value: 60 },
                { label: '70', value: 70 },
              ]}
              slider="focus"
              helper="Hover to reveal the slider; the value tracks the drag live."
            />
            <NumberInput
              kind="currency"
              label="Currency amount"
              value={fieldAmount}
              onChange={setFieldAmount}
              currency="INR"
              onCurrencyChange={() => {}}
              presets={[
                { label: '₹25k', value: 25000 },
                { label: '₹1L', value: 100000 },
              ]}
              helper="Currency select on the left; en-IN grouping on blur."
            />
            <NumberInput
              label="Error state"
              value={12}
              onChange={() => {}}
              error="Value must be between 0 and 10."
            />
          </FieldGrid>
          <Field
            hint={
              <p className="mt-1 rounded-md border border-accent/20 bg-accent-soft px-3 py-2 text-xs text-accent-strong">
                The hint slot carries cross-page notices — anything that is not a helper or an error.
              </p>
            }
          >
            <FieldGrid cols={{ sm: 2 }}>
              <NumberInput layout="inline" label="SIP amount" value={25000} onChange={() => {}} suffix="/mo" />
              <NumberInput layout="inline" label="Step-up" value={10} onChange={() => {}} suffix="%" />
            </FieldGrid>
          </Field>
        </div>
      </section>

      {/* ── Feedback ── */}
      <section className="space-y-6">
        <SectionTitle title="Feedback" subtitle="Human errors, short successes. Amber means stale or drifting, red means a real problem." />
        <div className="grid gap-3">
          <Alert variant="info">Market data refreshes every trading day after 4 PM IST.</Alert>
          <Alert variant="success">Scenario saved. It will appear in the report.</Alert>
          <Alert variant="warning">Last market sync was 3 days ago. Figures may be stale.</Alert>
          <Alert variant="danger">We couldn’t save that change. <Button variant="ghost" size="sm" className="underline">Retry</Button></Alert>
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-2">
          {(['saving', 'saved', 'error'] as const).map((s) => (
            <SaveIndicator key={s} status={s} />
          ))}
          <span className="flex items-center gap-2 text-sm text-muted">
            Corrosion buffer
            <InfoTip content="A margin we hold back so the corpus survives bad sequences of returns." />
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 pt-2">
          <ProgressBar label="Funding progress" value={72} showValue />
          <ProgressBar label="Workflow complete" value={100} showValue />
        </div>
        <div>
          <SectionHeader title="Badge tones" />
          <div className="flex flex-wrap gap-2">
            {(['positive', 'warning', 'negative', 'info', 'neutral', 'accent', 'brass'] as const).map((tone) => (
              <Badge key={tone} tone={tone}>{tone}</Badge>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Avatar — deterministic tones from name hash" />
          <div className="flex items-center gap-3">
            <Avatar name="Meera Krishnan" size="lg" />
            <Avatar name="Arjun Bhat" size="md" />
            <Avatar name="SoundThesis Capital" size="sm" />
          </div>
        </div>
      </section>

      {/* ── Surfaces ── */}
      <section className="space-y-6">
        <SectionTitle title="Surfaces & motifs" subtitle="Hairlines carry structure; shadows are for floating layers only. Cards are a decision, not a default." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <SectionHeader title="Card · default" description="Raised surface, hairline, quiet shadow." />
            <p className="text-sm text-muted">Reserved for contained interaction, metric groups, decisions, previews.</p>
          </Card>
          <div className="glass-card rounded-lg p-5">
            <SectionHeader title="glass-card" description="Frosted floating panel." />
            <p className="text-sm text-muted">For overlays and sticky chrome.</p>
          </div>
          <div className="rounded-lg p-5 bg-sunken border border-border">
            <SectionHeader title="Sunken panel" description="Recessed well — tracks, chips." />
            <p className="text-sm text-muted">Holds secondary content down, not up.</p>
          </div>
          <div className="rounded-lg p-5 bg-inkfill text-on-inkfill">
            <SectionHeader title="Deep panel" />
            <p className="text-sm opacity-80">Inverted ink surface for emphasis bands.</p>
          </div>
          <div className="grid-motif rounded-lg p-5 border border-border bg-surface">
            <SectionHeader title=".grid-motif" description="Graph paper, extremely quiet." />
            <p className="text-sm text-muted">Signature motif — bands and empty states only.</p>
          </div>
          <div className="hero-gradient rounded-lg p-5 border border-border">
            <SectionHeader title=".hero-gradient" description="Soft neutral radial wash." />
            <p className="text-sm text-muted">Dashboard hero, empty states, report covers.</p>
          </div>
        </div>
      </section>

      {/* ── Overlay ── */}
      <section className="space-y-6">
        <SectionTitle title="Overlay" subtitle="Drawers and dialogs sit on the overlay scrim with popover shadow — the only heavy shadow in the system." />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>Delete scenario…</Button>
        </div>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Scenario detail">
          <p className="text-sm text-muted leading-relaxed">
            Drawers hold focused, temporary work — adjusting one assumption, reviewing
            one document. Escape closes; focus returns to the trigger.
          </p>
          <div className="mt-5">
            <FinancialMetric label="Projected corpus" value={38600000} prefix="₹" size="lg" hint="At the selected horizon" />
          </div>
        </Drawer>
        <ConfirmDialog
          open={confirmOpen}
          onConfirm={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
          title="Delete this scenario?"
          description="The scenario and its report annotations will be removed. This cannot be undone."
          confirmLabel="Delete scenario"
          danger
        />
      </section>

      {/* ── Empty states ── */}
      <section className="space-y-6">
        <SectionTitle title="Empty states" subtitle="A blank workspace is dignified. Never demo data, never fake health — always a next action." />
        <EmptyState
          title="No clients yet"
          description="Create your first client to start a plan. Their balance sheet, goals, and risk profile live here."
          icon={PieChart}
          action={<Button>Create client</Button>}
        />
        <EmptyState
          display
          title="Nothing to review yet"
          description="When a plan is ready for review, it will surface here with its funding status."
        />
      </section>

      {/* ── Charts ── */}
      <section className="space-y-6">
        <SectionTitle title="Charts" subtitle="Moss is the primary series; brass dashes mark the required corpus. Every color comes from getChartTheme() — light/dark switching is automatic." />
        <div className="border border-border rounded-lg p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-[2px] bg-accent rounded-full" /> Projected corpus
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-brass" /> Required corpus
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CORPUS_PROJECTION} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: chart.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: chart.grid }} />
                <YAxis
                  tick={{ fill: chart.axis, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(v: number) => `₹${(v / 10_000_000).toFixed(1)}Cr`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 'var(--radius-sm)',
                    color: chart.tooltipText,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: chart.axisLabel, fontFamily: 'var(--font-mono)' }}
                  itemStyle={{ fontFamily: 'var(--font-mono)' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, undefined]}
                />
                <Line type="monotone" dataKey="projected" stroke={chart.primary} strokeWidth={2} dot={false} fill={chart.primaryFill} fillOpacity={0.08} />
                <Line type="monotone" dataKey="required" stroke={chart.reference} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-faint">
            Projection passes above the required corpus from 2030 onward — a surplus,
            not a squeak. Tooltip surface is the raised token.
          </p>
        </div>
      </section>

      <footer className="border-t border-border pt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">SoundThesis Capital · Editorial Financial Intelligence</p>
        <p className="text-xs text-faint">Contract: docs/UI_SYSTEM.md · Audit: docs/UI_AUDIT.md</p>
      </footer>
    </div>
  );
};
