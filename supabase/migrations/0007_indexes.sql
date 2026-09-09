-- 0007_indexes.sql
-- Spec-mandated supporting indexes only (no speculative indexes).

CREATE INDEX idx_clients_organization_id ON clients (organization_id);
CREATE INDEX idx_clients_organization_status ON clients (organization_id, status);

CREATE INDEX idx_client_assignments_user_client ON client_assignments (user_id, client_id);

CREATE INDEX idx_retirement_plans_org_client ON retirement_plans (organization_id, client_id);
CREATE INDEX idx_retirement_plans_org_status ON retirement_plans (organization_id, status);
-- current_version_id is a unique lookup (one current version per plan).
CREATE UNIQUE INDEX idx_retirement_plans_current_version
  ON retirement_plans (current_version_id) WHERE current_version_id IS NOT NULL;

-- (plan_id, version_number) uniqueness is enforced by the table's UNIQUE constraint.

CREATE INDEX idx_plan_scenarios_org_plan ON plan_scenarios (organization_id, plan_id);

CREATE INDEX idx_assets_org_client ON assets (organization_id, client_id);

CREATE INDEX idx_goals_org_client ON goals (organization_id, client_id);

CREATE INDEX idx_audit_logs_org_created ON audit_logs (organization_id, created_at DESC);

CREATE INDEX idx_tasks_org_due_at ON tasks (organization_id, due_at);
