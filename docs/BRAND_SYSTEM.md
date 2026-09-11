# Sound Thesis — Brand System

Sound Thesis is a wealth-practitioner workspace built around one promise: **a clearer view of wealth**.

## Identity

The visual concept is **Editorial Financial Intelligence**: the restraint of a private wealth report, the information density of a research terminal, and the usability of modern software. The product should communicate clarity, confidence, continuity, context and precision.

The mark is an ascending thesis: two measured bars establish a baseline and a higher point, with a small brass reference marker. It is rendered as a token-driven SVG so the same mark works in light and dark themes.

## Palette

The semantic tokens in `src/index.css` are the source of truth. Light mode uses warm parchment, primary ink, moss action color and brass reference color. Dark mode is a private study: layered near-black greens, warm white text, moss highlights and brass references. Product code should use semantic utilities (`bg-surface`, `text-ink`, `border-border`, `text-accent-strong`) rather than raw hex values.

Brass marks a target, benchmark or reference. It is not an action color. Negative is reserved for real problems; status always includes a label or icon in addition to color.

## Type

- Inter: interface and body copy.
- Instrument Serif: display moments only — hero titles, empty-state anchors and signature numbers.
- JetBrains Mono: tabular financial figures, dates, scores and compact metadata.

The type system is deliberately quiet. Numbers are read before decoration; whitespace and hairlines create hierarchy.

## Shape, depth and motif

Radii are restrained (4–20px). Hairline borders and surface shifts carry structure. Shadows are reserved for raised layers, dialogs and popovers. The graph-paper `.grid-motif` is used only on hero and empty-state surfaces, never behind dense charts.

## Usage checklist

- Use `PageHeader`, `SectionHeader`, `FinancialMetric`, `StatusBadge`, `Card` and `EmptyState` before introducing a new visual primitive.
- Keep financial defaults at `0` or empty; use `—` / “Not configured” for uncomputed results.
- Keep formulas and shared state in the existing calculation/context modules.
- Test every new surface in Light, Dark and System themes, at 360px and desktop widths.
