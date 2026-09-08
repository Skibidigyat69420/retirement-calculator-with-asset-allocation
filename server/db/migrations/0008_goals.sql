-- 0008_goals.sql
-- Spec section 18 (goals).

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    goal_type TEXT NOT NULL,

    priority TEXT NOT NULL
        CHECK (priority IN ('essential', 'important', 'aspirational')),

    target_amount NUMERIC(20,2),

    target_date DATE,

    years_to_goal NUMERIC(8,2),

    inflation_rate NUMERIC(8,4),

    recurring BOOLEAN NOT NULL DEFAULT false,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'funded', 'paused', 'abandoned')),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER goals_touch_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
