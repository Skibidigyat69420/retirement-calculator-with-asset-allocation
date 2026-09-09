# Sound Thesis Wealth — Backend

Multi-tenant backend for the wealth-practitioner platform: **PostgreSQL (Supabase) as the system of record** plus a **Fastify API** (`server/`). Implements the backend spec from `sound_thesis_wealth_practitioner_ai_harness_prompt_expanded (1).md` (schema §9–33, tenancy §34–37, auth §38–41, API contracts §42–46, services §47–50).

## Layout

```
supabase/
  migrations/0001..0008  schema → indexes → RLS (plain SQL; supabase CLI or psql)
  config.toml            supabase project config
  README.md              migration application + RLS/GUC details
server/
  src/
    config.ts            zod-validated env
    db/                  postgres.js pool + drizzle; withTenant() (transaction-scoped GUCs)
    auth/                JWT verification (Supabase JWKS / HS256 dev mode)
    tenancy/             x-organization-id membership resolution
    permissions/         role matrix + can* policy functions (spec §41)
    http/                error contract, cursor pagination, request IDs
    audit/               audit log service with secret redaction
    contracts/           shared error/pagination types
    repositories/        tenant-aware DB access
    services/            domain logic incl. CalculationService (wraps src/lib/wealthEngine)
    routes/              thin zod-validated handlers under /api/v1
  scripts/seed.ts        demo data (guarded; never runs on prod Supabase by accident)
  test/                  84 tests: core, calculation, tenancy isolation, authorization
                         matrix, idempotency/rate-limit, direct RLS
```

## Quickstart (local, no Supabase needed)

Requires any PostgreSQL 14+ (a server on `localhost:54330` was used during development; any DATABASE_URL works).

```bash
# 1. create DB + apply schema
createdb stw_dev
for f in ../supabase/migrations/*.sql; do psql -d stw_dev -v ON_ERROR_STOP=1 -f "$f"; done

# 2. configure
cp .env.example .env   # set DATABASE_URL=postgres://user@host:5432/stw_dev

# 3. seed demo practice + client, then run
npm run db:seed        # requires ALLOW_SEED=true; refuses *.supabase.co unless ALLOW_PROD_SEED=true
npm run dev            # http://localhost:4000

# 4. log in (dev mode mints a Supabase-shaped JWT by email)
curl -X POST localhost:4000/api/v1/auth/dev-login \
  -H 'content-type: application/json' \
  -d '{"email":"you@soundthesis.local"}'
# then call APIs with headers:
#   authorization: Bearer <token>
#   x-organization-id: <org id from seed output>
```

## Using real Supabase

1. Create a Supabase project; run `supabase/migrations` via `supabase db push` (or paste into the SQL editor in order).
2. Create buckets `reports` and `documents` (private).
3. Set env: `AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL` (default `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`) or `SUPABASE_JWT_SECRET` for HS256 (legacy/default local).
4. Provision users: on invite acceptance in `supabase` mode, link `users.auth_user_id` to the Supabase auth user (the dev-mode accept flow auto-provisions; in supabase mode it returns 501 until wired to Supabase admin invites — see TODOs).
5. RLS is defense-in-depth: the API always sets `app.current_organization_id/user_id/role` via `set_config(..., true)` inside a per-request transaction (`withTenant`), and repositories also filter by `organization_id` explicitly.

## Tests

```bash
npm test          # 84 tests; needs PostgreSQL on localhost:54330 (DATABASE_URL / TEST_DATABASE_URL)
npm run typecheck
```

- `test/migratedDb.ts` creates `stw_test`, applies all migrations via psql, serializes parallel files with an advisory lock.
- `tenancyIsolation.test.ts` (spec §148) and `authorization.test.ts` (spec §149) are the mandatory security suites.
- `rlsDirect.test.ts` proves default-deny RLS with a NOSUPERUSER role and no GUC leakage across pooled connections.

## Security model

- Auth → membership → can* policy → tenant-aware repository → RLS → row (defense in depth).
- Roles: platform_admin > practice_owner > practice_admin > wealth_practitioner > associate > read_only; client-scope via client_assignments (primary/secondary/associate/viewer).
- Standard error envelope `{error:{code,message,requestId}}`; internal details only in dev.
- Cursor pagination (default 25, max 100); rate limiting (default 300/min/IP, `rateLimitMax` option).
- Audit logs redact keys matching /token|secret|password|pin|totp/i. Broker secrets must never be logged or returned.
- Report/document downloads go through authorization and short-lived signed URLs (501 `STORAGE_NOT_CONFIGURED` until Supabase storage env is set).

## Known limitations / TODOs

- PDF generation and real file upload are placeholders (honest 501s); report generation is a state transition, not a worker.
- `retirementYear` / `planHealth` client-list filters not yet implemented.
- `swp.postRetirementReturn` is not consumed by the frontend engine's distribution phase (engine caveat); `requiredCorpus` applies it via closed-form annuity math instead.
- Invitation acceptance auto-provisions users in `AUTH_MODE=dev` only; supabase mode needs the Supabase admin invite flow wired.
- Routes send the HTTP response inside the tenant transaction callback — a read-your-writes latency nuance documented in the test suite; revisit if it becomes observable.
- The repo's quant audit (frontend engine fixes, §5 of the spec) is a separate workstream — the backend wraps the engine as-is.
