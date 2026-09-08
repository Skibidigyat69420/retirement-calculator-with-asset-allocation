# LEGACY RISKS — what the swarm must respect

> Compiled 2026-09-08. The audit file (`Comprehensive Application Audit, Debug & Upgrade Plan.md`, 264 lines) is the spec-mandated defect backlog — **but it was written against an older revision of the code. Spot-verification below shows most Phase-1 critical math bugs are ALREADY FIXED in the current tree.** Agents must re-verify against current line numbers before "fixing" anything, or they will regress working code.

## 1. Audit status re-verification (CRITICAL for the quant gate)

Audit's six critical math/simulation bugs and their **current** status:

| Audit claim (original ref) | Current verification (2026-09-08) | Status |
|---|---|---|
| `wealthEngine.ts` snapshot category values — terminal values copied into every year's snapshot (audit L428) | `simulateOnePath` now records a fresh `{...state.values}` (+ retained) per year at `src/lib/wealthEngine.ts:459-461`; `buildSnapshots` builds yearly snapshots. | **FIXED** |
| `wealthEngine.ts` backward depletion-age search finds last zero year (audit L607-611) | Forward detection: `if (state.depletionAge === null) state.depletionAge = currentAge + y - 1;` at `src/lib/wealthEngine.ts:430` (first shortfall year). | **FIXED** |
| `wealthEngine.ts` STP double-counting — lumpsum both asset and `stpLiquid` (audit L297-349) | STP lumpsum deducted from liquid at init: `src/lib/wealthEngine.ts:319-321`. | **FIXED** |
| `wealthEngine.ts` `liquidateAtRetirement` flag ignored (audit L282-390) | Flag evaluated at `src/lib/wealthEngine.ts:316-318`; at retirement, retained (non-liquidated) assets leave the SWP corpus (L411-420). **Semantics note:** retained = `!liquidateAtRetirement`; verify this matches product intent. | **FIXED (verify semantics)** |
| `wealthEngine.ts` custom asset return rates overridden by category means (audit L319-327) | Value-weighted custom means per category at `src/lib/wealthEngine.ts:325-330`, applied as `returns[i] - means[i] + mean` (L353-357). | **FIXED** |
| `wealthEngine.ts` goal SIP double-inflation discounting (audit L482-485) | Goal funding compares corpus vs nominal FV directly (`wealthEngine.ts:337,385-403`) — no real/nominal mixing there. `goals.ts:calculateGoalPV` still discounts nominal FV by the passed rate (`goals.ts:35-39`) with nominal `portfolioMean` — internally consistent but **worth a quant re-check**. | **LIKELY FIXED (verify)** |
| `wealthEngine.ts` income flat over 30 years | `currentIncome *= (1 + infl)` yearly at `src/lib/wealthEngine.ts:408`. | **FIXED** |
| `monteCarlo.ts` double σ multiplication (audit L39) | `src/lib/monteCarlo.ts:32-38` — `means[i] + L·z`, no extra `* stdDevs[i]`. | **FIXED** |
| `monteCarlo.ts` SIP step-up applied 1 month/year (audit L121) | `monthlyContribution *= (1 + sipStepUp / 100)` per year at `src/lib/monteCarlo.ts:124`. | **FIXED** |
| `goals.ts` double σ multiplication (audit L34) | `src/lib/goals.ts:25-33` — no extra σ. | **FIXED** |
| `assumptions.ts` shallow-copy covariance mutation (audit L113-119) | Deep row clones: `correlation[cat] = { ...cov[cat] }` at `src/lib/assumptions.ts:116`. | **FIXED** |
| `calculations.ts` STP full-lumpsum reprocessed yearly (audit L254-270) | Running `stpBalance` carried across years at `src/lib/calculations.ts:264,275-284`. | **FIXED** |
| `calculations.ts` SIP step-up restart (audit L254-270) | `currentMonthlySip` grown yearly and passed to `calculateSIPYearly` (`calculations.ts:295-296`). | **FIXED** |
| `calculations.ts` liquidated assets double-counted (audit L306-320) | Not confirmed re-verified — `calculateMasterPlan` still exists and is still **dead code** (no page consumes its result; the context calls only `runWealthEngine`). | **PARTIALLY VERIFIED — dead code path** |
| `mvo.ts` Sharpe gradient uses `means[i] - riskFreeRate` (audit L162); equity cap never applied (audit L137-165) | `applyEquityCap` called at `src/lib/mvo.ts:161` and after gradient steps at `:189`; gradient at `:185`. | **FIXED** |
| `portfolioAnalytics.ts` variance = Σσᵢ² instead of wᵀΣw (audit L75-78) | Full covariance `wᵀΣw` with category weights at `src/lib/portfolioAnalytics.ts:76-84`. | **FIXED** |

**Implication for the swarm's quant gate (spec §5):** the Monte-Carlo volatility suppression called out in the spec appears resolved in the current engine. The remaining quant work is *verification* (hand-check formulas, extend `tests/`), not blind re-application of the audit's patch list. Phase-2..6 audit items (UI/UX, connectivity) were NOT re-verified here and remain a backlog.

## 2. Shared mutable state risks

