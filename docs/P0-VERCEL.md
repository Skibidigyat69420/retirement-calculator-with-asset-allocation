# P0 implementation tracker — Vercel deployment

Deployment target: Vercel. Authentication provider: Supabase (existing backend integration).

## Step 1: authentication

Implemented in code:
- Supabase password sign-in and account signup with confirmation redirect.
- Recovery email request and password-update screen at `/reset-password`.
- SDK-managed session persistence and automatic token refresh.
- Server-validated session restoration through authenticated `GET /api/v1/auth/session`; this endpoint discovers active memberships without an organization header.
- Structured onboarding-required response for accounts without an application user or active practice membership (handled by Step 2).
- Local demo access only with `VITE_AUTH_MODE=dev`; production builds hide demo access. Backend rejects dev authentication in production, and demo login tokens expire after one hour.
- Supabase JWT issuer, audience, expiry and algorithm checks, with a cached JWKS resolver. Legacy HS256 requires an explicitly configured non-default signing secret.

## Step 2: user and practice provisioning

Implemented:
- Unprovisioned Supabase accounts see a setup screen instead of a dead-end access-pending message.
- Create practice: provider-confirmed identity, application user, practice_owner membership, and audit record. A transaction and identity lock make repeat/concurrent submissions safe.
- Join practice: invitation is bound to the confirmed email, stored role, expiry, active practice, and active account. Acceptance is atomic; repeat acceptance does not duplicate membership or upgrade roles.
- Practice team screen (profile menu or /team) lets owners/admins generate and revoke invitation links. Links are shared manually; this feature does not send email. Tokens are stored hashed, shown only when created, and expire after 72 hours.
- Suspended users/memberships/practices cannot regain access through onboarding. Ordinary API requests also reject inactive practices.
- Role management prevents practice admins from promoting themselves to owner/platform admin, and prevents removing/demoting/suspending the last active owner.
- Existing unlinked users with the same email are never silently claimed. ACCOUNT_LINK_REQUIRED needs administrator review; newly registered emails provision normally.

No new database migration is required. This uses the existing users, organizations, organization_memberships, invitations, and audit_logs tables. The API waits for provisioning/invitation-creation transactions to commit before returning success.

Live check: restart the backend after configuring the public key below, sign in with your verified account, enter your full name and practice name, and create the practice. You should reach an empty client directory. Invite another confirmed account through Practice team to check acceptance with real identities.

Validation includes database-backed onboarding tests plus auth, authorization, tenancy, RLS, and mocked-provider browser flows. Browser checks run with npm run test:onboarding:ui; they intercept all provider/API requests and create no real accounts. Real email verification remains a provider-configured acceptance check.

Plan persistence, report records, and Vercel API routing are now implemented. Remaining P0 work is production validation against the real Supabase/Postgres project.

## Configuration for validation

Frontend `.env.local` (Vercel build environment later):

```env
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Only public URL/key belong in `VITE_*`. Never put a service-role key or JWT signing secret there.

Backend environment:

```env
AUTH_MODE=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
DATABASE_URL=YOUR_POSTGRES_CONNECTION
NODE_ENV=development
```

Set `NODE_ENV=production` in production. The local backend scripts load `server/.env`; Vercel must receive the same backend variables in project settings.

In Supabase, enable email/password authentication and email confirmation. Configure the Site URL and allowlist the exact local and deployed `/login` and `/reset-password` redirect URLs. Configure production email delivery before launch. The frontend requests confirmation and recovery through the official SDK; delivery and provider settings must be verified against the actual project.

Local Vite continues to proxy `/api/v1` to port 4000. Vercel exposes the backend through `api/v1/[...path].ts`, so the frontend can use same-origin `/api/v1` in production. The old Docker/Firebase backend has been removed.

## Acceptance checks with a configured Supabase project

1. Sign up, receive confirmation, and verify the email. An unprovisioned identity must see practice setup, not client data.
2. Create a practice for the verified identity. Correct password opens the workspace; wrong password fails. Repeated setup must not create duplicate practices.
3. Reload and refresh a token; the API must accept the current bearer token.
4. Request recovery, follow its email link, set a new password, and sign in again. Invalid/expired links must not report success.
5. Log out and verify a reload cannot restore workspace access; test logout across tabs.
6. Disable a user/membership and verify access is rejected on the next server check.
7. Verify a production build has no demo buttons and the API refuses development login.

## Remaining P0 sequence

- Run migrations against the production Postgres database before first deploy.
- Configure Vercel and Supabase redirect URLs for the final deployment domain.
- Run real-account acceptance checks with email confirmation, onboarding, invitations, client creation, plan save/delete, and report generation.
- Add server-side PDF/document storage later if reports must be downloadable as immutable files instead of browser print output.

References: https://supabase.com/docs/guides/auth/passwords and https://supabase.com/docs/reference/javascript/auth-onauthstatechange

