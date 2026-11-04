# Sound Thesis API

This backend is a clean replacement for the previous server implementation. It intentionally starts as a small API contract server for the current frontend.

It provides:

- Supabase-backed session lookup when `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are configured.
- Local demo login in development.
- In-memory organizations, invitations, clients, profiles, plans, versions, calculations, FX rates, and export payloads when `DATABASE_URL` is not set.
- Postgres-backed persistence when `DATABASE_URL` is set and migrations have been applied.

It persists versioned plans, calculation runs, report metadata, and audit history. Report document rendering/storage and live market integrations remain future work.

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

## Vercel

`api/v1/[...path].ts` adapts the Fastify API to a Vercel Node.js Function and
serves the existing `/api/v1/*` contract. Configure `DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `CORS_ORIGIN` as server-only
variables in both Vercel Preview and Production. Use Supabase's transaction
pooler for `DATABASE_URL` and never expose it through a `VITE_*` variable.
