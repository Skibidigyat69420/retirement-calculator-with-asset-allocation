# SOUND THESIS WEALTH PLANNER
# MASTER AI-HARNESS IMPLEMENTATION SPECIFICATION
## Vite + React → Production Multi-Tenant Wealth-Practitioner Platform

**Repository:** https://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation

**Important:** This is an implementation prompt for an AI coding harness. The harness is expected to inspect, modify, test, and integrate the actual repository. It is **not** a conceptual product roadmap.

---

# 1. PRIMARY DIRECTIVE

You are the lead engineering system responsible for transforming the existing repository into a production-quality platform for **wealth practitioners**.

The repository already contains meaningful functionality. Preserve it.

Do **not** interpret this task as:

> Build a new retirement calculator from scratch.

Interpret it as:

> Evolve the existing Sound Thesis Wealth Planner into a secure, multi-tenant, collaborative wealth-planning operating platform while preserving and strengthening the existing financial modelling engine.

The finished product must support:

```text
PLATFORM
  ↓
WEALTH PRACTICE / ORGANIZATION
  ↓
WEALTH PRACTITIONERS
  ↓
CLIENTS / HOUSEHOLDS
  ↓
FINANCIAL PROFILE
  ↓
GOALS
  ↓
RISK
  ↓
PORTFOLIO
  ↓
RETIREMENT
  ↓
SCENARIOS
  ↓
RECOMMENDATIONS
  ↓
IMPLEMENTATION
  ↓
REPORTS / IPS / DOSSIER
  ↓
REVIEWS
```

The platform's core value proposition is:

> Give a wealth practitioner one persistent, explainable, beautiful workspace in which they can understand a client, model the future, compare alternatives, make decisions, document those decisions, and return months later without losing the history.

---

# 2. ABSOLUTE CONSTRAINTS

The following constraints are mandatory.

## 2.1 Keep Vite + React

The current frontend is:

```text
Vite
React 19
TypeScript
React Router
Tailwind CSS
Recharts
Framer Motion
Lucide
```

Do not migrate the frontend to Next.js.

Do not replace React with another framework.

Do not rewrite the frontend simply because a backend is being added.

The repository already uses lazy route loading through `React.lazy` and `Suspense`; preserve that performance-oriented pattern. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/App.tsx

---

## 2.2 Preserve working financial features

Existing functionality includes:

```text
Dashboard
Risk Questionnaire
Master Plan
Goal Planner
Retirement
Allocation
MVO
Advanced Portfolio
Scenario Lab logic
Reverse Planning
Reports
IPS
Dossier
Client Meeting
Decision History
Standalone Calculators
Angel Connect
Angel Data
Market Data
```

Do not remove a feature because the surrounding architecture is being modernized.

Refactor behind stable interfaces.

---

## 2.3 PostgreSQL becomes the system of record

The authoritative store for client financial data must become PostgreSQL.

LocalStorage is not acceptable as the long-term source of truth for:

```text
clients
assets
liabilities
income
expenses
goals
risk assessment
retirement plans
scenarios
plan versions
meeting notes
decisions
reports
documents
assignments
permissions
```

LocalStorage may still be used for:

```text
sidebar collapse
last-selected UI tab
non-sensitive preferences
temporary offline drafts
```

but not authoritative financial state.

---

## 2.4 Multi-tenancy is mandatory

Every wealth practice is its own tenant.

Example:

```text
Organization A
  Wealth Practitioner A1
  Wealth Practitioner A2
  Client A1
  Client A2

Organization B
  Wealth Practitioner B1
  Client B1
  Client B2
```

There must be no route, API, query, cache, report, document, or calculation result that can accidentally expose:

```text
Organization A → Organization B data
```

The database should provide defense-in-depth through PostgreSQL RLS or an equivalent database-level isolation mechanism.

PostgreSQL supports row security policies with `USING` and `WITH CHECK`; when RLS is enabled and no permissive policy applies, access is effectively default-deny. citehttps://www.postgresql.org/docs/17/ddl-rowsecurity.html

---

# 3. CODEBASE FACTS THE HARNESS MUST RESPECT

The current repository describes itself as an institutional-grade individual wealth planning platform built with React, TypeScript, Vite and Tailwind. Its central design principle is that a shared `MasterPlanInputs` object flows into multiple modules and the `wealthEngine` provides correlated Monte Carlo outputs. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation

The current `App.tsx` uses:

```text
BrowserRouter
CalculatorProvider
Layout
Suspense
lazy-loaded page components
```

and maps routes to the existing planning modules. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/App.tsx

The current `CalculatorContext` is highly centralized. It currently owns:

```text
inputs
assets
SIP
STP
SWP
goals
wealth result
assumptions
risk answers
risk profile
manual targets
saved plans
decision history
meeting state
assumption mode
custom returns
```

and directly manages LocalStorage state. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/context/CalculatorContext.tsx

The codebase's `src/lib` contains the actual domain engine:

```text
allocationModels.ts
allocationScenarios.ts
assumptions.ts
calculations.ts
calculators.ts
constants.ts
feed.ts
formatters.ts
goalConflictEngine.ts
goals.ts
implementationShortfall.ts
instruments.ts
ipsMarkdown.ts
marketData.ts
monteCarlo.ts
mvo.ts
persistenceUtils.ts
planHealthScore.ts
planStorage.ts
portfolioAnalytics.ts
portfolioProjection.ts
priceCache.ts
projections.ts
random.ts
recommendationEngine.ts
returns.ts
reversePlanning.ts
riskQuestionnaire.ts
scenarioLab.ts
scenarios.ts
smartapi.ts
stressTest.ts
utils.ts
wealthEngine.ts
```

This is a substantial existing domain layer. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/tree/main/src/lib

The existing pages are also already broad and should be converted into a coherent workflow rather than deleted. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/tree/main/src/pages

---

# 4. EXISTING AUDIT — HIGH PRIORITY

The repository contains a code-level audit covering:

```text
12 pages
35 components
23 business logic modules
6 API endpoints
```

The audit identifies:

```text
6 critical math/simulation bugs
12 severe logic flaws
20+ UI/UX issues
architectural gaps
```

The audit specifically states that the Monte Carlo volatility bug can suppress volatility to roughly 2% instead of the intended ~15%, materially overstating success rates. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

Treat this audit as the initial defect backlog.

---

# 5. QUANTITATIVE CORRECTNESS GATE

No new financial-result UI should be considered complete until the known engine defects are fixed or explicitly documented with a reason.

Known fixes include:

## `wealthEngine.ts`

Fix:

```text
per-year category snapshots
backward depletion-age search
STP double-counting
liquidateAtRetirement behavior
custom asset returns being overwritten
goal SIP discounting
income growth
```

## `monteCarlo.ts`

Fix:

```text
double standard-deviation scaling
annual SIP step-up
```

## `goals.ts`

Fix:

```text
double standard-deviation scaling
double-inflation discounting
```

## `assumptions.ts`

Fix:

```text
shallow-copy covariance mutation
```

## `calculations.ts`

Fix:

```text
STP yearly state reset
SIP step-up propagation
liquidated asset double-counting
```

## `mvo.ts`

Fix:

```text
Sharpe gradient
equity cap after gradient refinement
```

## `portfolioAnalytics.ts`

Fix:

```text
portfolio variance calculation using full covariance
```

These findings and their locations are already documented in the repo's audit. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 6. NEW TARGET ARCHITECTURE

Use a layered architecture.

```text
┌─────────────────────────────────────────────────────┐
│                   VITE + REACT                      │
│                                                     │
│ Dashboard / Clients / Plans / Reports / Team       │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────┐
│                 API / APPLICATION                    │
│                                                     │
│ Auth • Authorization • Services • Validation        │
└─────────────┬─────────────────┬─────────────────────┘
              │                 │
              ▼                 ▼
      ┌─────────────┐   ┌────────────────┐
      │ PostgreSQL  │   │ Object Storage │
      │ system data │   │ PDFs / files   │
      └─────────────┘   └────────────────┘
              │
              ▼
      ┌────────────────────────────┐
      │ Financial Domain Engine     │
      │                             │
      │ wealthEngine               │
      │ Monte Carlo                │
      │ MVO                        │
      │ goals                      │
      │ retirement                 │
      │ recommendations            │
      └────────────────────────────┘
```

---

# 7. TARGET REPOSITORY STRUCTURE

Do not force this exact structure if it conflicts with the current repo, but move toward it.

```text
/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── guards/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── shell/
│   │   ├── client/
│   │   ├── planning/
│   │   ├── portfolio/
│   │   ├── charts/
│   │   ├── dashboard/
│   │   └── reports/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── clients/
│   │   ├── plans/
│   │   ├── scenarios/
│   │   ├── goals/
│   │   ├── risk/
│   │   ├── portfolio/
│   │   ├── reports/
│   │   └── meetings/
│   │
│   ├── domain/
│   │   ├── retirement/
│   │   ├── portfolio/
│   │   ├── risk/
│   │   ├── scenarios/
│   │   └── recommendations/
│   │
│   ├── services/
│   │   ├── api/
│   │   ├── auth/
│   │   └── formatting/
│   │
│   ├── context/
│   ├── hooks/
│   ├── lib/
│   └── types/
│
├── server/
│   ├── auth/
│   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── rls/
│   ├── routes/
│   ├── services/
│   ├── repositories/
│   ├── permissions/
│   ├── integrations/
│   ├── jobs/
│   └── middleware/
│
├── shared/
│   ├── contracts/
│   ├── enums/
│   └── validation/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── e2e/
│
└── docs/
```

---

# 8. DOMAIN MODEL

The central domain object should no longer be "calculator state."

It should be:

```text
Client
```

with a set of persistent planning artifacts.

```text
Client
 ├── Profile
 ├── Household
 ├── Assets
 ├── Liabilities
 ├── Income
 ├── Expenses
 ├── Goals
 ├── Risk Assessments
 ├── Retirement Plans
 │     ├── Versions
 │     ├── Scenarios
 │     └── Results
 ├── Meetings
 ├── Decision History
 ├── Reports
 ├── Documents
 └── Tasks
```

---

# 9. POSTGRESQL SCHEMA — DETAILED

## 9.1 organizations

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,

    logo_url TEXT,
    website TEXT,

    brand_primary TEXT,
    brand_secondary TEXT,

    status TEXT NOT NULL DEFAULT 'active',
    plan_tier TEXT NOT NULL DEFAULT 'standard',

    settings JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 9.2 users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email CITEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,

    phone TEXT,
    avatar_url TEXT,

    status TEXT NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    last_login_at TIMESTAMPTZ
);
```

Authentication-provider records may live in the authentication system rather than directly here.

---

# 10. MEMBERSHIPS

```sql
CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active',

    invited_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (organization_id, user_id)
);
```

Roles:

```text
platform_admin
practice_owner
practice_admin
wealth_practitioner
associate
read_only
```

Do not create a single permanent role column on `users`.

A user belongs to organizations through memberships.

---

# 11. HOUSEHOLDS

The product should support a family/household rather than treating every person as an unrelated CRM record.

```sql
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    name TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Example:

```text
The Mehta Family
```

Members:

```text
Arjun Mehta
Priya Mehta
```

---

