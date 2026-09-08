# Authorization & Authentication — Sound Thesis Wealth Planner

Owner: Agent 4 (AUTH ENGINEER). Code: `server/auth/**`, `server/middleware/**`,
`server/db/migrations/0100_auth.sql`.

---

## 1. Role model

A user belongs to organizations **through memberships** — there is no
permanent role column on `users` (spec §10). Each membership carries one
role. The platform role (`platform_admin`) operates the platform and has
**no implicit practice privileges**; it is not invitable.

| Role | Purpose |
|---|---|
| `platform_admin` | Platform operations, cross-tenant audit/billing oversight |
| `practice_owner` | Full control of a practice, including billing and permanent client deletion |
| `practice_admin` | Team + settings management, all client work; cannot delete permanently or grant owner/admin roles |
| `wealth_practitioner` | Full client workflow (clients, plans, reports, exports) |
| `associate` | Contributes (plans, scenarios, drafts); cannot export or approve |
| `read_only` | View clients/plans/reports only |

Defined in `server/auth/types.ts` (`ROLES`, `INVITABLE_ROLES`) and
`server/auth/permissions.ts` (`ROLE_PERMISSIONS`).

## 2. Permission matrix

| Permission | platform_admin | practice_owner | practice_admin | wealth_practitioner | associate | read_only |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| org.settings.manage | – | ✓ | ✓ | – | – | – |
| org.billing.manage | ✓ | ✓ | – | – | – | – |
| org.members.invite | –* | ✓ | ✓† | – | – | – |
| org.members.manage (roles, suspend, remove) | – | ✓ | ✓† | – | – | – |
| org.members.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| clients.view | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| clients.create / edit / archive | – | ✓ | ✓ | ✓ | create/edit | – |
| clients.delete (permanent, spec §134) | – | ✓ | – | – | – | – |
| plans.create / edit / approve | – | ✓ | ✓ | ✓ | create/edit | – |
| scenarios.run | – | ✓ | ✓ | ✓ | ✓ | – |
| reports.view / generate / approve | – | ✓ | ✓ | ✓ | view/generate | view |
| reports.export / exports.run | – | ✓ | ✓ | ✓ | – | – |
| documents.manage | – | ✓ | ✓ | ✓ | ✓ | – |
| tasks.manage | – | ✓ | ✓ | ✓ | ✓ | – |
| audit.view | ✓ | ✓ | ✓ | – | – | – |
| integrations.manage (broker) | – | ✓ | ✓ | ✓ | – | – |

\* `platform_admin` passes middleware only when explicitly listed in
`requireRole(...)` — never implicitly.
† Admins cannot invite or manage roles ≥ `practice_admin`
(`canInviteRole`, `roleAtLeast` in `server/auth/permissions.ts`).

## 3. Three enforcement layers (defense stack)

Spec §34's stack is implemented as:

1. **Authentication** — `middleware/requestContext.ts` hashes the
   `soundthesis_session` cookie token and resolves it through the
   SECURITY DEFINER `auth_lookup_session()` (the only way to read a
   session before context exists), then attaches `req.user` /
   `req.session`.
2. **Membership + Authorization** — `middleware/requireAuth.ts` (must be
   authenticated) → `middleware/requireRole.ts` / `requirePermission`
   (membership role must hold the permission) → service-layer checks in
   `server/auth/index.ts` (`canInviteRole`, own-sessions-only
   revocation, active-membership check before org switching).
3. **Tenant-aware repository + RLS** — `requestContext` opens
   `BEGIN` on a **dedicated pooled client**, installs
   `SELECT set_config('app.user_id', ..., true)` /
   `SELECT set_config('app.organization_id', ..., true)` (`is_local :=
   true` = `SET LOCAL`, per-request, so tenant state **cannot leak
   between pooled connections** — spec §§35–36) and hands the client to
   the request as `req.db`. All repository queries in the request MUST
   use `req.db`. At response finish the transaction is COMMITted (or
   ROLLBACKed) and the client released. RLS policies (00xx migrations +
   `0100_auth.sql`) compare `organization_id` / `user_id` against these
   variables via the hardened `app_organization_id()` / `app_user_id()`
   accessors from `0091_rls_hardening.sql`, so absent context cleanly
   denies (NULL) instead of erroring on the empty-string GUC revert
   quirk. If a session points at an org the user no longer belongs to,
   the org context is left empty — queries deny rather than run under a
   stale tenant.

### Elevation model (who can bypass what)

Every table is `FORCE ROW LEVEL SECURITY` — even the table owner is
subject to policies. The API connects as the restricted **`app_user`**
role. The ONLY elevations are SECURITY DEFINER functions owned by the
migration superuser (EXECUTE granted to `app_user` only), defined in
`0100_auth.sql`:

