# SoundThesis Design Reference

## Purpose

SoundThesis is a wealth-planning workspace for advisers. It combines a React single-page application, a Fastify API, Supabase authentication, and Postgres persistence. The product is organized around an adviser selecting a client, maintaining the client’s planning data, running calculations, producing an IPS, and generating versioned reports and dossiers.

The application supports both a real-client workflow and a single, comprehensive sample household for safe end-to-end testing.

## System architecture

```text
React / Vite client
  ├─ Supabase Auth session
  ├─ CalculatorContext: active client + planning state
  └─ /api/v1 requests with bearer token + organization header
             │
             ▼
Fastify API (server/)
  ├─ validates the Supabase access token
  ├─ resolves the application user and active organization
  ├─ applies authorization and audit events
  ├─ runs planning calculations
  └─ persists data through AppStore
             │
             ▼
Supabase Postgres
  ├─ tenant-owned clients and planning records
  ├─ global sample catalog
  └─ row-level security policies
```

The deployed Vercel application serves the frontend and API routes from the same origin. The frontend uses `/api/v1` by default, avoiding a separate public backend URL.

## Identity, organizations, and authorization

Authentication is handled by Supabase. The backend maps the Supabase identity to its `users` table and authorizes all tenant-owned work through an active organization.

Core identity tables:

| Table | Responsibility |
| --- | --- |
| `users` | Application user mapped to a Supabase auth user. |
| `organizations` | An advisory practice / tenant. |
| `organization_memberships` | User role inside a practice. |
| `practice_invitations` | Invites used to add colleagues to an existing practice. |

Each API request carries an `x-organization-id` header. The server accepts it only when the authenticated user has an active membership for that organization. Postgres RLS also scopes tenant-owned records using the backend-set `app.organization_id` setting.

## Client and planning data model

### Client workspace

`clients` is the stable identity for all real client workflows. A client can have assignments, a financial profile, plans, calculation runs, reports, and audit events.

| Record | Role |
| --- | --- |
| `clients` | Core relationship and contact details. |
| `client_assignments` | Advisers assigned to a client. |
| `financial_resources` | Row-based assets, liabilities, cash flows, and goals. |
| `plans` | Named planning workspaces for a client. |
| `plan_versions` | Immutable planning-state snapshots. |
| `calculation_runs` | Persisted engine outputs tied to a plan version. |
| `reports` | Versioned plan reports and dossiers. |
| `audit_events` | Trace of meaningful user actions. |

`CalculatorContext` hydrates the selected `clients.id` from the API. Financial resource rows are the source of truth for balances, liabilities, cash flows, and goals. A plan version retains the wider planning state such as household details, insurance, risk answers, assumptions, allocation policy, SIP/STP/SWP settings, and adviser rationale.

### Report lifecycle

Reports are never overwritten. Creating a report creates the next version for that client and report kind. Older reports can be archived while remaining available in history. This applies equally to dossiers and plan reports.

## Global sample design

Samples are test fixtures, not clients and not user-created drafts.

### Why a global catalog exists

The legacy approach created a copy of every sample in `client_drafts` for every organization. This made the same sample names appear repeatedly in the database. The current design separates the globally reusable sample definition from the per-organization test workspace.

| Table | Scope | Purpose |
| --- | --- | --- |
| `sample_draft_catalog` | Global | One catalog entry: `comprehensive-household`. |
| `sample_client_workspaces` | Organization-scoped | Links the global sample to that organization’s disposable test client. |
| `client_drafts` | Organization-scoped | Reserved for future genuine drafts; it does not store sample templates. |

When a practice requests `GET /api/v1/client-drafts`, the API:

1. Reads the global catalog.
2. Creates a private test `clients` record only if that practice has not opened the sample before.
3. Seeds the profile rows, plan, and first plan version.
4. Returns the one catalog item with the practice-specific `clientId`.

This gives every user the same sample choice while preventing a test dossier or report from leaking between organizations.

### Comprehensive sample household

The single sample is designed to exercise all dossier sections:

- Full client contact, household, health, advice, planning-purpose, and investment-philosophy fields.
- Five family members and four income sources.
- Four insurance policies.
- Eight assets spanning equity, debt, gold, real estate, liquid, and other categories.
- Three liabilities with payment, term, rate, and lender information.
- Income, expense, and SIP cash-flow records.
- SIP, STP, SWP, retirement, and inflation settings.
- Six goals with different horizons, priorities, inflation rates, and a recurring goal.
- A populated risk-answer set and initial master-plan version.

