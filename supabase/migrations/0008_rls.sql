-- 0008_rls.sql
-- Row Level Security for the multi-tenant model.
--
-- DESIGN NOTE: tenant isolation is enforced via a request-scoped GUC,
-- app.current_organization_id, set by the API layer after authenticating the
-- request. current_setting('app.current_organization_id', true) returns NULL
-- when unset, NULL = uuid comparison fails, so the default posture is DENY.
-- Supporting GUCs: app.current_user_id and app.current_role.
--
-- WARNING: the tenant GUC must be set with SET LOCAL inside a transaction so
-- it is rolled back when the transaction ends. NEVER use a plain SET on a
-- pooled connection (Supavisor/pgbouncer reuse connections across tenants) —
-- a plain SET would leak one tenant's context into the next request on the
-- same connection. The service role bypasses RLS entirely.
-- NOTE: CURRENT_ROLE is a reserved keyword, so setting the role GUC requires
-- quoting: SET LOCAL "app.current_role" = '…' (reading via
-- current_setting('app.current_role', true) needs no quotes).

-- Enable RLS on every table.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE retirement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumption_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Standard tenant tables: one policy per operation class, keyed on the org GUC.
-- ---------------------------------------------------------------------------

CREATE POLICY tenant_select ON households FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON households FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON households FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON households FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON clients FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON clients FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON clients FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON clients FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- client_assignments has no organization_id column; tenancy is derived through
-- its parent client.
CREATE POLICY tenant_select ON client_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM clients c
                 WHERE c.id = client_assignments.client_id
                   AND c.organization_id = current_setting('app.current_organization_id', true)::uuid));
CREATE POLICY tenant_insert ON client_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM clients c
                      WHERE c.id = client_assignments.client_id
                        AND c.organization_id = current_setting('app.current_organization_id', true)::uuid));
CREATE POLICY tenant_update ON client_assignments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM clients c
                 WHERE c.id = client_assignments.client_id
                   AND c.organization_id = current_setting('app.current_organization_id', true)::uuid))
  WITH CHECK (EXISTS (SELECT 1 FROM clients c
                      WHERE c.id = client_assignments.client_id
                        AND c.organization_id = current_setting('app.current_organization_id', true)::uuid));
CREATE POLICY tenant_delete ON client_assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM clients c
                 WHERE c.id = client_assignments.client_id
                   AND c.organization_id = current_setting('app.current_organization_id', true)::uuid));

CREATE POLICY tenant_select ON assets FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON assets FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON assets FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON assets FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON liabilities FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON liabilities FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON liabilities FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON liabilities FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON cashflow_rules FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON cashflow_rules FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON cashflow_rules FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON cashflow_rules FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON goals FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON goals FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON goals FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON goals FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON risk_assessments FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON risk_assessments FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON risk_assessments FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON risk_assessments FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON retirement_plans FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON retirement_plans FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON retirement_plans FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON retirement_plans FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON plan_versions FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON plan_versions FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON plan_versions FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON plan_versions FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON plan_scenarios FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON plan_scenarios FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON plan_scenarios FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON plan_scenarios FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON meeting_sessions FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON meeting_sessions FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON meeting_sessions FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON meeting_sessions FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON meeting_checklist_items FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON meeting_checklist_items FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON meeting_checklist_items FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON meeting_checklist_items FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON meeting_notes FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON meeting_notes FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON meeting_notes FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON meeting_notes FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON decision_logs FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON decision_logs FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON decision_logs FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON decision_logs FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON audit_logs FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON audit_logs FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON audit_logs FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON audit_logs FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON reports FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON reports FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON reports FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON reports FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON documents FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON documents FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON documents FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON documents FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON tasks FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON tasks FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON tasks FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON tasks FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY tenant_select ON notifications FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_insert ON notifications FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_update ON notifications FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY tenant_delete ON notifications FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- assumption_sets: global rows (organization_id IS NULL) are visible to every
-- tenant; tenant rows follow the org GUC. Only platform_admin may create
-- global (NULL-organization) rows.
-- ---------------------------------------------------------------------------

