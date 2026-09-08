-- 0100_auth.sql — Authentication schema (Agent 4: AUTH ENGINEER)
--
-- DEPENDENCIES (created by the 00xx migrations owned by the DB agent):
--   * public.users                    (0002) — referenced via FK below
--   * public.organizations            (0002) — referenced via FK below
--   * public.organization_memberships (0003)
--   * public.audit_logs               (0016)
--   * app_user role + default grants  (0095)
--   * app_user_id() / app_organization_id() hardened GUC accessors (0091)
--     — every policy below uses them so context-free queries cleanly
--       deny (NULL) instead of erroring on the empty-string GUC quirk.
--
-- ELEVATION MODEL: the API connects as app_user (RLS applies even to the
-- table owner — every table here is FORCE'd). Pre-authentication lookups
-- (session by cookie, credentials by email, invitation/reset token by
-- hash) run through SECURITY DEFINER functions owned by the migration
-- superuser; EXECUTE is granted to app_user only. Everything else goes
-- through plain RLS with the per-request SET LOCAL tenant context.

-- ---------------------------------------------------------------------------
-- sessions (spec §38, §40)
-- organization_id is NULL until the user binds/switches an active
-- organization (spec §37); it holds the ACTIVE organization, not ownership.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,

    token_hash TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    ip INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS sessions_user_idx
    ON sessions(user_id);

CREATE INDEX IF NOT EXISTS sessions_expiry_idx
    ON sessions(expires_at)
    WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- user_auth_credentials
-- Authentication-provider record for local email/password + TOTP MFA.
-- Kept out of public.users per spec §9.2 ("Authentication-provider records
-- may live in the authentication system rather than directly here").
-- The TOTP secret is stored server-side only and is never exposed
-- through any API (spec §201).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_auth_credentials (
    user_id UUID PRIMARY KEY
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    password_hash TEXT NOT NULL,

    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret TEXT,
    mfa_pending_secret TEXT,

    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,

    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER user_auth_credentials_touch_updated_at
BEFORE UPDATE ON user_auth_credentials
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- password_reset_tokens (spec §38)
-- Single-use, short expiry, hashed at rest (spec §39 token requirements).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
    ON password_reset_tokens(user_id);

-- ---------------------------------------------------------------------------
-- invitations (spec §39)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    email CITEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'practice_owner',
        'practice_admin',
        'wealth_practitioner',
        'associate',
        'read_only'
    )),

    invited_by UUID
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    token_hash TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_org_email_pending_idx
    ON invitations(organization_id, email)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS invitations_org_idx
    ON invitations(organization_id, status);

-- Explicit grants for app_user (0095 default privileges should also cover
-- these, but make the auth contract self-contained).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON
            sessions, user_auth_credentials, password_reset_tokens, invitations TO app_user';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Request-scoped tenant context (spec §§34-36):
--   app.user_id          -> uuid of the authenticated user
--   app.organization_id  -> uuid of the active organization
-- installed per-request with SET LOCAL inside a transaction
-- (see server/middleware/requestContext.ts).
-- ---------------------------------------------------------------------------
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY sessions_select_own ON sessions
    FOR SELECT
    USING (user_id = app_user_id());

CREATE POLICY sessions_insert_own ON sessions
    FOR INSERT
    WITH CHECK (user_id = app_user_id());

CREATE POLICY sessions_update_own ON sessions
    FOR UPDATE
    USING (user_id = app_user_id())
    WITH CHECK (user_id = app_user_id());

CREATE POLICY sessions_delete_own ON sessions
    FOR DELETE
    USING (user_id = app_user_id());

ALTER TABLE user_auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_auth_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY credentials_select_own ON user_auth_credentials
    FOR SELECT
    USING (user_id = app_user_id());

CREATE POLICY credentials_insert_own ON user_auth_credentials
    FOR INSERT
    WITH CHECK (user_id = app_user_id());

CREATE POLICY credentials_update_own ON user_auth_credentials
    FOR UPDATE
    USING (user_id = app_user_id())
    WITH CHECK (user_id = app_user_id());

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

-- Post-authentication consumption uses RLS (user context installed before
-- the lookup). The PRE-authentication lookup-by-hash elevation lives in
-- auth_lookup_password_reset_token() below.
CREATE POLICY password_reset_tokens_own ON password_reset_tokens
    FOR ALL
    USING (user_id = app_user_id())
    WITH CHECK (user_id = app_user_id());

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY invitations_org_select ON invitations
    FOR SELECT
    USING (organization_id = app_organization_id());

CREATE POLICY invitations_org_insert ON invitations
    FOR INSERT
    WITH CHECK (organization_id = app_organization_id());

CREATE POLICY invitations_org_update ON invitations
    FOR UPDATE
    USING (organization_id = app_organization_id())
    WITH CHECK (organization_id = app_organization_id());

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER elevation points (pre-authentication lookups).
-- Owner = migration superuser → RLS bypass; EXECUTE restricted to app_user.
-- These are the ONLY places credential/session/token rows may be read
-- without an established tenant context.
-- ---------------------------------------------------------------------------

-- Session lookup from the session cookie, before any context exists.
-- Returns the raw row (including revoked/expired) so the app can return
-- precise SESSION_EXPIRED vs SESSION_REVOKED errors; the token hash is
-- unguessable, so returning it here leaks nothing.
CREATE OR REPLACE FUNCTION auth_lookup_session(p_token_hash TEXT)
RETURNS SETOF sessions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM sessions WHERE token_hash = p_token_hash;
$$;

-- Login: resolve email → user + credentials in one round-trip.
CREATE OR REPLACE FUNCTION auth_lookup_user_credentials(p_email CITEXT)
RETURNS TABLE (
    id UUID, email CITEXT, full_name TEXT, avatar_url TEXT, status TEXT,
    last_login_at TIMESTAMPTZ,
    password_hash TEXT, mfa_enabled BOOLEAN,
    failed_login_attempts INT, locked_until TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT u.id, u.email, u.full_name, u.avatar_url, u.status, u.last_login_at,
           c.password_hash, c.mfa_enabled,
           c.failed_login_attempts, c.locked_until
    FROM users u
    JOIN user_auth_credentials c ON c.user_id = u.id
    WHERE u.email = p_email AND u.status = 'active';
$$;

-- Password reset: issue (rotating any outstanding token) — always called
-- AFTER the account is known to exist, pre-context.
CREATE OR REPLACE FUNCTION auth_create_password_reset_token(
    p_user_id UUID, p_token_hash TEXT, p_ttl_minutes INT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE password_reset_tokens SET used_at = now()
     WHERE user_id = p_user_id AND used_at IS NULL;
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (p_user_id, p_token_hash, now() + (p_ttl_minutes || ' minutes')::interval);
$$;

-- Password reset: consume — lookup by hash before context exists.
CREATE OR REPLACE FUNCTION auth_lookup_password_reset_token(p_token_hash TEXT)
RETURNS SETOF password_reset_tokens
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM password_reset_tokens WHERE token_hash = p_token_hash;
$$;

-- Invitations: peek/accept lookup by hash before context exists,
-- including the organization name for the accept screen.
CREATE OR REPLACE FUNCTION auth_lookup_invitation(p_token_hash TEXT)
RETURNS TABLE (
    id UUID, organization_id UUID, organization_name TEXT, email CITEXT,
    role TEXT, invited_by UUID, status TEXT,
    created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, accepted_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT i.id, i.organization_id, o.name, i.email, i.role, i.invited_by,
           i.status, i.created_at, i.expires_at, i.accepted_at
    FROM invitations i
    JOIN organizations o ON o.id = i.organization_id
    WHERE i.token_hash = p_token_hash;
$$;

-- Housekeeping: physical removal of long-expired sessions (server job only).
CREATE OR REPLACE FUNCTION auth_delete_expired_sessions()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH deleted AS (
        DELETE FROM sessions WHERE expires_at < now() - interval '7 days' RETURNING id
    )
    SELECT count(*)::int FROM deleted;
$$;

-- Admin/platform: revoke every session of a user (actor ≠ target, so the
-- own-session RLS policy cannot authorize this; application layer must
-- separately authorize the admin action — see AuthService.adminRevokeUserSessions).
CREATE OR REPLACE FUNCTION auth_revoke_all_user_sessions(p_user_id UUID)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH revoked AS (
        UPDATE sessions SET revoked_at = now()
         WHERE user_id = p_user_id AND revoked_at IS NULL
        RETURNING id
    )
    SELECT count(*)::int FROM revoked;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        EXECUTE 'REVOKE ALL ON FUNCTION
            auth_lookup_session(TEXT),
            auth_lookup_user_credentials(CITEXT),
            auth_create_password_reset_token(UUID, TEXT, INT),
            auth_lookup_password_reset_token(TEXT),
            auth_lookup_invitation(TEXT),
            auth_delete_expired_sessions(),
            auth_revoke_all_user_sessions(UUID) FROM PUBLIC';
        EXECUTE 'GRANT EXECUTE ON FUNCTION
            auth_lookup_session(TEXT),
            auth_lookup_user_credentials(CITEXT),
            auth_create_password_reset_token(UUID, TEXT, INT),
            auth_lookup_password_reset_token(TEXT),
            auth_lookup_invitation(TEXT),
            auth_delete_expired_sessions(),
            auth_revoke_all_user_sessions(UUID) TO app_user';
    END IF;
END;
$$;
