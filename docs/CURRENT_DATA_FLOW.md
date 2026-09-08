# CURRENT DATA FLOW — Sound Thesis Wealth Planner

> How data moves through the app **today** (pre-platform). All file references verified 2026-09-08.

## 1. The one big picture

```
localStorage / market-data.json / Angel One API / api/*.ts
        │
        ▼
CalculatorContext (single global provider, ONE client)
   ├─ inputs: MasterPlanInputs ──────────────┐
   ├─ assumptions: AssumptionSet ────────────┤
   ├─ riskProfile/riskScore ─────────────────┤
   └─ manualTargets ─────────────────────────┘
                    │
                    ▼  useDeferredValue + useMemo
            runWealthEngine(inputs, assumptions, {profile,score}, manualTargets)
                    │  WealthEngineResult (deterministic path + Monte Carlo)
                    ▼
        every page via useCalculator() → charts, tables, reports
                    │
                    ▼ (debounced 500 ms)
        saveClientData(inputs) → localStorage
```

There is exactly **one** `MasterPlanInputs` instance alive at any time. Multi-client, multi-tenant, versioning, and server persistence do not exist yet.

## 2. Central state shape — `src/context/CalculatorContext.tsx`

`CalculatorContextType` (lines 37–81) exposes:

| State | Type (defined in `src/types/index.ts`) | Source of truth |
|---|---|---|
| `inputs` | `MasterPlanInputs` = `client: ClientProfile` + `currentAge/retirementAge/lifeExpectancy/inflation/annualIncome/monthlyExpenditure` + `assets: Asset[]` + `sip: SIPConfig` + `stp: STPConfig` + `swp: SWPConfig` + `goals: Goal[]` | localStorage (`soundthesis_client_inputs`) merged over `defaultClientInputs()` |
| `assumptions` | `AssumptionSet` (categories mean/std + covariance + correlation + FX) | localStorage (`soundthesis_assumptions`), overwritten on mount by market-data calibration |
| `assumptionMode` / `customCategoryReturns` | `'market' \| 'conservative' \| 'historical' \| 'override'` | localStorage |
| `riskAnswers` / `riskScore` / `riskProfile` | 20-question map → score → one of 5 profiles | localStorage |
| `manualTargets` | `Record<AssetCategory, number> \| null` | localStorage |
| `wealthResult` | `WealthEngineResult` | derived (never persisted) |
| `savedPlans` + active-plan marker | `StoredPlan[]` (fields typed `unknown`!) | localStorage via `DataStore` abstraction |
| `decisionHistory` | `DecisionLogEntry[]` (has `revertPatch: Partial<MasterPlanInputs>`, `inputsSnapshot`) | localStorage |
| `meetingState` | 4-stage workflow + checklists + notes | localStorage |

Initialization order in the provider: every slice lazy-initializes from its localStorage loader; anything missing falls back to `defaultClientInputs()` / neutral defaults (risk score 50 = Balanced when no answers).

## 3. Engine invocation

`src/context/CalculatorContext.tsx:584-598`:

```ts
const deferredInputs = useDeferredValue(inputs);
const deferredAssumptions = useDeferredValue(activeAssumptions);
const deferredProfile = useDeferredValue({ profile: riskProfile, score: riskScore });
const deferredManualTargets = useDeferredValue(manualTargets);
const wealthResult = useMemo(
  () => runWealthEngine(deferredInputs, deferredAssumptions, deferredProfile, deferredManualTargets),
  [deferredInputs, deferredAssumptions, deferredProfile, deferredManualTargets],
);
```

- `activeAssumptions = getAssumptionsForMode(mode, assumptions, customReturns)` (line 235).
- `runWealthEngine` (`src/lib/wealthEngine.ts:627`) internally: (a) builds a deterministic per-year path (`buildSnapshots`) with per-year category snapshots, goal funding (maturity year, priority tie-break), STP deployment, SWP with tax, retained-vs-liquidated assets, FX, income-tax estimates; (b) runs N correlated Monte Carlo paths (Cholesky of category covariance, seeded RNG optional); (c) computes allocations/targets/rebalancing vs `manualTargets ?? riskProfile.targets`, tax summary, currency exposure, drawdown probability.
- Because everything is one `useMemo` keyed on deferred values, **every keystroke in any input eventually recomputes the entire engine** (deferred, so UI stays responsive).

