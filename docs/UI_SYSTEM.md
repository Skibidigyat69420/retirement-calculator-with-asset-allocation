# SOUND THESIS — UI System

**"Editorial Financial Intelligence"** — a design-system reference for the SOUND THESIS
wealth-planning platform. This document is the single source of truth for how the
interface looks, reads, and behaves. Implementation lives in `src/index.css` (tokens),
`src/components/ui/` (primitives), `src/lib/chartTheme.ts` (charts), and
`src/lib/theme.tsx` (theming).

---

## 1. Brand principles

> **A clearer view of wealth.**

SOUND THESIS is a working instrument for wealth practitioners — closer to a well-set
ledger or a printed actuarial report than to a consumer app. Five principles govern
every decision:

- **Clarity** — the number is the hero. Hierarchy is unambiguous; decoration never
  competes with data. If a choice doesn't help a practitioner read a figure faster,
  it doesn't ship.
- **Confidence** — the interface states things plainly, in complete sentences, and
  never hedges visually. We do not use confetti, gamified streaks, or congratulatory
  animation to manufacture trust.
- **Continuity** — everything derives from a small set of tokens. Light and dark are
  two renderings of one system, not two designs. Print output is a first-class surface.
- **Context** — a figure is only meaningful next to what it was, what it should be,
  or what it could become. Deltas, reference lines, and brass "target" marks carry
  that context.
- **Precision** — tabular numerals, en-IN grouping (₹5,32,00,000), unambiguous dates
  and units. Sloppy numbers read as sloppy advice.

**What we are not:**

- Not a **bank portal** — no marketing banners, no upsell tiles, no "explore products."
- Not a **spreadsheet** — numbers are curated and annotated, not dumped in a grid.
- Not a **generic SaaS dashboard** — no card-everything composition, no rainbow
  chart palettes, no default-avatar corporate sameness.
- Not a **crypto app** — no neon dark mode, no percentage rocket stickers, no
  fear-of-missing-out copy. Dark mode is a private study, not a trading floor.

---

## 2. Color

All color is semantic. Never use a raw hex in product code (the single sanctioned
exception is the token swatch table in `src/pages/StyleGuide.tsx`). Tokens are
defined in `src/index.css` under `@theme` (light) and `.dark` (dark).

### Surfaces

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-canvas` | `#F4F2ED` | `#0E100E` | App background — warm parchment / private study |
| `--color-background` | `#F4F2ED` | `#0E100E` | Alias of canvas (legacy name kept) |
| `--color-surface` | `#FBFAF7` | `#151815` | Default content surface |
| `--color-raised` | `#FFFFFF` | `#1B1F1B` | Inputs, tooltips, popovers — highest light surface |
| `--color-sunken` | `#ECEAE2` | `#0A0C0A` | Recessed wells, segmented control track, chips |
| `--color-inset` | `#EFEDE6` | `#101310` | Inset fields and recessed panels |
| `--color-elevated` | `#FFFFFF` | `#222722` | Raised overlays above raised |
| `--color-deep` | `#20231F` | `#F1F1EA` | Deepest accent panel (inverted ink) |
| `--color-overlay` | `rgba(23,24,21,0.45)` | `rgba(5,6,5,0.65)` | Modal/drawer scrim |

### Borders — hairlines carry structure

| Token | Light | Dark |
|---|---|---|
| `--color-border` | `#D9D8D1` | `#2A302A` |
| `--color-border-strong` | `#C2C1B7` | `#3B423B` |
| `--color-border-subtle` | `#E6E4DC` | `#202520` |

### Ink (text)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-ink` | `#171815` | `#F1F1EA` | Primary text, headings |
| `--color-ink-soft` | `#4E524B` | `#C9CCC2` | Secondary text |
| `--color-muted` | `#6E7268` | `#9BA095` | Labels, captions, metadata |
| `--color-faint` | `#7B7E76` | `#7E837A` | Placeholders, quietest text |

### Accent — moss (primary action & identity)

