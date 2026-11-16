/**
 * The client profiler can be served from a dedicated hostname while sharing
 * this codebase and backend. Configure VITE_RISK_PROFILER_URL at build time
 * (for example, https://risk.example.com); it is intentionally public.
 */
export function riskProfilerLink(token: string): string {
  const configured = import.meta.env.VITE_RISK_PROFILER_URL?.trim().replace(/\/$/, '');
  const base = configured || window.location.origin;
  return `${base}/r/${encodeURIComponent(token)}`;
}
