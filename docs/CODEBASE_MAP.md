# CODEBASE MAP — Sound Thesis Wealth Planner

> Generated 2026-09-08 by the Repository Archaeologist subagent (read-only analysis).
> Every path below was verified against the working tree at the time of writing.
> Note: `server/` and `shared/` do NOT exist yet — they are being created by other swarm agents.

## 1. Application shell & routing

| File | Responsibility | Key exports |
|---|---|---|
| `src/main.tsx` | Entry point. StrictMode + ErrorBoundary + App. | — |
| `src/App.tsx` | `BrowserRouter`, `CalculatorProvider`, `Layout`, `Suspense` + 17 `lazyNamed()` route components (with one retry on transient load failure). | default `App` |
| `src/components/ErrorBoundary.tsx` | Top-level error boundary. | `ErrorBoundary` |
| `src/components/Skeleton.tsx` | Route-loading fallback. | `Skeleton` |
| `src/index.css` | Tailwind 4 (`@import "tailwindcss"`) + `@theme` design tokens. Dark editorial theme: semantic colors (background/surface/raised/ink/muted/accent) + legacy aliases (`--color-navy`, `--color-gold`, etc.). 732 lines incl. print CSS. | — |
| `vite.config.ts` | React + Tailwind plugins; `localApiPlugin()` dev middleware serves `/api/market-data` from `public/data/market-data.json`; proxies `/api/angelone/*` → `https://apiconnect.angelone.in`. | — |
| `netlify.toml` + `public/_redirects` | SPA fallback `/* → /index.html 200`. | — |
| `tsconfig.app.json` / `tsconfig.node.json` | App: `src/` only, bundler resolution, `noUnusedLocals/Parameters`, **`strict` is NOT set** (see LEGACY_RISKS). Node: `vite.config.ts`, `api/**/*.ts`. `server/`/`shared/` covered by neither. | — |

### Route table (src/App.tsx)

| Path | Component | Source module |
|---|---|---|
| `/` | Dashboard | `pages/Dashboard.tsx` |
| `/risk` | RiskQuestionnaire | `pages/RiskQuestionnaire.tsx` |
| `/master-plan` | MasterPlan | `pages/MasterPlan.tsx` |
| `/goal` | GoalPlanner | `pages/GoalPlanner.tsx` |
| `/retirement` | Retirement | `pages/Retirement.tsx` |
| `/reverse-planning` | ReversePlanning | `pages/ReversePlanningPage.tsx` (wraps `components/analytics/ReversePlanning.tsx`) |
| `/allocation` | Allocation | `pages/Allocation.tsx` |
| `/advanced-portfolio` | AdvancedPortfolio | `pages/AdvancedPortfolioPage.tsx` (wraps `components/analytics/AdvancedPortfolioLab.tsx`) |
| `/meeting-workflow` | ClientMeeting | `pages/ClientMeetingPage.tsx` (wraps `components/analytics/ClientMeetingWorkflow.tsx`) |
| `/decision-history` | DecisionHistory | `pages/DecisionHistoryPage.tsx` (wraps `components/analytics/DecisionHistoryPanel.tsx`) |
| `/reports` | Reports | `pages/Reports.tsx` |
| `/dossier` | Dossier | `pages/Dossier.tsx` |
| `/calculators` | Calculators | `pages/Calculators.tsx` (tabs over 8 calculators) |
| `/ips` | IPSTemplate | `pages/IPSTemplate.tsx` |
| `/angel-connect` | AngelConnect | `pages/AngelConnect.tsx` |
| `/angel-data` | AngelData | `pages/AngelData.tsx` |
| `*` | Navigate → `/` | (404 fallback already present) |

Navigation metadata: `src/components/layout/navItems.ts` — `navItems: NavItem[]` (17 items grouped into sections Overview / 1. Discover / 2. Risk Profile / 3. Retirement / 4. Allocation / 5. Deliverables / Tools & Live Feed), `SECTION_LABELS`, `utilityItem`.

### Layout

| File | Responsibility |
|---|---|
| `src/components/layout/Layout.tsx` | Sidebar + TopBar + animated `<main>` + Footer; owns mobile drawer open state. |
| `src/components/layout/Sidebar.tsx` | Section-grouped nav from `navItems`, mobile drawer. |
| `src/components/layout/TopBar.tsx` | Page title resolution, hamburger, hosts `PlanManager` (saved plans). |
| `src/components/layout/Footer.tsx` | Static footer. |
| `src/components/layout/WorkflowFooter.tsx` | Prev/next workflow links used by most pages. |
| `src/components/layout/PortfolioNavTabs.tsx` | Sub-tabs used on Allocation page only. |