| Token | Light | Dark |
|---|---|---|
| `--color-accent` | `#667A63` | `#8EA889` |
| `--color-accent-strong` | `#4A5C47` | `#A9C0A3` |
| `--color-accent-soft` | `#E6ECE3` | `rgba(142,168,137,0.14)` |
| `--color-accent-softer` | `#EFF3EC` | `rgba(142,168,137,0.08)` |
| `--color-focus-ring` | `#667A63` | `#8EA889` |

### Accent — brass (reference & highlight only)

| Token | Light | Dark |
|---|---|---|
| `--color-brass` | `#B3945A` | `#C5A66D` |
| `--color-brass-strong` | `#96793F` | `#D8BC85` |
| `--color-brass-soft` | `#F1EADF` | `rgba(197,166,109,0.12)` |

**Usage rules:**

- **Brass is never an action color.** It marks *reference* — a required-corpus line,
  a target, a benchmark, a highlight on a printed report. Buttons, links, and primary
  series are moss, never brass.
- **Red (`--color-negative`) is reserved for real problems** — errors, genuine
  shortfalls, destructive confirmation. A negative monthly delta is ink/muted, not red.
- **Status is never communicated by color alone.** Every status component pairs color
  with an icon and/or a text label (`StatusBadge`, `Alert` do this intrinsically).

### Semantic status

| Token | Light | Dark |
|---|---|---|
| `--color-positive` / `-soft` | `#557A60` / `#E8EFE9` | `#96B99E` / `rgba(150,185,158,0.12)` |
| `--color-negative` / `-soft` | `#A65954` / `#F4E8E6` | `#C88A84` / `rgba(200,138,132,0.12)` |
| `--color-warning` / `-soft` | `#B07D3E` / `#F4EBDD` | `#CEA267` / `rgba(206,162,103,0.12)` |
| `--color-info` / `-soft` | `#64758A` / `#E9EDF1` | `#93A3B5` / `rgba(147,163,181,0.12)` |

---

## 3. Typography

Three typefaces, each with exactly one job:

- **Inter** (`--font-sans`) — all UI chrome and body copy. `font-feature-settings:
  "cv11", "ss01"` is set globally.
- **Instrument Serif** (`--font-display`) — display only: page heroes (`PageHeader
  variant="hero"`), empty-state display titles, hero numbers (`.num-hero`). Never used
  for labels, tables, or paragraphs.
- **JetBrains Mono** (`--font-mono`) — every number that must align: all ₹ amounts,
  percentages, years, dates, and scores. Applied via the `tabular-nums` utility or
  `[data-tabular="true"]`, both of which enable `tnum` tabular figures with
  `-0.01em` tracking.

### Scale

| Level | Size | Weight / face | Use |
|---|---|---|---|
| Hero number | 48–72 (`num-hero`, `text-5xl sm:text-6xl`+) | Instrument Serif, tabular | Dashboard headline figures |
| Page title | 34–42 (standard `text-2xl sm:text-3xl`, hero `text-4xl sm:text-5xl`) | Sans semibold / Serif | Page anchors |
| Section | 21–26 (`text-xl md:text-2xl`) | Sans semibold, tight tracking | `SectionTitle` |
| Card title | 15–17 (`text-[15px]`, `text-base`) | Sans semibold | `SectionHeader`, card headers |
| Body | 14–16 (`text-sm`, `text-[15px]`) | Sans regular | Descriptions, helper text |
| Metadata | 12–13 (`text-xs`, `text-[11px]`) | Sans / mono uppercase | Labels, eyebrows, captions |

**Eyebrow** — the `.eyebrow` utility: 11px mono, 600 weight, `0.14em` tracking,
uppercase, `--color-faint`. Used for section labels and metric labels.

---

## 4. Spacing & layout

Base scale is Tailwind's 4px rhythm, aliased in tokens (`--space-1` … `--space-24`,
i.e. 4 → 96px). Comfortable whitespace is part of the editorial voice — when in
doubt, add air, not borders.

**Content widths:**

| Context | Max width |
|---|---|
| Default content | `1440px` (`max-w-[1440px]`) |
| Data-dense screens (tables, lab) | `1520px` |
| Editorial / prose surfaces | `1200px` (`max-w-prose` for body copy) |

