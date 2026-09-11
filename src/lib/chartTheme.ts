/**
 * Single chart theme for the whole product.
 * Every chart consumes these tokens so light/dark switching is automatic.
 * Values are CSS custom-property references — recharts passes them through
 * to SVG presentation attributes, and the browser resolves them per theme.
 */
export interface ChartTheme {
  axis: string;
  axisLabel: string;
  grid: string;
  primary: string;
  primaryFill: string;
  secondary: string;
  reference: string;
  positive: string;
  negative: string;
  warning: string;
  muted: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export const getChartTheme = (): ChartTheme => ({
  axis: 'var(--color-faint)',
  axisLabel: 'var(--color-muted)',
  grid: 'var(--color-border-subtle)',
  primary: 'var(--color-accent)',
  primaryFill: 'var(--color-accent)',
  secondary: 'var(--color-brass)',
  reference: 'var(--color-brass)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  warning: 'var(--color-warning)',
  muted: 'var(--color-border-strong)',
  tooltipBg: 'var(--color-raised)',
  tooltipBorder: 'var(--color-border)',
  tooltipText: 'var(--color-ink)',
});
