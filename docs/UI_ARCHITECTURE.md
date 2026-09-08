# UI Architecture — Sound Thesis Design System

The visual foundation for the wealth-practitioner platform. Implements the
master-spec design law: §103–106 (command palette, responsive tables),
§107–116 (design system, formatting, chart system, accessibility),
§117–122 (empty/loading/error/autosave/guard states), §229–235 (information
hierarchy, color semantics, dark mode, print UX).

## 1. Tokens

Runtime values live in `src/index.css` (`@theme` + `.dark` override block).
Typed mirrors for non-CSS consumers (charts, canvas, export) live in
`src/lib/design-tokens.ts` — **keep the two in sync**.

| Token | Light | Dark (.dark) | Use |
|---|---|---|---|
| `background` | `#F7F8FA` | `#0B1220` (midnight) | App canvas |
| `surface` | `#FFFFFF` | `#101A2E` (navy) | Cards, panels |
| `sunken` | `#F1F3F6` | `#080D18` | Wells, tab tracks, skeletons |
| `raised` | `#FFFFFF` | `#16223A` | Elevated inputs |
| `border` / `border-strong` | `#E4E7EC` / `#D0D5DD` | `#1E2A44` / `#2C3C5E` | Hairlines |
| `ink` / `ink-soft` | `#344054` / `#475467` | `#F2F5F9` / `#C9D1DD` | Primary text |
| `muted` / `faint` | `#667085` / `#98A2B3` | `#8B95A5` / `#66707F` | Secondary text |
| `accent` | `#0E9F6E` (emerald) | `#34D399` (muted emerald) | Brand primary |
| `accent-strong` | `#087F5B` | `#6EE7B7` | Hover / emphasis |
| `accent-soft` | `#E7F7F0` (soft mint) | `rgba(52,211,153,.12)` | Selected washes |
| `champagne` | `#C9A86A` | `#C9A86A` | Premium accents only |
| `positive` / `negative` | `#12805C` / `#D64545` | `#4ADE80` / `#FB7185` | §233 semantics |
| `warning` / `info` | `#D99000` / `#3978E8` | `#FBBF24` / `#7DD3FC` | §233 semantics |
| `focus-ring` | `#0E9F6E` | `#34D399` | Global focus-visible ring |

- **Radius** (§111): Tailwind scale kept at defaults; cards `rounded-2xl`
  (16px default), inputs/buttons `rounded-xl` (12px), wells `rounded-lg`.
- **Shadows** (§112): border-only by default; `shadow-card-hover`,
  `shadow-elevated`, `shadow-popover` reserved for dropdowns, modals,
  drawers, floating panels.
- **Spacing** (§110): Tailwind's 4-pt scale (`4 8 12 16 20 24 32 40 48 64`).
- **Type** (§109): Onest (Inter-class, loaded in index.html) · Cormorant
  Garamond display · JetBrains Mono. Scale: page 32–36 · section 20–24 ·
  body 14–16 · metadata 11–13 (micro-labels uppercase + tracking).

### Dark mode

Class strategy: `@custom-variant dark` — add `.dark` to `<html>` (or any
ancestor). The `.dark` block in `index.css` flips every semantic token,
the neutral/status Tailwind scales (inverted zinc/slate/white, which the
legacy pages rely on), and the shadow set. Nothing needs `dark:` variants
for the base surfaces, but all new components ship `dark:`-safe styling
via tokens. Charts auto-detect via `useChartTheme()` (MutationObserver on
`<html class>`). **Legacy aliases** (`cream`, `paper`, `warm`, `navy`,
`gold`, `red`, `emerald`, `textMain`, `textMuted`) remain wired so existing
pages keep compiling and rendering.

## 2. Component inventory

Public API: `src/components/ui/index.ts`. All components are typed,
forwardRef where the underlying element is interactive, and built with
`cn()` (`clsx` + `tailwind-merge`).

### Primitives
```tsx
import { Button, Input, Select, Textarea, Field } from '../components/ui';

<Button variant="primary | secondary | outline | ghost | danger"
        size="sm | md | lg" loading loadingText="Saving…">Save</Button>

// Field wires label/hint/error + aria automatically:
<Field label="Monthly SIP" hint="Includes step-ups" error={errors.sip}>
  {(props) => <Input {...props} inputMode="numeric" />}
</Field>
```
- `Input`, `NumberInput` / `EnhancedNumberInput`, `CurrencyInput` —
  locale-aware `en-IN` formatting on blur (₹85,000), presets, error states.
- `Select` (native-styled), `Slider`, `Textarea`, `Tabs`.

### Surfaces & structure
- `Card` (variants: default/elevated/navy/gold/subtle), `SectionCard`
  (title + description + action header, `flush` for tables),
  `PageHeader` (§230 hierarchy: title → subtitle → actions), `SectionTitle`.

### Metrics & data display
- `StatCard` — **primary metric treatment (§229)**: one dominant tabular
  number, `secondary` figures visually subordinated, optional trend chip.
  Use `size="hero"` for dashboard/client-header metrics. Never stack six.
- `MetricCard` — secondary KPI grid cards.
- `Badge`, `Tag` (practice-configurable §246, removable), `StatusPill`
  (§232 language: on-track / needs-review / at-risk / stale /
  awaiting-input / complete), `ProgressBar` (role=progressbar),
  `Sparkline` (inline SVG, `label` required), `Kbd`, `Table`.