**Card philosophy — cards are NOT the default container.** Structure comes from
hairline rules, full-bleed bands, and quiet surface shifts. Reach for a `Card` only
when the content is one of:

1. a **contained interaction** (a form panel, a settings group),
2. a **metric group** that must read as one object,
3. a **decision** the practitioner is being asked to make,
4. a **preview** (report cover, client summary).

Asymmetric layouts are encouraged: a wide narrative column beside a narrow numeric
rail reads better than a grid of equal tiles. Relatedly, `.grid-motif` bands and
full-width hairline dividers break up long pages without boxing everything.

---

## 5. Shape & depth

**Radii** — quiet, not bubbly: `--radius-xs` 4 · `--radius-sm` 6 · `--radius-md` 10
· `--radius-lg` 14 · `--radius-xl` 20. Buttons and inputs use 6–10; cards 10–14;
large hero panels up to 20.

**Depth — hairlines first, shadows rarely.** A 1px `--color-border` hairline carries
most structure. The shadow scale exists for elevation, not decoration:

| Token | Value (light) | Use |
|---|---|---|
| `--shadow-card` | `0 1px 2px rgba(32,35,31,0.05)` | resting cards |
| `--shadow-card-hover` | `0 4px 14px -4px rgba(32,35,31,0.08)` | interactive hover |
| `--shadow-elevated` | `0 10px 28px -10px rgba(32,35,31,0.12)` | raised panels |
| `--shadow-popover` | `0 20px 48px -12px rgba(32,35,31,0.22)` | **floating layers only** — drawers, dialogs, tooltips, toasts |

Never stack a card's hairline border *and* a heavy shadow; pick the quieter one.

---

## 6. Motifs

- **`.grid-motif`** — 32px graph-paper grid in `--color-border-subtle` (dark: moss at
  6% alpha). The brand signature. Used *extremely quietly*: contained bands inside
  empty states and hero edges, never behind dense data. The `EmptyState` primitive
  fades it out top-down so it never fights content.
- **`.hero-gradient`** — two soft radial washes (moss top-left, brass bottom-right)
  over `--color-surface`. Selective by design: dashboard hero, empty states, report
  covers. Not on forms, not on tables, not on every page header.
- **`.hero-gradient-dark-panel`** — dark variant for deep hero panels.
- **`.glass-card` / `.glass-header`** — frosted floating panels (`backdrop-blur`)
  for overlays and sticky headers.
- **No rainbow gradients. No background imagery behind data.** Charts sit on the
  plainest surface available.

---

## 7. Components

One entry per primitive in `src/components/ui/`. Props listed are the public API.

### Actions

**`Button`** — `variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'`,
`size: 'sm' | 'md' | 'lg'`. Primary is moss on white text; secondary is raised
surface with hairline; outline strengthens on hover; ghost for low-emphasis tool
actions; danger uses negative-soft and is for destructive confirmation only.
Subtle `active:scale-[0.98]` press feedback.

**`SegmentedControl`** — `options: { value, label, icon? }[]`, `value`, `onChange`,
`ariaLabel`. Renders `role="radiogroup"`; full left/right arrow-key cycling; only the
active option is in the tab order.

**`ThemeToggle`** — `variant: 'segmented' | 'icon'`. Segmented shows Light / Dark /
System; icon cycles on click. Reads/writes `useTheme`.

### Status & feedback

**`StatusBadge`** — `status` — 16 statuses: `on-track`, `needs-review`, `at-risk`,
`incomplete`, `stale`, `saved`, `saving` (spinner icon), `error`, `draft`, `review`,
`approved`, `archived`, `not-started`, `in-progress`, `ready-for-review` (brass —
the one brass status), `active` (moss). Icon + label, never color alone.

**`Badge`** — `tone: 'positive' | 'warning' | 'negative' | 'info' | 'neutral' |
'accent' | 'brass'`, `dot` (default true), plus legacy `variant` names mapped onto
tones. Mono uppercase micro-label.