| Function | Purpose |
|---|---|
| `auth_lookup_session(token_hash)` | cookie → session (requestContext) |
| `auth_lookup_user_credentials(email)` | login + reset: email → user + credentials |
| `auth_create_password_reset_token(user, hash, ttl)` | issue reset token (rotating) |
| `auth_lookup_password_reset_token(hash)` | consume reset token pre-context |
| `auth_lookup_invitation(hash)` | peek/accept invitation pre-context (+ org name) |
| `auth_revoke_all_user_sessions(user)` | admin cross-user session revocation |
| `auth_delete_expired_sessions()` | housekeeping |

Everything else — session inserts/updates, credential updates,
membership reads/writes, audit inserts — runs under plain RLS with the
SET LOCAL context and is governed by the policies in `0100_auth.sql`
(own sessions / own credentials / org-scoped invitations).

**POOL CONTRACT for the bootstrap agent**: one pg Pool as `app_user`
goes to `requestContext(pool)` AND `createAuthService(pool)`. Do NOT
hand the service a superuser/owner pool — that would silently bypass the
RLS the whole model depends on.

## 4. Sessions & device management (spec §§38, 40)

- Cookie: `soundthesis_session`, **HttpOnly, SameSite=Lax, Path=/,
  Secure in production** (`server/auth/session.ts`). 30-day expiry.
- Only the SHA-256 hash of the opaque random token is stored
  (`server/auth/tokens.ts`); plaintext never hits the DB or logs.
- `AuthService.listSessions / revokeSession / revokeAllSessions` power
  the "Active sessions" UI. Users may only revoke **their own** sessions
  (IDOR guard: cross-user session IDs 404).
- **Password reset, password change, MFA enable/disable all revoke
  sessions** (reset/MFA-disable revoke *all*; change/enable revoke all
  *other* sessions) — replay of an old session token after revocation
  fails at the session lookup → `AUTH_SESSION_EXPIRED/REVOKED`.
- `adminRevokeUserSessions` exists for platform/practice admins
  (elevation via `auth_revoke_all_user_sessions`).

## 5. Organization switching (spec §37)

`AuthService.switchOrganization(sessionToken, organizationId)`:

1. Validates the session.
2. Verifies an **active membership** for the target org under the user's
   RLS context — otherwise `403 AUTH_MEMBERSHIP_REQUIRED` (cross-org API
   denied, spec §199).
