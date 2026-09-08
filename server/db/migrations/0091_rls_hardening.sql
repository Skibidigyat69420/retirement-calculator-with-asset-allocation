-- 0091_rls_hardening.sql
-- Hardens the policies from 0090_rls.sql against a PostgreSQL custom-GUC
-- quirk: when a SET LOCAL value reverts at COMMIT/ROLLBACK, the custom
-- variable does not read back as NULL — it reads back as '' (empty string).
-- The raw casts in 0090 therefore errored on context-free queries instead of
-- cleanly denying (zero rows). These accessor functions NULLIF-guard the
-- value, and every policy is recreated on top of them.
--
-- Fresh databases run 0090 then 0091; the net effect is the hardened policy
-- set. 0090 is intentionally left untouched as the applied historical record.

CREATE OR REPLACE FUNCTION app_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- Plain tenant tables: recreate the uniform default-deny policy set.
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
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_insert', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_update', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_delete', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT USING (
                organization_id = app_organization_id()
            )', t || '_tenant_select', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (
                organization_id = app_organization_id()
            )', t || '_tenant_insert', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR UPDATE USING (
                organization_id = app_organization_id()
            ) WITH CHECK (
                organization_id = app_organization_id()
            )', t || '_tenant_update', t);

        EXECUTE format(
            'CREATE POLICY %I ON %I FOR DELETE USING (
                organization_id = app_organization_id()
            )', t || '_tenant_delete', t);
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- organization_memberships
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS organization_memberships_select ON organization_memberships;
DROP POLICY IF EXISTS organization_memberships_insert ON organization_memberships;
DROP POLICY IF EXISTS organization_memberships_update ON organization_memberships;
DROP POLICY IF EXISTS organization_memberships_delete ON organization_memberships;

CREATE POLICY organization_memberships_select
ON organization_memberships FOR SELECT
USING (
    organization_id = app_organization_id()
    OR user_id = app_user_id()
);

CREATE POLICY organization_memberships_insert
ON organization_memberships FOR INSERT
WITH CHECK (
    organization_id = app_organization_id()
);

CREATE POLICY organization_memberships_update
ON organization_memberships FOR UPDATE
USING (
    organization_id = app_organization_id()
)
WITH CHECK (
    organization_id = app_organization_id()
);

CREATE POLICY organization_memberships_delete
ON organization_memberships FOR DELETE
USING (
    organization_id = app_organization_id()
);

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_insert ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;

CREATE POLICY organizations_select
ON organizations FOR SELECT
USING (
    id IN (
        SELECT m.organization_id
        FROM organization_memberships m
        WHERE m.user_id = app_user_id()
    )
);

CREATE POLICY organizations_insert
ON organizations FOR INSERT
WITH CHECK (
    app_user_id() IS NOT NULL
);

CREATE POLICY organizations_update
ON organizations FOR UPDATE
USING (
    id IN (
        SELECT m.organization_id
        FROM organization_memberships m
        WHERE m.user_id = app_user_id()
    )
)
WITH CHECK (
    id IN (
        SELECT m.organization_id
        FROM organization_memberships m
        WHERE m.user_id = app_user_id()
    )
);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;

CREATE POLICY users_select
ON users FOR SELECT
USING (
    id = app_user_id()
    OR id IN (
        SELECT m.user_id
        FROM organization_memberships m
        WHERE m.organization_id = app_organization_id()
    )
);

CREATE POLICY users_insert
ON users FOR INSERT
WITH CHECK (
    id = app_user_id()
);

CREATE POLICY users_update
ON users FOR UPDATE
USING (
    id = app_user_id()
)
WITH CHECK (
    id = app_user_id()
);

-- ---------------------------------------------------------------------------
-- client_assignments
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS client_assignments_select ON client_assignments;
DROP POLICY IF EXISTS client_assignments_insert ON client_assignments;
DROP POLICY IF EXISTS client_assignments_update ON client_assignments;
DROP POLICY IF EXISTS client_assignments_delete ON client_assignments;

CREATE POLICY client_assignments_select
ON client_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = app_organization_id()
    )
);

CREATE POLICY client_assignments_insert
ON client_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = app_organization_id()
    )
);

CREATE POLICY client_assignments_update
ON client_assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = app_organization_id()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = app_organization_id()
    )
);

CREATE POLICY client_assignments_delete
ON client_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_assignments.client_id
          AND c.organization_id = app_organization_id()
    )
);

-- ---------------------------------------------------------------------------
-- assumption_sets
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS assumption_sets_select ON assumption_sets;
DROP POLICY IF EXISTS assumption_sets_insert ON assumption_sets;
DROP POLICY IF EXISTS assumption_sets_update ON assumption_sets;
DROP POLICY IF EXISTS assumption_sets_delete ON assumption_sets;

CREATE POLICY assumption_sets_select
ON assumption_sets FOR SELECT
USING (
    organization_id IS NULL
    OR organization_id = app_organization_id()
);

CREATE POLICY assumption_sets_insert
ON assumption_sets FOR INSERT
WITH CHECK (
    organization_id IS NULL
    OR organization_id = app_organization_id()
);

CREATE POLICY assumption_sets_update
ON assumption_sets FOR UPDATE
USING (
    organization_id IS NULL
    OR organization_id = app_organization_id()
)
WITH CHECK (
    organization_id IS NULL
    OR organization_id = app_organization_id()
);

CREATE POLICY assumption_sets_delete
ON assumption_sets FOR DELETE
USING (
    organization_id IS NULL
    OR organization_id = app_organization_id()
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_delete ON notifications;

CREATE POLICY notifications_select
ON notifications FOR SELECT
USING (
    organization_id = app_organization_id()
    AND user_id = app_user_id()
);

CREATE POLICY notifications_insert
ON notifications FOR INSERT
WITH CHECK (
    organization_id = app_organization_id()
    AND user_id = app_user_id()
);

CREATE POLICY notifications_update
ON notifications FOR UPDATE
USING (
    organization_id = app_organization_id()
    AND user_id = app_user_id()
)
WITH CHECK (
    organization_id = app_organization_id()
    AND user_id = app_user_id()
);

CREATE POLICY notifications_delete
ON notifications FOR DELETE
USING (
    organization_id = app_organization_id()
    AND user_id = app_user_id()
);

-- ---------------------------------------------------------------------------
-- audit_logs (append-only: still no UPDATE/DELETE policy)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;

CREATE POLICY audit_logs_select
ON audit_logs FOR SELECT
USING (
    organization_id = app_organization_id()
);

CREATE POLICY audit_logs_insert
ON audit_logs FOR INSERT
WITH CHECK (
    organization_id = app_organization_id()
    OR organization_id IS NULL
);
