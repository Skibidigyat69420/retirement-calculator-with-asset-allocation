-- 0003_memberships.sql
-- Spec section 10 (memberships). Roles live on the membership, never on users.

CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL
        CHECK (role IN (
            'platform_admin',
            'practice_owner',
            'practice_admin',
            'wealth_practitioner',
            'associate',
            'read_only'
        )),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'invited', 'suspended')),

    invited_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (organization_id, user_id)
);

CREATE TRIGGER organization_memberships_touch_updated_at
BEFORE UPDATE ON organization_memberships
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