## 2. State management (single source of truth)

### `src/context/CalculatorContext.tsx` (689 lines) — THE central hub

`CalculatorProvider` owns **all** planning state for exactly ONE client at a time (no multi-client/multi-tenant concept exists):

- `inputs: MasterPlanInputs` (client profile, ages, inflation, income, assets, sip/stp/swp configs, goals) — initialized from `loadClientData()` ?? `defaultClientInputs()`, persisted debounced 500 ms.
- Mutators: `setInputs`, `updateInputs`, `updateClient`, `updateAsset`/`addAsset`/`removeAsset`, `updateSIP`/`updateSTP`/`updateSWP`, `addGoal`/`updateGoal`/`removeGoal`.
- `assumptions: AssumptionSet` + `setAssumptions`; auto-calibrated on mount from `fetchMarketDataFromBackend()` → `buildAssumptionsFromMarketData()`.
- `assumptionMode` ('market'|'conservative'|'historical'|'override') + `customCategoryReturns` → `activeAssumptions` via `getAssumptionsForMode`.
- `riskAnswers` / `riskScore` / `riskProfile`; `applyRiskProfileToPlan()` writes equity/debt splits into sip+stp and clears manualTargets.
- `manualTargets: Record<AssetCategory, number> | null`.
- **`wealthResult: WealthEngineResult`** — recomputed in a `useMemo` over `useDeferredValue` of inputs/assumptions/profile/targets via `runWealthEngine(...)`. This is the product every page consumes.
- `savedPlans` + `saveCurrentPlan`/`loadSavedPlan`/`deleteSavedPlan`/`refreshSavedPlans` (via `lib/planStorage`).
- `decisionHistory` + `logDecision`/`revertDecision`/`clearDecisionHistory` (localStorage-backed; revert applies `revertPatch` to inputs).
- `meetingState` (4-stage client meeting workflow, checklist map at lines 92–97) + stage/note mutators.
- `resetToDefaults()`, `showToast()` (floating toast stack rendered by the provider itself).
- `useCalculator()` hook is the single consumption point used by ~30 pages/components.

## 3. Domain engine — `src/lib/` (35 modules + `store/`)

### Financial core

