-- 0012_plan_scenarios.sql
-- Spec sections 22-23 (scenarios) and 144 (scenario versioning).
-- A scenario result references planVersion + assumptionVersion + engineVersion
-- for reproducibility; base_version_id pins the plan version it derives from.

CREATE TABLE plan_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    plan_id UUID NOT NULL
        REFERENCES retirement_plans(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    scenario_type TEXT NOT NULL
        CHECK (scenario_type IN ('base', 'conservative', 'optimistic', 'custom', 'stress', 'reverse', 'what_if')),

    assumptions JSONB NOT NULL,

    result JSONB,

    result_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (result_status IN ('draft', 'calculated', 'stale', 'error')),

    base_version_id UUID
        REFERENCES plan_versions(id),

    assumption_set_id UUID,

    engine_version TEXT,

    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);

CREATE TRIGGER plan_scenarios_touch_updated_at
BEFORE UPDATE ON plan_scenarios
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
