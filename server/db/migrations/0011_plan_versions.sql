-- 0011_plan_versions.sql
-- Spec section 21 (plan versions). Immutable snapshots: what was calculated,
-- with which assumptions, by which engine version.

CREATE TABLE plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    plan_id UUID NOT NULL
        REFERENCES retirement_plans(id)
        ON DELETE CASCADE,

    version_number INTEGER NOT NULL,

    input_snapshot JSONB NOT NULL,

    assumptions_snapshot JSONB NOT NULL,

    result_snapshot JSONB,

    engine_version TEXT NOT NULL,

    created_by UUID REFERENCES users(id),

    change_summary TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (plan_id, version_number)
);

-- Complete the deferred FK from 0010_retirement_plans.sql.
ALTER TABLE retirement_plans
    ADD CONSTRAINT retirement_plans_current_version_id_fkey
    FOREIGN KEY (current_version_id)
    REFERENCES plan_versions(id)
    ON DELETE SET NULL;
