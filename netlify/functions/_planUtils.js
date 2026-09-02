import { getStore } from '@netlify/blobs';

export const STORE_NAME = 'soundthesis-plans';

// Simple in-memory fallback for local Vite dev where Netlify Blobs is unavailable.
const devStore = new Map();

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

/**
 * Decode a Netlify Identity JWT and return the user id.
 *
 * In production this should also verify the HMAC-SHA256 signature against
 * NETLIFY_IDENTITY_SECRET. For the current prototype we decode the payload
 * so the data-store architecture works end-to-end; the signature check is a
 * known hardening step before real client data is stored.
 */
export function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const parts = token.replace(/^Bearer\s+/i, '').split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

export function getPlanStore() {
  try {
    return getStore(STORE_NAME);
  } catch {
    return {
      get: async (key) => devStore.get(key) || null,
      set: async (key, value) => devStore.set(key, value),
      delete: async (key) => devStore.delete(key),
      list: async ({ prefixes }) => {
        const prefix = prefixes?.[0] || '';
        const blobs = [];
        for (const [key] of devStore) {
          if (key.startsWith(prefix)) blobs.push({ key });
        }
        return { blobs };
      },
    };
  }
}

export function planKey(userId, planId) {
  return `${userId}:${planId}`;
}
