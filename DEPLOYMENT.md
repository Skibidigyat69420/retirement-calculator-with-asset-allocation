# Deployment Guide

Production architecture — three pieces, two platforms:

| Piece | Host | Notes |
|---|---|---|
| Frontend (React/Vite SPA + `api/` serverless functions) | **Vercel** | Static build from `vercel.json` |
| Practitioner backend (`server/`, Fastify) | **Render** | Docker image, repo-root build context |
| Backend database | **Render Postgres** | Migrations auto-applied on boot |

---

## 1. Backend + database — Render (one-time, ~5 min)

1. [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** → connect the GitHub repo.
2. Render reads `render.yaml` and creates:
   - `stw-postgres` — managed Postgres (free tier: expires in 90 days, upgrade for permanent),
   - `stw-api` — Docker web service. The container applies `supabase/migrations` on every boot (`npm run db:migrate` inside the entrypoint), then starts Fastify on port 4000. `/health` is the health-check endpoint.
   - `stw-seed` — one-off job with demo practice + client data.
3. After the first deploy succeeds, run the seed once: Blueprint page → `stw-seed` → **Run job**.
4. In `stw-api` → Environment, set `CORS_ORIGIN` to your Vercel URL from step 2 (e.g. `https://your-app.vercel.app`) and save (triggers redeploy).
5. Note the API URL: `https://stw-api.onrender.com`. Test it: `curl https://stw-api.onrender.com/health` → `{"status":"ok",...}`.

Free-tier Render services sleep after ~15 min idle; first request takes ~30 s to wake.

## 2. Frontend — Vercel (one-time, ~3 min)

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo. Vercel auto-detects Vite; `vercel.json` supplies the build command, SPA rewrite, and security headers.
2. Add one environment variable:
   - `VITE_API_BASE_URL` = `https://stw-api.onrender.com/api/v1`
3. Deploy. Every later push to `main` auto-deploys.

### Optional: deploy from GitHub Actions instead

If you prefer deploys via the workflow in `.github/workflows/deploy-vercel.yml`, set these repo secrets (Settings → Secrets → Actions):
- `VERCEL_TOKEN` — from [vercel.com/account/tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` — from your project's `.vercel/project.json` (run `npx vercel link` locally), or the project settings URL

Without the secrets the workflow prints a warning and skips — nothing breaks.

## 3. Verification

```bash
# Backend
curl https://stw-api.onrender.com/health
curl -X POST https://stw-api.onrender.com/api/v1/auth/dev-login \
  -H 'content-type: application/json' \
  -d '{"email":"adviser@soundthesis.local"}'

# Frontend: open https://your-app.vercel.app → login with the seeded
# practitioner account from the seed job output.
```

## Security checklist before real client data

- [ ] `AUTH_MODE=dev` **mints a JWT for any email** — demo only. Switch to `AUTH_MODE=supabase` with `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (or `SUPABASE_JWKS_URL`) and provision auth users.
- [ ] Set a strong random `SUPABASE_JWT_SECRET` (any long random string works in dev mode too).
- [ ] `ALLOW_SEED=true` only exists on the `stw-seed` job — never add it to `stw-api`.
- [ ] Render Postgres free tier expires; use a paid plan or Supabase for anything real.

## Local production-like run (Docker)

```bash
docker build -f server/Dockerfile -t stw-api .
docker run --rm -p 4000:4000 -e DATABASE_URL=postgres://... -e AUTH_MODE=dev stw-api
```
