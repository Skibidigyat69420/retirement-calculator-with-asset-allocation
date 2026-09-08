-- 0013_assumption_sets.sql
-- Spec section 24 (assumption sets).
-- organization_id NULL = global assumptions; a real tenant id = practice override.

CREATE TABLE assumption_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES organizations(id),

    name TEXT NOT NULL,

    source TEXT NOT NULL
        CHECK (source IN ('market', 'historical', 'conservative', 'override')),

    version TEXT NOT NULL,

    data JSONB NOT NULL,

    valid_from DATE,
    valid_to DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (organization_id, name, version)
);

-- FK deferred from 0012_plan_scenarios.sql (target table did not exist yet).
ALTER TABLE plan_scenarios
    ADD CONSTRAINT plan_scenarios_assumption_set_id_fkey
    FOREIGN KEY (assumption_set_id)
    REFERENCES assumption_sets(id)
    ON DELETE SET NULL;
