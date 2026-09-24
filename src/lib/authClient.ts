import { createClient } from '@supabase/supabase-js';

// Demo access is opt-in and is never available in a production build.
export const demoAuth = import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === 'dev';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const configuredRedirectOrigin = import.meta.env.VITE_AUTH_REDIRECT_ORIGIN?.trim();
export const authClient = !demoAuth && url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export function requireAuthClient() {
  if (!authClient) throw new Error('Authentication is not configured. Contact your workspace administrator.');
  return authClient;
}

export function authRedirectUrl(path: string) {
  const origin = configuredRedirectOrigin || window.location.origin;
  return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
