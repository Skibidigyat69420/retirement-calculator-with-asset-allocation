-- 0090_rls.sql
-- Row-Level Security: default-deny tenancy for every tenant table.
--
-- Model (spec sections 34-36):
--   * Every policy keys on current_setting('app.organization_id', true).
--     When the setting is absent the cast yields NULL, the comparison is
--     NULL, and NO rows are visible — default deny.
--   * Tenant context is set with set_tenant_context() below, which uses
--     SET LOCAL semantics (set_config(..., is_local := true)). It is scoped to
--     the current transaction, so tenant state can never leak between pooled
--     connections (spec section 36 — the IMPORTANT RLS edge case).
--     Callers MUST be inside a transaction; the migration runner, seed and
--     verify scripts all wrap their work in BEGIN/COMMIT.
--   * FORCE ROW LEVEL SECURITY is enabled on every table so the rule applies
--     even to the table owner — no accidental superuser-style bypass except
--     for actual superusers / BYPASSRLS roles (reserved for migrations and
--     platform-admin operations).
--   * client_assignments has no organization_id column; its policy keys
--     through the parent client. The subquery on clients is itself protected
--     by RLS, so a cross-org JOIN can never expose rows.

-- ---------------------------------------------------------------------------
-- Tenant context helpers
-- ---------------------------------------------------------------------------

-- Sets the request-scoped tenant context. is_local := true gives SET LOCAL
-- semantics: values evaporate at COMMIT/ROLLBACK and can never bleed into the
-- next checkout of a pooled connection.
CREATE OR REPLACE FUNCTION set_tenant_context(p_organization_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.organization_id', p_organization_id::text, true);
    PERFORM set_config('app.user_id', p_user_id::text, true);
END;
$$;

-- Convenience for org-only contexts (system jobs, background workers).
CREATE OR REPLACE FUNCTION set_tenant_context(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.organization_id', p_organization_id::text, true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Plain tenant tables: uniform default-deny policy template
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    t TEXT;
    tenant_tables TEXT[] := ARRAY[
        'households',
        'clients',
        'assets',
        'liabilities',
        'cashflow_rules',
        'goals',
        'risk_assessments',
        'retirement_plans',
        'plan_versions',
        'plan_scenarios',
        'meeting_sessions',
        'meeting_checklist_items',
        'meeting_notes',
        'decision_logs',
        'reports',
        'documents',
        'tasks'
    ];
BEGIN
    FOREACH t IN ARRAY tenant_tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT USING (
                organization_id = current_setting(''app.organization_id'', true)::uuid
            )', t || '_tenant_select', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (
                organization_id = current_setting(''app.organization_id'', true)::uuid
            )', t || '_tenant_insert', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR UPDATE USING (
                organization_id = current_setting(''app.organization_id'', true)::uuid
            ) WITH CHECK (
                organization_id = current_setting(''app.organization_id'', true)::uuid
            )', t || '_tenant_update', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR DELETE USING (
                organization_id = current_setting(''app.organization_id'', true)::uuid
            )', t || '_tenant_delete', t);
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- organization_memberships
-- A user must be able to read their OWN membership rows before any tenant
-- context exists (that is how the login flow resolves which organizations the
-- actor belongs to). Writes always require an active tenant context.
-- ---------------------------------------------------------------------------

ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY organization_memberships_select
ON organization_memberships FOR SELECT
USING (
    organization_id = current_setting('app.organization_id', true)::uuid
    OR user_id = current_setting('app.user_id', true)::uuid
);

CREATE POLICY organization_memberships_insert
ON organization_memberships FOR INSERT
WITH CHECK (
    organization_id = current_setting('app.organization_id', true)::uuid
);

CREATE POLICY organization_memberships_update
ON organization_memberships FOR UPDATE
USING (
    organization_id = current_setting('app.organization_id', true)::uuid
)
WITH CHECK (
    organization_id = current_setting('app.organization_id', true)::uuid
);

CREATE POLICY organization_memberships_delete
ON organization_memberships FOR DELETE
USING (
    organization_id = current_setting('app.organization_id', true)::uuid
);

-- ---------------------------------------------------------------------------
-- organizations
-- Readable by members. Creatable by any authenticated user (bootstrap: the
-- app must create the practice_owner membership in the same transaction).
-- Mutable only by members. Deletion is never allowed via RLS.
-- ---------------------------------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

CREATE POLICY organizations_select
ON organizations FOR SELECT
USING (
    id IN (
        SELECT m.organization_id
        FROM organization_memberships m
        WHERE m.user_id = current_setting('app.user_id', true)::uuid
    )
);

CREATE POLICY organizations_insert
ON organizations FOR INSERT
WITH CHECK (
    current_setting('app.user_id', true) IS NOT NULL
);

