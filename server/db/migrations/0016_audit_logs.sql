-- 0016_audit_logs.sql
-- Spec section 29 (audit vs decision logs). System-level accountability:
-- append-only, no UPDATE or DELETE policies are ever granted (see 0090_rls.sql).

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES organizations(id),

    actor_user_id UUID
        REFERENCES users(id),

    action TEXT NOT NULL,

    entity_type TEXT NOT NULL,
    entity_id UUID,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
