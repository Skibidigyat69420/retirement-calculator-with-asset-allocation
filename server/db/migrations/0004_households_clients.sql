-- 0004_households_clients.sql
-- Spec sections 11 (households) and 12 (clients).

CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    name TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER households_touch_updated_at
BEFORE UPDATE ON households
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    household_id UUID
        REFERENCES households(id),

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,

    email CITEXT,
    phone TEXT,

    date_of_birth DATE,
    marital_status TEXT,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'prospect', 'inactive', 'archived')),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);

CREATE TRIGGER clients_touch_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
