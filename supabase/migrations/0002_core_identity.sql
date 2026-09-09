-- 0002_core_identity.sql
-- Organizations, users, and memberships.

CREATE TABLE organizations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  logo_url       TEXT,
  website        TEXT,
  brand_primary  TEXT,
  brand_secondary TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  plan_tier      TEXT NOT NULL DEFAULT 'standard',
  settings       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE, -- link to Supabase auth.users; nullable until invite acceptance
  email        CITEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE organization_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL
                  CHECK (role IN ('platform_admin', 'practice_owner', 'practice_admin',
                                  'wealth_practitioner', 'associate', 'read_only')),
  status          TEXT NOT NULL DEFAULT 'active',
  invited_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TRIGGER organization_memberships_set_updated_at
  BEFORE UPDATE ON organization_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