# 12. CLIENTS

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    household_id UUID
        REFERENCES households(id),

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,

    email CITEXT,
    phone TEXT,

    date_of_birth DATE,
    marital_status TEXT,

    status TEXT NOT NULL DEFAULT 'active',

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);
```

Add search indexes and tenant-aware indexes.

---

# 13. CLIENT ASSIGNMENTS

Do not hard-code a client to one wealth practitioner forever.

Use assignments.

```sql
CREATE TABLE client_assignments (
    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    assignment_role TEXT NOT NULL DEFAULT 'secondary',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (client_id, user_id)
);
```

Roles:

```text
primary
secondary
associate
viewer
```

---

# 14. PROFILE / CONTACT DATA

Do not put everything into `clients`.

Consider:

```text
client_contacts
client_addresses
client_relationships
client_tags
```

only if product requirements justify them.

Avoid pathological normalization.

The rule:

> Normalize data that is queried, indexed, permissioned, or related independently. Keep highly variable calculation snapshots in JSONB.

---

# 15. ASSETS

```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    asset_type TEXT NOT NULL,
    asset_category TEXT NOT NULL,

    currency TEXT NOT NULL DEFAULT 'INR',

    current_value NUMERIC(20,2) NOT NULL DEFAULT 0,
    cost_basis NUMERIC(20,2),

    expected_return NUMERIC(8,4),

    liquidity TEXT,

    liquidate_at_retirement BOOLEAN
        NOT NULL DEFAULT false,

    external_reference TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);
```

---

# 16. LIABILITIES

```sql
CREATE TABLE liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    liability_type TEXT NOT NULL,

    outstanding_amount NUMERIC(20,2) NOT NULL,
    interest_rate NUMERIC(8,4),
    monthly_payment NUMERIC(20,2),
    maturity_date DATE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);
```

---

# 17. CASHFLOWS

Use explicit entities for cashflows if the existing model can support it without excessive complexity.

```sql
CREATE TABLE cashflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    type TEXT NOT NULL,

    name TEXT NOT NULL,

    annual_amount NUMERIC(20,2),

    monthly_amount NUMERIC(20,2),

    annual_growth_rate NUMERIC(8,4),

    start_date DATE,
    end_date DATE,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Types:

```text
income
expense
sip
stp
swp
transfer
```

If this becomes too invasive for the first migration, keep the existing plan input shape in JSONB while providing a clean adapter.

---

# 18. GOALS

```sql
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    goal_type TEXT NOT NULL,

    priority TEXT NOT NULL,

    target_amount NUMERIC(20,2),

    target_date DATE,

    years_to_goal NUMERIC(8,2),

    inflation_rate NUMERIC(8,4),

    recurring BOOLEAN NOT NULL DEFAULT false,

    status TEXT NOT NULL DEFAULT 'active',

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Priority:

```text
essential
important
aspirational
```

---

# 19. RISK ASSESSMENTS

Do not overwrite the client's previous risk assessment.

```sql
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    answers JSONB NOT NULL,

    raw_score NUMERIC(10,4),
    profile TEXT,

    dimension_scores JSONB NOT NULL DEFAULT '{}'::jsonb,

    questionnaire_version TEXT NOT NULL,

    assessed_by UUID REFERENCES users(id),

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The repository currently contains risk profiling across weighted dimensions and uses the result to affect strategic allocation, simulation settings and glide paths. Preserve this integration. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation

---

# 20. RETIREMENT PLANS

A client can have several plans over time.

```sql
CREATE TABLE retirement_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'draft',

    created_by UUID REFERENCES users(id),

    current_version_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);
```

Keep the immutable inputs in versions instead of stuffing every parameter directly into this record.

---

# 21. PLAN VERSIONS

```sql
CREATE TABLE plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    plan_id UUID NOT NULL
        REFERENCES retirement_plans(id)
        ON DELETE CASCADE,

    version_number INTEGER NOT NULL,

    input_snapshot JSONB NOT NULL,

    assumptions_snapshot JSONB NOT NULL,

    result_snapshot JSONB,

    engine_version TEXT NOT NULL,

    created_by UUID REFERENCES users(id),

    change_summary TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(plan_id, version_number)
);
```

This solves:

```text
"What did we calculate?"
```

and:

```text
"Why does the result look different six months later?"
```

---

# 22. SCENARIOS

```sql
CREATE TABLE plan_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id),

    plan_id UUID NOT NULL
        REFERENCES retirement_plans(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    scenario_type TEXT NOT NULL,

    assumptions JSONB NOT NULL,

    result JSONB,

    result_status TEXT NOT NULL DEFAULT 'draft',

    base_version_id UUID
        REFERENCES plan_versions(id),

    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);
```

Types:

```text
base
conservative
optimistic
custom
stress
reverse
what_if
```

---

# 23. SCENARIO STALENESS

If a base plan changes, dependent scenarios become:

```text
stale
```

The UI must show:

```text
Scenario based on Plan v7
Current plan is v9
This scenario may no longer reflect current assumptions.
```

Offer:

```text
Recalculate
Create new scenario
Keep historical result
```

Never silently overwrite scenario history.

---

# 24. ASSUMPTION SETS

The repository already supports market, historical, conservative and override modes. Preserve this model. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/context/CalculatorContext.tsx

Use:

```sql
CREATE TABLE assumption_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID,

    name TEXT NOT NULL,

    source TEXT NOT NULL,

    version TEXT NOT NULL,

    data JSONB NOT NULL,

    valid_from DATE,
    valid_to DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Global assumptions:

```text
organization_id = NULL
```

Practice-specific overrides:

```text
organization_id = actual tenant
```

---

# 25. MEETINGS

The current context already stores a four-stage meeting workflow.

The current stages are approximately:

```text
Stage 1
Profile
Assets
Cashflow
Goals
Risk

Stage 2
Net Worth
Readiness
Conflicts
Scenarios

Stage 3
Allocation
Waterfall
Rebalance
Transition

Stage 4
Dossier
IPS
Actions
```

These are currently stored locally. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/context/CalculatorContext.tsx

Turn them into persistent meeting records.

```sql
CREATE TABLE meeting_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,
    client_id UUID NOT NULL,

    title TEXT,

    current_stage INTEGER NOT NULL DEFAULT 1,

    status TEXT NOT NULL DEFAULT 'open',

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 26. MEETING CHECKLISTS

```sql
CREATE TABLE meeting_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    meeting_id UUID NOT NULL
        REFERENCES meeting_sessions(id)
        ON DELETE CASCADE,

    stage_id INTEGER NOT NULL,

    checklist_key TEXT NOT NULL,

    completed BOOLEAN NOT NULL DEFAULT false,

    completed_by UUID REFERENCES users(id),

    completed_at TIMESTAMPTZ,

    UNIQUE(meeting_id, checklist_key)
);
```

---

# 27. MEETING NOTES

```sql
CREATE TABLE meeting_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    meeting_id UUID NOT NULL
        REFERENCES meeting_sessions(id)
        ON DELETE CASCADE,

    stage_id INTEGER,

    body TEXT NOT NULL,

    author_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Autosave.

---

# 28. DECISION HISTORY

Turn "decision history" into a first-class domain concept.

```sql
CREATE TABLE decision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    client_id UUID NOT NULL,

    plan_id UUID,

    actor_user_id UUID,

    action TEXT NOT NULL,

    summary TEXT NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Example:

```text
Changed retirement age:
55 → 57

Projected surplus:
₹46L → ₹1.08Cr
```

---

# 29. AUDIT LOGS VS DECISION LOGS

Do not conflate them.

## Audit log

Security/accountability:

```text
Ketan updated Client ID
Ketan exported report
Aarav changed role
```

## Decision log

Planning narrative:

```text
Client decided to retire at 57
```

The former is system-level accountability.

The latter is wealth-planning history.

---

# 30. REPORTS

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    client_id UUID NOT NULL,

    plan_id UUID,

    report_type TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'queued',

    plan_version_id UUID,

    storage_key TEXT,

    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
```

---

# 31. DOCUMENTS

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    client_id UUID,

    plan_id UUID,

    name TEXT NOT NULL,

    document_type TEXT NOT NULL,

    storage_key TEXT NOT NULL,

    mime_type TEXT,
    size_bytes BIGINT,

    uploaded_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    archived_at TIMESTAMPTZ
);
```

Use object storage for the actual binary.

---

# 32. TASKS

This is necessary to turn planning into execution.

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    client_id UUID,

    plan_id UUID,

    title TEXT NOT NULL,

    description TEXT,

    assigned_to UUID REFERENCES users(id),

    due_at TIMESTAMPTZ,

    status TEXT NOT NULL DEFAULT 'open',

    priority TEXT NOT NULL DEFAULT 'normal',

    created_by UUID REFERENCES users(id),

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 33. NOTIFICATIONS

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    user_id UUID NOT NULL,

    type TEXT NOT NULL,

    title TEXT NOT NULL,
    body TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 34. PostgreSQL TENANCY MODEL

Every tenant-owned table should include:

```text
organization_id
```

At query time:

```text
resolve actor
→ resolve organization membership
→ set tenant context
→ execute repository query
```

At database level:

```text
organization_id must equal request tenant
```

The intended defense stack is:

```text
Authentication
      ↓
Membership
      ↓
Authorization
      ↓
Tenant-aware repository
      ↓
RLS
      ↓
Row
```

---

# 35. RLS IMPLEMENTATION MODEL

Use a secure request-scoped organization variable or equivalent.

Conceptual:

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_tenant_policy
ON clients
USING (
    organization_id =
    current_setting('app.current_organization_id', true)::uuid
)
WITH CHECK (
    organization_id =
    current_setting('app.current_organization_id', true)::uuid
);
```

Do not blindly copy this into production without validating your connection-pooling/request-context strategy.

The implementation must prevent tenant state leaking between database connections.

---

# 36. IMPORTANT RLS EDGE CASE

Connection pooling makes tenant context dangerous.

Never do:

```text
SET app.current_organization_id = 'A'
```

on a reusable connection and assume it will remain safe.

Use a transaction-scoped mechanism.

Prefer:

```text
SET LOCAL
```

inside a transaction, or use an equivalent connection-safe technique.

The security agent must explicitly test this.

---

# 37. ORGANIZATION SWITCHING

When a user belongs to several practices:

```text
Current practice
Sound Thesis Wealth
⌄

Acme Wealth
Northstar
Family Office
```

Switching organizations must:

```text
clear client cache
clear plan cache
clear notifications
clear selected client
clear stale query keys
refetch organization-scoped configuration
```

Never retain:

```text
Organization A client ID
```

after switching to:

```text
Organization B
```

---

# 38. AUTHENTICATION

Implement:

```text
/login
/forgot-password
/reset-password
/invite/:token
```

Authentication must support:

```text
email/password
secure sessions
password hashing
session expiry
logout
session revocation
MFA
email verification
```

Use a mature authentication package/service.

Do not write cryptography.

---

# 39. WEALTH PRACTITIONER INVITATIONS

Practice owner:

```text
Team
→ Invite practitioner
```

Dialog:

```text
Email
Role

[ Send invitation ]
```

Invitation:

```text
Sound Thesis Wealth invited you.

[ Accept invitation ]
```

On acceptance:

```text
create user
create membership
set initial role
log audit event
```

Token requirements:

```text
single use
short expiry
hashed at rest where possible
revocable
```

---

# 40. SESSION / DEVICE MANAGEMENT

Security settings:

```text
Active sessions

Chrome · Windows
Current session

Safari · iPhone
3 days ago

