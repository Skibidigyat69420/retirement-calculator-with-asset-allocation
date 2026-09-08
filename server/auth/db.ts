/**
 * Request-scoped tenant context on a dedicated connection (spec §§34-36).
 *
 * Pooled connections are NEVER mutated with a plain SET: the context is
 * installed with SET LOCAL inside a transaction and released with
 * COMMIT/ROLLBACK, so tenant state cannot leak between requests sharing
 * a pooled connection. Variable names match the 00xx migrations
 * (app.user_id / app.organization_id, hardened accessors in 0091).
 *
 * CONTRACT with the DB agent's 00xx migrations:
 *   * gen_random_uuid() (0001)
 *   * audit_logs (0016): organization_id, actor_user_id, action,
 *     entity_type, entity_id, metadata jsonb, ip_address, created_at
 *     — request_id and user_agent are carried inside metadata (spec §203).
 */
import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface TenantContext {
  userId: string | null;
  organizationId: string | null;
  requestId?: string;
}

/**
 * Check out a dedicated client, BEGIN, install SET LOCAL tenant context,
 * run `fn`, then COMMIT (or ROLLBACK on error) and always release.
 * Use for every multi-statement auth flow (spec §140: no partial state).
 *
 * Empty-string values (not NULL) are used for absent context because of
 * the custom-GUC revert quirk documented in 0091_rls_hardening.sql; the
 * hardened accessors NULLIF-guard them back to a clean deny.
 */
export async function withTenantTransaction<T>(
  pool: Pool,
  ctx: TenantContext | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (ctx) {
      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', ctx.userId ?? '']);
      await client.query('SELECT set_config($1, $2, true)', [
        'app.organization_id',
        ctx.organizationId ?? '',
      ]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Convenience wrapper around client.query with typed rows. */
export async function q<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return client.query<T>(text, params as unknown[]);
}

export interface AuditEventInput {
  organizationId?: string | null;
  userId?: string | null;
  action: string; // e.g. INVITATION_ACCEPTED, PASSWORD_RESET, SESSION_REVOKED
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Write an audit event (spec §203: who/what/when/where/resource/requestId).
 * Never include raw secrets — callers must pass redacted metadata only.
 * Matches 0016_audit_logs.sql; request_id/user_agent ride in metadata.
 */
export async function writeAuditEvent(client: PoolClient, event: AuditEventInput): Promise<void> {
  const metadata: Record<string, unknown> = { ...(event.metadata ?? {}) };
  if (event.requestId) metadata.request_id = event.requestId;
  if (event.userAgent) metadata.user_agent = event.userAgent;
  await client.query(
    `INSERT INTO audit_logs
       (organization_id, actor_user_id, action, entity_type, entity_id,
        ip_address, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      event.organizationId ?? null,
      event.userId ?? null,
      event.action,
      event.resourceType ?? null,
      event.resourceId ?? null,
      event.ipAddress ?? null,
      JSON.stringify(metadata),
    ],
  );
}
