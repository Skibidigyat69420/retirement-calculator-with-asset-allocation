Comprehensive Application Audit, Debug & Upgrade Plan
Summary
After a complete code-level audit of all 12 pages, 35 components, 23 business logic modules, and 6 API endpoints, I've identified 6 critical math/simulation bugs, 12 severe logic flaws, 20+ UI/UX issues, and significant architectural gaps. The application's core architecture (shared context, wealth engine, risk profiling) is actually much stronger than it first appears — most pages DO connect to the shared CalculatorContext and wealthEngine. The main issues are in calculation correctness, UI polish, and a few disconnected modules.

This plan is organized into 6 execution phases ordered by impact and dependency.

User Review Required
IMPORTANT

Scope & Prioritization: This is a very large project. I recommend executing Phases 1–4 (critical bugs, calculation fixes, UX fixes, and connectivity improvements) as the first pass, then Phases 5–6 (polish and final QA) as a second pass. Shall I proceed with all phases, or would you prefer to start with a subset?

WARNING

Breaking changes: Phase 1 fixes critical math bugs in the Monte Carlo, wealth engine, and goal calculations. These fixes will change simulation outputs significantly (currently Monte Carlo volatility is dampened to ~2% instead of the correct 15%, making all success rates appear artificially high). After fixing, success rates and required SIP figures will change to realistic values.

IMPORTANT

Data persistence: Currently only risk questionnaire answers persist to localStorage. Phase 3 adds localStorage persistence for all client inputs (assets, goals, cashflows). This means existing users on the deployed site will start with default data until they make changes.

Phase 1: Critical Math & Simulation Bug Fixes
These bugs produce incorrect financial outputs and must be fixed first since all UI depends on correct calculations.

Calculation Engine Fixes
[MODIFY] 
wealthEngine.ts
Fix snapshot category values (L428): { ...state.values } copies terminal values into every year's snapshot. Fix by recording per-year category snapshots during simulateOnePath.
Fix backward depletion age search (L607-611): Iterating backwards finds the last zero-corpus year instead of the first. Reverse to forward iteration.
Fix STP double-counting (L297-349): STP lumpsum is initialized as both an asset and separate stpLiquid balance. Fix by deducting STP transfers from state.values.liquid.
Fix liquidateAtRetirement flag being ignored (L282-390): The wealth engine never evaluates this flag during distribution. Implement asset liquidation logic at the accumulation→distribution transition.
Fix custom asset return rates being overridden (L319-327): Individual asset return rates are replaced by category assumption means. Preserve custom rates when specified.
Fix goal SIP double-inflation discounting (L482-485): Uses nominal FV with real discount rate. Use nominal return with nominal FV consistently.
Fix income remaining flat over 30 years: Annual income should grow with inflation during accumulation.
[MODIFY] 
monteCarlo.ts
Fix double standard deviation multiplication (L39): L * z already produces correctly-scaled returns from the covariance matrix Cholesky factor. Remove the extra * stdDevs[i] multiplication.
Fix SIP step-up rate (L121): Math.pow(1 + stepUp/100, 1/12) only applies 1 month of growth per year. Change to 1 + stepUp/100 for annual step-up.
[MODIFY] 
goals.ts
Fix double standard deviation multiplication (L34): Same issue as monteCarlo.ts — remove * stdDevs[i].
Fix double-inflation discounting (L49-53): Use nominal return rate with nominal future value.
[MODIFY] 
assumptions.ts
Fix shallow copy corrupting covariance matrix (L113-119): { ...cov } only copies outer keys, so writing to correlation[cat][cat2] mutates cov[cat][cat2]. Deep-clone rows: catList.forEach(cat => correlation[cat] = { ...cov[cat] }).
[MODIFY] 
calculations.ts
Fix STP state reset across years (L254-270): STP processes the full lumpsum every year instead of tracking a running balance.
Fix SIP step-up not propagating (L254-270): calculateSIPYearly(sip, 1) restarts the SIP at base amount each year, losing step-up compounding.
Fix double-counting liquidated assets (L306-320): Assets already included in terminalSnapshot are added again via asset.value.
[MODIFY] 
mvo.ts
Fix Sharpe gradient formula (L162): Uses means[i] - riskFreeRate instead of means[i] for the return derivative.
Apply equity cap in gradient refinement (L137-165): applyEquityCap is never called after gradient steps.
[MODIFY] 
portfolioAnalytics.ts
Fix portfolio variance (L75-78): Uses sum of squared individual variances instead of full covariance 
w
T
Σ
w
w 
T
 Σw.