### Secondary engine entry points (pages calling lib directly, bypassing the memo)

- `Retirement.tsx` → `runRetirementMonteCarlo` (`monteCarlo.ts`) with sensitivity matrices.
- `GoalPlanner.tsx` → `simulateAllGoals` (`goals.ts`) for per-goal success; `evaluateGoalConflicts` for the waterfall.
- `Allocation.tsx` / `AdvancedPortfolioLab.tsx` → `runMVO` (`mvo.ts`) + `allocationModels.*` + `projections.projectAllocationScenario`.
- `Reports.tsx` → `runReversePlanning`, `runStressTest`, `computePlanHealthScore`, `generatePlanRecommendations`.
- `ReversePlanning.tsx` → `runReversePlanning` (returns pathways whose `patch: Partial<MasterPlanInputs>` is applied back into context — the only "solver → inputs" write-back).
- Standalone calculators call pure functions from `calculators.ts`/`calculations.ts` only.

## 4. Persistence — every localStorage/sessionStorage key

### Authoritative financial state (must move to PostgreSQL per spec §2.3)

| Key | Shape | Writer | Reader |
|---|---|---|---|
| `soundthesis_client_inputs` | `MasterPlanInputs & {_version: 1}` | `persistenceUtils.saveClientData` (debounced 500 ms from context) | `loadClientData` (context init) |
| `soundthesis_risk_answers` | `RiskAnswers` | context `setRiskAnswers` | context init |
| `soundthesis_manual_targets` | `Record<AssetCategory, number>` | context `setManualTargets` | context init |
| `soundthesis_decision_history` | `DecisionLogEntry[]` | `logDecision`/`revertDecision`/`clearDecisionHistory` | context init |
| `soundthesis_meeting_state` | `ClientMeetingState` | meeting mutators | context init |
| `soundthesis_assumptions` | `AssumptionSet` | `assumptions.saveAssumptions` (only called from lib/tests — **context itself never saves after calibration**) | `loadAssumptions` (context init) |
| `soundthesis_plans` | `Record<id, StoredPlan>` (payload fields `unknown`) | `store/localStorageStore.savePlan` via PlanManager UI | `listPlans`/`loadPlan` |
| `soundthesis_active_plan` | plan id string | `setActivePlanId` | `getActivePlanId` |
| `soundthesis_master_plan_loans` | `LoanLiability[]` (page-local type) | `MasterPlan.tsx` effect (line ~165) | `MasterPlan.tsx` init (line ~150) |

### UI / cache state (acceptable to keep in localStorage per spec §2.3)

| Key | Writer | Notes |
|---|---|---|
| `soundthesis_assumption_mode` | context | UI preference |
| `soundthesis_custom_returns` | context effect | becomes financial input in override mode |
| `soundthesis_ips_state_v1`, `soundthesis_saved_ips_drafts`, `soundthesis_ips_linked_mode` | `IPSTemplate.tsx` | IPS drafts + live-sync toggle |
| `soundthesis_allocation_scenarios`, `soundthesis_active_scenario` | `allocationScenarios.ts` | **currently dead** — no page calls load/save |
| `soundthesis_price_cache_<exchange>_<symbol>_<from>_<to>` | `priceCache.ts` | 24 h TTL candle cache |
| session `soundthesis_angel_session_v1` (JWT), `soundthesis_angel_creds_v1` (apiKey+clientCode+IPs+MAC) | `smartapi.ts` | sessionStorage, cleared on tab close; PIN/TOTP never persisted |

## 5. How `MasterPlanInputs` feeds the engines

