# Supabase database layer

PostgreSQL (Supabase) schema for the Sound Thesis Wealth multi-tenant
wealth-practitioner platform.

## Layout

- `config.toml` — minimal Supabase CLI project config (project id
  `sound-thesis-wealth`, API port 54331).
- `migrations/0001…0008` — ordered, append-only SQL migrations:
  1. `0001_extensions_and_types.sql` — `citext`, `pgcrypto`, `set_updated_at()` trigger function
  2. `0002_core_identity.sql` — `organizations`, `users`, `organization_memberships`
  3. `0003_clients_and_households.sql` — `households`, `clients`, `client_assignments`
  4. `0004_financial_profile.sql` — `assets`, `liabilities`, `cashflow_rules`, `goals`, `risk_assessments`
  5. `0005_plans_scenarios_assumptions.sql` — `retirement_plans`, `plan_versions`, `plan_scenarios`, `assumption_sets`
  6. `0006_collaboration.sql` — meetings, notes, decisions, audit, reports, documents, tasks, notifications, invitations
  7. `0007_indexes.sql` — spec-mandated indexes
  8. `0008_rls.sql` — Row Level Security on every table

Migrations are plain SQL and idempotent in intent (append-only: never edit an
applied migration; add a new one).

## Applying migrations

### Supabase CLI

```sh
supabase link --project-ref <project-ref>
supabase db push          # applies everything in migrations/ in order
```

Or against local Supabase: `supabase start && supabase db reset`.

### Plain psql

Each file applies cleanly on a fresh PostgreSQL with a one-liner loop:

```sh
for f in supabase/migrations/00*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

## Tenant isolation (RLS) and the GUC

Every tenant-owned row carries `organization_id`. Row Level Security policies
compare it against the request-scoped setting:

```sql
current_setting('app.current_organization_id', true)::uuid
```

The API layer sets three GUCs after authenticating each request:

| GUC                       | Meaning                                   |
|---------------------------|-------------------------------------------|
| `app.current_organization_id` | tenant scope for row filtering          |
| `app.current_user_id`     | the `users.id` of the caller              |
| `app.current_role`        | membership role used by role-gated policies |

`current_setting(..., true)` returns NULL when unset, and NULL fails the uuid
comparison — so an unset GUC means **default-deny**.

**Connection pooling safety:** always set the GUC with `SET LOCAL` inside the
request transaction:

```sql
BEGIN;
SET LOCAL app.current_organization_id = '…';
SET LOCAL app.current_user_id = '…';
SET LOCAL app.current_role = 'wealth_practitioner';
-- …application queries…
COMMIT;
```

Never use a plain `SET` on a pooled connection (Supavisor/pgbouncer reuses
connections across tenants). The service role bypasses RLS entirely and is
used for provisioning (e.g. creating `users` rows).

Note: `CURRENT_ROLE` is a reserved keyword, so the role GUC must be quoted
when set (`SET LOCAL "app.current_role" = '…'`); reading it via
`current_setting('app.current_role', true)` needs no quotes.

Special cases:

- `assumption_sets.organization_id IS NULL` means a global assumption set,
  visible to all tenants; only `platform_admin` may insert/update global rows.
- `client_assignments` has no `organization_id`; its policies derive tenancy
  through the parent `clients` row.
- `users` has no mutating policies — user provisioning is service-role only.