Phase 2: Architecture & Data Flow Fixes
Context & State Management
[MODIFY] 
CalculatorContext.tsx
Add localStorage persistence for inputs (assets, goals, cashflows, profile params). Currently only riskAnswers are persisted. Add save/load with debounced writes and a "Reset to Defaults" action.
Remove redundant calculateMasterPlan(inputs) call: result from calculations.ts is computed but never consumed by any page. Remove to eliminate wasted computation.
Fix ID collision: Replace Date.now() with crypto.randomUUID() for asset and goal IDs.
Add setManualTargets to context: Currently allocation target overrides are local state in Allocation.tsx. Move to context so Reports, IPS, and Dashboard can access them.
Handle incomplete risk questionnaire consistently: When answers are incomplete, the context defaults to score 50 ('Balanced') while the questionnaire page calculates a different score. Align both to use the same logic.
[MODIFY] 
App.tsx
Add 404 fallback route: <Route path="*" element={<Navigate to="/" replace />} />.
Remove dead /advanced-allocation link from Allocation.tsx or add the route.
Page Connectivity Fixes
[MODIFY] 
Retirement.tsx
Fix projected corpus bug: Uses wealthResult.terminalValue (age 80 leftover) instead of corpus accumulated at retirement age. Extract the correct snapshot at retirement age.
Fix formula mismatch: Uses perpetuity formula (
a
n
n
u
a
l
N
e
e
d
/
r
r
e
a
l
annualNeed/r 
real
​
 ) while calculators use finite-horizon annuity. Standardize on finite-horizon using lifeExpectancy.