[ Revoke ]
```

Provide:

```text
Sign out all sessions
```

after password/MFA reset.

---

# 41. AUTHORIZATION MODEL

Use explicit policy functions.

Example:

```ts
canViewClient(actor, client)
canEditClient(actor, client)
canCreatePlan(actor, client)
canArchiveClient(actor, client)
canManageTeam(actor, organization)
canExportReport(actor, report)
```

The backend is authoritative.

Frontend visibility is only a UX optimization.

---

# 42. API ERROR CONTRACT

Standardize:

```json
{
  "error": {
    "code": "CLIENT_ACCESS_DENIED",
    "message": "You do not have access to this client.",
    "requestId": "req_..."
  }
}
```

Do not expose internal database messages.

---

# 43. API RESOURCE CONTRACTS

Every API response should have predictable shapes.

Client:

```json
{
  "id": "...",
  "organizationId": "...",
  "householdId": "...",
  "name": "Raj Sharma",
  "status": "active",
  "assignedPractitioners": [],
  "financialSummary": {
    "netWorth": 68400000,
    "investableAssets": 47200000
  },
  "lastReviewedAt": "2026-08-15T10:00:00Z"
}
```

Do not return the entire plan payload on every client-list request.

---

# 44. API PAGINATION

All list endpoints should be paginated.

Examples:

```text
GET /api/v1/clients?limit=25&cursor=...
GET /api/v1/activity?limit=50&cursor=...
```

Default page size:

```text
25
```

Upper limit:

```text
100
```

unless a specialized export API exists.

---

# 45. API FILTERING

Clients:

```text
status
assignedPractitioner
planHealth
retirementYear
lastReviewed
search
```

Plans:

```text
status
client
updatedSince
health
```

Reports:

```text
type
client
createdBy
createdSince
```

---

# 46. API IDEMPOTENCY

Important operations such as:

```text
report generation
imports
broker syncs
payment/webhook operations
```

should support idempotency where appropriate.

Do not generate five reports because the browser retried the request four times.

---

# 47. BACKEND SERVICES

Recommended service boundaries:

```text
AuthService
OrganizationService
MembershipService
ClientService
HouseholdService
AssetService
CashflowService
GoalService
RiskService
PlanService
ScenarioService
CalculationService
RecommendationService
MeetingService
ReportService
DocumentService
TaskService
AuditService
NotificationService
MarketDataService
BrokerService
```

Keep domain logic out of route handlers.

---

# 48. REPOSITORY LAYER

Repositories own database interaction.

Examples:

```text
ClientRepository
PlanRepository
ScenarioRepository
GoalRepository
AssetRepository
ReportRepository
```

Every repository must be tenant aware.

Bad:

```ts
clientRepository.findById(id)
```

Potentially safe:

```ts
clientRepository.findById({
  organizationId,
  clientId
})
```

or equivalent transaction-scoped tenant context.

---

# 49. CALCULATION SERVICE

The calculation service should:

```text
load plan version
resolve assumptions
construct domain input
run calculation engine
validate result
store result
return normalized output
```

Conceptual:

```text
CalculationService.calculatePlan()
```

Result metadata:

```json
{
  "engineVersion": "2.1.0",
  "assumptionVersion": "2026-Q3",
  "planVersion": 7,
  "scenarioVersion": 2,
  "calculatedAt": "..."
}
```

---

# 50. KEEP THE EXISTING ENGINE

The current engine is the asset.

Do not duplicate it in backend and frontend.

Bad:

```text
Frontend calculation
+
backend calculation
```

where the formulas gradually diverge.

Better:

```text
shared/domain calculation package
        ↓
frontend preview
        ↓
backend authoritative execution
```

If bundling the same TypeScript domain engine into both environments is practical, do that.

If not, define one authoritative backend engine and a deliberately constrained frontend preview path with contract tests.

---

# 51. FRONTEND STATE MIGRATION

Current:

```text
CalculatorContext
+
localStorage
+
calculation engines
```

Target:

```text
AuthenticatedUser
       ↓
Organization
       ↓
SelectedClient
       ↓
Plan
       ↓
EditableDraft
       ↓
Server mutation
       ↓
Version
```

Do not remove the existing context in one step.

---

# 52. CONTEXT REFACTOR SEQUENCE

Phase 1:

```text
CalculatorContext remains.
```

Replace persistence calls with API service calls.

Phase 2:

Extract:

```text
AuthContext
OrganizationContext
ClientContext
```

Phase 3:

Extract plan state into:

```text
PlanEditor
PlanQuery
PlanMutation
```

Phase 4:

Delete obsolete global localStorage persistence.

---

# 53. PLAN EDITOR MODEL

The planning UI needs a difference between:

```text
persisted server state
```

and:

```text
current unsaved editing state
```

Use:

```text
serverSnapshot
draft
dirtyFields
saveStatus
lastSavedAt
```

State:

```text
clean
dirty
saving
saved
error
conflict
```

---

# 54. AUTOSAVE

Use debounce:

```text
500–1200ms
```

depending on field type.

Do not save every keystroke to PostgreSQL.

For an amount field:

```text
₹
[ 1,50,000 ]
```

the client can debounce.

For a multi-step commit:

```text
Create scenario
```

use explicit mutation.

---

# 55. CONFLICT HANDLING

Every plan version should carry:

```text
version number
updatedAt
```

When saving:

```text
Expected version: 9
Server version: 10
```

Return:

```text
409 CONFLICT
```

UX:

```text
This plan was updated elsewhere.

[ Review changes ]
[ Keep server version ]
[ Create new version from my draft ]
```

For financial data:

**never silently overwrite.**

---

# 56. LOCAL MIGRATION

Existing users may have localStorage plans.

On first login:

```text
We found an existing plan on this device.

Import it into your new secure workspace?

[ Import ]
[ Skip ]
```

Process:

```text
read local data
↓
validate against schema
↓
sanitize
↓
create client
↓
create plan
↓
create plan version
↓
create risk assessment
↓
create goals/assets/cashflows
↓
write migration audit event
```

Never blindly `JSON.parse()` localStorage and write it directly to the database.

---

# 57. CLIENT OVERVIEW — NEW UX

This screen becomes the heart of the platform.

Header:

```text
← Clients

RAJ SHARMA
Age 52 · Mumbai

Primary wealth practitioner
Ketan

[ New Plan ] [ Review ] [ More ]
```

Summary strip:

```text
Net Worth
₹6.84 Cr

Investable
₹4.72 Cr

Income
₹42L

Spending
₹18.6L

Retirement
2033
```

---

# 58. CLIENT HEALTH

Large section:

```text
Planning Health

82
Strong
```

Breakdown:

```text
Retirement       88
Goals            76
Liquidity        91
Risk alignment   79
Portfolio        84
```

Every score must be explorable.

Click:

```text
Risk alignment
```

opens:

```text
Why is risk alignment 79?

Current equity:
63%

Strategic equity:
60%

Maximum equity:
65%

Assessment:
Within tolerance, slightly above target.
```

---

# 59. CLIENT ALERTS

Use intelligent alerts.

Example:

```text
Needs attention

Inflation sensitivity
A 1% increase in inflation reduces projected surplus by ₹31L.

Goal shortfall
Education goal is currently funded at 72%.

Review due
Annual review due in 9 days.
```

Avoid generic red badges.

Every alert needs:

```text
reason
severity
action
```

---

# 60. PRIMARY CLIENT TABS

Use:

```text
Overview
Profile
Financials
Goals
Risk
Plan
Portfolio
Scenarios
Reports
Meetings
Activity
```

Do not expose 15 separate top-level sidebar items.

The client is the organizing principle.

---

# 61. GLOBAL SIDEBAR

Recommended:

```text
SOUND THESIS
Wealth Practice

OVERVIEW
Dashboard

CLIENTS
All Clients
Reviews
Tasks

PLANNING
Plans
Scenario Lab
Retirement

PORTFOLIO
Allocation
Optimization
Stress Tests

DELIVER
Reports
IPS
Dossiers

PRACTICE
Team
Activity
Integrations
Settings
```

The existing audit already recommends grouping the current navigation into planning, portfolio, reports, tools and data. Extend that into the practitioner-centric structure. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 62. DASHBOARD

Top:

```text
Good morning, Ketan.

Here's what needs your attention.
```

Primary actions:

```text
[ + New Client ]
[ + New Plan ]
```

KPIs:

```text
Clients
128

Active Plans
94

Reviews Due
8

Plans at Risk
11
```

---

# 63. DASHBOARD — PLANNING HEALTH

Visual:

```text
Your practice

Healthy           71%
Review            21%
At risk             8%
```

Clicking a segment filters clients.

---

# 64. DASHBOARD — WORK QUEUE

Instead of only metrics, surface work.

```text
Today's work

9 reviews
3 plan updates
2 reports awaiting approval
1 client import
```

Each is actionable.

---

# 65. DASHBOARD — UPCOMING REVIEWS

```text
UPCOMING REVIEWS

Raj Sharma          Tomorrow
Anita Mehta         Friday
Vivek Shah          15 Sep
```

Click opens the client directly.

---

# 66. DASHBOARD — PRACTICE ACTIVITY

```text
Ketan updated Raj Sharma's plan
2h ago

Aarav created a scenario for Anita Mehta
4h ago

Meera uploaded a document for Vivek Shah
Yesterday
```

---

# 67. CLIENT DIRECTORY

Desktop:

```text
Clients                                   128

[ Search clients... ]    [ Filter ] [ Sort ] [ + New Client ]

Client                 Wealth       Retirement  Health  Practitioner
Raj Sharma             ₹6.84 Cr       2033       82     Ketan
Anita Mehta             ₹2.10 Cr       2031       67     Aarav
Vivek Shah              ₹9.20 Cr       2038       91     Ketan
```

Use server pagination.

---

# 68. CLIENT DIRECTORY FILTER DRAWER

Filters:

```text
Status
Assigned practitioner
Plan health
Retirement year
Portfolio value
Last reviewed
Tags
```

Add saved views:

```text
My clients
Needs review
At risk
Reviews this week
No plan
```

---

# 69. NEW CLIENT FLOW

Do not open a giant form.

Step 1:

```text
Tell us about your client

First name
Last name
Email
Phone
DOB
```

Step 2:

```text
Start the financial picture

Income
Monthly spending
Assets
Liabilities
```

Step 3:

```text
What are they planning for?

Retirement
Education
Home
Legacy
```

Step 4:

```text
Start their first plan?

[ Start Retirement Plan ]
[ Save Client Only ]
```

---

# 70. MASTER PLAN REDESIGN

Current Master Plan has major inputs across:

```text
Profile
Assets
Cashflow
Goals
Results
```

Keep this conceptual structure but make the experience progressive.

New workflow:

```text
01 Profile
02 Financials
03 Cashflows
04 Goals
05 Risk
06 Assumptions
07 Results
```

Desktop:

```text
left progress rail
center editor
right persistent summary
```

---

# 71. MASTER PLAN — RIGHT RAIL

Always show:

```text
Planning outlook

Required
₹4.86 Cr

Projected
₹5.32 Cr

Funding
109%

Probability
82%

Plan health
82
```

This gives practitioners constant context.

---

# 72. MASTER PLAN INPUT DESIGN

Every input gets:

```text
Label
Value
Unit
Help
Source
```

Example:

```text
Inflation

[ 6.0 ] %

Used to inflate future spending and goal requirements.

Source
Practice default
```

If overridden:

```text
Source
Practitioner override
```

---

# 73. FINANCIAL PROFILE UX

Instead of:

```text
Annual income: ______
Monthly expenditure: ______
```

Create visual groupings.

```text
HOUSEHOLD CASH FLOW

Income
₹42L / year

Core spending
₹13.2L / year

Lifestyle
₹5.4L / year

Annual surplus
₹23.4L
```

Show:

```text
Savings rate 55.7%
```

---

# 74. ASSET INPUT UX

Use rows/cards:

```text
Equity MF
₹80L
Return 11%
Liquid at retirement ✓

Debt
₹40L
Return 7%