3. Rebinds `sessions.organization_id` (the session's *active* org).
4. Returns the fresh `MePayload`.

`organization_id` on `sessions` is NULL until the user binds an org.
**Client-side contract**: after switching, the SPA must clear
client/plan/notification caches, the selected client, and stale query
keys, then refetch org-scoped configuration (spec §37) — cache keys must
be tenant-prefixed (`organization:abc:user:xyz:client:123`, spec §200).

## 6. Invitations (spec §39)

`AuthService.createInvitation` (owner/admin via
`requirePermission('org.members.invite')`, service double-checks
`canInviteRole`) → `acceptInvitation` runs in **one transaction**: create
user (id pre-generated so the users RLS `WITH CHECK (id = app_user_id)`)
→ credentials → membership (role from invitation) → mark accepted →
audit → session. Single-use, 72-hour expiry, SHA-256-hashed at rest,
revocable. Re-inviting the same email rotates the pending token
(partial unique index on `(organization_id, email) WHERE status =
'pending'`).

## 7. Password reset (spec §38)

`requestPasswordReset` always resolves identically (no account
enumeration). Tokens are single-use, 30-minute, hashed at rest;
`resetPassword` consumes the token, installs the new bcrypt hash,
revokes ALL sessions in the same transaction.

## 8. MFA (TOTP via otpauth, spec §38/§201)

`mfaBeginSetup` → pending secret + `otpauth://` URI (shown once, as QR).
`mfaConfirmSetup` verifies a code (±1 window) before enabling.
`mfaDisable` requires the password and revokes all sessions. TOTP
secrets are stored server-side only and never returned by any endpoint,
logged, or placed in URLs.

## 9. API error contract (spec §42)

All errors are `{ "error": { "code", "message", "details"?, "requestId"? } }`
via `middleware/errors.ts` (`AppError`) + `middleware/errorHandler.ts`
(last middleware; `notFoundHandler` for unmatched routes). Codes live in
`AUTH_ERROR_CODES` (`server/auth/types.ts`): `AUTH_INVALID_CREDENTIALS`,
`AUTH_MFA_REQUIRED`, `AUTH_MFA_INVALID`, `AUTH_ACCOUNT_LOCKED`,
`AUTH_SESSION_EXPIRED`, `AUTH_SESSION_REVOKED`, `AUTH_NOT_AUTHENTICATED`,
`AUTH_MEMBERSHIP_REQUIRED`, `AUTH_INVITATION_INVALID`,
`AUTH_INVITATION_EXPIRED`, `AUTH_RESET_TOKEN_INVALID`,
`AUTH_RESET_TOKEN_EXPIRED`, `AUTH_PASSWORD_TOO_WEAK`, `AUTH_EMAIL_TAKEN`,
`RATE_LIMITED`, `CSRF_MISSING_HEADER`, `FORBIDDEN`, `NOT_FOUND`,
`VALIDATION_ERROR`, `INTERNAL_ERROR`. Internal DB messages are never
exposed; unexpected errors are logged with the request ID.

## 10. Rate limiting & CSRF (spec §§202, CSRF)

- `middleware/rateLimit.ts` — in-memory **sliding window**, keyed per
  **IP + route** (`createRateLimiter({ windowMs, max })`). 429 responses
  carry the error contract plus `Retry-After` / `X-RateLimit-*` headers.
  Recommended mounts: login (5/15 min), password reset + invite
  (5/hour), report generation/exports (30/min), broker sync (20/min). Do
  **not** rate-limit chart interactions. *Process-local store — for
  multi-instance deployments back this with Redis.*
- `middleware/csrf.ts` — for mutating methods on `/api`, requires the
  `X-Requested-With` header (any non-empty value). Combined with
  SameSite=Lax cookies this blocks cross-site request forgery; the API
  must not enable credentialed cross-origin access.

## 11. Threat-model mitigations → code map (spec §199)

| Threat | Mitigation | Location |
|---|---|---|
| IDOR (session revocation) | Own-sessions-only check | `server/auth/index.ts` (`revokeSession`) |
| Cross-org API/switch | Active-membership check before rebind; RLS | `switchOrganization`; `0100_auth.sql` policies |
| Session theft / replay | Hash-at-rest tokens, revocation, expiry, sign-out-all on reset | `session.ts`, `tokens.ts`, `passwordReset.ts` |
| Credential brute force | bcrypt(12), 5-strike lockout (15 min), dummy-hash timing equalization | `index.ts` `login`, `passwords.ts` |
| Account enumeration | Uniform login timing; reset flow resolves silently | `index.ts` `login` / `requestPasswordReset` |
| CSRF | SameSite=Lax + custom header on mutations | `session.ts`, `csrf.ts` |
| Rate-limit abuse | Sliding-window limiter | `rateLimit.ts` |
| Secret leakage (TOTP/PIN/tokens) | Secrets never returned/logged/URL'd; tokens hashed | `totp.ts`, `tokens.ts` |
| Tenant state leak via pooling | `SET LOCAL` inside per-request txn on dedicated client | `requestContext.ts`, `db.ts` |
| RLS bypass via table owner | `FORCE ROW LEVEL SECURITY` + app_user role + definer-only elevations | `0100_auth.sql`, `0090/0091/0095` |
| Auditability | Every auth event writes redacted audit rows | `db.ts` `writeAuditEvent` |

## 12. Audit event contract

Auth events written (spec §203: who/what/when/where/resource/requestId):
`LOGIN`, `LOGOUT`, `SESSION_REVOKED`, `SESSIONS_REVOKED_ALL`,
`ADMIN_SESSIONS_REVOKED`, `INVITATION_SENT`, `INVITATION_ACCEPTED`,
`INVITATION_REVOKED`, `PASSWORD_RESET_REQUESTED`,
`PASSWORD_RESET_COMPLETED`, `PASSWORD_CHANGED`, `MFA_ENABLED`,
`MFA_DISABLED`. Metadata is redacted (no secrets, no tokens).

**Schema contract (0016_audit_logs.sql):** inserts use
`(organization_id, actor_user_id, action, entity_type, entity_id,
ip_address, metadata)` — `request_id` and `user_agent` ride inside
`metadata` JSONB. See `server/auth/db.ts` `writeAuditEvent`.

## 13. DB-dependent verification steps (require a live PostgreSQL)

1. Run all migrations 0001→0100 (`npm run db:migrate`). Fresh DBs run
   0090 then 0091 (hardened policy set) before 0100.
2. Seed a user + `user_auth_credentials` row (bcrypt hash from
   `hashPassword`) plus an organization + `practice_owner` membership.
3. Exercise: `login` → cookie set → `getMe` → `switchOrganization`
   (valid + cross-org denial) → `logout` → replay rejected.
4. RLS test (spec §36): as `app_user` with `app.organization_id` set to
   org A, `SELECT` from an org-scoped table returns zero org-B rows; a
   second request on the same pooled connection sees only its own
   context (no leakage); context-free queries deny cleanly (no error).
5. Invitation accept + password reset flows incl. session invalidation.
6. `npx tsx --test tests/auth/*.test.ts` covers the DB-free units
   (passwords, tokens, TOTP, rate limiter, permission matrix, cookie
   contract) — 26 tests.
