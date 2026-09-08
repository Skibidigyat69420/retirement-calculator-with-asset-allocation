-- 0009_risk_assessments.sql
-- Spec section 19 (risk assessments). Immutable history: never updated in place.

CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    answers JSONB NOT NULL,

    raw_score NUMERIC(10,4),
    profile TEXT,

    dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,

    questionnaire_version TEXT NOT NULL,

    assessed_by UUID REFERENCES users(id),

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
