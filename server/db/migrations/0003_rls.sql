-- Row Level Security for tenant isolation.
-- Policies use backend-set Postgres settings:
--   app.auth_user_id      Supabase auth user id while resolving/provisioning identity
--   app.user_id           Sound Thesis application user id after identity resolution
--   app.organization_id   Active practice/workspace id for tenant-scoped reads/writes

create or replace function stw_current_auth_user_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.auth_user_id', true), '')
$$;

create or replace function stw_current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function stw_current_organization_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.organization_id', true), '')::uuid
$$;

create or replace function stw_has_active_membership(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_memberships m
    join users u on u.id = m.user_id
    where m.organization_id = org_id
      and m.status = 'active'
      and (
        m.user_id = stw_current_user_id()
        or u.auth_user_id = stw_current_auth_user_id()
      )
  )
$$;

create or replace function stw_is_current_org(org_id uuid)
returns boolean
language sql
stable
as $$
  select org_id = stw_current_organization_id() and stw_has_active_membership(org_id)
$$;

alter table users enable row level security;
alter table organizations enable row level security;
alter table organization_memberships enable row level security;
alter table practice_invitations enable row level security;
alter table clients enable row level security;
alter table client_assignments enable row level security;
alter table financial_resources enable row level security;
alter table plans enable row level security;
alter table plan_versions enable row level security;
alter table audit_events enable row level security;
alter table reports enable row level security;

drop policy if exists users_self_select on users;
create policy users_self_select on users
  for select
  using (auth_user_id = stw_current_auth_user_id() or id = stw_current_user_id());

drop policy if exists users_self_insert on users;
create policy users_self_insert on users
  for insert
  with check (auth_user_id = stw_current_auth_user_id());

drop policy if exists users_self_update on users;
create policy users_self_update on users
  for update
  using (auth_user_id = stw_current_auth_user_id() or id = stw_current_user_id())
  with check (auth_user_id = stw_current_auth_user_id() or id = stw_current_user_id());

drop policy if exists organizations_member_access on organizations;
create policy organizations_member_access on organizations
  for all
  using (stw_is_current_org(id))
  with check (id = stw_current_organization_id() or stw_current_organization_id() is null);

drop policy if exists memberships_member_access on organization_memberships;
create policy memberships_member_access on organization_memberships
  for select
  using (stw_has_active_membership(organization_id) or user_id = stw_current_user_id());

drop policy if exists memberships_member_insert on organization_memberships;
create policy memberships_member_insert on organization_memberships
  for insert
  with check (stw_current_organization_id() is null or organization_id = stw_current_organization_id());

drop policy if exists memberships_member_update on organization_memberships;
create policy memberships_member_update on organization_memberships
  for update
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));

drop policy if exists invitations_org_access on practice_invitations;
create policy invitations_org_access on practice_invitations
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));

drop policy if exists invitations_token_acceptance on practice_invitations;
create policy invitations_token_acceptance on practice_invitations
  for select
  using (status = 'pending' and expires_at > now());

-- Tenant-owned tables.
drop policy if exists clients_org_access on clients;
create policy clients_org_access on clients
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));

drop policy if exists client_assignments_org_access on client_assignments;
create policy client_assignments_org_access on client_assignments
  for all
  using (exists (select 1 from clients c where c.id = client_id and stw_is_current_org(c.organization_id)))
  with check (exists (select 1 from clients c where c.id = client_id and stw_is_current_org(c.organization_id)));

drop policy if exists financial_resources_org_access on financial_resources;
create policy financial_resources_org_access on financial_resources
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));

drop policy if exists plans_org_access on plans;
create policy plans_org_access on plans
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));

drop policy if exists plan_versions_org_access on plan_versions;
create policy plan_versions_org_access on plan_versions
  for all
  using (exists (select 1 from plans p where p.id = plan_id and stw_is_current_org(p.organization_id)))
  with check (exists (select 1 from plans p where p.id = plan_id and stw_is_current_org(p.organization_id)));

drop policy if exists audit_events_org_access on audit_events;
create policy audit_events_org_access on audit_events
  for all
  using (organization_id is null or stw_is_current_org(organization_id))
  with check (organization_id is null or stw_is_current_org(organization_id));

drop policy if exists reports_org_access on reports;
create policy reports_org_access on reports
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));
