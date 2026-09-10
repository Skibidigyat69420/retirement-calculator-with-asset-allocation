# Deployment Guide

## Option A — everything on Firebase (recommended)

The whole app — SPA, utility API, practitioner backend — runs on Firebase. The SPA talks to the backend **same-origin** (Hosting rewrites `/api/**` to Cloud Functions), so there is no CORS to configure and no `VITE_API_BASE_URL`.

| Piece | Firebase service |
|---|---|
| Frontend (React/Vite SPA) | **Firebase Hosting** (`dist/`, SPA fallback, cache + security headers) |
| Public utility API (`api/` handlers + Angel One proxy) | **Cloud Function `api`** (2nd gen, Node 22, asia-south1) |
| Practitioner backend (`server/`, Fastify, `/api/v1/**`) | **Cloud Function `practitioner`** (own instance + secrets, so a DB problem can never break the public endpoints) |
| Database | **Supabase Postgres** (Firebase has no relational DB; the backend requires one). Free tier is fine. |

### One-time setup (~10 min, mostly clicking)

1. **Firebase project + Blaze plan.** Console → create project (any name). Cloud Functions require the Blaze (pay-as-you-go) plan — add a payment method; this deployment stays within the free monthly allotment for demo use.
2. **Login from this machine** (one browser click):
   ```bash
   npx -y firebase-tools login
   ```
3. **Supabase project** (Postgres): [supabase.com](https://supabase.com) → New project (GitHub OAuth, pick region Mumbai/Singapore). In **Project Settings → Database**, copy the **Connection string (URI)**.
4. **Apply schema + seed** from the repo:
   ```bash
   cd server
   DATABASE_URL='postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres' npm run db:migrate
   ALLOW_SEED=true ALLOW_PROD_SEED=true DATABASE_URL='postgresql://...' npm run db:seed
   ```
   (`db:migrate` is idempotent — safe to re-run. The seed guard requires the explicit `ALLOW_PROD_SEED=true` for supabase.co hosts.)

   **Connection string:** use the **direct connection** or **session pooler** URI from Supabase → Connect. Do NOT use the transaction pooler (port 6543) — the backend's Drizzle/postgres.js driver relies on prepared statements, which transaction pooling doesn't support.
5. **Wire the project + secrets:**
   ```bash
   npx firebase use --add            # pick your Firebase project
   npx firebase functions:secrets:set DATABASE_URL        # paste the Supabase URI
   npx firebase functions:secrets:set SUPABASE_JWT_SECRET # any long random string, e.g. openssl rand -hex 32
   ```
6. **Deploy:**
   ```bash
   npm --prefix functions run build
   npx firebase deploy --only functions,hosting
   ```
7. Open the URL printed under **Hosting URL** (`https://<project>.web.app`). Log in with `adviser@soundthesis.local` (dev login) — full app, one platform.

### Optional Firebase extras

- **Custom domain**: Console → Hosting → Add custom domain.
- **Deploy only the frontend** after UI changes: `npx firebase deploy --only hosting`.
- **Emulators** (local): `npx firebase emulators:start` (set secrets via `functions/.env` — the file is gitignored).

### Security checklist before real client data

- [ ] `AUTH_MODE=dev` **mints a JWT for any email** via `POST /api/v1/auth/dev-login` — demo only. Switch to `AUTH_MODE=supabase` with `SUPABASE_URL` + JWKS config before real clients.
- [ ] Rotate `SUPABASE_JWT_SECRET` to a strong random value (step 5).
- [ ] Keep Supabase's **Row Level Security** enabled (all migrations ship with RLS policies).
- [ ] Restrict Supabase DB access: the DB password is only stored as a Firebase function secret.

---

## Option B — Vercel frontend + Render backend

> Use this if you'd rather avoid Firebase/Blaze. Everything below is wired and tested, and the Vercel side may already be live from the GitHub integration.

Production architecture — three pieces, two platforms:

| Piece | Host | Notes |
|---|---|---|
| Frontend (React/Vite SPA + `api/` serverless functions) | **Vercel** | Static build from `vercel.json` |
| Practitioner backend (`server/`, Fastify) | **Render** | Docker image, repo-root build context |
| Backend database | **Render Postgres** | Migrations auto-applied on boot |

### 1. Backend + database — Render (one-time, ~5 min)

1. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** → connect the GitHub repo.
2. Render reads `render.yaml` and creates:
   - `stw-postgres` — managed Postgres (free tier: expires in 90 days, upgrade for permanent),
   - `stw-api` — Docker web service. The container applies `supabase/migrations` on every boot (`npm run db:migrate` inside the entrypoint), then starts Fastify on port 4000. `/health` is the health-check endpoint.
   - `stw-seed` — one-off job with demo practice + client data.
3. After the first deploy succeeds, run the seed once: Blueprint page → `stw-seed` → **Run job**.
4. In `stw-api` → Environment, set `CORS_ORIGIN` to your Vercel URL from step 2 (e.g. `https://your-app.vercel.app`) and save (triggers redeploy).
5. Note the API URL: `https://stw-api.onrender.com`. Test it: `curl https://stw-api.onrender.com/health` → `{"status":"ok",...}`.

Free-tier Render services sleep after ~15 min idle; first request takes ~30 s to wake.

### 2. Frontend — Vercel (one-time, ~3 min)

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo. Vercel auto-detects Vite; `vercel.json` supplies the build command, SPA rewrite, and security headers.
2. Add one environment variable:
   - `VITE_API_BASE_URL` = `https://stw-api.onrender.com/api/v1`
3. Deploy. Every later push to `main` auto-deploys.

### Optional: deploy from GitHub Actions instead

If you prefer deploys via the workflow in `.github/workflows/deploy-vercel.yml`, set these repo secrets (Settings → Secrets → Actions):
- `VERCEL_TOKEN` — from [vercel.com/account/tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` — from your project's `.vercel/project.json` (run `npx vercel link` locally), or the project settings URL

Without the secrets the workflow prints a warning and skips — nothing breaks.

### 3. Verification

```bash
# Backend
curl https://stw-api.onrender.com/health
curl -X POST https://stw-api.onrender.com/api/v1/auth/dev-login \
  -H 'content-type: application/json' \
  -d '{"email":"adviser@soundthesis.local"}'

# Frontend: open https://your-app.vercel.app → login with the seeded
# practitioner account from the seed job output.
```

### Security checklist (Option B)

- [ ] `AUTH_MODE=dev` **mints a JWT for any email** — demo only. Switch to `AUTH_MODE=supabase` with `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (or `SUPABASE_JWKS_URL`) and provision auth users.
- [ ] Set a strong random `SUPABASE_JWT_SECRET` (any long random string works in dev mode too).
- [ ] `ALLOW_SEED=true` only exists on the `stw-seed` job — never add it to `stw-api`.
- [ ] Render Postgres free tier expires; use a paid plan or Supabase for anything real.

## Local production-like run (Docker)

```bash
docker build -f server/Dockerfile -t stw-api .
docker run --rm -p 4000:4000 -e DATABASE_URL=postgres://... -e AUTH_MODE=dev stw-api
```
