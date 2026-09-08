import { useEffect, useState } from 'react';
import { getChartTheme, type ChartTheme, type ThemeMode } from '../../../lib/design-tokens';

export { getChartTheme };
export type { ChartTheme };

/**
 * Live chart theme: re-resolves when `.dark` is toggled on <html>, so
 * charts re-render with the correct token set (§234: separate dark set).
 */
export function useChartTheme(mode?: ThemeMode): ChartTheme {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false,
  );

  useEffect(() => {
    if (mode) return;
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark')),
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [mode]);

  return getChartTheme(mode ?? (isDark ? 'dark' : 'light'));
}

/** Shared axis tick props — consistent typography across every chart (§115). */
export const axisTickStyle = {
  fontSize: 11,
  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export const gridStrokeOpacity = 0.7;
