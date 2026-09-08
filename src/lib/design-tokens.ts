/**
 * Sound Thesis design tokens — typed mirror of src/index.css `@theme`.
 *
 * Single source of truth for the design system constants. The CSS file owns
 * the runtime values (so Tailwind utilities and CSS variables never drift);
 * this module exposes the same values to TypeScript for charts, canvas
 * rendering, PDF export and any non-CSS consumer.
 *
 * Spec: "Sound Thesis Wealth Planner" §107–116 (design system, number
 * formatting, chart system). Dark mode values follow §234 (midnight
 * background, soft white text, muted emerald primary).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Color tokens
// ─────────────────────────────────────────────────────────────────────────────

export const lightColors = {
  // Surfaces (layered: canvas → sunken → surface → raised)
  background: '#F7F8FA',
  surface: '#FFFFFF',
  raised: '#FFFFFF',
  sunken: '#F1F3F6',
  overlay: 'rgba(16, 24, 40, 0.48)',

  // Hairlines & borders
  border: '#E4E7EC',
  borderStrong: '#D0D5DD',

  // Ink (text) — TEXT / MUTED from the spec palette
  ink: '#344054',
  inkSoft: '#475467',
  muted: '#667085',
  faint: '#98A2B3',

  // Brand — PRIMARY EMERALD / PRIMARY DARK / SOFT MINT / CHAMPAGNE
  accent: '#0E9F6E',
  accentStrong: '#087F5B',
  accentSoft: '#E7F7F0',
  champagne: '#C9A86A',
  midnight: '#0B1220',
  navyDeep: '#101A2E',

  // Semantic status (§233: green positive, amber review, red concern, blue info)
  positive: '#12805C',
  negative: '#D64545',
  warning: '#D99000',
  info: '#3978E8',
} as const;

export const darkColors = {
  // §234 dark mode: midnight background, layered navy surfaces
  background: '#0B1220',
  surface: '#101A2E',
  raised: '#16223A',
  sunken: '#080D18',
  overlay: 'rgba(4, 8, 16, 0.72)',

  border: '#1E2A44',
  borderStrong: '#2C3C5E',

  // Soft white text
  ink: '#F2F5F9',
  inkSoft: '#C9D1DD',
  muted: '#8B95A5',
  faint: '#66707F',

  // Muted emerald primary
  accent: '#34D399',
  accentStrong: '#6EE7B7',
  accentSoft: 'rgba(52, 211, 153, 0.12)',
  champagne: '#C9A86A',
  midnight: '#0B1220',
  navyDeep: '#101A2E',

  positive: '#4ADE80',
  negative: '#FB7185',
  warning: '#FBBF24',
  info: '#7DD3FC',
} as const;

export type ThemeMode = 'light' | 'dark';

export const tokens = {
  colors: lightColors,

  /** Radius scale (§111): 8 / 12 / 16 / 20 / 24 px. Default cards: 16px. */
  radius: {
    sm: 8,
    md: 12,
    lg: 16, // default cards
    xl: 20,
    '2xl': 24,
  },

  /** Spacing rhythm (§110): 4 8 12 16 20 24 32 40 48 64 — matches Tailwind. */
  spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const,

  /** Type scale (§109): page 32–36 · section 20–24 · body 14–16 · meta 12–13. */
  fontSize: {
    page: [32, 36] as const,
    section: [20, 24] as const,
    body: [14, 16] as const,
    meta: [12, 13] as const,
  },

  /**
   * Font stacks. index.html loads Onest (geometric-humanist, Inter-class),
   * Cormorant Garamond (display serif) and JetBrains Mono; §109 prefers
   * Inter with optional Manrope display — Onest is the shipped equivalent.
   */
  fontFamily: {
    sans: '"Onest", "Inter", system-ui, -apple-system, sans-serif',
    serif: '"Cormorant Garamond", Georgia, serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },

  /**
   * Shadow scale (§112): default is border-only; elevation reserved for
   * dropdowns, modals, drawers and floating panels.
   */
  shadow: {
    card: '0 1px 2px rgba(16, 24, 40, 0.06)',
    cardHover: '0 4px 12px -2px rgba(16, 24, 40, 0.10)',
    elevated: '0 8px 24px -6px rgba(16, 24, 40, 0.16)',
    popover: '0 16px 40px -8px rgba(16, 24, 40, 0.24)',
  },

  /**
   * Motion vocabulary (§113): micro-interactions run 100–180ms with a
   * shared ease-out-expo curve; entrances may go longer but must respect
   * prefers-reduced-motion (enforced globally in index.css + MotionConfig).
   */
  motion: {
    durationFast: 100,
    durationBase: 150,
    durationSlow: 180,
    durationEnter: 240,
    easeOut: [0.16, 1, 0.3, 1] as const,
    easeInOut: [0.65, 0, 0.35, 1] as const,
  },

  /** z-index scale for layered UI. */
  zIndex: {
    sticky: 20,
    overlay: 40,
    drawer: 50,
    modal: 60,
    popover: 70,
    toast: 90,
    commandPalette: 100,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Chart system (§115) — one visual contract for every chart
// ─────────────────────────────────────────────────────────────────────────────

export interface ChartTheme {
  mode: ThemeMode;
  background: string;
  grid: string;
  axis: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  /** Ordered series palette — always use these, never ad-hoc hexes. */
  series: [string, string, string, string, string, string];
  bandFill: [string, string, string];
}

export const lightChartTheme: ChartTheme = {
  mode: 'light',
  background: lightColors.background,
  grid: lightColors.border,
  axis: lightColors.muted,
  tooltipBackground: '#FFFFFF',
  tooltipBorder: lightColors.border,
  tooltipText: lightColors.ink,
  series: ['#0E9F6E', '#3978E8', '#C9A86A', '#7C5CD6', '#D99000', '#667085'],
  bandFill: ['rgba(14,159,110,0.10)', 'rgba(14,159,110,0.22)', 'rgba(14,159,110,0.38)'],
};

export const darkChartTheme: ChartTheme = {
  mode: 'dark',
  background: darkColors.background,
  grid: darkColors.border,
  axis: darkColors.muted,
  tooltipBackground: '#16223A',
  tooltipBorder: darkColors.borderStrong,
  tooltipText: darkColors.ink,
  series: ['#34D399', '#7DD3FC', '#C9A86A', '#A5B4FC', '#FBBF24', '#8B95A5'],
  bandFill: ['rgba(52,211,153,0.10)', 'rgba(52,211,153,0.22)', 'rgba(52,211,153,0.36)'],
};

/** Resolve the active chart theme from the DOM (`.dark` on <html>). SSR-safe. */
export function getChartTheme(mode?: ThemeMode): ChartTheme {
  const resolved =
    mode ??
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light');
  return resolved === 'dark' ? darkChartTheme : lightChartTheme;
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial number formatting (§114) — centralized, locale-aware (en-IN)
// ─────────────────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function trimZeros(text: string): string {
  if (!text.includes('.')) return text;
  return text.replace(/0+$/, '').replace(/\.$/, '');
}

const isNil = (val: number | null | undefined): val is null | undefined =>
  val === null || val === undefined || Number.isNaN(val);

/** ₹85,000 — full Indian-grouped currency, no decimals. */
export function formatINR(val: number | null | undefined): string {
  if (isNil(val)) return '₹0';
  return inrFormatter.format(val);
}

/**
 * Intelligent lakh/crore compaction (§114):
 * ₹1,500 → ₹1,500 · ₹85,000 → ₹85,000 · ₹1.5 L · ₹46.2 L · ₹4.86 Cr
 * Crores and lakhs keep 2 significant decimals (3 for <10 Cr is avoided by
 * trimming), thousands stay ungrouped-by-magnitude.
 */
export function formatCompactINR(val: number | null | undefined): string {
  if (isNil(val)) return '₹0';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1_00_00_000) return `${sign}₹${trimZeros((abs / 1_00_00_000).toFixed(2))} Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trimZeros((abs / 1_00_000).toFixed(1))} L`;
  if (abs >= 1_000) return `${sign}₹${trimZeros((abs / 1_000).toFixed(1))}K`;
  return sign + inrFormatter.format(abs);
}

/** Precise INR with two decimals for statements and reports. */
export function formatINRPrecise(val: number | null | undefined): string {
  if (isNil(val)) return '₹0.00';
  return inrPreciseFormatter.format(val);
}

/** 82.4% — percent with configurable precision. */
export function formatPercent(val: number | null | undefined, fractionDigits = 1): string {
  if (isNil(val)) return '0%';
  return `${val.toFixed(fractionDigits)}%`;
}

/** Axis / tick compaction: 2 Cr / 50 L / 10K (no ₹, unit-spaced). */
export function formatAxisINR(val: number | null | undefined): string {
  if (isNil(val)) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_00_00_000) return `${trimZeros((abs / 1_00_00_000).toFixed(1))} Cr`;
  if (abs >= 1_00_000) return `${trimZeros((abs / 1_00_000).toFixed(0))} L`;
  if (abs >= 1_000) return `${trimZeros((abs / 1_000).toFixed(0))}K`;
  return String(Math.round(abs));
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** 3 Sep 2026 — en-IN short date; pass `withTime` for meeting timestamps. */
export function formatDate(val: Date | string | number, withTime = false): string {
  const date = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(date.getTime())) return '';
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}

/**
 * Signed change (§114): +₹46L / −2.3%.
 * `style: 'currency'` renders deltas like +₹46.2 L; 'percent' renders +2.3%.
 */
export function formatDelta(
  val: number | null | undefined,
  style: 'currency' | 'percent' | 'number' = 'currency',
  fractionDigits = 1,
): string {
  if (isNil(val)) return style === 'percent' ? '+0%' : style === 'number' ? '+0' : '+₹0';
  const sign = val < 0 ? '-' : '+';
  const abs = Math.abs(val);
  if (style === 'percent') return `${sign}${abs.toFixed(fractionDigits)}%`;
  if (style === 'number') return `${sign}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: fractionDigits }).format(abs)}`;
  return sign + formatCompactINR(abs);
}

/** Strip ₹, commas and spaces for parsing user-entered amounts. */
export function parseINRInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}
