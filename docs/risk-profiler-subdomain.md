# Risk Profiler subdomain

The client Risk Profiler is a separate public surface in this same project.
The main adviser application remains on the primary hostname; client links use
`https://risk.yourdomain.com/r/<secure-token>` once configured.

## What is already in the codebase

- `/risk-profiler` is the signed-in adviser desk: an adviser can run the same
  assessment in person or create a client link. Both update one shared,
  per-household risk-profile record.
- `/r/<token>` is the public client form and risk-only result. It does not
  show allocation recommendations, plan data or adviser-only client data.
- `VITE_RISK_PROFILER_URL` selects the public base URL used when an adviser
  creates a link. Leave it unset for local development; links use the current
  origin instead.

## Production setup

1. Add `risk.yourdomain.com` as an additional custom domain on the same
   frontend deployment as the main app. Point its DNS record to that host.
   It can serve the same build; the app detects the `risk.` hostname and shows
   the public Risk Profiler landing page at `/`.
2. Set the public build variable `VITE_RISK_PROFILER_URL` to
   `https://risk.yourdomain.com`, then redeploy the frontend. It contains no
   secret.
3. Run `server/db/migrations/0009_risk_assessments.sql` and
   `server/db/migrations/0010_client_risk_profiles.sql` on the shared Postgres
   database before issuing links.
4. If the API is a separate origin, include both the main application origin
   and `https://risk.yourdomain.com` in the server-only `CORS_ORIGIN` list.

For Netlify, attach the custom domain in the site’s Domain management UI; a
domain assignment and DNS record cannot be safely created from `netlify.toml`.
