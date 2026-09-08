/** Shared Recharts styling — matches the existing chart wrappers. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
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
