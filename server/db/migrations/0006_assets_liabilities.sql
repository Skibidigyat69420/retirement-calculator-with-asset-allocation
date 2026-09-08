-- 0006_assets_liabilities.sql
-- Spec sections 15 (assets) and 16 (liabilities).

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    asset_type TEXT NOT NULL,
    asset_category TEXT NOT NULL,

    currency TEXT NOT NULL DEFAULT 'INR',

    current_value NUMERIC(20,2) NOT NULL DEFAULT 0,
    cost_basis NUMERIC(20,2),

    expected_return NUMERIC(8,4),

    liquidity TEXT,

    liquidate_at_retirement BOOLEAN NOT NULL DEFAULT false,

    external_reference TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);

CREATE TRIGGER assets_touch_updated_at
BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    liability_type TEXT NOT NULL,

    outstanding_amount NUMERIC(20,2) NOT NULL,
    interest_rate NUMERIC(8,4),
    monthly_payment NUMERIC(20,2),
    maturity_date DATE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);

CREATE TRIGGER liabilities_touch_updated_at
BEFORE UPDATE ON liabilities
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
