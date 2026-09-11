import { useMemo, type CSSProperties } from 'react';
import { getChartTheme } from '../../lib/chartTheme';

/** Floating surface tooltip — resolved per theme via CSS custom properties. */
export const TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--color-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-popover)',
  padding: '10px 14px',
};

export const TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: 'var(--color-ink)',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: 'var(--color-muted)',
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  marginBottom: '4px',
};

export const LEGEND_WRAPPER_STYLE: CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-muted)',
  paddingBottom: '8px',
};

export const AXIS_TICK_BASE = { fontSize: 11, fontFamily: 'var(--font-mono)' };

/**
 * First-mount line draw animation duration in ms (0 when the user prefers
 * reduced motion). Recharts animates line/area strokes as a left-to-right
 * draw when animationDuration is non-zero.
 */
export const useChartMotion = (): number =>
  useMemo(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 0;
    }
    return 480;
  }, []);

/**
 * Token-based palette for asset categories. Keys are the display labels from
 * ASSET_LABELS so donuts fed by pages with legacy hex colors are upgraded to
 * the editorial palette automatically; values are CSS-var references that
 * resolve per theme. Ordered so the dominant class (equity) takes the
 * strongest token and the rest stay muted and warm.
 */
export const CATEGORY_TOKEN_COLORS: Record<string, string> = {
  Equity: 'var(--color-accent)',
  Debt: 'var(--color-info)',
  Commodities: 'var(--color-brass)',
  'Real Estate': 'var(--color-warning)',
  Liquid: 'var(--color-positive)',
  Other: 'var(--color-border-strong)',
};

/** Fallback token palette for unnamed donut slices (stable, editorial, no rainbow). */
export const TOKEN_FALLBACK_PALETTE = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-brass)',
  'var(--color-positive)',
  'var(--color-warning)',
  'var(--color-border-strong)',
  'var(--color-muted)',
];

/** Resolve a donut slice color: known category → token, else caller color, else palette. */
export const resolveSliceColor = (name: string, provided: string | undefined, index: number): string =>
  CATEGORY_TOKEN_COLORS[name] ?? provided ?? TOKEN_FALLBACK_PALETTE[index % TOKEN_FALLBACK_PALETTE.length];

export { getChartTheme };
