-- 0010_retirement_plans.sql
-- Spec section 20 (retirement plans).
-- current_version_id gets its FK in 0011_plan_versions.sql (target table must
-- exist first); immutable inputs live in plan_versions, not here.

CREATE TABLE retirement_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_review', 'approved', 'implemented', 'archived')),

    created_by UUID REFERENCES users(id),

    current_version_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);

CREATE TRIGGER retirement_plans_touch_updated_at
BEFORE UPDATE ON retirement_plans
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
