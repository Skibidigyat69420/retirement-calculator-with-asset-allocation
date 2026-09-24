# Sound Thesis API

This backend is a clean replacement for the previous server implementation. It intentionally starts as a small API contract server for the current frontend.

It provides:

- Supabase-backed session lookup when `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are configured.
- Local demo login in development.
- In-memory organizations, invitations, clients, profiles, plans, versions, calculation stubs, FX rates, and export payloads when `DATABASE_URL` is not set.
- Postgres-backed persistence when `DATABASE_URL` is set and migrations have been applied.

It now has the first production persistence layer. Calculation, reports, document storage, and market integrations still need deeper implementations.

## Local Run

```bash
npm install --prefix server
npm run dev --prefix server
```

The frontend dev server proxies `/api/v1` to `http://localhost:4000`.

## Postgres

Set `DATABASE_URL`, then run:

```bash
npm run db:migrate --prefix server
```

For local demo testing only, set `SEED_DEMO_WORKSPACE=true` before starting the backend. Production must leave this disabled.
