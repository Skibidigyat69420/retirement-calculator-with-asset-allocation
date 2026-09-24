# Backend API Contract

This is the working contract between the React frontend and the new backend. The current implementation lives in `server/src/app.ts` and is exposed locally by `server/src/server.ts`. Vercel uses `api/v1/[...path].ts`.

All authenticated routes use:

- `Authorization: Bearer <token>`
- `x-organization-id: <organization id>` when the user has more than one workspace

Supabase Auth email redirects are controlled by `VITE_AUTH_REDIRECT_ORIGIN`.

- Local testing: leave it empty so links return to `http://localhost:5173`.
- Production: set it to your deployed app origin, for example `https://your-app.vercel.app`.
- Supabase Dashboard must allow both local and production redirect URLs.

Errors use this envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message."
  }
}
```

## Health

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Local backend health check. |

## Auth And Onboarding

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/dev-login` | Development-only login for the local demo user. Disabled in production. |
| `GET` | `/api/v1/auth/session` | Resolve a bearer token to the app user and memberships. |
| `POST` | `/api/v1/auth/onboarding/practice` | Create the first practice for a verified signed-in user. |
| `POST` | `/api/v1/auth/invitations/accept` | Join a practice with an invitation token. |

## Organizations

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/organizations/current/invitations` | List invitations for the active practice. |
| `POST` | `/api/v1/organizations/current/invitations` | Create a manual invitation link. |
| `POST` | `/api/v1/organizations/current/invitations/:id/revoke` | Revoke an active invitation. |

## Clients

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/clients` | List active clients. |
| `POST` | `/api/v1/clients` | Create a client. |
| `GET` | `/api/v1/clients/:clientId` | Load one client. |
| `PATCH` | `/api/v1/clients/:clientId` | Update client demographics. |
| `GET` | `/api/v1/clients/:clientId/export?format=json` | Export a client bundle. |

## Financial Profile

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/clients/:clientId/profile` | Load assets, liabilities, cashflows, goals, and totals. |
| `POST` | `/api/v1/clients/:clientId/assets` | Create an asset. |
| `PATCH` | `/api/v1/clients/:clientId/assets/:id` | Update an asset. |
| `POST` | `/api/v1/clients/:clientId/assets/:id/archive` | Archive an asset. |
| `POST` | `/api/v1/clients/:clientId/liabilities` | Create a liability. |
| `PATCH` | `/api/v1/clients/:clientId/liabilities/:id` | Update a liability. |
| `POST` | `/api/v1/clients/:clientId/liabilities/:id/archive` | Archive a liability. |
| `POST` | `/api/v1/clients/:clientId/cashflows` | Create a cashflow. |
| `PATCH` | `/api/v1/clients/:clientId/cashflows/:id` | Update a cashflow. |
| `POST` | `/api/v1/clients/:clientId/goals` | Create a goal. |
| `PATCH` | `/api/v1/clients/:clientId/goals/:id` | Update a goal. |

## Plans

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/clients/:clientId/plans` | List active plans for a client. |
| `POST` | `/api/v1/clients/:clientId/plans` | Create a plan. |
| `GET` | `/api/v1/plans/:planId` | Load one plan and its current version. |
| `PATCH` | `/api/v1/plans/:planId` | Update plan metadata or archive the plan. |
| `DELETE` | `/api/v1/plans/:planId` | Archive a plan. |
| `POST` | `/api/v1/plans/:planId/versions` | Create an immutable plan input snapshot. |
| `POST` | `/api/v1/plans/:planId/calculate` | Calculate from saved plan/client state. |

## Shared Data

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/fx/rates` | Return INR conversion rates. |

## Reports

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/reports?clientId=...` | List report records for the active practice, optionally filtered by client. |
| `POST` | `/api/v1/clients/:clientId/reports` | Create a dossier or plan-report record. |
| `PATCH` | `/api/v1/reports/:reportId` | Update report status. |
| `POST` | `/api/v1/reports/:reportId/archive` | Archive a report. |
| `GET` | `/api/v1/reports/:reportId/download-url` | Return a browser route for print/PDF export of the dossier deck. |

## Next Backend Milestones

The current implementation can run with in-memory data when `DATABASE_URL` is missing, or with Postgres persistence after running `npm run db:migrate --prefix server`.

For local Postgres demo testing only, set `SEED_DEMO_WORKSPACE=true` before starting the backend. This creates the demo adviser, demo practice, and demo client. Production must leave this disabled.

Next milestones:

1. Move calculation inputs fully to saved backend state.
2. Add server-side PDF rendering/storage for report records.
3. Add document upload URLs and market/Angel routes through authenticated backend endpoints.
4. Add automated integration tests against a throwaway Postgres database.
