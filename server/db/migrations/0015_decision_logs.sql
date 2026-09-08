-- 0015_decision_logs.sql
-- Spec section 28 (decision history). Planning narrative, append-only.

CREATE TABLE decision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    plan_id UUID
        REFERENCES retirement_plans(id)
        ON DELETE SET NULL,

    actor_user_id UUID
        REFERENCES users(id),

    action TEXT NOT NULL,

    summary TEXT NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
