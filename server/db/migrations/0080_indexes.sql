-- 0080_indexes.sql
-- Spec section 136 (database indexes), plus:
--   * partial tenant indexes on organization_id WHERE archived_at IS NULL for
--     every soft-deletable table
--   * client search indexes (spec section 12: "Add search indexes and
--     tenant-aware indexes")
--
-- Deliberately not added: dozens of speculative indexes. Measure query plans
-- first (spec section 136).

-- Spec-required indexes.
CREATE INDEX clients_org_idx
    ON clients(organization_id);

CREATE INDEX clients_org_status_idx
    ON clients(organization_id, status);

CREATE INDEX assignments_user_idx
    ON client_assignments(user_id, client_id);

CREATE INDEX plans_org_client_idx
    ON retirement_plans(organization_id, client_id);

CREATE INDEX plans_org_status_idx
    ON retirement_plans(organization_id, status);

CREATE INDEX scenarios_org_plan_idx
    ON plan_scenarios(organization_id, plan_id);

CREATE INDEX assets_org_client_idx
    ON assets(organization_id, client_id);

CREATE INDEX goals_org_client_idx
    ON goals(organization_id, client_id);

CREATE INDEX audit_org_time_idx
    ON audit_logs(organization_id, created_at DESC);

CREATE INDEX tasks_org_due_idx
    ON tasks(organization_id, due_at);

-- Partial tenant indexes: live rows only for soft-deleted tables.
CREATE INDEX clients_org_live_idx
    ON clients(organization_id)
    WHERE archived_at IS NULL;

CREATE INDEX assets_org_live_idx
    ON assets(organization_id, client_id)
    WHERE archived_at IS NULL;

CREATE INDEX liabilities_org_live_idx
    ON liabilities(organization_id, client_id)
    WHERE archived_at IS NULL;

CREATE INDEX retirement_plans_org_live_idx
    ON retirement_plans(organization_id, client_id)
    WHERE archived_at IS NULL;

CREATE INDEX plan_scenarios_org_live_idx
    ON plan_scenarios(organization_id, plan_id)
    WHERE archived_at IS NULL;

CREATE INDEX documents_org_live_idx
    ON documents(organization_id, client_id)
    WHERE archived_at IS NULL;

-- Tenant + supporting indexes for remaining tenant tables.
CREATE INDEX households_org_idx
    ON households(organization_id);

CREATE INDEX organization_memberships_user_idx
    ON organization_memberships(user_id, organization_id)
    WHERE status = 'active';

CREATE INDEX cashflow_rules_org_client_idx
    ON cashflow_rules(organization_id, client_id);

CREATE INDEX risk_assessments_org_client_idx
    ON risk_assessments(organization_id, client_id);

CREATE INDEX plan_versions_org_plan_idx
    ON plan_versions(organization_id, plan_id);

CREATE INDEX meeting_sessions_org_client_idx
    ON meeting_sessions(organization_id, client_id);

CREATE INDEX meeting_checklist_items_org_meeting_idx
    ON meeting_checklist_items(organization_id, meeting_id);

CREATE INDEX meeting_notes_org_meeting_idx
    ON meeting_notes(organization_id, meeting_id);

CREATE INDEX decision_logs_org_client_idx
    ON decision_logs(organization_id, client_id);

CREATE INDEX reports_org_client_idx
    ON reports(organization_id, client_id);

CREATE INDEX notifications_user_unread_idx
    ON notifications(user_id)
    WHERE read_at IS NULL;

CREATE INDEX assumption_sets_org_idx
    ON assumption_sets(organization_id);

-- Client search: name lookup within a tenant, and email lookup.
CREATE INDEX clients_org_name_idx
    ON clients(organization_id, last_name, first_name);

CREATE INDEX clients_email_idx
    ON clients(email);
