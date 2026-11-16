-- Client-facing risk-profiler submissions. The access token is stored only as
-- a hash; questionnaire answers and the recipient name use the existing
-- application-level encryption envelope before being written to JSON/text.
create table if not exists risk_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  recipient_name text,
  access_token_hash text not null unique,
  status text not null default 'invited' check (status in ('invited', 'completed')),
  answers jsonb not null default '{}'::jsonb,
  risk_score integer check (risk_score between 0 and 100),
  risk_verdict text check (risk_verdict in ('Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive')),
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists risk_assessments_client_created_idx
  on risk_assessments (organization_id, client_id, created_at desc);

alter table risk_assessments enable row level security;

drop policy if exists risk_assessments_org_access on risk_assessments;
create policy risk_assessments_org_access on risk_assessments
  for all
  using (stw_is_current_org(organization_id))
  with check (stw_is_current_org(organization_id));

-- The API temporarily sets this transaction-local value after hashing the
-- bearer link token. This lets a recipient read and submit only their own
-- assessment without opening a broad anonymous database policy.
drop policy if exists risk_assessments_public_token_access on risk_assessments;
create policy risk_assessments_public_token_access on risk_assessments
  for select
  using (access_token_hash = nullif(current_setting('app.risk_access_token_hash', true), ''));

drop policy if exists risk_assessments_public_token_submit on risk_assessments;
create policy risk_assessments_public_token_submit on risk_assessments
  for update
  using (access_token_hash = nullif(current_setting('app.risk_access_token_hash', true), ''))
  with check (access_token_hash = nullif(current_setting('app.risk_access_token_hash', true), ''));
