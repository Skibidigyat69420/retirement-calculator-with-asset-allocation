-- 0007_cashflow_rules.sql
-- Spec section 17 (cashflows).

CREATE TABLE cashflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL
        CHECK (type IN ('income', 'expense', 'sip', 'stp', 'swp', 'transfer')),

    name TEXT NOT NULL,

    annual_amount NUMERIC(20,2),

    monthly_amount NUMERIC(20,2),

    annual_growth_rate NUMERIC(8,4),

    start_date DATE,
    end_date DATE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (
        annual_amount IS NOT NULL
        OR monthly_amount IS NOT NULL
    )
);

CREATE TRIGGER cashflow_rules_touch_updated_at
BEFORE UPDATE ON cashflow_rules
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
