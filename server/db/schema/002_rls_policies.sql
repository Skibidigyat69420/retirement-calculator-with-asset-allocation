-- 002_rls_policies.sql
-- Enable Row Level Security and setup tenant isolation policies

-- Helper function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_organization_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 1. Enable RLS on all tenant-aware tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Also enable for mapping tables like client_assignments
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for standard tenant-isolated tables
-- A policy template that enforces organization_id matches the session variable

DO $$ 
DECLARE
    tenant_table text;
    tables_with_org_id text[] := ARRAY[
        'households', 'clients', 'assets', 'liabilities', 'cashflow_rules', 
        'goals', 'risk_assessments', 'retirement_plans', 'plan_versions', 
        'plan_scenarios', 'meeting_sessions', 'meeting_checklist_items', 
        'meeting_notes', 'decision_logs', 'reports', 'documents', 'tasks', 'notifications'
    ];
BEGIN
    FOREACH tenant_table IN ARRAY tables_with_org_id LOOP
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I 
             FOR ALL 
             USING (organization_id = current_tenant_id()) 
             WITH CHECK (organization_id = current_tenant_id());', 
            tenant_table
        );
    END LOOP;
END $$;

-- 3. Special Policies

-- Organizations: users can only see their own organization based on the session variable
-- (In a real app, you might allow reading basic org data for members)
CREATE POLICY org_isolation_policy ON organizations
    FOR ALL
    USING (id = current_tenant_id())
    WITH CHECK (id = current_tenant_id());

-- Organization Memberships: Can see memberships for current organization
CREATE POLICY membership_isolation_policy ON organization_memberships
    FOR ALL
    USING (organization_id = current_tenant_id())
    WITH CHECK (organization_id = current_tenant_id());

-- Assumption Sets: Can see global assumptions (organization_id IS NULL) OR tenant assumptions
CREATE POLICY assumption_sets_isolation_policy ON assumption_sets
    FOR ALL
    USING (organization_id IS NULL OR organization_id = current_tenant_id())
    WITH CHECK (organization_id = current_tenant_id());

-- Client Assignments: Need to check via clients table since it doesn't have organization_id
-- Alternatively, we can just let the application layer handle assignments or join with clients.
-- For strict RLS without org_id on the assignment table:
CREATE POLICY client_assignments_isolation_policy ON client_assignments
    FOR ALL
    USING (
        client_id IN (SELECT id FROM clients WHERE organization_id = current_tenant_id())
    )
    WITH CHECK (
        client_id IN (SELECT id FROM clients WHERE organization_id = current_tenant_id())
    );

-- Users: Usually no organization_id. Often handled at app layer or visible only to peers in same org.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Simple policy: users can see themselves, or app logic bypasses RLS (e.g. using a superuser for auth).
-- For now, allow viewing all users to avoid breaking auth, but restrict updates to self.
CREATE POLICY users_view_policy ON users FOR SELECT USING (true);
CREATE POLICY users_update_policy ON users FOR UPDATE USING (id = current_setting('app.current_user_id', true)::UUID);