**`Alert`** — `variant: 'info' | 'success' | 'warning' | 'danger'`, optional `icon`
override. Soft-tinted surface, tinted icon, sentence-case body copy.

**`SaveIndicator`** — `status: 'idle' | 'saving' | 'saved' | 'error'`. Renders nothing
when idle. Labels: "Saving…", "Saved just now", "Changes not saved". `role="status"`,
`aria-live="polite"`.

**`ProgressBar`** — `value`, `max` (100), `label`, `showValue`. Moss fill; turns
positive green at 100%. Proper `role="progressbar"` semantics.

**`ConfirmDialog`** — `open`, `onConfirm`, `onCancel`, `title`, `description?,
confirmLabel?` (default "Confirm"), `danger?`. `role="alertdialog"`, Escape cancels,
cancel button receives initial focus; non-danger confirms auto-focus. Danger adds the
warning icon well and uses the danger button.

**`Tooltip`** — `content`, `side: 'top' | 'bottom'`. CSS-only: appears on hover and
keyboard focus. Raised surface, popover shadow.
**`InfoTip`** — `content`, `side?`. The "?" affordance built on `Tooltip` for
plain-language explanations of terms.

### Metrics

**`FinancialMetric`** — `label`, `value: number | string | null`, `prefix?`, `suffix?`,
`delta?`, `deltaLabel?`, `hint?`, `size: 'sm' | 'md' | 'lg' | 'hero'`. **The `—`
null convention:** when `value` is `null`/`undefined` it renders a faint em-dash —
never a fabricated zero, placeholder, or fake figure. `hero` uses `.num-hero`
(Instrument Serif tabular). Numbers are en-IN formatted.

**`MetricCard`** — `label`, `value` (string), `subtext?`, `delta?` (signed, rendered
▲/▼), `variant: 'default' | 'navy' | 'gold' | 'success' | 'danger'`, `icon?`.

### Surfaces & structure

**`Card`** — `variant: 'default' | 'elevated' | 'navy' | 'gold' | 'subtle'`. Default
is raised + hairline + card shadow; `navy` is a sunken ink panel; `gold` uses
brass-soft. Reach for it per the card philosophy in §4.

**`PageHeader`** — `eyebrow?`, `title`, `description?`, `actions?`,
`variant: 'standard' | 'hero' | 'compact'`. Standard renders the hairline rule under
the header; hero sets the title in Instrument Serif.

**`SectionHeader`** — `title`, `description?`, `action?`, `hairline?`. Compact
15px header for inside-page groups.
**`SectionTitle`** — `title`, `subtitle?`, `eyebrow?` (legacy `badge?` deprecated),
`action?`. Larger section anchor with hairline.

**`EmptyState`** — `eyebrow?`, `title`, `description?`, `action?`, `icon?`,
`display?`. Renders a quiet grid-motif band at the top. `display` switches the title
to Instrument Serif for hero moments.

### Inputs

**`Input`** — `label?`, `suffix?`, `helper?`, `error?` (sentence-case; renders in
negative tone), plus native input props.

**`CurrencyInput`** — `label?`, `value`, `onChange`, `min?` (0), `max?`, `step?`
(1000), `helper?`, `error?`, `presets?: { label, value }[]`, `disabled?`. Fixed ₹
prefix, en-IN grouping on blur, ↑/↓ arrow adjustment by step, hover stepper buttons,
preset chips. **Zero renders as a real "0", never a fake placeholder.**

**`EnhancedNumberInput` / `NumberInput`** — `NumberInput` is the preferred wrapper
around `EnhancedNumberInput`. Adds `prefix?` / `suffix?` (suffix renders as a sunken
chip), decimals to 2 places, same stepper/preset/error conventions as `CurrencyInput`.

**`Select`** — `label?`, `value`, `onChange`, `options: { value, label }[]`, `helper?`,
`disabled?`. Native select with chevron; options carry surface tokens.

**`Slider`** — `label`, `value`, `onChange`, `min?`, `max?`, `step?`, `suffix?` ('%'),
`formatValue?`. Thin-track range with a small solid ink thumb (global base styles).