- **`CalculatorContext` is a global singleton for exactly one client.** All 17 routes share one `MasterPlanInputs` + one `wealthResult`. There is no client entity, no per-client isolation, no concept of a "current client id". Any multi-tenant work must introduce a client-scoped layer *above* this context without breaking its consumer contract (`useCalculator()`).
- **The provider value is a fresh object every render** and includes the entire `wealthResult`; every context change re-renders every `useCalculator()` consumer (memoization is only inside `runWealthEngine`'s `useMemo`). Performance risk grows as pages multiply.
- **`revertDecision` mutates `inputs` from inside a `setDecisionHistory` updater** (`CalculatorContext.tsx:271-281`) — a React side-effect inside a state updater (StrictMode double-invoke hazard).
- **Two parallel state copies of some concepts:** `types/index.ts` vs `riskQuestionnaire.ts` both define `RiskProfile`/`RiskProfileName`/`RiskQuestion` (duplicated, must stay in sync); IPS state lives page-locally while its siblings live in context.
- **Dead/contradictory engines:** `calculations.calculateMasterPlan` (deterministic) and `wealthEngine.buildSnapshots` (also deterministic) compute overlapping things with different math; `allocationScenarios` localStorage persistence has no UI consumer.

## 3. localStorage dependencies

- Full key inventory is in `docs/CURRENT_DATA_FLOW.md` §4. Everything financial (inputs, risk answers, targets, decisions, meeting state, plans, loans, IPS drafts) is localStorage-only today; **spec §2.3 forbids this as the system of record**.
- `StoredPlan` payload fields are typed `unknown` and `loadSavedPlan` casts them straight into `MasterPlanInputs` — corrupt/old payloads can silently produce engine garbage (version key exists only for `soundthesis_client_inputs`, `_version: 1`).
- `loadClientData` silently returns `null` on version mismatch — users lose state with no migration path yet.
- Cross-tab: two tabs write the same keys; last writer wins, no storage events handled.
- Keys are unprefixed per-tenant (all start `soundthesis_`) — fine for single-user, wrong for multi-tenancy.

## 4. Untyped / unvalidated boundaries

- **No zod anywhere in `src/` or `api/`.** Every `fetch().json()` and every `JSON.parse(localStorage)` result is cast, not validated: market-data bundle, Angel One payloads, IPS docs, saved plans, persisted inputs.
- `DataStore` interface is the good seam (`src/lib/store/`), but `StoredPlan.inputs/assumptions/riskAnswers` are `unknown` — the natural place for shared zod contracts (`shared/contracts/`).
- `api/*.ts` handlers duplicate return/covariance math from `src/lib/returns.ts` (drift risk between server & client math).

## 5. API / secret-exposure risks

- **`src/lib/smartapi.ts:52-55` — hardcoded personal network identifiers** in `DEFAULT_NETWORK_INFO` (local IP `192.168.68.61`, public IP `122.170.251.47`, MAC `b0:22:7a:74:16:ec`) shipped in the client bundle. Must be removed/moved server-side.
- **`src/lib/smartapi.ts:483` — hardcoded Angel One API key fallback `'7mnk8SRp'`** committed in source.
- **`src/lib/smartapi.ts:480` reads `import.meta.env.VITE_ANGEL_API_KEY`** — any value set at build time is inlined into the public JS bundle. Broker credentials must live only in the new Express backend.
- **Browser → Angel One calls (`/api/angelone/*`) exist only as a vite dev proxy.** On Netlify (`netlify.toml` has only the SPA fallback) these calls hit `/index.html` — the Angel Connect/Data features are effectively dev-only; SmartAPI also rejects cross-origin browser calls. The new backend must own this integration.
- **JWT broker token stored in sessionStorage** (`soundthesis_angel_session_v1`) — accessible to any XSS payload; acceptable for dev, not for production multi-tenant.
- `api/load-ips.ts` sanitization is decent (basename + `..` + extension checks), but the whole `api/` Vercel layer is GET-only, unauthenticated, and un-rate-limited — fine for public market data, wrong for client data.

## 6. Other fragility

- **`tsconfig.app.json` and `tsconfig.node.json` do NOT set `"strict": true`** (only `noUnusedLocals` etc.), despite the spec claiming strict TS. `server/` and `shared/` are included in **neither** tsconfig — whoever owns tsconfig must add coverage or `tsc -b` won't check backend code. Do not assume strictness in existing files.
- **`wealthResult` recomputation on every input keystroke** (deferred but unthrottled) runs full Monte Carlo in the main thread — watch for jank as simulations counts rise; relevant when moving engines server-side.
- **Assumption auto-calibration overwrites the loaded `AssumptionSet` in memory on mount** and never persists the calibrated set back — refresh behavior depends on the market bundle being reachable (falls back to static copy).
- **`riskQuestionnaire.ts` duplicates types** exported from `types/index.ts` — a refactor hazard.
- **Legacy/dead code:** `legacy/` directory, `calculations.calculateMasterPlan` result unused, `allocationScenarios` persistence unused, `feed.ts` WebSocket broken per audit, `tmp-*.mjs` scripts in `scripts/`.
- **`.env` exists at repo root** (gitignored, contains Angel creds per `.env.example` shape) — backend agents must not read it into the client bundle; new server code should read it only server-side.
- **React 19 + StrictMode** — the `revertDecision` updater side-effect (§2) and any non-idempotent effects will double-fire in dev.

## 7. What must NOT break during the swarm

- `useCalculator()` contract — 30+ consumers; extend, don't reshape.
- `runWealthEngine(inputs, assumptions, {profile, score}, manualTargets)` signature and `WealthEngineResult` shape — every page and chart depends on it.
- The `DataStore` seam (`src/lib/store/`) — the server-backed store should implement the same interface before context wiring changes.
- localStorage keys — keep reading them as a migration source for existing users' data (spec: PostgreSQL becomes SoR, but current users' browsers hold the only copy of their plans).
- Lazy route pattern in `App.tsx` and the `/api/market-data` + `/data/market-data.json` dual-read (dev middleware AND static fallback) that assumption calibration depends on.
- `npm run test:unit` (Node test runner over `tests/*.test.ts`, tsx — not vitest) must keep passing.
