# Database

PostgreSQL 17 is the system of record for the Sound Thesis Wealth Planner.
Tenancy is enforced defense-in-depth with **default-deny Row-Level Security**
on every tenant table (spec sections 34–37).

## Connection configuration

| Setting | Source | Default |
|---|---|---|
| Database URL | `DATABASE_URL` env | `postgres://postgres:postgres@localhost:5432/wealth_planner` |
| Pool size | `DATABASE_POOL_MAX` env | `10` |

`server/db/connection.ts` exports the shared `pg` `Pool` used by the API.

**The API must connect as `app_user`, never as a superuser.** PostgreSQL
silently bypasses RLS for superusers and `BYPASSRLS` roles — if the API used
the `postgres` role, every policy below would be a no-op (this was caught in
verification; see `server/db/verify-rls.ts`).

- `app_user` is created by migration `0095_app_role.sql` with the local-dev
  password `app_user_dev_password` (overridable at migrate time via the
  `app.app_user_password` custom GUC). **Production must provision the role
  and password through infrastructure/secrets management.**
- Migrations and the seed intentionally run as the superuser (schema changes
  and demo data need to bypass RLS).

## Running PostgreSQL

### Option A — Docker (preferred where available)

```bash
docker compose up -d          # postgres:17, port 5432
npm run db:migrate
npm run db:seed
```

### Option B — Any PostgreSQL 17 you already have

All migrations are plain SQL and can be applied manually:

```bash
createdb wealth_planner
for f in $(ls server/db/migrations/*.sql | sort); do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
npm run db:seed
```

Note: manual application bypasses `schema_migrations` tracking, so
`npm run db:migrate` will re-apply files afterwards. Prefer the runner.

### Option C — standalone binaries (used for CI on this machine)

This machine has the Docker daemon installed but the user is not in the
`docker` group, so verification used standalone PostgreSQL 17.11 binaries
downloaded into `.tmp-pg/` (untracked dev artifact; safe to delete when the
database is no longer needed):

```bash
export LD_LIBRARY_PATH="$PWD/.tmp-pg/ext/usr/lib/x86_64-linux-gnu"
BIN="$PWD/.tmp-pg/postgresql-17.11.0-x86_64-unknown-linux-gnu/bin"
"$BIN/pg_ctl" -D "$PWD/.tmp-pg/data" -l "$PWD/.tmp-pg/pg.log" \
  -o "-p 5432 -k /tmp" start   # initdb was run once with --auth=trust
```

The server is currently running with a fully migrated + seeded database;
`npm run db:migrate` / `db:seed` work against it with the default URL.

## Migrations

- Live in `server/db/migrations/`, applied in **filename order** by
  `npm run db:migrate` (`server/db/migrate.ts`).
- Each migration runs in its own transaction; a SQL error rolls it back and
  the runner exits non-zero.
- Applied files are recorded in `schema_migrations` — re-running is a no-op.
- Every schema change must be a new numbered migration file; never edit the
  database by hand (spec section 206).

Inventory:

| File | Contents |
|---|---|
| `0001_extensions.sql` | `pgcrypto`, `citext`, `touch_updated_at()` trigger function |
| `0002_organizations_users.sql` | `organizations`, `users` |
| `0003_memberships.sql` | `organization_memberships` (roles live here, not on users) |
| `0004_households_clients.sql` | `households`, `clients` |
| `0005_client_assignments.sql` | `client_assignments` (composite PK, no `organization_id`) |
| `0006_assets_liabilities.sql` | `assets`, `liabilities` |
| `0007_cashflow_rules.sql` | `cashflow_rules` (income/expense/sip/stp/swp/transfer) |
| `0008_goals.sql` | `goals` |
| `0009_risk_assessments.sql` | `risk_assessments` (immutable history) |
| `0010_retirement_plans.sql` | `retirement_plans` |
| `0011_plan_versions.sql` | `plan_versions` (immutable input/assumption/result snapshots) |
| `0012_plan_scenarios.sql` | `plan_scenarios` (pinned to base plan version) |
| `0013_assumption_sets.sql` | `assumption_sets` (`organization_id NULL` = global) |
| `0014_meetings.sql` | `meeting_sessions`, `meeting_checklist_items`, `meeting_notes` |
| `0015_decision_logs.sql` | `decision_logs` (planning narrative) |
| `0016_audit_logs.sql` | `audit_logs` (system accountability, append-only) |
| `0017_reports_documents.sql` | `reports`, `documents` (metadata; binaries in object storage) |
| `0018_tasks_notifications.sql` | `tasks`, `notifications` |
| `0080_indexes.sql` | Spec §136 indexes, partial live-row tenant indexes, client search |
| `0090_rls.sql` | RLS policies + `set_tenant_context()` (initial) |
| `0091_rls_hardening.sql` | Recreates all policies via `app_organization_id()` / `app_user_id()` |
| `0095_app_role.sql` | `app_user` role + grants (incl. default privileges for later tables) |
| `0100_auth.sql` | owned by the auth agent (sessions, etc.) |