### Navigation & overlay

**`Tabs`** — `tabs: { id, label, icon? }[]`, `active`, `onChange`, `ariaLabel?`.
Hairline underline tabs; active tab gets a 2px moss underline (not a pill) and an
accent icon.

**`Drawer`** — `open`, `onClose`, `title?`, `width?` (480, clamped 420–640),
`side: 'left' | 'right'`. `role="dialog"`, Escape closes, body scroll locked, sticky
header with close button.

**`Avatar`** — `name`, `id?`, `size: 'sm' | 'md' | 'lg'`. Deterministic token-safe
tone picked by hashing `id || name`; mono initials, `aria-label` = full name.

---

## 8. Charts

All charts consume `getChartTheme()` from `src/lib/chartTheme.ts`. The contract:

```ts
interface ChartTheme {
  axis: string;        // var(--color-faint)   — ticks
  axisLabel: string;   // var(--color-muted)   — axis labels
  grid: string;        // var(--color-border-subtle)
  primary: string;     // var(--color-accent)  — moss, primary series
  primaryFill: string; // var(--color-accent)  — soft area fill at low opacity
  secondary: string;   // var(--color-brass)
  reference: string;   // var(--color-brass)   — dashed target/benchmark lines
  positive: string;    // var(--color-positive)
  negative: string;    // var(--color-negative)
  muted: string;      // var(--color-border-strong) — extra series
  tooltipBg: string;   // var(--color-raised)
  tooltipBorder: string; // var(--color-border)
  tooltipText: string; // var(--color-ink)
}
```

Rules:

- Values are **CSS custom-property references**, not hex — recharts passes them to SVG
  and the browser resolves per theme, so light/dark switching is automatic. Never
  hard-code a chart color.
- **Moss is the primary series; brass is the reference.** Required corpus, targets,
  and benchmarks render as brass `strokeDasharray` dashed lines. The primary series
  always carries the strongest contrast; further series degrade through muted/soft
  fills before any new hue is introduced.
- Lines are thin (1.5–2px) with soft, low-opacity fills. No 3D, no gradients across
  data, no gridline heavier than `--color-border-subtle`.
- Tooltip surface = the `raised` token with a hairline border and popover shadow.
- A series showing a *problem* (e.g. corpus depletion) may use `--color-negative`;
  a favorable comparison may use `--color-positive`. Status colors never decorate
  neutral data.

---

## 9. States

**Zero-state philosophy.** A blank workspace is a legitimate, dignified state — not
an error and never an opportunity to show off demo numbers.

- All financial defaults are **0 / empty**. There is no seeded client, no sample
  portfolio shipped as the default.
- Helpers in `src/lib/planState.ts` formalize this: `isProfileConfigured`,
  `hasFinancialData`, `isPlanEmpty`, and `planStatus` (`not-started | in-progress |
  ready-for-review`).
- Uncomputed values render as **`—` / "Not configured"** — via `guardNumber` and
  `formatOrDash`, and the `FinancialMetric` null convention. **Never** display a fake
  health score, placeholder probability, or invented corpus.
- **Loading** — skeleton blocks use the sunken surface with a quiet 1.8s opacity
  shimmer (`.animate-shimmer`), shaped to match the real layout so content doesn't
  jump on arrival.
- **Stale / warning** is amber (`--color-warning`), with an icon — used for outdated
  market data, drifting allocations, incomplete profiles.
- **Error copy is human.** Say what happened and what to do: *"We couldn't save that
  change."* with a **Retry** action — not "Error 422: persistence failure."
- **Success copy is short.** "Saved." "Client created." Nothing more.

---

## 10. Theming

- Modes: **light / dark / system**, persisted in `localStorage` under
  `'soundthesis_theme'`; system follows `prefers-color-scheme` live
  (`src/lib/theme.tsx`).
- `ThemeProvider` exposes `theme` (preference), `resolved` ('light' | 'dark'), and
  `setTheme`. The `.dark` class lands on `<html>`; `color-scheme` is kept in sync and
  the `theme-color` meta tag tracks the resolved canvas.
