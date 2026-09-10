# UI Audit — SOUND THESIS Redesign ("Editorial Financial Intelligence")

A concise record of what the redesign replaced, where it lives now, and what visual
debt remains. Scope: the token system, composition model, navigation chrome, data
defaults, charts, command surface, and theming. Audited 2026-09-10 against
`src/index.css`, `src/components/`, `src/lib/`, and the legacy reference in
`legacy/calculators.html`.

---

## 1. Legacy emerald-on-white token system → semantic moss/parchment tokens

**What it was.** The codebase grew out of `legacy/calculators.html` (Alpine.js +
CDN Tailwind), whose palette was cream `#F4F1EA` / navy `#1A233A` / gold `#B68B40`
with emerald greens on white cards, spread later as ad-hoc Tailwind classes
(`bg-emerald-50`, `text-emerald-700`, `border-emerald-200/60`) across layout chrome.
There was no single definition of "a color" — the same surface was `#F4F1EA` in one
file and `bg-white` in another.

**What replaced it.** A fully semantic token layer: warm parchment canvas
(`--color-canvas #F4F2ED`), moss accent (`--color-accent #667A63`), brass reference
accent (`--color-brass #B3945A`), a five-step ink scale, warm hairline borders, and a
matching dark set — all defined once in `src/index.css` under `@theme` / `.dark`.
Legacy names (`--color-cream`, `--color-navy`, `--color-gold`, `--color-red`,
`--color-emerald`, `--color-textMain`…) survive only as **aliases mapped onto the new
vocabulary** (`src/index.css:59-70`) so older component code resolves to correct
values.

**Where.** `src/index.css`; legacy reference `legacy/calculators.html`.

## 2. Card-everything composition → hairlines, bands, and card discipline

**What it was.** The legacy page and early React screens wrapped every metric, every
form group, and every chart in an identical rounded white card (`bg-white p-6
shadow-sm border border-gray-100 rounded-xl`). The result was a wall of identical
boxes with no hierarchy — a generic SaaS dashboard.

**What replaced it.** A composition model where structure comes from 1px hairline
rules, full-bleed bands, quiet surface shifts (canvas → surface → sunken), and the
`.grid-motif` / `.hero-gradient` motifs. `Card` survives but is reserved for four
cases: contained interaction, metric group, decision, preview (documented in
`docs/UI_SYSTEM.md` §4). Page and section anchors now come from `PageHeader` /
`SectionTitle` / `SectionHeader` primitives with hairlines instead of boxes.

**Where.** `src/index.css` (motif & hairline utilities, `@layer utilities`),
`src/components/ui/Card.tsx`, `src/components/ui/PageHeader.tsx`,
`src/components/ui/SectionTitle.tsx`, `src/components/ui/SectionHeader.tsx`.

## 3. Sidebar workflow-percentage gamification → completion signals

**What it was.** The sidebar computed a 5-step "Workflow Progress" percentage with an
animated bar, a pulsing dot, and step badges — turning a professional planning
journey into a progress quest. Nav links used heavy rounded pill styling with
gradient brand decoration.

**What replaced it.** A restrained navigation model: step chips (`01`–`05`) mark the
core journey, a quiet `Check` marks genuinely completed stages, and the active page
is indicated by a 2px moss rail driven by `aria-current="page"` (`src/index.css:350-363`)
— an accessibility hook doing visual work. The percentage bar and pulsing gamification
were dropped; plan readiness is now expressed semantically via `planStatus()`
(`not-started | in-progress | ready-for-review`) and `StatusBadge`.

**Where.** `src/components/layout/Sidebar.tsx` (current chrome is being reworked on
`ui-rebuild`), `src/lib/planState.ts`, `src/index.css`.

## 4. Demo-data-as-defaults → true zero state

**What it was.** The calculator context seeded plausible demo figures on first load,
so every screen showed a healthy-looking plan before the practitioner entered
anything — fake health by default.

**What replaced it.** All financial defaults are 0/empty. `src/lib/planState.ts`
formalizes the distinction: `isProfileConfigured`, `hasFinancialData`, `isPlanEmpty`,
and `planStatus`. Uncomputed values render as `—` ("Not configured") via
`guardNumber` / `formatOrDash` and the `FinancialMetric` null convention; loading
states are skeletons, never invented numbers. `EmptyState` with its quiet grid-motif
band is the canonical blank-workspace surface.

**Where.** `src/lib/planState.ts`, `src/components/ui/FinancialMetric.tsx`,
`src/components/ui/EmptyState.tsx`, `src/context/CalculatorContext.tsx`.

## 5. Hard-coded hex chart colors → token-driven chart theme