### Feedback & states
- `Skeleton`, `SkeletonText`, `SkeletonTableRows` (§118 — never blank).
- `EmptyState` (§117: title + why + action slot), `ErrorState` (§119:
  human message + Try again), `Alert`, `AutosaveIndicator` (§120:
  `saving/saved/error` + Retry), `ConfirmDialog` (§121 guard).

### Overlays
`Modal` (focus trap + restore, ESC, `role=dialog`), `Drawer` (right/left),
`Popover` (anchored floating panel), `Tooltip` (CSS, hover + focus-within),
`DropdownMenu` (menu role, shortcut chips), `ConfirmDialog`.

### Toast
```tsx
<ToastProvider>            {/* once, near root */}
const toast = useToast();
toast.success('Plan saved', { description: 'Retirement · Raj Sharma' });
toast.error("Couldn't save this plan", { description: 'Your previous saved version is safe.' });
```
Fixed bottom-right stack, `role=alert` for errors / `role=status` otherwise,
framer-motion layout animations, auto-dismiss (errors linger).

### Command palette (§103/§122/§198)
```tsx
const [open, setOpen] = useState(false);
<CommandPalette
  open={open} onClose={() => setOpen(false)} onOpenChange={setOpen}
  items={[
    { id: 'c-1', group: 'Clients', label: 'Raj Sharma',
      hint: '₹6.84 Cr · 82% health · Retirement 2033',
      keywords: 'raj sharma retirement 2033', onSelect: () => nav('/clients/1') },
    { id: 'a-1', group: 'Actions', label: 'Create client', shortcut: 'N',
      onSelect: () => nav('/clients/new') },
  ]}
/>
```
⌘K/Ctrl-K opens globally; subsequence fuzzy ranking (`fuzzyScore` exported
for reuse); ↑/↓/↵/ESC; grouped results with hint lines and `Kbd` shortcut
chips.

## 3. Charts (`src/components/ui/charts/`)

One contract (§115): ResponsiveContainer · accessible summary · consistent
axes (mono 11px, `formatAxisINR` → `2 Cr / 50 L / 10K`) · shared
`ChartTooltip` (compact INR) · theme palette, never ad-hoc hexes ·
`ChartFigure` wrapper gives every important chart a title, textual summary
and "View data table" toggle (§242).

| Component | Use |
|---|---|
| `AreaFanChart` | Monte Carlo percentiles (§81): translucent P10–P90 / P25–P75 bands, dominant P50 line, Today/Retirement/Life-expectancy reference lines |
| `DonutAllocation` | Asset-class allocation donut with % + ₹ legend, center total |
| `ComparisonBars` | What-if scenario comparison with value labels (§82) |
| `NetWorthArea` | Net worth vs cumulative invested — the gap is growth |

All accept `mode?: 'light' | 'dark'` (default: auto-detect), formatters,
and `title` + `summary` (required, for a11y). Chart animations disable
under `prefers-reduced-motion`.

## 4. Motion vocabulary

- Micro-interactions 100–180ms, `cubic-bezier(0.16, 1, 0.3, 1)` (tokens in
  `design-tokens.ts → tokens.motion`).
- Number transitions (StatCard), chart entrances, drawer/modal/palette
  entrances via framer-motion; every motion component reads
  `useReducedMotion()`.
- Global kill-switch: `prefers-reduced-motion` media query in index.css.

## 5. Accessibility checklist (§116, WCAG 2.2 AA)

- Global 2px `focus-visible` ring on all interactive elements.
- `Modal`/`Drawer`/`CommandPalette`: dialog roles, ESC, focus management.
- `ProgressBar` role + aria values; `StatusPill` role=status; toasts
  alert/status roles; form errors via `role=alert` + `aria-describedby`
  (`Field`, `Input`, `Textarea`).
- Charts: `role=img` + `aria-label`, sr-only figcaption, data-table toggle.
- Status is never color-alone (dot + text) per §233.
- Skip-to-content link, `prefers-contrast: more` support, print styles.

## 6. Print UX (§235)

`@media print` in index.css: forces the light paper palette (even in dark
mode), hides `aside/header/footer/nav/.no-print`, strips shadows/animations,
print-friendly type stack, `@page` A4 margins, `.page-break` / `.avoid-break`
/ `.print-keep` utilities. Reports should use these utilities and the
`.no-print` class on interactive chrome.

## 7. Financial number formatting (§114)

Centralized in `src/lib/design-tokens.ts`:

```ts
formatINR(85000)          // '₹85,000'        (Indian grouping)
formatCompactINR(4.86e7)  // '₹4.86 Cr'       (lakh/crore intelligent)
formatCompactINR(1.5e5)   // '₹1.5 L'
formatPercent(82.44)      // '82.4%'
formatDelta(4.6e6)        // '+₹46 L'         (signed)
formatDate(new Date())    // '3 Sep 2026'
parseINRInput('₹1,25,000') // 125000
```

(Existing `src/lib/formatters.ts` remains for legacy pages; new code
should use the design-tokens versions above.)

## 8. Do / Don't

- **Do** use `PageHeader` + `SectionCard` for every new page.
- **Do** put the key decision metric in one `StatCard` (hero), supporting
  numbers beneath (§229–230).
- **Don't** stack six equally-weighted KPI cards.
- **Don't** hard-code colors — use tokens or `theme.series` in charts.
- **Don't** use green/red as the only signal (§233).
- **Don't** add `dark:` overrides for surfaces — tokens flip automatically;
  reserve `dark:` for one-off accents.
