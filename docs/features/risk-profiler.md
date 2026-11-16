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

## Connected and portable handoffs

- **Connected client link (default):** start from the household plan,
  optionally answer some questions with the client, then create a link. Those
  initial answers are prefilled in the client form and every later partial
  response is saved to that private link. Only the client’s completed
  submission updates the household’s shared risk profile and main plan.
- **Portable transfer (exception path):** the adviser desk can export a
  signed, risk-only transfer code and a receiving adviser can import it into a
  selected household. The code carries no client name, email, plan, allocation
  or financial data. It is signed by the backend and expires after 180 days.

Set `RISK_PROFILE_EXPORT_KEY` in the backend only if you want a dedicated key
for portable transfer signing; otherwise the backend derives that key from the
already-required `FIELD_ENCRYPTION_KEY`.

## Production setup

1. Add `risk.yourdomain.com` as an additional custom domain on the same
   frontend deployment as the main app. Point its DNS record to that host.
   It can serve the same build; the app detects the `risk.` hostname and shows
   the public Risk Profiler landing page at `/`.
2. Set the public build variable `VITE_RISK_PROFILER_URL` to
   `https://risk.yourdomain.com`, then redeploy the frontend. It contains no
   secret.
3. Run `server/db/migrations/0009_risk_assessments.sql`,
   `server/db/migrations/0010_client_risk_profiles.sql`, and
   `server/db/migrations/0011_risk_profile_imports.sql`, and
   `server/db/migrations/0012_risk_profile_collaboration.sql` on the shared Postgres
   database before issuing links or portable transfers.
4. If the API is a separate origin, include both the main application origin
   and `https://risk.yourdomain.com` in the server-only `CORS_ORIGIN` list.

For Netlify, attach the custom domain in the site’s Domain management UI; a
domain assignment and DNS record cannot be safely created from `netlify.toml`.