| File | Purpose | Key exports |
|---|---|---|
| `wealthEngine.ts` (750) | Central simulation. Deterministic per-year path + correlated Monte Carlo (Cholesky), goals funding by maturity-year+priority, SWP distribution with tax, retained vs liquidated assets at retirement, FX adjustment, category snapshots, rebalancing trades, tax summary, currency exposure. | `runWealthEngine(inputs, assumptions, profileBundle, manualTargets)`, interfaces `WealthEngineResult`, `WealthSnapshot`, `GoalResult`, `CashFlowEvent`, `TaxSummary`, `CurrencyExposure`, `MonteCarloOutcome` |
| `monteCarlo.ts` (228) | Standalone retirement Monte Carlo (used by Retirement page / stress tests). | `runRetirementMonteCarlo(params: RetirementSimParams): MonteCarloRun` |
| `goals.ts` (141) | Per-goal probabilistic simulation. | `simulateGoal`, `simulateAllGoals`, `calculateGoalPV`, `requiredMonthlySIPForGoal`, `GoalSimulationResult` |
| `calculations.ts` (534) | Legacy deterministic master-plan math (SIP/STP/SWP yearly, CAGR, `calculateMasterPlan`). Still used by calculators + WhatChangedPanel/ImplementationTransitionPlan. | `calculateSIPMonthly/Yearly`, `calculateSTP`, `calculateSTPWithReturns`, `calculateSTPStandalone`, `growAssetsAnnually`, `sumAssetsByCategory`, `getCategoryBreakdown`, `calculateCAGR`, `calculateMasterPlan`, `calculateSIPStandalone`, `calculateSWPStandalone`, `requiredSIPForGoal`, `requiredLumpsumForGoal` |
| `calculators.ts` (408) | Pure standalone calculator functions (audit-verified correct). | `calculateSIP`, `calculateLumpsum`, `calculateSWP`, `calculateSustainableSWP`, `calculateSTP`, `calculateGoal`, `calculateRetirementCorpus`, `calculateEMI` + result interfaces |
| `assumptions.ts` (242) | Return/vol/FX assumption sets built from market data or presets; persistence of the set. | `buildAssumptionsFromMarketData`, `getDefaultAssumptions`, `getAssumptionsForMode`, `getAssumptionSourceLabel`, `loadAssumptions`, `saveAssumptions`, `CONSERVATIVE_PRESET`, `HISTORICAL_PRESET`, interfaces `AssumptionSet`, `CategoryAssumptions`, `FXAssumption` |
| `mvo.ts` (369) | Mean-variance optimization (grid + gradient refinement, equity cap, CML). | `runMVO`, `evaluateCustomWeights`, `findPortfolioByVolatility`, `formatWeight`, interfaces `Portfolio`, `ConstraintSet`, `MVOResult`, `AssetPoint`, `CMLPoint` |
| `allocationModels.ts` (274) | Black-Litterman, risk parity, glide path, tactical allocation (audit-verified sound). | `blackLitterman`, `riskParityAllocation`, `glidePathAllocation`, `tacticalAllocation` |
| `projections.ts` (544) | Allocation-target projections with glide paths & rebalancing strategies. | `projectAssetAllocation`, `projectAllocationScenario`, `convertSnapshotsToAllocationProjection`, `getTargetGlideAllocation`, interfaces `ProjectionResult`, `AllocationScenario` options |
| `portfolioProjection.ts` (254) | Multi-currency portfolio growth projection. | `projectPortfolioGrowth`, `calculateEffectiveReturn`, `SUPPORTED_CURRENCIES` |
| `returns.ts` (134) | Log returns, covariance, correlation (audit-verified sound). | `computeLogReturns`, `computeReturnStats`, `computeCovarianceMatrix`, `computeCorrelationMatrix`, `alignSeries`, `buildReturnsMatrix`, `annualizeDailyReturn/Volatility`, `mean`, `stdDev` |
| `random.ts` (68) | Seeded PRNG (mulberry32) + Box-Muller. | `createSeededRandom`, `createBoxMuller` |

### Planning / advisory layer

| File | Purpose | Key exports |
|---|---|---|
| `riskQuestionnaire.ts` (595) | 20-question, 8-dimension psychometric questionnaire; scoring, profiles, gap analysis, behavioral biases, action checklist, glide path. Duplicates `RiskProfile`/`RiskProfileName` types locally (shadows `types/index.ts`). | `RISK_QUESTIONS`, `DIMENSION_WEIGHTS`, `RISK_PROFILES`, `calculateRiskScore`, `getRiskProfile`, `getRiskProfileById`, `getCategoryScores`, `getDimensionBreakdown`, `analyzeRiskGap`, `detectBehavioralBiases`, `generateActionChecklist`, `getDecimalTargets`, `buildGlidePath` |
| `scenarioLab.ts` (261) | Compares plan variants (income change, delayed retirement, …). | `runScenarioLab`, interfaces `ScenarioLabResult`, `ScenarioComparisonItem` |
| `reversePlanning.ts` (269) | Solves required SIP / feasible retirement age toward a target corpus. | `runReversePlanning`, `ReversePlanningParams/Result/Pathway` (types from `types/index.ts`) |
| `stressTest.ts` (298) | Crisis-scenario portfolio stress tests. | `runStressTest`, `CRISIS_PRESETS`, interfaces `CrisisScenario`, `StressTestImpact`, `CategoryStressResult` |
| `goalConflictEngine.ts` (205) | Goal funding waterfall & conflict detection under constrained capital. | `evaluateGoalConflicts`, interfaces `GoalConflictResult`, `WaterfallStep`, `EvaluatedGoalDemand` |
| `recommendationEngine.ts` (208) | Rule-based plan recommendations. | `generatePlanRecommendations`, `PlanRecommendation` |
| `planHealthScore.ts` (305) | Composite plan health scoring. | `computePlanHealthScore`, interfaces `PlanHealthResult`, `HealthComponentScore` |
| `implementationShortfall.ts` | Perold shortfall, VWAP/TWAP, rebalancing simulation (audit-verified). | `analyzeImplementationShortfall`, `estimatePreTradeCost`, `simulateRebalancing` |
| `allocationScenarios.ts` (153) | Allocation scenario CRUD + localStorage persistence. NOTE: `loadScenarios/saveScenarios/loadActiveScenarioId/saveActiveScenarioId` have **no page consumers** — currently dead persistence. | `createScenario`, `buildInitialScenarios`, `PRESET_SCENARIOS`, `normalizeTargets`, target builders, load/save fns |
| `scenarios.ts` (137) | `defaultClientInputs()` factory — default `MasterPlanInputs`. | `defaultClientInputs` |
| `ipsMarkdown.ts` (335) | IPS state → markdown serializer/parser. | `generateIPSMarkdown`, `parseIPSMarkdown`, `defaultState`, `IPSState` |