Fix tax exclusion: Include swp.taxRate in the local required corpus calculation.
Add life expectancy input to the page (currently hidden but affects calculations).
Show both accumulation and distribution phases in the chart, not just accumulation.
[MODIFY] 
Allocation.tsx
Fix rebalancing table disconnection: Gap (₹) and Action columns use pre-computed wealthResult.rebalancingTrades which don't reflect manual slider or MVO target changes. Recompute dynamically from current targets.
Fix applyMvoTargets 2-asset normalization: Forces debtSplit = 100 - equitySplit, wiping Gold allocation. Properly distribute across all categories.
Fix target percentage validation: Sliders can sum to >100% or <100%. Add normalization or constrained sliders.
Remove dead /advanced-allocation link (L316).
Persist manual targets to context so they propagate to Reports and IPS.
[MODIFY] 
GoalPlanner.tsx
Add goal name editing: Currently renders name as static text.
Add delete goal button: Currently only deletable from Master Plan.
Add recurring toggle: Property exists but no UI to set it.
Fix empty state: When all goals are removed, show a "Create Goal" button.
Fix X-axis formatter: Hardcoded Lakh formatter shows Crore values incorrectly.
Fix SIP gap calculation: Compares individual goal SIP against total portfolio SIP.
[MODIFY] 
Reports.tsx
Add print button and print-specific CSS.
All data is already dynamic from useCalculator() — verify after Phase 1 math fixes.
[MODIFY] 
IPSTemplate.tsx
Initialize targets from riskProfile.targets instead of hardcoded defaults.
Add realestate and other categories to SAA section.
Fix "Load" behavior: Currently downloads the file instead of loading into form.
[MODIFY] 
RiskQuestionnaire.tsx
Fix score denominator display (L85): Shows score / 200 instead of score / 100.
Fix subtitle (L218): Says "16 questions across seven dimensions" — should be "20 questions across eight dimensions".
Add missing 8th dimension (context / Portfolio Context) to categoryIcons and categoryLabels.
Surface analyzeRiskGap(), detectBehavioralBiases(), and generateActionChecklist() on the results page.
Add glide path chart labels: Currently renders raw SVG rectangles without axis labels.
[MODIFY] 
Dashboard.tsx
Fix grid columns (L138): lg:grid-cols-5 with 6 cards. Change to lg:grid-cols-3 xl:grid-cols-6.
Fix multi-currency display: Only shows first non-INR currency.
Add empty/loading states for when data hasn't been entered yet.
Add post-retirement/distribution phase to charts.
Add quick-action links on alerts (e.g., "Fix in Master Plan").
[MODIFY] 
MVO.tsx
Add input validation: Prevent negative returns, >100% std dev.
Handle international symbol errors gracefully: US ETFs with empty tokens crash the SmartAPI fetch.
Improve error messaging when optimization fails (singular matrix, no feasible solution).
[MODIFY] 
MasterPlan.tsx
Fix goal priority ordering: Goals sorted by yearsToGoal instead of priority. Essential goals should be funded first when capital is constrained.
Phase 3: Data Persistence & Consistency
[NEW] 
persistenceUtils.ts
saveClientData(inputs) / loadClientData() with debounced localStorage writes.
Version key for migration when data model changes.
"Reset to Defaults" function.
[MODIFY] 
CalculatorContext.tsx
Wire persistence: load on mount, save on inputs changes (debounced 500ms).
Phase 4: UI/UX Polish & Component Fixes
Navigation & Layout
[MODIFY] 
TopBar.tsx
Fix title resolution for /angel-connect (currently shows fallback "Wealth Planner").
Add aria-label and aria-expanded to hamburger button.
[MODIFY] 
Sidebar.tsx
Group navigation items into logical sections: Planning (Dashboard, Risk, Master Plan, Goals, Retirement), Portfolio (Allocation, MVO), Reports (Reports, IPS), Tools (Calculators), Data (Angel Connect, Angel Data).
Add workflow completion indicators (checkmarks/badges showing completed sections).
Add Escape key listener to dismiss mobile drawer.
Add body scroll lock when drawer is open.
Fix drawer slide direction (currently slides from right, hamburger is on left).
[MODIFY] 
navItems.ts
Add section groupings.
Fix duplicate Calculator icon for /calculators and /retirement.
Input Components
[MODIFY] 
CurrencyInput.tsx
Fix Arrow key / stepper button visual sync when focused.
[MODIFY] 
EnhancedNumberInput.tsx
Fix Arrow key / stepper button visual sync when focused.
[MODIFY] 
Button.tsx
Add default type="button" to prevent accidental form submission.
[MODIFY] 
Slider.tsx
Fix CSS track occlusion: native slider background hides custom progress track.
Charts
[MODIFY] Chart components (all 6 files in src/components/charts/)
Unify hardcoded colors (#1A233A, #B68B40) with COLORS from constants.ts.
Add ResponsiveContainer wrapper for proper chart sizing on mobile.
Formatting
[MODIFY] 
formatters.ts
Add formatCompactCurrency() that intelligently uses Lakhs/Crores based on magnitude.
Add formatDate() utility.
Audit all pages to use centralized formatters instead of inline formatting.
Accessibility
Add role="progressbar" + ARIA attributes to ProgressBar.tsx.
Add role="tablist" / role="tab" / aria-selected to Tabs.tsx.
Add role="alert" to Alert.tsx.
Add htmlFor/id connections in Input.tsx, Select.tsx, CurrencyInput.tsx.
CSS Cleanup
[DELETE] 
App.css
Dead code — Vite template CSS not imported anywhere.

[MODIFY] 
index.css
Fix --color-gold mismatch: defined as #D1CDC3 (grey) but charts use #B68B40 (amber). Align to one value.
Fix --color-navy being identical to --color-ink (#111111).
Fix range input background overriding transparent slider.
Add print-specific CSS rules.
Phase 5: Missing Features & Workflow Improvements
Reports Export
[MODIFY] 
Reports.tsx
Add "Print Report" button with window.print().
Add print-specific CSS (hide sidebar, navigation, use serif fonts).
Calculators Integration
[MODIFY] Calculator components (7 files in src/components/calculators/)
Add "Apply to Master Plan" buttons where relevant (SIP → Master Plan SIP config, Retirement Corpus → context).
Initialize calculator inputs from context when available.
Angel Connect → Wealth Planner
The "Sync to Wealth Planner" button already exists and works. Verify it properly maps holdings categories.
Scenario Management
scenarios and loadScenario exist in context but have no UI. Add a scenario selector dropdown to Master Plan.
Phase 6: Final QA & Testing
Build check: npx tsc --noEmit — verify zero errors.
Route testing: Visit every route, verify content renders.
Workflow testing: Complete the full advisor workflow:
Dashboard → Risk Profile → complete all 20 questions → verify score
Use result in Allocation → verify targets update
Master Plan → add assets, goals, cashflows → verify projections
Retirement → verify corpus calculations match
Reports → verify all data is consistent
IPS → verify risk profile and allocation match
Calculation testing: Verify key financial formulas with hand calculations.
Responsive testing: Check all pages at mobile/tablet/desktop widths.
Console check: Verify no runtime errors or warnings.
Data consistency check: Change input in one module, verify it propagates correctly.
Verification Plan
Automated Tests
npx tsc --noEmit — TypeScript compilation
npm run build — Full production build
Manual calculation spot-checks for key formulas
Manual Verification
Complete full advisor workflow end-to-end
Test each page at 3 viewport sizes (360px, 768px, 1440px)
Check browser console for errors on every page
Verify data consistency across modules after changes
Files Not Changed (Verified Working)
These files were audited and found to be correct or non-critical:

allocationModels.ts — Black-Litterman, Risk Parity math is sound
riskQuestionnaire.ts — Scoring logic is correct (UI display bugs only)
calculators.ts — Standalone calculator functions are mathematically correct
returns.ts — Log returns, covariance, correlation math is sound
constants.ts — Clean centralized defaults
scenarios.ts — Realistic baseline profiles
implementationShortfall.ts — Perold, VWAP/TWAP correctly implemented
smartapi.ts — Angel One API integration is functional
feed.ts — WebSocket is broken but non-critical (live feed is unused)
API handlers — Working correctly for their use cases