**What it was.** Charts carried inline hex literals per chart (emerald `#10B981`-family
greens, golds, slate greys), so each chart had its own palette and none of them
followed theme switching.

**What replaced it.** A single contract, `getChartTheme()` in `src/lib/chartTheme.ts`,
returning `var(--token-*)` references that the browser resolves per theme in SVG.
Moss is the primary series, brass is the dashed reference (targets/benchmarks),
status colors are reserved for genuine positive/negative meaning, and the tooltip
surface is the `raised` token with a hairline border.

**Where.** `src/lib/chartTheme.ts`; residual literals noted in §9 below.

## 6. No command surface → (structural gap)

**What it was.** The legacy single-page app had none, and the React rebuild carried
no keyboard-driven navigation or command palette — every action required finding the
right sidebar item by eye.

**What replaced it.** A global command palette (`src/components/layout/CommandPalette.tsx`)
opened with ⌘K / Ctrl+K: fuzzy navigation across all sections, saved-plan loading,
and workspace actions (load demo, reset, theme switching) with full keyboard
navigation (arrows/Enter/Esc), mounted from `TopBar`. Focus management and
Escape/arrow keyboard handling are also standardized across `Drawer`,
`ConfirmDialog`, `SegmentedControl`, and `Tabs`, and a skip link is the first
focusable element in `Layout`.

**Where.** `src/components/layout/CommandPalette.tsx`,
`src/components/layout/navItems.ts`, `src/components/layout/Sidebar.tsx`,
`src/components/ui/Drawer.tsx`, `src/components/ui/ConfirmDialog.tsx`,
`src/index.css` (`.skip-to-content`).

## 7. Single theme with a couple of dark overrides → first-class dual theme

**What it was.** The app was designed light-only; dark mode, where it existed at all,
was a handful of one-off overrides that left borders, shadows, and status tints
unreadable.

**What replaced it.** Every token is redefined in `.dark` (`src/index.css:124-171`)
with matching hairlines, shadows, status tints, and focus ring; the intent is "a
private study, not neon." `ThemeProvider` (`src/lib/theme.tsx`) manages
light/dark/system with live system tracking, persists to `localStorage`
(`'soundthesis_theme'`), syncs `color-scheme` and the `theme-color` meta, and an
inline bootstrap in `index.html` applies the class before first paint (no FOUC).
`prefers-contrast: more` and a full print stylesheet are also covered.

**Where.** `src/lib/theme.tsx`, `src/index.css`, `index.html`,
`src/components/ui/ThemeToggle.tsx`.

---

## 8. What the redesign deliberately kept

- The en-IN currency formatting and Indian-market domain conventions (lakh/crore
  grouping) — now centralized in formatters and `CurrencyInput`.
- The five-step advisory journey (`01 Discover → 05 Deliverables`) — kept as
  navigation structure, minus the gamified progress bar.
- Legacy token **aliases** remain in `src/index.css` so untouched older components
  still resolve; they are migration shims, not a second palette.

## 9. Known remaining visual debt

Honest list — these are not yet resolved:

1. **Hard-coded hex persists in five pages** despite the chart-theme contract:
   `src/pages/Dashboard.tsx`, `src/pages/RiskQuestionnaire.tsx` (6 literals),
   `src/pages/GoalPlanner.tsx` (9), `src/pages/Reports.tsx`, `src/pages/Dossier.tsx`.
   These should migrate to `getChartTheme()` / tokens.
2. ~~**No command palette.**~~ Resolved — ⌘K palette shipped (see §6).
3. ~~**Layout chrome is mid-rebuild.**~~ Resolved — `Sidebar.tsx` / `TopBar.tsx` were
   rebuilt on `ui-rebuild` (sectioned rail with collapse persistence, quiet glass
   topbar with ⌘K, theme toggle and profile menu).
4. **Legacy `variant` names** (`Card` `navy|gold`, `MetricCard` variants, `Badge`
   `variant`) survive alongside the new `tone` vocabulary — a documented dual API
   that should converge on tones.
5. **Warm-neutral Tailwind overrides** (`--color-emerald-500`, `--color-rose-500`,
   `--color-amber-500` remapped to moss/brick/warm values in `src/index.css:111-120`)
   keep legacy utility classes looking right, but they mean `emerald-500` in code is
   secretly moss — a trap for new contributors.
6. **Mobile table→summary-card collapse** is specified and partially implemented;
   several dense screens still scroll horizontally on <640px.
7. **Charts in the five pages above** also vary in line weights and grid treatment;
   a shared chart-composition primitive (axis defaults, tooltip component) would
   finish the job `getChartTheme()` started.
