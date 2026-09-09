import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config.js';
import { ApiError } from '../http/errors.js';

/**
 * Supabase Storage signed URLs (spec §127 — never expose unauthenticated
 * storage URLs). When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are not
 * configured, endpoints fail honestly with 501 STORAGE_NOT_CONFIGURED
 * rather than returning a fake URL.
 */

let cached: SupabaseClient | null | undefined;

function client(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  cached =
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return cached;
}

export function storageConfigured(): boolean {
  return client() !== null;
}

export async function createSignedDownloadUrl(
  bucket: 'reports' | 'documents',
  storageKey: string,
  expiresInSeconds = 60,
): Promise<string> {
  const supabase = client();
  if (!supabase) {
    throw new ApiError(
      501,
      'STORAGE_NOT_CONFIGURED',
      'Supabase storage is not configured on this deployment.',
    );
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new ApiError(
      502,
      'STORAGE_ERROR',
      `Could not create a signed URL (${error?.message ?? 'unknown storage error'}).`,
    );
  }
  return data.signedUrl;
}