CREATE POLICY organizations_update
ON organizations FOR UPDATE
USING (
    id IN (
        SELECT m.organization_id
        FROM organization_memberships m
        WHERE m.user_id = current_setting('app.user_id', true)::uuid
    )
)
WITH CHECK (
    id IN (
        SELECT m.organization_id
        FROM organization_memberships m
        WHERE m.user_id = current_setting('app.user_id', true)::uuid
    )
);

-- ---------------------------------------------------------------------------
-- users
-- A user is always visible to themselves and to members of the same
-- organization(s). Only the user themselves may be modified.
-- ---------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_select
ON users FOR SELECT
USING (
    id = current_setting('app.user_id', true)::uuid
    OR id IN (
        SELECT m.user_id
        FROM organization_memberships m
        WHERE m.organization_id = current_setting('app.organization_id', true)::uuid
    )
);

CREATE POLICY users_insert
ON users FOR INSERT
WITH CHECK (
    id = current_setting('app.user_id', true)::uuid
);

CREATE POLICY users_update
ON users FOR UPDATE
USING (
    id = current_setting('app.user_id', true)::uuid
)
WITH CHECK (
    id = current_setting('app.user_id', true)::uuid
);

-- ---------------------------------------------------------------------------
-- client_assignments
-- No organization_id column: tenant check passes through the parent client.
-- The clients subquery is itself RLS-protected, so a cross-org client is
-- invisible and EXISTS evaluates false (spec section 36 edge case).
-- ---------------------------------------------------------------------------

ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY client_assignments_select
ON client_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = current_setting('app.organization_id', true)::uuid
    )
);

CREATE POLICY client_assignments_insert
ON client_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = current_setting('app.organization_id', true)::uuid
    )
);

CREATE POLICY client_assignments_update
ON client_assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = current_setting('app.organization_id', true)::uuid
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = current_setting('app.organization_id', true)::uuid
    )
);

CREATE POLICY client_assignments_delete
ON client_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = current_setting('app.organization_id', true)::uuid
    )
);

-- ---------------------------------------------------------------------------
-- assumption_sets
-- organization_id IS NULL = global assumption sets (readable by every tenant);
-- a real organization_id = practice-specific override (visible only to that
-- tenant). NOTE: creating/editing global sets is a platform-admin operation
-- and must be enforced at the application layer (or via a BYPASSRLS role);
-- RLS alone cannot distinguish platform admins from tenant users.
-- ---------------------------------------------------------------------------

ALTER TABLE assumption_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumption_sets FORCE ROW LEVEL SECURITY;

CREATE POLICY assumption_sets_select
ON assumption_sets FOR SELECT
USING (
    organization_id IS NULL
    OR organization_id = current_setting('app.organization_id', true)::uuid
);

CREATE POLICY assumption_sets_insert
ON assumption_sets FOR INSERT
WITH CHECK (
    organization_id IS NULL
    OR organization_id = current_setting('app.organization_id', true)::uuid
);

CREATE POLICY assumption_sets_update
ON assumption_sets FOR UPDATE
USING (
    organization_id IS NULL
    OR organization_id = current_setting('app.organization_id', true)::uuid
)
WITH CHECK (
    organization_id IS NULL
    OR organization_id = current_setting('app.organization_id', true)::uuid
);

CREATE POLICY assumption_sets_delete
ON assumption_sets FOR DELETE
USING (
    organization_id IS NULL
    OR organization_id = current_setting('app.organization_id', true)::uuid
);

-- ---------------------------------------------------------------------------
-- notifications
-- Tenant-scoped AND user-scoped: a notification belongs to one user.
-- ---------------------------------------------------------------------------

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_select
ON notifications FOR SELECT
USING (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND user_id = current_setting('app.user_id', true)::uuid
);

CREATE POLICY notifications_insert
ON notifications FOR INSERT
WITH CHECK (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND user_id = current_setting('app.user_id', true)::uuid
);

CREATE POLICY notifications_update
ON notifications FOR UPDATE
USING (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND user_id = current_setting('app.user_id', true)::uuid
)
WITH CHECK (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND user_id = current_setting('app.user_id', true)::uuid
);

CREATE POLICY notifications_delete
ON notifications FOR DELETE
USING (
    organization_id = current_setting('app.organization_id', true)::uuid
    AND user_id = current_setting('app.user_id', true)::uuid
);

-- ---------------------------------------------------------------------------
-- audit_logs
-- Append-only (spec section 29). SELECT for the tenant; INSERT for the
-- tenant (organization_id may be NULL for platform-level events). No UPDATE or
-- DELETE policy is defined anywhere — those statements are denied by default.
-- ---------------------------------------------------------------------------

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select
ON audit_logs FOR SELECT
USING (
    organization_id = current_setting('app.organization_id', true)::uuid
);

CREATE POLICY audit_logs_insert
ON audit_logs FOR INSERT
WITH CHECK (
    organization_id = current_setting('app.organization_id', true)::uuid
    OR organization_id IS NULL
);