### Data access & integrations

| File | Purpose | Key exports |
|---|---|---|
| `marketData.ts` (249) | Fetches `/api/market-data` (falls back to `/data/market-data.json`); symbol history via SmartAPI; alignment helpers. | `fetchMarketDataFromBackend`, `fetchMarketData`, `fetchSymbolHistory`, `alignMarketData`, `getDefaultDateRange`, `getMaxHistoryDateRange`, `MarketDataSet` |
| `smartapi.ts` (492) | Angel One SmartAPI client: login/TOTP, profile, RMS funds, holdings, positions, order/trade book, quotes, LTP, candle data. **Hardcoded personal IPs/MAC + API-key fallback; see LEGACY_RISKS.** | `generateTOTP`, `loginSmartApi`, `fetchUserProfile`, `fetchRMSFunds`, `fetchAllHoldings`, `fetchPositions`, `fetchOrderBook`, `fetchTradeBook`, `fetchQuotes`, `fetchLTPs`, `fetchCandleData`, `saveCredentials`/`loadCredentials`/`saveSession`/`loadSession`/`clearSession`, `buildDefaultCredentials`, `DEFAULT_NETWORK_INFO` |
| `feed.ts` (194) | WebSocket feed manager (audit: broken but unused). | `createFeedManager`, `FeedConnection`, `FeedStatus`, `FeedAuth` |
| `instruments.ts` (90) | Static instrument master subset (exchange, token, category, benchmark). | `INSTRUMENTS`, `INSTRUMENT_MAP`, `getInstrument`, `getInstrumentsByCategory`, `DEFAULT_ALLOCATION_SYMBOLS`, `BENCHMARK_SET` |
| `priceCache.ts` (71) | localStorage candle cache (24 h TTL), keys `soundthesis_price_cache_*`. | `getCachedPrices`, `setCachedPrices`, `clearPriceCache` |
| `persistenceUtils.ts` (65) | Versioned localStorage persistence of `MasterPlanInputs` (`_version: 1`). | `saveClientData`, `loadClientData`, `resetClientData`, `CLIENT_DATA_VERSION` |
| `planStorage.ts` (59) | Plan CRUD facade over the `DataStore` abstraction. | `listPlans`, `loadPlan`, `savePlan`, `deletePlan`, `savePlanLocally`, `loadLocalPlans`, `getActiveStore`, `PlanBundle` |
| `store/types.ts` | `DataStore` interface + `StoredPlan` (**all payload fields typed `unknown`**). | `DataStore`, `StoredPlan` |
| `store/localStorageStore.ts` | localStorage `DataStore` impl; keys `soundthesis_plans`, `soundthesis_active_plan`. | `localStorageStore`, `getActivePlanId`, `setActivePlanId` |
| `store/index.ts` | `createStore()` — currently hard-returns `localStorageStore` (the seam for a future backend store). | `createStore` |

### Shared utilities

| File | Purpose | Key exports |
|---|---|---|
| `constants.ts` (93) | `COLORS`, `ASSET_COLORS`, `ASSET_LABELS`, `DEFAULT_RATES`, `DEFAULT_ALLOCATION`, `RISK_FREE_RATE`, `CATEGORY_SIGMAS`, `FX_ASSUMPTIONS`, `GLIDE_PATH_PRESETS` | |
| `formatters.ts` (52) | `formatCurrency`, `formatCurrencyCompact`/`formatCompactCurrency`, `formatPercent`, `formatNumber`, `formatDate`, `parseCurrencyInput` | |
| `utils.ts` (4) | `cn()` (clsx + tailwind-merge). | |

### Hooks

