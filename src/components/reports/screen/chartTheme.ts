/** Shared Recharts styling — soft macOS-style floating panel. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-raised)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.04)',
  padding: '10px 14px',
};

export const CHART_TICK = { fontSize: 11, fill: 'var(--color-muted)' };
export const CHART_GRID_STROKE = 'var(--color-border)';

/** Semantic token colors usable directly as SVG fills/strokes. */
export const TOKEN = {
  accent: 'var(--color-accent)',
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
  negative: 'var(--color-negative)',
  positive: 'var(--color-positive)',
  ink: 'var(--color-ink)',
  muted: 'var(--color-muted)',
  faint: 'var(--color-faint)',
  border: 'var(--color-border)',
  sunken: 'var(--color-sunken)',
} as const;
