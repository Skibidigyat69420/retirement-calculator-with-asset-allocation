/** Shared Recharts styling — matches the existing chart wrappers. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #2b3444',
  backgroundColor: '#161b26',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.55), 0 8px 10px -6px rgba(0, 0, 0, 0.45)',
  padding: '10px 14px',
};

export const CHART_TOOLTIP_LABEL_STYLE = { color: '#f2f5f9', fontWeight: 600, marginBottom: '4px' };
export const CHART_TOOLTIP_ITEM_STYLE = { color: '#c6cdd8' };

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