| File | Purpose |
|---|---|
| `src/hooks/useMarketData.ts` | Market-data load state; used by AdvancedPortfolioLab and MVO flows. |
| `src/hooks/useLiveFeed.ts` | WebSocket live tick hook (wraps `createFeedManager`; unused by pages in practice). |

## 4. Pages — consumers of the context

| Page | Also imports from lib | Notable embedded components |
|---|---|---|
| `Dashboard.tsx` (1061) | constants, formatters, planHealthScore, recommendationEngine, riskQuestionnaire | `dashboard/charts/*` (4), PlanHealthScoreCard, RecommendationsList, WhatChangedPanel, PlanManager |
| `MasterPlan.tsx` (2075) | calculators, constants, formatters | AssetEvolutionChart, CashFlowTimelineChart, NetWorthInvestedChart, NominalRealChart, PhaseTimelineBar, SWPDrawdownChart, DonutChart, PlanningAssumptionsModal; owns `loans` state persisted to `soundthesis_master_plan_loans` |
| `GoalPlanner.tsx` (1065) | formatters, goalConflictEngine, wealthEngine | GoalHorizonTimeline, GoalPriorityWaterfall, GoalSuccessChart, GoalConflictMatrix |
| `RiskQuestionnaire.tsx` (532) | constants, formatters, riskQuestionnaire | — |
| `Retirement.tsx` (968) | calculators, formatters, goals | NominalRealChart, SWPDrawdownChart, RetirementSensitivityMatrix, StressTestSimulator, MonteCarloFailureAnalysis, ScenarioLab |
| `Allocation.tsx` (897) | constants, formatters, implementationShortfall, instruments, mvo, projections | AssetEvolutionChart, DonutChart, StressTestSimulator, PlanVsReality, ImplementationTransitionPlan, PortfolioNavTabs |
| `Reports.tsx` (516) | constants, formatters, goalConflictEngine, planHealthScore, recommendationEngine, reversePlanning, stressTest | `reports/screen/*` charts (9), PlanHealthPanel |
| `Dossier.tsx` (1419) | constants, formatters, planHealthScore, recommendationEngine, riskQuestionnaire, stressTest | `reports/screen/*` charts, DonutChart, MonteCarloFanChart |
| `IPSTemplate.tsx` (1810) | formatters, ipsMarkdown | IPS markdown editor; fetches `/api/list-ips`, `/api/load-ips`; localStorage keys `soundthesis_ips_state_v1`, `soundthesis_saved_ips_drafts`, `soundthesis_ips_linked_mode` |
| `AngelConnect.tsx` (866) | formatters, smartapi | SmartAPI login (TOTP), credential/session mgmt, "Sync to Wealth Planner" |
| `AngelData.tsx` (582) | constants, formatters, smartapi | Live quotes; fetches `/api/angel-one-snapshot` |
| `Calculators.tsx` (65) | — | 8 standalone calculators |
| `ClientMeetingPage.tsx` (188) | — | ClientMeetingWorkflow |
| `DecisionHistoryPage.tsx` (146) | formatters | DecisionHistoryPanel, recharts activity timeline |
| `AdvancedPortfolioPage.tsx` (23) | — | AdvancedPortfolioLab |
| `ReversePlanningPage.tsx` (23) | — | ReversePlanning |

## 5. Component inventory by domain