- **FOUC bootstrap**: an inline script in `index.html` reads the stored preference
  (defaulting to system) and applies `.dark` before first paint, so there is no
  flash of the wrong theme.
- **Dark mode is a private study, not neon** — the same tokens at quieter values:
  warm near-black canvas, desaturated moss/brass, hairlines that read as low lamplight.
  Every component token is redefined for dark in `.dark`; nothing falls through to a
  light-only value.
- `prefers-contrast: more` strengthens borders and flattens glass surfaces; print
  forces flat ink-on-paper regardless of the active theme.

---

## 11. Motion

Motion is a garnish, never a meal.

- Durations: `--duration-fast` 140ms (hovers, toggles), `--duration-normal` 220ms
  (drawers, reveals). Nothing longer than ~300ms except skeleton shimmer.
- Easing: `--ease-standard` `cubic-bezier(0.16,1,0.3,1)` for entrances and layout;
  `--ease-emphasis` `cubic-bezier(0.22,1,0.36,1)` for hero moments.
- Signature move: **fade + slight translate** (8px on toasts, full slide on drawers).
- Number interpolation on hero figures is **debounced** — values settle once per
  computation batch; they never tick like a slot machine while the user drags a slider.
- `prefers-reduced-motion: reduce` collapses all animation and transition durations
  to near-zero globally (including shimmer and drawer slides).

---

## 12. Accessibility

WCAG 2.2 AA is the intent across the product.

- **Focus is always visible**: a global 2px moss `focus-visible` ring with 2px offset
  on every interactive element. Never remove it without a replacement.
- **Skip link** — `.skip-to-content` is the first focusable element in `Layout`.
- Active navigation sets `aria-current="page"` (renders the 2px moss rail in the
  sidebar); tabs, radios, progress bars, dialogs and alerts all use correct ARIA
  roles (`role="tablist"`, `radiogroup`, `progressbar`, `dialog`/`alertdialog`,
  `role="alert"`).
- **Keyboard**: Escape closes drawers and dialogs; arrow keys cycle `SegmentedControl`
  and adjust number inputs; Enter commits an input's edit. Active segmented options
  and tabs are the only tab stops in their groups.
- **Never color alone** for status (see §2) — icon + label accompany every tint.
- Contrast pairs that ship in the system: `ink` on `canvas/surface/raised` (~13–16:1
  light), `ink` on `accent-soft`/`brass-soft` status tints, `white` on `accent`
  (≥ 4.5:1 light, ~5.5:1 dark), `accent-strong` on `accent-soft`. `muted` is for
  large/secondary text only, never for critical figures.

---

## 13. Responsive

| Band | Range | Behavior |
|---|---|---|
| Mobile | < 640px | Single column; **tables collapse to summary cards**; navigation moves to a drawer + bottom nav; numeric rails stack |
| Tablet | 640–1024px | Two-column where useful; drawers over split panes |
| Desktop | 1024–1440px | Full layout; sidebar persistent |
| Wide | > 1440px | Content caps at the widths in §4; whitespace absorbs the rest |

Data density increases with width, but type sizes do not shrink below the scale in §3.

---

## 14. Copy tone

The voice is a calm, senior practitioner: precise, plain, complete sentences. We
explain *why*, then we say *what next*.

- **Button verbs name the object and the action**: *Create client · Save scenario ·
  Generate report · Rebalance portfolio.* Never *Submit*, *Execute*, *OK*, *Proceed*.
- **Form labels**: explanatory forms (IPS, client onboarding) use sentence-case
  labels that read as questions or statements ("When would you like to retire?");
  dense screens use concise uppercase field labels ("Retirement age").
- **Helper text pattern** — lead with the guidance, keep it to one or two lines:
  *"We use this to estimate your post-retirement monthly need."*
- **Errors** state the problem in human terms and offer recovery (see §9).
- **Empty states** describe the outcome of acting, not the mechanics: *"Add your
  client's assets to see their full balance sheet."*
- **No jargon walls.** Terms of art (SWP, glide path, Monte Carlo) get an `InfoTip`
  explanation in plain language on first use.