Real estate
₹1.2Cr
Liquid at retirement ○
```

Allow drag-to-reorder.

Advanced settings in a drawer.

---

# 75. CASHFLOW UX

The current product supports:

```text
SIP
step-up
equity/debt split
STP
SWP
```

Do not display these as unrelated calculators.

Create a lifecycle visualization:

```text
TODAY
   ↓
ACCUMULATION
   ↓
RETIREMENT
   ↓
DISTRIBUTION
```

Show:

```text
SIP
STP
income
expenses
goals
SWP
```

on the same timeline.

---

# 76. GOALS UX

Goal cards:

```text
Education
₹50L
2031
Essential

Funded
78%

Monthly requirement
₹31K
```

Actions:

```text
Edit
Duplicate
Archive
Prioritize
```

The repository audit specifically notes the existing Goal Planner is missing goal editing, goal deletion, recurring controls, proper empty state, X-axis formatting, and correct SIP-gap logic. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 77. GOAL CONFLICT UX

Use existing `goalConflictEngine`.

Do not hide conflict logic.

Show:

```text
Goal conflict detected

Education
₹50L
2031

Retirement
₹4.86Cr
2033

Current cashflows cannot fully support both under the current assumptions.
```

Then:

```text
Ways to resolve

Increase SIP
+₹26K / month

Move education date
+2 years

Reduce retirement lifestyle
-8%
```

Every suggestion needs a computed impact.

---

# 78. RISK QUESTIONNAIRE UX

The questionnaire should feel like a guided interview.

At the top:

```text
Risk Assessment

Question 7 of 20

35% complete
```

Use one question per card.

Never make the screen feel like a regulatory form dump.

---

# 79. RISK RESULT UX

Show:

```text
Balanced
74 / 100
```

Then:

```text
Tolerance
82
Capacity
69
Liquidity
71
Experience
81
Goal flexibility
58
Behavioral stability
64
Context
77
```

Then:

```text
Strategic implications

Target equity
60%

Max equity
65%

Recommended volatility
12.4%

Primary concern
Goal rigidity
```

The current audit notes a mismatch between displayed question counts/dimensions and actual questionnaire structure. Fix the UI and data model together rather than merely changing text. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 80. RETIREMENT READINESS

Make this a decision surface.

Hero:

```text
RETIREMENT READINESS

82%
probability of plan sustainability
```

Then:

```text
Required corpus
₹4.86 Cr

Projected corpus
₹5.32 Cr

Surplus
₹46L

Modeled through age
85
```

Then:

```text
Biggest risks

Inflation
Retirement timing
Lifestyle spending
Sequence risk
```

---

# 81. RETIREMENT FAN CHART

Use:

```text
P10
P25
P50
P75
P90
```

with:

```text
Today
Retirement
Life expectancy
```

The chart needs a textual summary for accessibility.

Example:

```text
Median projection reaches ₹5.32Cr at retirement.
The lower 10th percentile falls below the required
funding threshold at age 79.
```

---

# 82. "WHAT-IF" SIMULATOR

This should be one of the most impressive experiences in the application.

Controls:

```text
Retirement age       55 ───────●─── 65
Monthly SIP           ₹20K ───●──── ₹2L
Annual step-up        0% ───●────── 15%
Inflation              4% ───●────── 8%
Pre-retirement return  7% ─────●──── 13%
```

Live output:

```text
Projected surplus
₹46L

Probability
82%

Depletion age
86
```

Animate the chart.

---

# 83. WHAT-IF COMPARE

Add:

```text
Current
vs
What-if
```

Example:

```text
Retire 2 years later

Probability
82% → 91%

Surplus
₹46L → ₹1.08Cr

Required SIP
₹82K → ₹63K
```

Add:

```text
Save scenario
```

which creates a persistent `plan_scenario`.

---

# 84. SCENARIO LAB UX

Tabs:

```text
Base
Conservative
Optimistic
Custom
Stress
Reverse
```

Each card:

```text
Scenario name
Assumptions
Projected corpus
Probability
Depletion age
Funding status
```

Comparison:

```text
                     Base      Conservative    Optimistic

Corpus               5.32Cr       4.11Cr         6.41Cr
Probability             82%          61%            94%
Depletion age            86           77             >90
Monthly SIP             82K         1.05L            61K
```

---

# 85. ASSUMPTION TRANSPARENCY

Every material output gets:

```text
Why?
```

Click:

```text
Why is this 82%?
```

Open panel:

```text
Simulation
1,000 paths

Return assumptions
Equity 11.2%
Debt 7.0%
Gold 6.4%

Volatility
Equity 18.1%
Debt 5.2%

Inflation
6%

Retirement age
55

Life expectancy
85

Engine
v2.1.0
```

---

# 86. NUMBERS SHOULD BE EXPLAINABLE

Every core metric can expose:

```text
definition
inputs
method
assumptions
timestamp
engine version
```

This matters more than decorative UI.

---

# 87. PLAN HEALTH

Convert the existing plan-health logic into an executive summary.

```text
PLAN HEALTH
82

Retirement   88
Goals        76
Liquidity    91
Risk         79
Portfolio    84
```

Click each dimension.

---

# 88. RECOMMENDATIONS

Use the existing recommendation engine.

Display:

```text
Top recommendations

01
Increase SIP

₹82K → ₹1.05L

Expected impact
+₹58L corpus

[ Apply ]
[ Explain ]
```

Second:

```text
Review retirement age

55 → 57

Expected impact
+₹74L
```

Third:

```text
Rebalance debt

20% → 25%

Expected volatility reduction
1.2%
```

Never auto-apply a recommendation without explicit user action.

---

# 89. IMPLEMENTATION WORKFLOW

After recommendation:

```text
[ Apply ]
```

should optionally generate:

```text
Implementation task
```

Example:

```text
Increase SIP
Owner: Ketan
Due: 15 Sep
Status: Pending
```

---

# 90. PORTFOLIO PAGE

Use:

```text
Current
Target
Projected
```

table:

```text
Category        Current    Target    Drift

Equity            63%       60%       +3%
Debt              20%       25%       -5%
Gold               7%        7%        0%
Real Estate       10%        8%       +2%
```

Then:

```text
Suggested transition
```

---

# 91. ALLOCATION TARGET VALIDATION

The repository audit identifies that current sliders can sum to less than or greater than 100%.

Fix it.

Possible UI patterns:

### Pattern A

Constrained sliders.

### Pattern B

Editable percentages with remaining-allocation indicator.

### Pattern C

Normalize on commit with an explicit explanation.

Best UX:

```text
Target allocation
100.0%

Equity       60%
Debt         25%
Gold          7%
Real estate   8%
```

The UI must never leave the user with an impossible allocation state.

---

# 92. MVO PAGE

The MVO page should be advanced but not intimidating.

Primary:

```text
Portfolio Optimization

Current
Max Sharpe
Minimum Volatility
Risk Parity
Equal Weight
```

Secondary:

```text
Efficient Frontier
Correlation
Statistics
Constraints
```

The current MVO engine already has an efficient frontier, max-Sharpe, min-variance, equal-weight and risk-parity concepts. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation

---

# 93. STRESS TEST

Show:

```text
Stress Test

Market shock
-25%

Inflation
+3%

Retirement
2 years earlier

Spending
+15%
```

Then:

```text
Corpus impact
-₹1.42Cr

Depletion age
83 → 78

Plan health
82 → 64
```

Then:

```text
How to restore resilience

