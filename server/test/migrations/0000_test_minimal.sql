-- Minimal bootstrap schema for CORE tests only (users / organizations /
-- organization_memberships). This intentionally does NOT mirror the full
-- platform migrations in supabase/ — it exists so the core test suite
-- (auth + tenancy plumbing) can run independently of the parallel migration
-- work. Applied by test/helpers.ts when TEST_BOOTSTRAP=1.
-- No RLS here: tests connect with the owner role and insert rows directly.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  website text,
  brand_primary text,
  brand_secondary text,
  status text NOT NULL DEFAULT 'active',
  plan_tier text NOT NULL DEFAULT 'standard',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  email citext NOT NULL UNIQUE,
  full_name text,
  phone text,
  avatar_url text,
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN
    ('platform_admin','practice_owner','practice_admin',
     'wealth_practitioner','associate','read_only')),
  status text NOT NULL DEFAULT 'active',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