1. User edits any field → context mutator (`updateInputs`, `updateAsset`, `updateSIP`, …) → `setInputs`.
2. `useDeferredValue(inputs)` → `runWealthEngine` recompute → new `wealthResult`.
3. `wealthResult` flows to every mounted page through context; pages pick the slices they need (e.g. `Dashboard` uses `netWorth`, `monteCarlo.successRate`, `goalResults`; `Retirement` uses `snapshots`, `depletionAge`; `Reports` uses nearly everything).
4. Independently, a 500 ms debounced effect calls `saveClientData(inputs)` → localStorage.
5. `defaultClientInputs()` (`lib/scenarios.ts`) provides the baseline: 30-year-old client, age 60 retirement / 85 life expectancy, 6% inflation, ₹25L income, sample assets (equity ₹15L @12%, debt ₹8L @7%, …), ₹50k/mo SIP 70/30 with 5% step-up, inactive STP, SWP ₹80k/mo need.

## 6. Assumption auto-calibration flow

```
mount → fetchMarketDataFromBackend()
          tries GET /api/market-data (vite dev middleware or Vercel fn)
          falls back to GET /data/market-data.json (static bundle)
        → alignMarketData(...) → MarketDataSet
        → buildAssumptionsFromMarketData(...) → AssumptionSet (means, stds,
          covariance, correlation, FX from INR pairs)
        → setAssumptions(...)  (overwrites the localStorage-loaded set in memory)
```
Used by: context (global assumptions), `useMarketData` hook → AdvancedPortfolioLab & MVO (own copies for optimization inputs).

## 7. Risk-profile flow

`RiskQuestionnaire` page → `setRiskAnswers` → context `riskScore = calculateRiskScore(answers)` (0 answers → 50) → `getRiskProfile(score)` → profile with `targets`, `monteCarloSimulations`, `goalSuccessThreshold`, etc. → `applyRiskProfileToPlan()` writes equity/debt split into `inputs.sip`/`inputs.stp` and clears `manualTargets`. `runWealthEngine` uses the profile for MC simulation counts, target allocation fallback, and goal thresholds.

## 8. Saved plans flow (`DataStore` abstraction)

```
PlanManager UI (TopBar/Dashboard)
  → context.saveCurrentPlan(name)
  → planStorage.savePlan({inputs, assumptions, riskAnswers, manualTargets})
  → store/index.createStore() ──► localStorageStore (the only impl today)
  → soundthesis_plans[id] = StoredPlan ; soundthesis_active_plan = id
loadSavedPlan(id) → setInputs/setAssumptions/setRiskAnswers/setManualTargets (cast from `unknown`)
```
`createStore()` in `src/lib/store/index.ts:12` is the intended seam for swapping in a server-backed store.

## 9. Decision history flow

`logDecision({category, actionTitle, summary, previousValue, newValue, rationale, author, revertPatch?, revertManualTargets?, inputsSnapshot?})` → prepends id/timestamp → localStorage. `revertDecision(id)` applies `revertPatch` to `inputs` and drops the entry. Consumers: DecisionHistoryPage, DecisionHistoryPanel, Dashboard activity.

## 10. API call graph (frontend → backend)

| Caller | Call | Data returned |
|---|---|---|
| `CalculatorContext` mount | `GET /api/market-data` → fallback `/data/market-data.json` | price bundle → assumptions |
| `useMarketData` / MVO / AdvancedPortfolioLab | `GET /api/market-data?symbols=…` | filtered bundle + recomputed covariance |
| `lib/smartapi.ts` (AngelConnect, AngelData, marketData history) | `/api/angelone/rest/...` (vite dev proxy → Angel One) | profile/holdings/quotes/candles (JWT header) |
| `AngelData.tsx` | `GET /api/angel-one-snapshot` | latest local snapshot JSON |
| `IPSTemplate.tsx` | `GET /api/list-ips`, `GET /api/load-ips?filename=` | IPS markdown list/content |

All API responses are consumed as untyped `response.json()` casts — no zod validation anywhere on the frontend.

## 11. What is NOT persisted today (gaps vs spec §2.3)

- Scenarios (`scenarioLab` results, `AllocationScenario[]`) — computed on the fly; allocationScenarios persistence is dead code.
- Reports/Dossier/IPS renders — reproducible from inputs, but IPS form state is only in page localStorage.
- Meeting notes exist; no history of plan versions beyond single-slot `savedPlans`.
- Nothing is ever sent to a server: the app is 100% client-side computation + localStorage.