- **`components/ui/`** (14): Alert, Badge, Button, Card, CurrencyInput, EnhancedNumberInput, Input, MetricCard, NumberInput, SectionTitle, Select, Slider, Tabs — the design-system primitives (dark editorial theme).
- **`components/charts/`** (11): AssetEvolutionChart, CashFlowTimelineChart, DonutChart, GoalHorizonTimeline, GoalPriorityWaterfall, GoalSuccessChart, MonteCarloFanChart, NetWorthInvestedChart, NominalRealChart, PhaseTimelineBar, SWPDrawdownChart — shared Recharts wrappers.
- **`components/dashboard/`**: PlanHealthScoreCard, RecommendationsList, WhatChangedPanel + `charts/` (AllocationCompareChart, CashflowWaterfallChart, MonteCarloHistogram, NetWorthEvolutionChart) — used only by Dashboard.
- **`components/analytics/`** (12): AdvancedPortfolioLab (BL/risk-parity/glide/tactical), ClientMeetingWorkflow, DecisionHistoryPanel, GoalConflictMatrix, ImplementationTransitionPlan, MonteCarloFailureAnalysis, PlanningAssumptionsModal, PlanVsReality, RetirementSensitivityMatrix, ReversePlanning, ScenarioLab, StressTestSimulator.
- **`components/calculators/`** (9): CalculatorShell + EMI, Goal, Lumpsum, PortfolioReturnProjection, RetirementCorpus, SIP, STP, SWP.
- **`components/reports/`**: AllocationComparisonBars, CurrencyExposureBars, GoalDistributionBars, NetWorthGrowthChart, PlanHealthPanel, PlanHealthRadial, StressImpactBars, StressMatrixTable, SWPSurvivalChart + `screen/` (11 print/screen charts: AllocationDriftChart, CashflowTimelineChart, ChartFrame, chartTheme, CurrencyExposureChart, GoalFundingChart, MonteCarloHistogram, NetWorthTrajectory, SensitivityTornado, StressScenarioChart, TaxBreakdownChart — consumed by Reports & Dossier; ChartFrame/chartTheme are internal).
- **`components/identity/`**: PlanManager — saved-plan list/save/load/delete UI (mounted in TopBar and Dashboard).
- **`components/layout/`**: Layout, Sidebar, TopBar, Footer, WorkflowFooter, PortfolioNavTabs, navItems.ts.

## 6. Backend / API surface (today)

| Endpoint | Where implemented | Consumer |
|---|---|---|
| `GET /api/market-data[?symbols&from&to]` | `api/market-data.ts` (Vercel serverless) + vite dev middleware | `lib/marketData.ts:fetchMarketDataFromBackend` (context auto-calibration; MVO; AdvancedPortfolioLab) |
| `GET /api/angel-one-snapshot` | `api/angel-one-snapshot.ts` | `pages/AngelData.tsx` |
| `GET /api/list-ips` | `api/list-ips.ts` (+ `api/lib/ipsDocs.generated.ts` embedded docs) | `pages/IPSTemplate.tsx` |
| `GET /api/load-ips?filename=` | `api/load-ips.ts` (basename-sanitized) | `pages/IPSTemplate.tsx` |
| `GET /api/ping` | `api/ping.ts` | health/diagnostics |
| `/api/angelone/*` | vite dev proxy only → `apiconnect.angelone.in` | `lib/smartapi.ts` (browser-direct SmartAPI calls) |
| `api/lib/shared.ts` | `sendJson`, `methodNotAllowed`, `queryParam` — GET-only JSON helpers. | all api handlers |

## 7. Scripts (`scripts/`)

- Python data pipeline (`.venv`): `fetch_angel_historical.py`, `fetch_angel_all.py`, `fetch_historical.py` (Yahoo), `build_market_database.py`, `angel_live_feed.py`, `requirements.txt` — populate `data/prices/*.csv`, `data/instruments_master.csv`, `data/universe_manifest.json`, `data/angel_one/<timestamp>/`.
- Node: `generate-ips-docs.mjs` (build-time embed of `ips/*.md` → `api/lib/ipsDocs.generated.ts`), `export-pdf.js` (Dossier PDF), `headless-qa.js` (puppeteer screenshot/axe QA → `qa-screenshots/`), `test-smartapi.js`, `audit-*.js`, `contrast-diag.js`, assorted `tmp-*.mjs` one-off shots.

## 8. Tests (`tests/` — Node test runner via `npx tsx --test`, NOT vitest/jest)

`wealthEngine.test.ts`, `calculations.test.ts`, `formatters.test.ts`, `goalConnection.test.ts`, `mvo.test.ts`, `mvoEnhanced.test.ts`, `portfolioProjection.test.ts`, `reversePlanning.test.ts`, `stressTest.test.ts`, `adviserEngines.test.ts` — all import pure functions from `src/lib/*` and run under `npm run test:unit`.

## 9. Data assets

- `public/data/market-data.json` — pre-built price bundle served to the app (source of assumption auto-calibration).
- `data/prices/*.csv`, `data/instruments_master.csv`, `data/universe_manifest.json` — raw pipeline outputs (not shipped to browser except via api).
- `data/angel_one/<YYYYMMDD_HHMMSS>/` — Angel One API snapshots (gitignored; absent on deploy → api returns 404).
- `ips/` — committed IPS markdown docs (embedded at build time); `ips-template/` — CFA-style IPS template docs.
- `legacy/` — old static HTML calculators + test.js (dead, unreferenced).