Enums are `TEXT` + `CHECK` constraints per the spec (no enum types).
`retirement_plans.current_version_id → plan_versions` and
`plan_scenarios.assumption_set_id → assumption_sets` FKs are added in later
migrations than their tables because the targets must exist first.

## Tenancy and RLS model

Request-scoped tenant context:

```sql
SELECT set_tenant_context(:organization_id, :user_id);
```

- `set_tenant_context()` uses `SET LOCAL` semantics (spec section 36 — the
  IMPORTANT RLS edge case). The values evaporate at `COMMIT`/`ROLLBACK` and
  can never bleed into the next checkout of a pooled connection.
- **Every request that touches tenant data must run inside a transaction**
  (`BEGIN` → `set_tenant_context` → queries → `COMMIT`). Without a
  transaction the context applies only to the enclosing auto-commit
  statement.
- Policies key on `app_organization_id()` / `app_user_id()` (defined in
  `0091_rls_hardening.sql`). These wrap `current_setting(..., true)` in
  `NULLIF(..., '')` because of a PostgreSQL quirk: after `SET LOCAL` reverts,
  a custom GUC reads back as `''` (empty string), not NULL — raw `::uuid`
  casts then error instead of denying.
- **Every tenant table has `FORCE ROW LEVEL SECURITY`** so the table owner
  is also subject to policies.
- `client_assignments` has no `organization_id`; its policies key through the
  parent client (`EXISTS (SELECT 1 FROM clients ...)`). The subquery is
  itself RLS-protected, so a cross-org JOIN cannot expose rows.
- Special cases:
  - `organization_memberships`: readable by org context **or** by the row's
    own user (the login flow must resolve memberships before tenant context
    exists); writes always require org context.
  - `organizations`: readable/writable by members; insertable by any
    authenticated user (org bootstrap must create the `practice_owner`
    membership in the same transaction).
  - `users`: visible to self + same-org members; modifiable only by self.
  - `assumption_sets`: global rows (`organization_id IS NULL`) readable by
    all tenants; practice overrides visible only to their tenant. Writing
    global sets is a platform-admin operation and must be enforced at the app
    layer (RLS cannot distinguish platform admins).
  - `notifications`: tenant-scoped **and** user-scoped.
  - `audit_logs`: append-only — SELECT + INSERT policies only; UPDATE and
    DELETE are denied by default.
- Platform-wide operations (platform_admin across tenants) require a
  separate elevated path (a `BYPASSRLS` role used deliberately, or
  `SECURITY DEFINER` functions). Do not connect the API as a superuser.

## Multi-statement operations (spec sections 140–142)

Operations such as *create client + default plan*, *create plan + version v1 +
update current_version_id + decision log + audit log*, and *apply
recommendation + new version + decision log + task* must run in a single
transaction with the tenant context set — partial state is never acceptable.

## Seed

`npm run db:seed` (`server/db/seed.ts`) creates, idempotently
(deterministic UUIDs + `ON CONFLICT DO NOTHING`; safe to re-run):

- **Sound Thesis Demo Practice** (slug `sound-thesis-demo-practice`), marked
  `DEMO` in settings: 5 practitioners, 10 households, 25 clients, assets,
  goals, risk assessments, cashflows, 6 plans with versions + scenarios,
  reports, tasks, decision history, audit activity, meetings with checklists
  and notes, notifications.
- Featured demo client **Raj Sharma** — age 52, retirement 2033, net worth
  ₹6.84 Cr, plan health 82 (spec section 180).
- **Northstar Wealth (Demo)** — a second tenant (1 practitioner, 1 client)
  so cross-tenant isolation is testable.

The seed refuses to run when `NODE_ENV=production` unless
`ALLOW_DEMO_SEED=true` is set explicitly (spec section 207: never seed fake
client data in production by accident).

## Verification

```bash
npm run db:migrate                       # zero SQL errors, prints applied files
npm run db:seed                          # demo data, idempotent
npx tsx server/db/verify-rls.ts          # 21 checks; exits non-zero on failure
```

`verify-rls.ts` connects as `app_user` (derived from `DATABASE_URL`, or set
`VERIFY_DATABASE_URL` / `APP_USER_PASSWORD` explicitly) and proves:
default-deny without context, per-org visibility in both directions,
cross-org INSERT rejection, `SET LOCAL` evaporation after COMMIT on a reused
connection, the special policies above, and append-only audit logs.

All 21 checks pass against PostgreSQL 17.11 as of 2026-09-08.