Increase SIP
Retire later
Reduce lifestyle
Change allocation
```

---

# 94. MARKET DATA ARCHITECTURE

The current repo uses:

```text
Python fetchers
data/prices/*.csv
public/data/market-data.json
frontend calculations
Angel One optional live integration
Yahoo Finance fallback
```

This works as an enrichment layer but should become a backend-managed service.

The README describes these data paths and the current API endpoints. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation

Target:

```text
Source
 ↓
ingestion job
 ↓
market data tables / versioned files
 ↓
AssumptionService
 ↓
planning engine
```

---

# 95. ANGEL ONE SECURITY

The current project exposes environment variables including:

```text
VITE_ANGEL_API_KEY
ANGEL_CLIENT_CODE
ANGEL_PIN
ANGEL_TOTP_SECRET
```

This architecture should be reconsidered before production.

The backend should own:

```text
API key
client code
PIN
TOTP
broker session
```

The browser should not own unnecessary broker secrets.

The repository currently describes `/api/angelone/*` as a proxy, so replace client-side credential exposure with a backend integration layer. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation

---

# 96. BROKER DATA MODEL

Eventually support:

```text
broker_connections
broker_accounts
holdings
positions
transactions
cash_balances
```

All tenant-scoped.

Never overwrite planning assets blindly with broker data.

Use:

```text
linked account
synced holding
planning asset
```

and explicit reconciliation.

---

# 97. DATA RECONCILIATION

If broker sync says:

```text
Equity Fund
₹82L
```

but plan says:

```text
Equity Fund
₹80L
```

show:

```text
Planning value
₹80L

Broker value
₹82L

Difference
₹2L

[ Review ]
```

Do not silently overwrite practitioner assumptions.

---

# 98. REPORT PIPELINE

Reports:

```text
User clicks Generate
      ↓
API creates report job
      ↓
plan version frozen
      ↓
calculation snapshot frozen
      ↓
PDF generated
      ↓
stored in object storage
      ↓
report status complete
      ↓
UI notification
```

Report generation must reference an immutable version.

---

# 99. REPORT DESIGN

A report should look like a wealth advisory deliverable.

Cover:

```text
SOUND THESIS

RETIREMENT & WEALTH PLAN

Raj Sharma

Prepared by
Ketan
Wealth Practitioner

September 2026
```

Page hierarchy:

```text
01 Executive Summary
02 Current Position
03 Goals
04 Risk Profile
05 Retirement Readiness
06 Portfolio
07 Scenarios
08 Recommendations
09 Implementation
10 Assumptions
```

---

# 100. CLIENT-FACING LANGUAGE

Always distinguish:

```text
Projection
Estimate
Scenario
Illustration
Assumption
```

from:

```text
Guarantee
Promise
Certainty
```

Use a disclaimer where appropriate:

```text
This projection is illustrative and depends on the assumptions,
market behaviour, cashflows and planning inputs used in the model.
It is not a guarantee of future performance.
```

Compliance/legal review is required before final client-facing deployment.

---

# 101. IPS VERSIONING

IPS should be:

```text
Draft
In Review
Approved
Archived
```

An approved IPS is immutable.

If the plan changes:

```text
Create new IPS version
```

Do not modify the old approved document.

---

# 102. DOSSIER

Turn the existing dossier into a flagship output.

Suggested structure:

```text
Cover
Client summary
Household
Net worth
Cashflow
Goals
Risk
Retirement
Portfolio
Scenario comparison
Recommendations
Implementation
Meeting history
Documents
Assumptions
```

It should be generated from the same immutable plan state as the report.

---

# 103. COMMAND PALETTE

Global:

```text
⌘ K
```

Commands:

```text
Find client
Create client
Create plan
Open retirement
Open scenario lab
Generate report
Open tasks
Open reviews
Switch practice
```

Search result can show:

```text
Raj Sharma
₹6.84Cr
82% health
Retirement 2033
```

---

# 104. GLOBAL QUICK ACTIONS

Top right:

```text
+ New
```

Menu:

```text
New Client
New Plan
New Scenario
New Meeting
Generate Report
```

---

# 105. MOBILE NAVIGATION

Do not squeeze the desktop sidebar onto mobile.

Bottom bar:

```text
Home
Clients
Plans
Tasks
More
```

Inside client:

```text
Overview
Plan
Portfolio
Reports
More
```

---

# 106. RESPONSIVE TABLES

Desktop:

```text
rich table
```

Tablet:

```text
compressed table
```

Mobile:

```text
stacked card
```

Do not force horizontal scrolling for ordinary client rows.

Charts may scroll horizontally where necessary.

---

# 107. DESIGN SYSTEM

Core palette:

```text
MIDNIGHT
#0B1220

NAVY
#101A2E

BACKGROUND
#F7F8FA

SURFACE
#FFFFFF

SURFACE MUTED
#F1F3F6

TEXT
#344054

MUTED
#667085

BORDER
#E4E7EC

PRIMARY EMERALD
#0E9F6E

PRIMARY DARK
#087F5B

SOFT MINT
#E7F7F0

CHAMPAGNE
#C9A86A

DANGER
#D64545

WARNING
#D99000

INFO
#3978E8
```

---

# 108. VISUAL DIRECTION

Product mood:

```text
quietly premium
institutional
modern
high-trust
precise
warm enough to feel human
dense enough for professional use
```

Avoid:

```text
crypto neon
gaming dashboards
oversized gradients
cartoon illustrations
excessive shadows
huge pill buttons everywhere
```

---

# 109. TYPOGRAPHY

Preferred:

```text
Inter
```

Optional display type:

```text
Manrope
```

Page:

```text
32–36px
```

Section:

```text
20–24px
```

Body:

```text
14–16px
```

Metadata:

```text
12–13px
```

---

# 110. SPACING

Use a consistent scale:

```text
4
8
12
16
20
24
32
40
48
64
```

Do not invent spacing values everywhere.

---

# 111. RADIUS

Use restrained rounding:

```text
8px
12px
16px
20px
24px
```

Default cards:

```text
16px
```

---

# 112. SHADOWS

Default:

```text
border only
```

Elevate only when necessary:

```text
dropdown
modal
drawer
floating panel
drag state
```

---

# 113. MICRO-INTERACTIONS

Examples:

```text
number transition
chart entrance
button hover
drawer entrance
success confirmation
```

Typical:

```text
100–180ms
```

Respect:

```text
prefers-reduced-motion
```

---

# 114. FINANCIAL NUMBER FORMATTING

Use centralized formatting.

Examples:

```text
₹85,000
₹1.50 L
₹46.2 L
₹4.86 Cr
₹6.84 Cr
```

Utilities:

```text
formatINR()
formatCompactINR()
formatPercent()
formatDate()
formatDelta()
```

The current audit specifically calls for intelligent lakh/crore formatting and centralized formatters. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 115. CHART SYSTEM

The repository already contains many chart components. Refactor them around one visual/chart contract.

Every chart must have:

```text
responsive container
accessible summary
consistent axes
consistent tooltips
consistent number formatting
consistent legend
consistent typography
```

Do not hard-code disparate colors.

The existing audit explicitly identifies inconsistent hard-coded chart colors and missing responsive chart wrappers. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 116. ACCESSIBILITY

Target:

```text
WCAG 2.2 AA
```

Minimum:

```text
keyboard navigation
focus rings
semantic labels
ARIA where necessary
tab roles
dialog roles
alert roles
accessible charts
form error association
reduced motion
contrast
```

The current audit already flags missing ARIA semantics on progress bars, tabs, alerts and input labels. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 117. EMPTY STATES

Bad:

```text
No clients.
```

Good:

```text
Your client workspace is ready.

Add your first client to start building a wealth plan.

[ Add Client ]
```

Each empty state answers:

```text
What is empty?
Why does it matter?
What should I do?
```

---

# 118. LOADING STATES

Every route gets skeleton/loading state.

Examples:

```text
Client list skeleton
Client profile skeleton
Chart skeleton
Scenario loading
Report generation
```

Never show a blank page.

---

# 119. ERROR STATES

Bad:

```text
500 Internal Server Error
```

Good:

```text
We couldn't save this plan.

Your previous saved version is safe.

[ Try again ]
```

---

# 120. AUTOSAVE INDICATOR

Display:

```text
Saved just now
```

or:

```text
Saving...
```

or:

```text
Couldn't save
[ Retry ]
```

Use subtle text near the plan title.

---

# 121. DIRTY STATE / NAVIGATION GUARD

If a user has unsaved changes and tries to leave:

```text
You have unsaved changes.

[ Save and leave ]
[ Leave without saving ]
[ Cancel ]
```

Do not trap them unnecessarily if autosave has already fully synchronized.

---

# 122. COMMAND PALETTE SEARCH INDEX

Client search should eventually use:

```text
name
email
phone
tags
assigned practitioner
```

but keep search server-side for larger practices.

---

# 123. TASK SYSTEM

Create task templates:

```text
Annual review
Risk reassessment
Rebalancing
Client follow-up
Document request
Implementation action
```

A recommendation can create a task.

A review can create tasks.

A report can create a follow-up.

---

# 124. REVIEW SYSTEM

Client record:

```text
Next review
15 Sep 2026

Review cadence
Annual

Last reviewed
15 Sep 2025
```

Review status:

```text
Scheduled
Due
Overdue
Completed
```

---

# 125. PLAN STATUS

Use:

```text
draft
in_review
approved
active
archived
```

Avoid arbitrary strings.

---

# 126. REPORT STATUS

Use:

```text
queued
generating
ready
failed
archived
```

---

# 127. DOCUMENT ACCESS

Document downloads must pass authorization.

Never expose:

```text
https://storage/path/report.pdf
```

directly without authorization if the file is sensitive.

Use signed, short-lived URLs or authenticated streaming.

---

# 128. FILE UPLOAD SECURITY

If uploads are introduced:

Validate:

```text
mime type
file extension
size
content type
virus/malware scanning where appropriate
```

Never trust the filename.

Store outside the application filesystem.

---

# 129. NOTIFICATION TYPES

Examples:

```text
REVIEW_DUE
PLAN_AT_RISK
SCENARIO_STALE
REPORT_READY
TEAM_INVITE
ASSIGNMENT_CHANGED
BROKER_SYNC_COMPLETE
IMPORT_COMPLETE
```

---

# 130. PRACTICE SETTINGS

Sections:

```text
Practice
Branding
Members
Roles
Notifications
Integrations
Security
Billing
```

Branding:

```text
logo
practice name
primary color
report cover
footer
```

The reporting engine can then use organization branding.

---

# 131. TEAM MANAGEMENT

Screen:

```text
Team

Ketan
Owner
72 clients

Aarav
Wealth Practitioner
41 clients

Meera
Associate
15 clients
```

Actions:

```text
Invite
Deactivate
Change role
Reassign clients
```

---

# 132. CLIENT REASSIGNMENT

If a practitioner leaves:

```text
Aarav has 41 clients.

Reassign them to:
[ Ketan ]
[ Meera ]
```

Require confirmation.

Audit:

```text
41 clients reassigned
By Ketan
```

---

# 133. DATA EXPORT

Authorized practitioners/admins can export:

```text
client summary
plan
goals
assets
liabilities
cashflows
risk
scenarios
reports
```

Formats:

```text
CSV
JSON
PDF
```

Audit:

```text
EXPORT_CREATED
```

---

# 134. CLIENT DATA DELETION

Normal UI should mostly use:

```text
Archive
```

Permanent deletion should be a restricted operation.

Show:

```text
Permanent deletion is irreversible.

This will remove client data and associated documents
subject to your retention policy.

[ Cancel ]
[ Permanently delete ]
```

Require explicit permission.

---

# 135. SOFT DELETION

For:

```text
clients
plans
assets
goals
liabilities
documents
```

prefer:

```text
archived_at
```

until a mature retention/deletion policy exists.

---

# 136. DATABASE INDEXES

Create at least:

```sql
CREATE INDEX clients_org_idx
ON clients(organization_id);

CREATE INDEX clients_org_status_idx
ON clients(organization_id, status);

CREATE INDEX assignments_user_idx
ON client_assignments(user_id, client_id);

CREATE INDEX plans_org_client_idx
ON retirement_plans(organization_id, client_id);

CREATE INDEX plans_org_status_idx
ON retirement_plans(organization_id, status);

CREATE INDEX scenarios_org_plan_idx
ON plan_scenarios(organization_id, plan_id);

CREATE INDEX assets_org_client_idx
ON assets(organization_id, client_id);

CREATE INDEX goals_org_client_idx
ON goals(organization_id, client_id);

CREATE INDEX audit_org_time_idx
ON audit_logs(organization_id, created_at DESC);

CREATE INDEX tasks_org_due_idx
ON tasks(organization_id, due_at);
```

Measure query plans before adding dozens of speculative indexes.

---

# 137. OBSERVABILITY

Add:

```text
Sentry or equivalent
structured server logs
request IDs
database monitoring
job monitoring
```

Every API request should be traceable using:

```text
requestId
```

But avoid logging sensitive financial payloads.

---

# 138. METRICS

Application metrics:

```text
API latency
error rate
calculation latency
report generation latency
database connections
queue depth
auth failures
```

Product metrics:

```text
clients_created
plans_created
plans_completed
scenarios_created
reports_generated
reviews_completed
```

Do not send raw client financial information to analytics.

---

# 139. PERFORMANCE

Target:

```text
initial shell < 2s on good desktop connection
```

Use:

```text
route lazy loading
chart lazy loading
server pagination
memoization only where justified
query caching
```

Heavy pages:

```text
MVO
Advanced Portfolio
Angel Data
Reports
```

should be loaded on demand.

---

# 140. DATABASE TRANSACTIONS

Use transactions for operations such as:

```text
create client + default plan
restore version
accept invitation + membership
apply recommendation + decision log
generate report record + version snapshot
broker reconciliation
```

Do not leave partial state.

---

# 141. EXAMPLE: CREATE PLAN TRANSACTION

```text
BEGIN

validate user
validate organization membership
validate client access

insert retirement_plan

insert plan_version v1

update current_version_id

insert decision_log

insert audit_log

COMMIT
```

---

# 142. EXAMPLE: APPLY RECOMMENDATION

```text
User clicks "Apply"

validate authorization

create new plan version

apply recommendation
calculate new result

store result snapshot

create decision log:
"Monthly SIP changed ₹82K → ₹1.05L"

create audit event

optionally create implementation task

return updated plan
```

---

# 143. CALCULATION VERSIONING

When a bug fix changes the engine:

```text
engine v2.0.0
```

becomes:

```text
engine v2.1.0
```

Old reports must retain:

```text
engineVersion
```

Do not silently recalculate old approved reports.

---

# 144. SCENARIO VERSIONING

A scenario result must reference:

```text
planVersion
assumptionVersion
engineVersion
```

This allows reproducibility.

---

# 145. FINANCIAL TEST FIXTURES

Create fixed test cases.

Example:

```text
Fixture: basic_retirement_01

Age 40
Retire 60
Life 85
Corpus ₹50L
SIP ₹50K
Inflation 6%
Pre-return 10%
Post-return 8%
```

Expected outputs:

```text
approx required corpus
approx projected corpus
approx depletion
```

Use tolerances.

Do not over-constrain stochastic results without seeded RNG.

---

# 146. SEEDED MONTE CARLO

Add seeded random support for tests.

Production:

```text
random seed generated per calculation
```

Stored in result metadata if reproducibility requires it.

Tests:

```text
seed = known constant
```

This lets the same scenario produce stable fixtures.

---

# 147. STOCHASTIC RESULT DISPLAY

When showing:

```text
82%
```

store:

```text
simulationCount
seed if applicable
distribution
engineVersion
assumptionVersion
```

Not merely:

```text
successRate: 0.82
```

---

# 148. TESTING TENANT ISOLATION

Mandatory test:

```text
Org A
  user A
  client A
  plan A

Org B
  user B
  client B
  plan B
```

As user A:

```text
GET client A → 200
GET client B → 404/403

GET plan A → 200
GET plan B → 404/403

GET reports for B → empty/403

GET notifications for B → impossible
```

Also test direct ID guessing.

---

# 149. AUTHORIZATION TESTING

For every role:

```text
owner
admin
wealth practitioner
associate
read-only
```

test:

```text
create
read
update
archive
export
manage team
```

Do not rely solely on snapshots.

---

# 150. E2E TEST — PRACTITIONER JOURNEY

```text
1. Open application
2. Login
3. Choose organization
4. View dashboard
5. Create client
6. Add assets
7. Add liabilities
8. Add goals
9. Complete risk assessment
10. Create plan
11. Change assumptions
12. Calculate
13. Create scenario
14. Compare scenario
15. Save
16. Generate report
17. Open report
18. Create implementation task
19. Complete meeting
20. Logout
21. Login again
22. Verify data persisted
```

---

# 151. E2E TEST — SECOND PRACTITIONER

```text
Owner creates client
Owner assigns client to Practitioner B

Practitioner B logs in

Client visible

Practitioner B edits plan

Owner sees update

Practitioner B cannot see another organization's client
```

---

# 152. E2E TEST — MOBILE

Test:

```text
360px
768px
1440px
```

The existing repository audit already specifies these viewport sizes for final verification. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 153. QA RULE

No console errors.

No:

```text
React hydration errors
uncaught promises
key warnings
broken lazy imports
failed network requests
```

unless explicitly expected.

---

# 154. AGENT SWARM ARCHITECTURE

The harness should use multiple specialized subagents.

The lead agent must own integration.

Use isolated worktrees/branches.

---

# 155. AGENT 0 — ORCHESTRATOR

Title:

```text
Principal Architect / Swarm Lead
```

Owns:

```text
architecture
contracts
dependency graph
agent coordination
integration
merge conflicts
release gate
```

Never casually rewrite another agent's subsystem.

---

# 156. AGENT 1 — REPOSITORY ARCHAEOLOGIST

Goal:

```text
Map every important subsystem.
```

Tasks:

```text
inspect src/pages
inspect src/components
inspect src/lib
inspect context
inspect persistence
inspect API
inspect scripts
inspect tests
inspect routes
inspect configs
```

Output:

```text
docs/CODEBASE_MAP.md
docs/CURRENT_DATA_FLOW.md
docs/LEGACY_RISKS.md
```

---

# 157. AGENT 2 — QUANT ENGINEER

Goal:

```text
Make financial outputs trustworthy.
```

Tasks:

```text
audit every financial formula
fix known engine bugs
add deterministic fixtures
add seeded stochastic tests
add engine versioning
```

Output:

```text
src/domain/*
tests/unit/quant/*
docs/QUANT_METHODS.md
```

Block release if critical calculation tests fail.

---

# 158. AGENT 3 — DATABASE ENGINEER

Goal:

```text
Build tenant-safe PostgreSQL.
```

Tasks:

```text
schema
migrations
constraints
indexes
RLS
soft deletion
audit storage
versioning
```

Output:

```text
server/db/*
docs/DATABASE.md
```

---

# 159. AGENT 4 — AUTH ENGINEER

Goal:

```text
Secure practitioner authentication.
```

Tasks:

```text
login
logout
sessions
MFA
reset password
invitations
memberships
role model
organization switching
```

---

# 160. AGENT 5 — BACKEND API ENGINEER

Goal:

```text
Create stable services and APIs.
```

Tasks:

```text
routes
controllers
services
repositories
validation
pagination
error contracts
transactions
```

---

# 161. AGENT 6 — PERSISTENCE MIGRATION ENGINEER

Goal:

```text
Replace localStorage authority with PostgreSQL.
```

Tasks:

```text
plan persistence
client persistence
risk persistence
meeting persistence
decision persistence
scenario persistence
autosave
migration bridge
conflict resolution
```

---

# 162. AGENT 7 — REACT ARCHITECT

Goal:

```text
Make frontend state server-aware.
```

Tasks:

```text
auth provider
org provider
client provider
plan query/mutations
route guards
API client
error/loading states
```

Do not duplicate business logic.

---

# 163. AGENT 8 — DESIGN SYSTEM ENGINEER

Goal:

```text
Make the app visually coherent.
```

Tasks:

```text
tokens
buttons
inputs
cards
tables
tabs
drawers
modals
command palette
toasts
badges
charts
```

---

# 164. AGENT 9 — PRACTITIONER UX ENGINEER

Goal:

```text
Reorganize the product around the wealth practitioner's workflow.
```

Tasks:

```text
dashboard
client directory
client overview
navigation
reviews
tasks
activity
```

---

# 165. AGENT 10 — PLANNING UX ENGINEER

Goal:

```text
Create the best financial planning workflow.
```

Tasks:

```text
Master Plan
retirement
goals
risk
scenario lab
what-if
recommendations
plan health
```

---

# 166. AGENT 11 — PORTFOLIO ANALYTICS ENGINEER

Goal:

```text
Upgrade investment analytics.
```

Tasks:

```text
allocation
MVO
stress test
rebalancing
sensitivity
market assumptions
portfolio charts
```

Coordinates all financial math changes through Agent 2.

---

# 167. AGENT 12 — REPORTING ENGINEER

Goal:

```text
Build production-grade reports.
```

Tasks:

```text
PDF
IPS
Dossier
documents
report versions
object storage
download/share
```

---

# 168. AGENT 13 — BROKER / MARKET DATA ENGINEER

Goal:

```text
Securely operationalize Angel One and market data.
```

Tasks:

```text
backend integration
credential handling
data refresh
holdings
positions
market bundle
assumption refresh
reconciliation
```

---

# 169. AGENT 14 — QA ENGINEER

Goal:

```text
Verify everything.
```

Tasks:

```text
unit
integration
E2E
visual
mobile
accessibility
tenant isolation
role isolation
calculation regression
```

---

# 170. AGENT 15 — SECURITY ENGINEER

Goal:

```text
Find ways to break the application.
```

Threat model:

```text
cross-tenant access
IDOR
session theft
CSRF
XSS
file upload
secret leakage
broker credential exposure
rate abuse
report URL abuse
organization switching
cache poisoning
```

---

# 171. AGENT 16 — PRINCIPAL PRODUCT REVIEWER

Goal:

```text
Act as the final skeptical user.
```

Questions:

```text
Would I trust this with a client?
Would I understand this number?
Can I recover from a mistake?
Can I find a client in 2 seconds?
Can I prepare for a meeting in 2 minutes?
Can I explain a scenario?
Can I tell what changed since last time?
```

Reject work that is technically correct but product-poor.

---

# 172. AGENT DEPENDENCY GRAPH

```text
                  ORCHESTRATOR
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
       AUDIT        QUANT         DATABASE
          │            │             │
          │            │             ▼
          │            │           AUTH
          │            │             │
          └────────────┴─────────────┘
                       │
                       ▼
                      API
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
    PERSISTENCE                 REACT ARCH
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
             DESIGN              PRACTITIONER        PLANNING
             SYSTEM                 UX                   UX
                                    │                   │
                                    └────────┬──────────┘
                                             ▼
                                         PORTFOLIO
                                             │
                    ┌────────────────────────┼───────────────┐
                    ▼                        ▼               ▼
                 REPORTS                 BROKER             QA
                    │                        │                │
                    └────────────────────────┼────────────────┘
                                             ▼
                                          SECURITY
                                             │
                                             ▼
                                        FINAL REVIEW
```

---

# 173. AGENT HANDOFF CONTRACT

Every agent must return:

```text
Summary
Files changed
Schema/API/component contracts
Tests added
Tests run
Known risks
Breaking changes
Follow-up requirements
```

Do not return a vague:

```text
Done.
```

---

# 174. AGENT FILE OWNERSHIP

Avoid concurrent edits to:

```text
App.tsx
CalculatorContext.tsx
index.css
package.json
```

without the orchestrator assigning ownership.

Shared foundational files need a single owner at a time.

---

# 175. AGENT BRANCHING

Suggested branches:

```text
agent/architecture
agent/repo-audit
agent/quant
agent/database
agent/auth
agent/api
agent/persistence
agent/react
agent/design-system
agent/practitioner-ux
agent/planning-ux
agent/portfolio
agent/reports
agent/broker
agent/qa
agent/security
```

---

# 176. MERGE ORDER

Merge in this order:

```text
repo audit
↓
quant engine
↓
database
↓
auth
↓
API
↓
persistence
↓
React architecture
↓
design system
↓
UX
↓
portfolio
↓
reports
↓
broker
↓
QA
↓
security
↓
final product review
```

---

# 177. FEATURE FLAGS

Potentially gate:

```text
backend_persistence
multi_tenant
new_dashboard
scenario_lab
report_v2
broker_v2
client_portal
```

This lets rollout happen gradually.

---

# 178. MIGRATION RELEASE STRATEGY

Do not flip the entire application overnight.

Recommended:

```text
Release 1
Backend behind feature flag

Release 2
Auth behind feature flag

Release 3
Server persistence optional

Release 4
Default to server persistence

Release 5
Remove obsolete localStorage financial storage
```

---

# 179. DEMO ORGANIZATION

Create a seed:

```text
Sound Thesis Demo Practice
```

Seed:

```text
5 practitioners
25 clients
multiple households
assets
goals
plans
scenarios
reports
tasks
activity
```

All fake.

Clearly marked:

```text
DEMO
```

---

# 180. DEMO CLIENT EXAMPLE

Example:

```text
Raj Sharma
Age 52
Retirement 2033
Net worth ₹6.84 Cr
Plan health 82
```

Use fake identifying details.

---

# 181. PRODUCT WALKTHROUGH

After setup, the demo should allow:

```text
login
→ dashboard
→ select Raj Sharma
→ view health
→ open plan
→ change retirement
→ run scenario
→ compare
→ generate report
```

This should work without external broker credentials.

---

# 182. MARKET DATA FAILURE MODE

If market data is unavailable:

```text
Market data unavailable.

Using last available assumption set:
2026-Q2

[ Refresh ]
```

Do not fail the entire plan.

---

# 183. BROKER OUTAGE

If Angel One is unavailable:

```text
Broker connection unavailable.

Last synchronized:
8 Sep 2026, 10:14 AM

Planning data is unchanged.

[ Retry ]
```

Do not erase cached holdings.

---

# 184. CALCULATION FAILURE

If calculation fails:

```text
We couldn't calculate this scenario.

Your saved plan is safe.

Common causes:
• invalid assumption range
• missing asset category
• infeasible portfolio constraint

[ Review inputs ]
```

---

# 185. VALIDATION RULES

Examples:

```text
age: 18–100
retirement age: current age–100
life expectancy: retirement age–110
inflation: 0–50%
return assumptions: -100–100%
portfolio weights: 0–100%
weights total: 100%
currency values: >= 0
```

Use domain-specific constraints.

---

# 186. EXTREME INPUTS

The application must gracefully handle:

```text
zero assets
zero income
negative cashflow
retirement next year
retirement after 30 years
100% equity
100% debt
no goals
20 goals
very large corpus
foreign currency assets
```

No NaN.

No Infinity.

No broken chart.

No silent negative funding.

---

# 187. NULL HANDLING

Do not treat:

```text
undefined
0
null
empty string
```

as equivalent without a domain reason.

Example:

```text
0 inflation
```

is not the same as:

```text
inflation not specified
```

---

# 188. CALCULATION OUTPUT CONTRACT

Use typed result:

```ts
interface RetirementPlanResult {
  requiredCorpus: number;
  projectedCorpus: number;
  fundingRatio: number;
  corpusGap: number;
  probabilityOfSuccess: number;
  depletionAge: number | null;

  terminalNominalValue: number;
  terminalRealValue: number;

  yearlyProjection: ProjectionPoint[];

  goalResults: GoalResult[];

  allocation: AllocationResult;

  taxSummary: TaxSummary;

  currencyExposure: CurrencyExposure[];

  metadata: CalculationMetadata;
}
```

---

# 189. CALCULATION METADATA

```ts
interface CalculationMetadata {
  engineVersion: string;
  assumptionVersion: string;
  simulationCount: number;
  seed?: number;
  calculatedAt: string;
  source: 'server' | 'preview';
}
```

---

# 190. PREVIEW VS AUTHORITATIVE CALCULATION

UI may show:

```text
Preview
```

while typing.

When user saves:

```text
Authoritative server calculation
```

is performed.

Label clearly if results may differ because of:

```text
simulation count
market version
precision
```

---

# 191. SCENARIO SAVE UX

Button:

```text
Save Scenario
```

Dialog:

```text
Scenario name

[ Retire at 57 ]

Save as

● New scenario
○ Update existing
○ Replace base

[ Save ]
```

---

# 192. "COMPARE WITH CURRENT" BUTTON

Every scenario gets:

```text
Compare
```

which shows:

```text
Current
Scenario
Difference
```

Highlight only meaningful deltas.

---

# 193. DECISION SUMMARY

At end of scenario:

```text
Decision summary

Retiring at 57 improves projected resilience
without requiring a higher SIP under current assumptions.

[ Save decision ]
```

Practitioner can edit summary.

Store in decision log.

---

# 194. CLIENT MEETING MODE

A special meeting view:

```text
RAJ SHARMA

Meeting
15 Sep 2026

Stage 2 of 4
Diagnose
```

Left:

```text
Checklist
```

Center:

```text
Current discussion
```

Right:

```text
Notes
```

Bottom:

```text
[ Previous ]
[ Complete Stage ]
[ Next ]
```

---

# 195. MEETING PREP

Before meeting:

```text
Meeting brief

Last review:
15 Sep 2025

What changed:
SIP +₹20K
Portfolio +₹42L
Risk score unchanged

Discussion points:
• retirement sensitivity
• education goal
• equity drift
```

This becomes a premium practitioner feature.

---

# 196. CLIENT TIMELINE

Activity:

```text
8 Sep 2026
Plan updated
Ketan

6 Sep 2026
Scenario created
Ketan

15 Aug 2026
Document uploaded
Meera

15 Sep 2025
Annual review completed
Ketan
```

---

# 197. PRACTICE ACTIVITY

Organization-wide:

```text
Ketan created client
Aarav changed allocation
Meera generated report
Ketan reassigned client
```

Filters:

```text
User
Action
Entity
Date
```

---

# 198. COMMAND-PALETTE SHORTCUTS

Suggested:

```text
⌘ K
N = new client
P = new plan
G C = clients
G D = dashboard
G R = reports
```

Do not overload users with shortcuts by default.

---

# 199. SECURITY THREAT MODEL

The security agent must test at minimum:

## IDOR

Change:

```text
/client/ID
```

to another client's ID.

Expected:

```text
403 or 404
```

## Cross-org API

Change:

```text
organization ID
```

Expected:

```text
denied
```

## Report URL abuse

Copy report URL.

Open from unauthorized account.

Expected:

```text
denied
```

## Storage access

Try old signed URL after expiry.

Expected:

```text
denied
```

## Session invalidation

Logout.

Replay session.

Expected:

```text
denied
```

---

# 200. CACHE SECURITY

Cache keys must include tenant/user context where permission-sensitive.

Bad:

```text
client:123
```

Better:

```text
organization:abc:client:123
```

If access is practitioner-specific:

```text
organization:abc:user:xyz:client:123
```

depending on actual permission model.

---

# 201. BROKER SECRET SECURITY

Never expose:

```text
TOTP secret
PIN
client secret
session token
```

to:

```text
console logs
error messages
analytics
React state inspection
URLs
```

---

# 202. RATE LIMITING

Apply to:

```text
login
password reset
invite
report generation
broker sync
exports
```

Do not rate-limit normal chart interactions unnecessarily.

---

# 203. AUDIT LOG CONTENT

Record:

```text
who
what
when
where
resource
before
after
request ID
```

Avoid raw sensitive data.

Use redaction.

---

# 204. DATA RETENTION

Define policies for:

```text
audit logs
reports
documents
archived clients
broker snapshots
```

Do not invent legally binding retention periods. Make them configuration/documentation items requiring compliance review.

---

# 205. BACKUPS

Production PostgreSQL must have:

```text
automated backups
point-in-time recovery
restore testing
```

The release process must include an actual restore exercise.

---

# 206. DATABASE MIGRATIONS

Every schema change:

```text
migration file
```

Never rely on manual production edits.

Example:

```text
001_initial_schema
002_memberships
003_clients
004_plans
005_versions
006_scenarios
007_audit
008_tasks
```

---

# 207. SEEDING

Commands:

```bash
npm run db:seed
```

should create:

```text
demo organization
demo practitioners
demo clients
demo plans
demo reports
```

Never seed fake client data in production by accident.

---

# 208. CI

Pull request checks:

```text
typecheck
lint
unit tests
database migration validation
build
E2E smoke
```

Full release:

```text
all unit
all integration
security tests
E2E
accessibility
visual regression
```

---

# 209. PACKAGE MANAGEMENT

The current application uses Vite, React, Tailwind, Recharts, Framer Motion, Lucide and Oxlint, and currently has no ORM/backend package in `package.json`. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/package.json

Add dependencies deliberately.

Do not add an enormous framework stack.

Preferred backend baseline:

```text
Fastify
Drizzle ORM
PostgreSQL driver
Zod
authentication provider
```

Evaluate current package versions before installation.

---

# 210. SERVER PACKAGE ORGANIZATION

If a separate backend is created, use:

```text
server/package.json
```

or a workspace structure.

Do not create an unstructured second application folder.

---

# 211. MONOREPO OPTION

If useful:

```text
apps/
  web/
  api/

packages/
  domain/
  contracts/
  config/
```

But do not migrate to a monorepo merely for aesthetics.

For this repository, a minimally invasive structure is preferable first.

---

# 212. DOMAIN PACKAGE

The most important shared package could become:

```text
packages/domain
```

containing:

```text
retirement
goals
risk
portfolio
scenario
recommendations
```

The frontend imports types/calculation helpers.

Backend imports the authoritative engine.

---

# 213. SHARED CONTRACTS

Define:

```text
CreateClientInput
UpdateClientInput

CreatePlanInput
UpdatePlanInput

CreateScenarioInput

PlanResult
ScenarioResult
```

Share these between frontend/backend.

---

# 214. API CLIENT

Frontend should not build fetch requests ad hoc everywhere.

Create:

```text
apiClient
```

with:

```text
get
post
patch
delete
```

plus:

```text
auth
request ID
error parsing
retry rules
```

Then feature services:

```text
clientsApi
plansApi
scenariosApi
reportsApi
```

---

# 215. QUERY STRATEGY

Client page should fetch:

```text
client summary
```

then lazy fetch:

```text
assets
goals
plan
reports
activity
```

Do not fetch the entire household history on every screen.

---

# 216. DATA PREFETCHING

When opening a client:

Prefetch:

```text
active plan
```

while rendering summary.

When opening plan:

Prefetch:

```text
scenario summaries
```

Do not prefetch 20 MB of PDFs.

---

# 217. OPTIMISTIC UI

Safe:

```text
mark notification read
toggle task complete
```

Use caution:

```text
change retirement age
change target allocation
archive client
```

For financial changes, server confirmation is preferable.

---

# 218. REPORT PREVIEW

Show:

```text
Preview
```

with:

```text
Page 1 of 12
```

Actions:

```text
Approve
Regenerate
Download
```

Approved reports become immutable.

---

# 219. SHARING

Potential future:

```text
Share report
```

Generate:

```text
short-lived secure link
```

with:

```text
expiry
revocation
password optionally
```

Audit link creation.

---

# 220. CLIENT PORTAL — FUTURE

Architect now for:

```text
practitioner users
```

and future:

```text
client users
```

but do not build the portal before practitioner workflow is excellent.

Client permissions should be separate.

---

# 221. CLIENT PORTAL DATA

Potential:

```text
My plan
My goals
My documents
My tasks
My review
```

The client should not receive:

```text
private practitioner notes
internal audit events
internal workflow metadata
```

---

# 222. AI FUTURE

Only after structured data is reliable.

Potential AI functions:

```text
Summarize client
Explain plan change
Prepare meeting brief
Identify major risks
Draft review agenda
Explain scenario
```

Authorization always precedes retrieval.

Never let the AI decide whether a user is authorized.

---

# 223. AI DATA FLOW

Correct:

```text
Authenticated user
↓
authorization
↓
permitted client IDs
↓
permitted data retrieval
↓
LLM context
↓
response
```

Not:

```text
LLM
↓
decides what user can see
```

---

# 224. PRODUCT COPY

Use:

```text
Wealth Practitioner
Client
Plan
Projection
Scenario
Review
Recommendation
Implementation
```

Avoid:

```text
Advisor
Calculation
Input
Output
Submit
```

unless the existing financial context specifically requires them.

---

# 225. BRAND LANGUAGE

Recommended positioning:

```text
Sound Thesis Wealth Planner
```

Subtext:

```text
A modern planning workspace for wealth practitioners.
```

Potential dashboard statement:

```text
Clarity for every financial future.
```

---

# 226. DESIGN DETAIL — LOGIN

Left:

```text
Sound Thesis

Clarity for every financial future.

Build better client plans.
See risk before it becomes a problem.
Turn assumptions into decisions.
```

Right:

```text
Welcome back

Work email
Password

[ Sign in ]

Forgot password?

[ Continue with Google ]
```

---

# 227. DESIGN DETAIL — TOPBAR

```text
Sound Thesis Wealth
/
Raj Sharma
/
Retirement Plan
```

Right:

```text
Saved
⌘K
Notifications
Ketan
```

---

# 228. DESIGN DETAIL — CLIENT HEADER

```text
Raj Sharma

52 · Mumbai

Plan health
82

[ Review ]
[ New plan ]
[ More ]
```

---

# 229. DESIGN DETAIL — PRIMARY METRIC

The key number should be visually dominant.

```text
₹5.32 Cr
Projected retirement corpus
```

Secondary:

```text
₹4.86 Cr required
+₹46L surplus
```

Do not present six huge KPIs with equal visual weight.

---

# 230. INFORMATION HIERARCHY

On every screen:

```text
PRIMARY DECISION
↓
SUPPORTING NUMBER
↓
EXPLANATION
↓
DETAIL
```

Not:

```text
12 equally sized cards
```

---

# 231. DASHBOARD HERO

Example:

```text
Planning health across your practice

82% of active plans are currently on track.

11 plans need your attention.
```

This is more meaningful than:

```text
AUM
Clients
Plans
Users
Reports
```

if the platform does not comprehensively know those values.

---

# 232. CLIENT STATUS LANGUAGE

Use:

```text
On track
Needs review
At risk
Stale
Awaiting input
```

Avoid:

```text
Good
Bad
Failed
```

for financial plans.

---

# 233. COLOR SEMANTICS

Green:

```text
positive
```

Amber:

```text
review
```

Red:

```text
material concern
```

Blue:

```text
information
```

Do not use green/red as the only indication.

---

# 234. DARK MODE

Optional.

Do not compromise data readability.

If implemented:

```text
midnight background
soft white text
muted emerald primary
```

Charts need a separate dark token set.

---

# 235. PRINT UX

Reports only.

When printing:

```text
hide sidebar
hide topbar
hide controls
switch to print-friendly typography
show page numbers
```

The existing repository audit specifically calls for print CSS and a print button on Reports. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 236. EXISTING ROUTE MIGRATION

Current paths can be aliased temporarily.

Examples:

```text
/
→ /dashboard

/risk
→ /clients/:id/risk

/master-plan
→ /clients/:id/plans/:planId

/goal
→ /clients/:id/goals

/retirement
→ /clients/:id/plans/:planId/retirement
```

Do not make the user think in terms of global calculator state anymore.

---

# 237. MISSING CLIENT CONTEXT

The current app behaves more like one active planning model.

The migration must introduce:

```text
selectedClientId
selectedPlanId
```

as explicit server-backed route context.

Do not rely on:

```text
"whatever was last saved in localStorage"
```

to identify the active client.

---

# 238. URL DESIGN

Good:

```text
/clients/abc123/plans/xyz789
```

Bad:

```text
/current-client
```

URLs should identify resources.

They should still enforce authorization.

---

# 239. BREADCRUMBS

Example:

```text
Clients
/
Raj Sharma
/
Retirement Plan
```

Clicking:

```text
Clients
```

returns to directory.

---

# 240. BROWSER BACK BEHAVIOR

Important flows should preserve expected navigation.

Example:

```text
Client
→ Plan
→ Scenario
→ Back
```

returns to plan state, not dashboard.

---

# 241. MULTI-TAB BEHAVIOR

Two browser tabs may edit the same plan.

Handle via:

```text
version conflict
```

or:

```text
real-time last-updated indicator
```

Do not silently overwrite.

---

# 242. ACCESSIBILITY OF FINANCIAL CHARTS

For every important chart add:

```text
accessible title
summary
data table toggle
```

Example:

```text
View data table
```

for Monte Carlo chart.

---

# 243. TABLE EXPORT

Financial tables may support:

```text
Copy
Export CSV
```

only where useful.

Audit export.

---

# 244. SORTING

Sortable:

```text
client name
portfolio value
retirement year
health
last reviewed
```

Server-side for large datasets.

---

# 245. FAVORITES

Useful feature:

```text
Star client
```

Then:

```text
My favorites
```

Keep it lightweight.

---

# 246. TAGGING

Clients may have:

```text
HNI
Family
Business Owner
International
Review Due
High Priority
```

but tags are practice-configurable.

Avoid hardcoding unnecessary business labels.

---

# 247. PRACTICE-WIDE DEFAULTS

Practice owner can configure:

```text
default inflation
default expected returns
simulation count
report branding
review cadence
```

Any change should be versioned for new plans and must not retroactively alter historical approved results.

---

# 248. ASSUMPTION SOURCE BADGES

Show:

```text
Market
Historical
Practice default
Practitioner override
```

as subtle badges.

---

# 249. CHANGE LOG FOR ASSUMPTIONS

Example:

```text
Assumption history

Equity return
11.2% → 10.6%

Updated by:
Practice Admin

Date:
8 Sep 2026

Reason:
Updated market methodology
```

---

# 250. PRODUCT DIFFERENTIATOR

The most important differentiator should be:

> **The platform remembers why the plan exists.**

Most financial calculators answer:

```text
What is the number?
```

This product should answer:

```text
What is the number?
Why?
What changed?
What should we do?
What did we decide?
What happened after the decision?
```

---

# 251. RELEASE GATE — PRODUCT

No release candidate unless a new wealth practitioner can:

```text
sign in
create practice
invite teammate
create client
create plan
complete plan
save
reopen
run scenario
generate report
```

without developer intervention.

---

# 252. RELEASE GATE — TENANCY

No release unless:

```text
Org A cannot access Org B
```

via:

```text
UI
API
direct ID
report URL
document URL
query manipulation
organization switch
cache
```

---

# 253. RELEASE GATE — QUANT

No release unless:

```text
known critical financial bugs fixed
regression tests pass
stochastic tests pass
hand calculations reviewed
engine version persisted
```

---

# 254. RELEASE GATE — UX

No release unless:

```text
desktop looks polished
mobile is intentionally designed
loading states exist
empty states exist
errors are human
autosave works
navigation is coherent
```

---

# 255. RELEASE GATE — SECURITY

No release unless:

```text
MFA works if enabled
sessions revoke
rate limits work
secrets remain server-side
storage URLs are protected
audit logs work
RLS works
role permissions work
```

---

# 256. FINAL ACCEPTANCE WORKFLOW

The final reviewer should literally perform:

```text
1. Register or seed practitioner
2. Login
3. Create practice
4. Invite practitioner
5. Create household
6. Create client
7. Create plan
8. Enter:
   age
   retirement age
   life expectancy
   income
   expenses
   assets
   goals
9. Complete risk assessment
10. Apply risk profile
11. Review allocation
12. Run MVO
13. Run retirement projection
14. Run Monte Carlo
15. Create scenario
16. Change retirement age
17. Compare
18. Save
19. Generate report
20. Add implementation task
21. Complete meeting stage
22. Logout
23. Login from second practitioner
24. Verify client access
25. Switch organization
26. Verify no stale data
27. Attempt forbidden cross-tenant URL
28. Verify denial
```

---

# 257. DEFINITION OF DONE

The platform is complete when all of the following are true.

## Architecture

```text
✓ Vite + React retained
✓ backend exists
✓ PostgreSQL exists
✓ migrations exist
✓ domain engine separated
✓ API contracts exist
✓ auth exists
✓ authorization exists
✓ tenant isolation exists
```

## Data

```text
✓ clients persist
✓ practitioners persist
✓ organizations persist
✓ assignments persist
✓ assets persist
✓ goals persist
✓ cashflows persist
✓ risk persists
✓ plans persist
✓ scenarios persist
✓ versions persist
✓ meetings persist
✓ decisions persist
✓ reports persist
✓ documents persist
✓ tasks persist
```

## Quant

```text
✓ known critical bugs corrected
✓ regression fixtures
✓ seeded Monte Carlo tests
✓ calculation metadata
✓ engine versioning
✓ reproducible snapshots
```

## UX

```text
✓ practitioner dashboard
✓ client directory
✓ client workspace
✓ planning wizard
✓ What-if
✓ scenario lab
✓ risk UX
✓ allocation
✓ MVO
✓ stress tests
✓ reporting
✓ meeting mode
✓ mobile experience
```

## Security

```text
✓ MFA
✓ sessions
✓ rate limiting
✓ RLS
✓ role enforcement
✓ audit logs
✓ secure document access
✓ broker credentials protected
```

---

# 258. DOCUMENTATION REQUIRED

Produce:

```text
docs/ARCHITECTURE.md
docs/CODEBASE_MAP.md
docs/DATABASE.md
docs/AUTHORIZATION.md
docs/API.md
docs/QUANT_METHODS.md
docs/SECURITY.md
docs/MIGRATION.md
docs/UI_ARCHITECTURE.md
docs/OPERATIONS.md
docs/FINAL_REVIEW.md
```

---

# 259. FINAL `FINAL_REVIEW.md`

Must include:

```text
Implementation summary
Architecture diagram
Database diagram
Authentication model
Authorization model
Tenant isolation
Financial-engine fixes
Major UX changes
Testing
Security findings
Performance
Known limitations
Deployment steps
Rollback plan
```

---

# 260. AI HARNESS EXECUTION STYLE

The harness must behave like a senior engineering organization.

Do:

```text
inspect
measure
design
implement
test
integrate
review
```

Do not:

```text
guess
rewrite
hope
```

---

# 261. DO NOT OVER-REFACTOR

A common failure mode is spending weeks moving files while shipping no capability.

Prefer:

```text
small interface
small migration
small feature
tests
integration
```

over:

```text
massive rewrite
```

---

# 262. DO NOT UNDER-ENGINEER

The opposite failure is:

```text
PostgreSQL table
+
login
+
existing calculator
```

without:

```text
permissions
RLS
versions
audit
workflow
```

That is not sufficient.

---

# 263. THE PRODUCT NORTH STAR

The wealth practitioner should be able to sit down before a client meeting and see:

```text
RAJ SHARMA

Where are they?
₹6.84 Cr net worth

Are they on track?
82 plan health

What has changed?
Retirement age +2
SIP +₹20K

What's the biggest risk?
Inflation sensitivity

What should we discuss?
Retirement flexibility

What happens if they retire later?
+₹62L expected resilience

What do we do next?
Increase SIP and rebalance debt
```

That is the end product.

---

# 264. FINAL PRINCIPLE

The existing repository's strongest asset is not its current UI.

It is the fact that a surprisingly large planning engine already exists behind the UI.

The harness must therefore follow this strategy:

```text
PRESERVE THE MATH
      +
PRODUCTIONIZE THE DATA
      +
SECURE THE TENANCY
      +
REFRAME AROUND CLIENTS
      +
ELEVATE THE PRACTITIONER WORKFLOW
      +
MAKE EVERY IMPORTANT DECISION EXPLAINABLE
```

The final product should feel like:

> **A modern private-wealth operating system for wealth practitioners.**

It should not feel like:

> A retirement calculator with accounts.

---

# 265. REPOSITORY REFERENCES USED FOR THIS SPEC

Primary repository:

```text
https://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation
```

Key current files/directories referenced:

```text
src/App.tsx
src/context/CalculatorContext.tsx
src/lib/
src/pages/
src/components/
package.json
Comprehensive Application Audit, Debug & Upgrade Plan.md
feature_list.md
sound_thesis_product_flow_ideas.md
```

The repository README describes the existing architecture, modules, market-data flow, quantitative engine and Vite/React stack. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation

The existing audit documents the critical calculation and UX defects that this specification prioritizes. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/Comprehensive%20Application%20Audit,%20Debug%20%26%20Upgrade%20Plan.md

---

# 266. MASTER COMMAND TO THE AI HARNESS

**Implement this specification against the existing repository.**

**Inspect the existing code before making architectural decisions.**

**Use the agent swarm.**

**Preserve existing functionality.**

**Fix the mathematical engine before polishing financial outputs.**

**Build PostgreSQL-backed multi-tenancy.**

**Use organizations as the hard tenancy boundary.**

**Use wealth practitioners as users/members inside practices.**

**Enforce permissions server-side.**

**Use PostgreSQL RLS or equivalent database-level isolation.**

**Replace localStorage as the source of truth for financial data.**

**Persist clients, households, plans, goals, assets, risk, scenarios, versions, meetings, decisions, reports and tasks.**

**Preserve the existing Vite + React frontend.**

**Make the UI significantly more sophisticated and practitioner-centric.**

**Make the client the center of the workflow.**

**Make scenario modelling and explainability first-class.**

**Make report generation immutable and versioned.**

**Make broker credentials server-side.**

**Add tests for financial correctness, security, tenant isolation and end-to-end workflow.**

**Do not stop at documentation. Build the actual system.**

**Do not produce fake screens disconnected from real data.**

**Do not use placeholder authentication.**

**Do not use placeholder PostgreSQL.**

**Do not fake calculation outputs.**

**Do not silently weaken security to make development easier.**

**When uncertain, inspect the repository, existing types, existing tests and existing architecture before inventing new abstractions.**

**Prefer incremental integration over big-bang replacement.**

**Finish with a fully runnable release candidate and `docs/FINAL_REVIEW.md`.**
