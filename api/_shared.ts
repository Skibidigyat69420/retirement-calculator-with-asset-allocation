/**
 * Shared helpers for the read-only Vercel serverless API.
 *
 * Underscore-prefixed files in api/ are ignored by Vercel as routes,
 * so this module is only bundled into the functions that import it.
 */

export function jsonResponse(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers || {}) };
  return new Response(JSON.stringify(body), { status: init?.status ?? 200, headers });
}

export function methodNotAllowed(method: string | undefined) {
  return jsonResponse({ error: `Method ${method || 'UNKNOWN'} not allowed. This endpoint is read-only (GET only).` }, {
    status: 405,
    headers: { Allow: 'GET' },
  });
}