The sample is disposable. Reset migrations remove old sample workspaces together with their linked resources, plans, reports, and calculation records. Real clients are not selected by those cleanup operations.

## Dossier design

The Dossier is a client-facing 16:9 deck that can also be printed to PDF. It is rendered from the current active client and live planning state.

### Light-only visual contract

The application shell can use a theme, but the Dossier must always be readable as a document. `.dossier-workspace` therefore defines its own light palette and `color-scheme: light`.

- Document canvas: light gray (`#F4F6F9`)
- Report pages: white
- Primary text: deep navy (`#1A1E27`)
- Secondary text: slate (`#5B6474`)
- Borders: pale blue-gray (`#D5DAE3`)
- Intentional dark panels retain explicit white text

Do not introduce theme-dependent colors into dossier content. Use dossier variables or explicit document colors for new pages, cards, and captions. This prevents dark-mode tokens from creating low-contrast text in the report or printed PDF.

### Export behavior

The Dossier supports:

- Browser print / Save as PDF, using a 13.333 × 7.5 inch page format.
- Markdown copy for accessible review.
- Downloadable accessible Markdown summary.

The print stylesheet removes application navigation and enforces light colors, exact color printing, dossier page breaks, and report-slide sizing.

## Frontend structure

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Route registration and lazy page loading. |
| `src/context/AuthContext.tsx` | Supabase session and organization context. |
| `src/context/CalculatorContext.tsx` | Active client hydration, planning state, persistence, and engine integration. |
| `src/pages/PractitionerPage.tsx` | Client directory and sample entry point. |
| `src/pages/Dossier.tsx` | Client dossier and export actions. |
| `src/pages/ReportsPage.tsx` | Report history and report creation. |
| `src/pages/IPSWorkspacePage.tsx` | IPS policy workspace and dossier brief handoff. |
| `src/index.css` | Design tokens, dossier deck styling, and print CSS. |

## Backend structure

| Location | Responsibility |
| --- | --- |
| `server/src/app.ts` | Fastify routes, auth, validation, authorization, and API composition. |
| `server/src/store.ts` | In-memory test store and Postgres store implementations. |
| `server/src/calculations.ts` | Server-side calculation orchestration. |
| `server/src/types.ts` | Shared backend domain types. |
| `server/db/migrations/` | Ordered Supabase schema and data migrations. |
| `server/test/app.test.ts` | API contract and sample-workspace regression tests. |

## API conventions

All APIs are under `/api/v1`. The frontend sends an Authorization bearer token and active organization header automatically. Important endpoint groups include:

| Endpoint group | Purpose |
| --- | --- |
| `/auth/*` | Session and development authentication support. |
| `/organizations/*` | Practice creation, membership, and invitations. |
| `/clients/*` | Client identity, profile resources, plans, calculations, and reports. |
| `/client-drafts` | Global sample catalog projected into an organization’s sample workspace, plus future non-sample drafts. |
| `/plans/*` | Plan versions and calculation-run access. |
| `/reports/*` | Report status and archival actions. |
| `/fx/rates` | Bundled FX fallback rate feed. |

## Database migrations

Migrations are applied manually in Supabase SQL Editor in numeric order.

For the global single-sample design, run:

1. `0001_core.sql` through `0006_seed_sample_client_workspaces.sql` if they have not already been applied.
2. `0007_global_sample_catalog.sql`.
3. `0008_replace_sample_catalog_with_comprehensive_household.sql`.

Migrations `0007` and `0008` intentionally remove legacy sample-only workspaces and their generated test data. Do not run them if old sample reports must be retained as records.

## Deployment configuration

Production deployment uses Vercel for the web application and Supabase for authentication and Postgres.

Important server-side environment variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string used by the API. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Key used to validate application sessions through Supabase. |
| `CORS_ORIGIN` | Allowed frontend origin when a cross-origin API deployment is used. |

Important frontend variable:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Optional API base URL. Omit it for same-origin Vercel routing. |

Frontend `VITE_*` variables are public build-time values. Never put `DATABASE_URL`, private service-role keys, or other secrets in a `VITE_*` variable.

## Verification checklist

Before deployment:

```powershell
npm run build
npm run typecheck --prefix server
npm test --prefix server -- --runInBand
```

After deploying and applying migrations:

1. Sign in and open **Samples**.
2. Confirm only **Sample Household** appears.
3. Select it and verify assets, liabilities, cash flows, goals, household details, and insurance are populated.
4. Open Reports and generate a dossier.
5. Toggle the app theme, reopen the dossier, and verify all document text remains readable with the same light presentation.
6. Generate another dossier and verify report versions remain available independently.
