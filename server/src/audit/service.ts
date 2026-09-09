import { db } from '../db/client.js';
import { auditLogs, type AuditLog } from '../db/schema.js';

const SENSITIVE_KEY = /token|secret|password|pin|totp/i;

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redactValue(v);
    }
    return out;
  }
  return value;
}

/**
 * Strip any keys matching /token|secret|password|pin|totp/i (recursively)
 * before metadata is persisted. Broker/API secrets must never be logged
 * (spec §203/§201).
 */
export function redact(metadata: Record<string, unknown>): Record<string, unknown> {
  return redactValue(metadata) as Record<string, unknown>;
}

export interface LogAuditEntry {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Write-once audit trail. Inserts go through the non-tenant `db` instance
 * (no GUC) because audit writes must succeed regardless of the caller's RLS
 * context; authorization is enforced by the caller before invoking log().
 */
export class AuditService {
  async log(entry: LogAuditEntry): Promise<AuditLog> {
    const [row] = await db
      .insert(auditLogs)
      .values({
        organizationId: entry.organizationId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        metadata: entry.metadata ? redact(entry.metadata) : {},
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        requestId: entry.requestId ?? null,
      })
      .returning();
    if (!row) throw new Error('audit_logs insert returned no row');
    return row;
  }
}

export const auditService = new AuditService();