CREATE POLICY assumption_sets_select ON assumption_sets FOR SELECT
  USING (organization_id IS NULL
         OR organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY assumption_sets_insert ON assumption_sets FOR INSERT
  WITH CHECK ((organization_id = current_setting('app.current_organization_id', true)::uuid)
              OR (organization_id IS NULL
                  AND current_setting('app.current_role', true) = 'platform_admin'));
CREATE POLICY assumption_sets_update ON assumption_sets FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
  WITH CHECK ((organization_id = current_setting('app.current_organization_id', true)::uuid)
              OR (organization_id IS NULL
                  AND current_setting('app.current_role', true) = 'platform_admin'));
CREATE POLICY assumption_sets_delete ON assumption_sets FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

CREATE POLICY organizations_select ON organizations FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_memberships m
                 WHERE m.organization_id = organizations.id
                   AND m.user_id = current_setting('app.current_user_id', true)::uuid));

CREATE POLICY organizations_insert ON organizations FOR INSERT
  WITH CHECK (current_setting('app.current_role', true) = 'platform_admin');

CREATE POLICY organizations_update ON organizations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_memberships m
                 WHERE m.organization_id = organizations.id
                   AND m.user_id = current_setting('app.current_user_id', true)::uuid
                   AND m.role IN ('practice_owner', 'practice_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM organization_memberships m
                      WHERE m.organization_id = organizations.id
                        AND m.user_id = current_setting('app.current_user_id', true)::uuid
                        AND m.role IN ('practice_owner', 'practice_admin')));

-- ---------------------------------------------------------------------------
-- organization_memberships
-- ---------------------------------------------------------------------------

CREATE POLICY organization_memberships_select ON organization_memberships FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

CREATE POLICY organization_memberships_insert ON organization_memberships FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid
              AND current_setting('app.current_role', true)
                  IN ('platform_admin', 'practice_owner', 'practice_admin'));

CREATE POLICY organization_memberships_update ON organization_memberships FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid
         AND current_setting('app.current_role', true)
             IN ('platform_admin', 'practice_owner', 'practice_admin'))
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid
              AND current_setting('app.current_role', true)
                  IN ('platform_admin', 'practice_owner', 'practice_admin'));

CREATE POLICY organization_memberships_delete ON organization_memberships FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid
         AND current_setting('app.current_role', true)
             IN ('platform_admin', 'practice_owner', 'practice_admin'));

-- ---------------------------------------------------------------------------
-- users: readable if the row IS the current user, or shares an organization
-- membership in the GUC org. Provisioning (INSERT/UPDATE/DELETE) is service-role
-- only, so no mutating policies are defined.
-- ---------------------------------------------------------------------------

CREATE POLICY users_select ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', true)::uuid
         OR EXISTS (SELECT 1 FROM organization_memberships m
                    WHERE m.organization_id = current_setting('app.current_organization_id', true)::uuid
                      AND m.user_id = users.id));

-- ---------------------------------------------------------------------------
-- invitations: managed by org leadership. NOTE: includes 'practice_owner'.
-- ---------------------------------------------------------------------------

CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid
         AND current_setting('app.current_role', true)
             IN ('practice_owner', 'practice_admin'));

CREATE POLICY invitations_insert ON invitations FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid
              AND current_setting('app.current_role', true)
                  IN ('practice_owner', 'practice_admin'));

CREATE POLICY invitations_update ON invitations FOR UPDATE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid
         AND current_setting('app.current_role', true)
             IN ('practice_owner', 'practice_admin'))
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid
              AND current_setting('app.current_role', true)
                  IN ('practice_owner', 'practice_admin'));

CREATE POLICY invitations_delete ON invitations FOR DELETE
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid
         AND current_setting('app.current_role', true)
             IN ('practice_owner', 'practice_admin'));
