/** Shared Recharts styling — matches the existing chart wrappers. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '0',
  border: '2px solid #111111',
  backgroundColor: '#ffffff',
  backdropFilter: 'none',
  boxShadow: '4px 4px 0 #111111',
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
