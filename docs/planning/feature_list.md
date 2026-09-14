# Sound Thesis Wealth Planner — Comprehensive Feature List

> **Institutional-Grade Multi-Asset Wealth Planning, Retirement Forecasting, Risk Modeling & Portfolio Analytics Platform**

---

## Table of Contents

1. [Executive Overview & Platform Architecture](#1-executive-overview--platform-architecture)
2. [Client Profiling & Risk Architecture](#2-client-profiling--risk-architecture)
3. [Core Wealth Engines & Deterministic Master Plan](#3-core-wealth-engines--deterministic-master-plan)
4. [Retirement Planning & SWP Longevity Modeling](#4-retirement-planning--swp-longevity-modeling)
5. [Crisis Stress-Testing & Macroeconomic Shock Simulator](#5-crisis-stress-testing--macroeconomic-shock-simulator)
6. [Retirement Age vs Lifestyle Expense Sensitivity Matrix](#6-retirement-age-vs-lifestyle-expense-sensitivity-matrix)
7. [Asset Allocation & Portfolio Rebalancing Engine](#7-asset-allocation--portfolio-rebalancing-engine)
8. [Modern Portfolio Theory & Mean-Variance Optimization (MVO)](#8-modern-portfolio-theory--mean-variance-optimization-mvo)
9. [Monte Carlo Stochastic Longevity Simulation](#9-monte-carlo-stochastic-longevity-simulation)
10. [Multi-Goal Financial Engineering & Cash Flow Matching](#10-multi-goal-financial-engineering--cash-flow-matching)
11. [Multi-Asset Portfolio Return & Wealth Projection Calculator](#11-multi-asset-portfolio-return--wealth-projection-calculator)
12. [Financial Decision Calculators Suite](#12-financial-decision-calculators-suite)
13. [Institutional Investment Policy Statement (IPS) Generator](#13-institutional-investment-policy-statement-ips-generator)
14. [7-Page Executive Portfolio Dossier & Publication PDF Engine](#14-7-page-executive-portfolio-dossier--publication-pdf-engine)
15. [Angel One SmartAPI Live Market Feed Connector](#15-angel-one-smartapi-live-market-feed-connector)
16. [State Management, Persistence & Plan Portability](#16-state-management-persistence--plan-portability)
17. [Design System, Typography & Verification Standards](#17-design-system-typography--verification-standards)

---

## 1. Executive Overview & Platform Architecture

Sound Thesis Wealth Planner is a full-stack, client-side institutional financial advisory platform engineered to model multi-decade wealth compounding, asset allocation, post-retirement income drawdown, market tail-risk shocks, and goals cash-flow matching with CFA/CFP-level mathematical precision.

### Key Architectural Characteristics
- **Zero-Cloud Local First**: Operates 100% locally in the browser with `localStorage` persistence, ensuring zero latency, absolute client financial confidentiality, and complete offline capability.
- **Pure Deterministic + Stochastic Hybrid Modeling**: Couples exact year-by-year cash flow accounting with 1,000-run Monte Carlo probability distributions.
- **Strict Single-Source State Management**: Centralized `CalculatorContext` synchronizes assets, income, liabilities, goals, risk scores, and asset allocation across all 9 platform pages in real time.
- **Institutional Publication Output**: Built-in 7-page A4 print stylesheet and headless Puppeteer CLI tool producing presentation-ready client advisory dossiers in seconds.

---

## 2. Client Profiling & Risk Architecture

### Client Personas & Presets
- **Pre-Configured Institutional Archetypes**:
  - **Vikram & Ananya Sharma (Balanced Growth)**: Dual-income family (Age 38/36), ₹2.33Cr net worth, ₹2.85L monthly income, targeting retirement at age 58.
  - **Rajesh & Priya Patel (Pre-Retirement Wealth)**: Age 52/50, ₹6.80Cr net worth, conservative wealth preservation focus.
  - **Aarav Patel (Young Accumulator)**: Age 28, high equity beta, aggressive multi-decade SIP accumulation.
  - **Dev & Riya Malhotra (Early Independence / FIRE)**: Age 34, high savings rate (>60%), early retirement drawdown at age 45.
- **Custom Plan Mode**: Complete blank-slate or custom overrides for any client scenario.

### Psychometric & Financial Capacity Risk Profiling (`/risk`)
- **Multi-Dimensional Questionnaire**: Evaluates investment horizon, reaction to a 25% equity crash, emergency buffer adequacy, liquidity preference, and income stability.
- **Risk Tolerance Score (0–100)**: Quantitative index mapped into five institutional risk tiers:
  - *Conservative* (0–30)
  - *Moderate* (31–50)
  - *Balanced* (51–70)
  - *Growth* (71–85)
  - *Aggressive* (86–100)
- **Automatic Glide Path Mapping**: Recommends age-dependent strategic asset allocations based on the user's risk capacity.

---

## 3. Core Wealth Engines & Deterministic Master Plan

### Master Plan Simulation (`/master-plan`)
- **Holistic Balance Sheet Aggregation**:
  - **Financial Assets**: Domestic Equities, Foreign Equities, Fixed Income/Debt, Sovereign Gold/Commodities, Liquid Cash, Alternative Assets.
  - **Physical Assets**: Primary Residence, Commercial Real Estate, Land.
  - **Liabilities**: Home Loans, Personal Loans, Vehicle Loans, Outstanding Credit.
- **Dynamic Cash Flow Accumulation Engine**:
  - Monthly active salary/business income with customizable annual increment (% p.a.).
  - Monthly baseline living expenses indexed to inflation.
  - Ongoing SIP contributions with annual Step-Up (% p.a.).
  - Discrete goal cash outlays (Education, Real Estate purchase, Vehicle, Travel) deducted from appropriate asset buckets.
  - Net monthly surplus automatically reinvested into growth assets.
- **Visual Trajectory Analytics**:
  - Year-by-year milestone chart of Total Net Worth, Financial Net Worth, and Debt reduction.
  - Real vs. Nominal net worth trajectory.

---

## 4. Retirement Planning & SWP Longevity Modeling

### Retirement & SWP Module (`/retirement`)
- **Target Retirement Corpus Computation**:
  - Calculates the required corpus using forward-looking inflation adjustment from current age to retirement age.
  - Incorporates life expectancy (e.g., age 85–95) and post-retirement safe withdrawal return assumptions.
- **Post-Retirement Systematic Withdrawal Plan (SWP)**:
  - Models inflation-indexed monthly draws to preserve living purchasing power.
  - Factors in post-retirement portfolio taxation (Long-Term Capital Gains / Income Tax on withdrawals).
- **Corpus Depletion Detection & Longevity Verdict**:
  - Detects if and when the corpus runs out (e.g., *"Depleted at Age 74"* vs. *"Perpetual Surplus to Age 90+"*).
  - Calculates the exact funding surplus or deficit (₹ and %).
- **Safe Withdrawal Rate (SWR) Benchmarks**:
  - Evaluates actual withdrawal rate against the classical 4.0% Bengen Rule, dynamic 3.0%–3.5% Indian macroeconomic benchmarks, and capital preservation thresholds.

---

## 5. Crisis Stress-Testing & Macroeconomic Shock Simulator

### Crisis Simulator Component (`src/components/analytics/StressTestSimulator.tsx`)
- **Historical Crisis Presets**:
  - **2008 Global Financial Crisis**: Equity (-42%), Real Estate (-18%), Gold (+22%), Debt (+6%), Inflation (-1.0%).
  - **2020 COVID Flash Crash**: Equity (-34%), Real Estate (-8%), Gold (+28%), Debt (+3%), Inflation (-0.5%).
  - **1970s Great Stagflation**: Equity (-22%), Debt (-12%), Gold (+45%), Real Estate (+8%), Inflation (+4.0%).
  - **2000 Dot-Com Tech Meltdown**: Equity (-48%), Debt (+12%), Gold (+8%), Real Estate (+4%).
  - **Custom Bespoke Macro Shock**: Full interactive sliders to test custom shocks and inflation spikes.
- **Topline Shock KPIs**:
  - Immediate Peak-to-Trough Portfolio Drawdown (₹ and %).
  - Shocked Terminal Retirement Corpus.
  - Impact on Corpus Depletion Age (e.g., *"Accelerates depletion by 6 years"*).
  - Institutional Portfolio Resilience Score (0–100).
- **Asset Breakdown Table**:
  - Classifies each holding as a *Drawdown Driver*, *Shock Absorber*, or *Neutral Cash*.
- **Institutional Mitigation Playbook**:
  - Dynamic tactical actions (e.g., *"Rebalance gold gains into oversold equities"*, *"Maintain 24 months of living expenses in liquid debt"*).

---

## 6. Retirement Age vs Lifestyle Expense Sensitivity Matrix

### Interactive 2D Heatmap (`src/components/analytics/RetirementSensitivityMatrix.tsx`)
- **5x5 Sensitivity Grid**:
  - **Horizontal Axis**: 5 Lifestyle Living Expense levels (-25%, -10%, Current Budget, +15%, +30%).
  - **Vertical Axis**: 5 Retirement Ages around target (e.g., Ages 55, 57, 58, 60, 63).
- **Color-Coded Status Codes**:
  - *Emerald Green*: Comfortable surplus (>15% buffer).
  - *Sky Blue*: Sustainable plan (0–15% surplus).
  - *Amber*: Borderline risk (0 to -15% deficit).
  - *Rose Red*: Severe depletion risk (<-15% shortfall).
- **Cell Details Modal / Flyout**:
  - Displays exact Projected Corpus vs. Required Corpus and monthly post-retirement draw.
- **1-Click "Apply to Active Plan"**:
  - Instantly updates global retirement age and monthly expenses across the entire application.

---

## 7. Asset Allocation & Portfolio Rebalancing Engine

### Strategic & Tactical Allocation (`/allocation`)
- **Target vs. Actual Asset Allocation**:
  - Evaluates current holdings across Equity, Debt, Gold, Real Estate, Liquid, and Alternatives.
  - Visual donut and comparative bar charts highlighting allocation drift.
- **Rebalancing Drift Analysis**:
  - Calculates dollar overweight/underweight deviations per asset category.
  - Rebalancing bands (e.g., ±5% tolerance threshold).
- **Tax-Aware Rebalancing Recommendations**:
  - Generates recommended buy/sell execution steps.
  - Highlights tax friction awareness (LTCG vs. STCG) and recommends rebalancing via fresh inflows/SIP redirection to avoid selling costs.

---

## 8. Modern Portfolio Theory & Mean-Variance Optimization (MVO)

### Institutional MVO Frontier Engine (`/mvo`)
- **Markowitz Quadratic Optimization**:
  - Computes the Efficient Frontier over 100+ sampled asset weight combinations.
  - Uses full variance-covariance matrix of Indian and global asset classes.
- **Benchmark Portfolios**:
  - **Maximum Sharpe Ratio (Tangency Portfolio)**: Maximizes risk-adjusted excess return per unit of volatility.
  - **Minimum Variance Portfolio**: Lowest absolute standard deviation portfolio.
  - **Current Client Portfolio**: Overlaid on the frontier to visualize efficiency gap.
- **Constraint Enforcement**:
  - Configurable equity ceilings (e.g., max 75%), minimum debt floors, and gold commodity caps.

---

## 9. Monte Carlo Stochastic Longevity Simulation

### Probabilistic Wealth Engine (`src/lib/monteCarlo.ts`)
- **1,000 Trial Multi-Asset Gaussian Engine**:
  - Incorporates asset class volatilities, cross-correlations, and fat-tail sequences of returns.
- **Percentile Fan Chart**:
  - **P90 (Top 10% Bull Market)**: Optimistic compounding trajectory.
  - **P50 (Median Expectation)**: Base case scenario.
  - **P10 (Bottom 10% Bear Sequence)**: Stress-case early retirement market downturn.
- **Corpus Longevity Success Probability**:
  - Probability score (e.g., *"94% Probability of Corpus Sustaining to Age 85"*).

---

## 10. Multi-Goal Financial Engineering & Cash Flow Matching

### Goal Planner (`/goal`)
- **Multi-Goal Creation & Prioritization**:
  - Categories: Children's Higher Education, Home Purchase, Luxury Vacation, Vehicle Upgrade, Legacy/Estate Transfer.
- **Differential Inflation Indexing**:
  - Applies category-specific inflation rates (e.g., 10.0% for education, 7.0% for real estate, 6.0% for general lifestyle).
- **Funding Architecture**:
  - Dedicated asset allocation per goal (e.g., high debt for near-term goals, high equity for >10-year goals).
  - Computes exact Monthly SIP or Lumpsum required to fund each goal without compromising the retirement corpus.

---

## 11. Multi-Asset Portfolio Return & Wealth Projection Calculator

### Portfolio Return Projection Tool (`src/components/calculators/PortfolioReturnProjectionCalculator.tsx`)
- **Customizable Multi-Asset Universe**:
  - Add, edit names, adjust weights, and remove unlimited custom asset classes.
  - Preset models: *Global All-Weather*, *Aggressive Multi-Asset Growth*, *Conservative Capital Preservation*.
  - 1-click **Auto-Normalize Weights to 100%**.
- **Multi-Currency FX Drift & Fisher Compound Return Modeling**:
  - Supported Currencies: **INR** (0%), **USD** (+3.5% p.a.), **EUR** (+2.5% p.a.), **GBP** (+2.0% p.a.), **AED** (+3.5% p.a.), **SGD** (+3.0% p.a.), **JPY** (+0.5% p.a.).
  - Exact compound Fisher currency equation:
    $$r_{\text{INR}} = (1 + r_{\text{local}}) \times (1 + r_{\text{fx}}) - 1$$
- **Nominal vs. Real Wealth Projections**:
  - Computes blended portfolio nominal and real purchasing-power returns net of domestic inflation.
  - Compounding over 1 to 50-year investment horizons.
  - Supports **Annual Rebalancing** vs. **Buy & Hold (Drifting Weights)**.
- **Dual Visualizations & Schedule**:
  - Nominal vs. Real Trajectory Area Chart.
  - Stacked Asset Breakdown Evolution Chart.
  - Year-by-Year Growth and Purchasing Power Schedule Table.

---

## 12. Financial Decision Calculators Suite

Available in the dedicated **Calculators** section (`/calculators`):

| Calculator | Key Inputs | Primary Outputs |
| :--- | :--- | :--- |
| **Multi-Asset Return Projection** | Custom assets, weights, returns, currency FX, inflation, horizon | Blended nominal/real return, terminal nominal & real wealth, asset breakdown |
| **SIP & Step-Up Calculator** | Monthly SIP, expected return, investment years, annual step-up % | Invested capital, wealth gain, terminal corpus, year-by-year trajectory |
| **Lumpsum Multiplier** | Initial deposit, expected CAGR, investment horizon | Future value, absolute gain, wealth multiplier (e.g. 4.2x) |
| **SWP & Drawdown** | Initial corpus, monthly withdrawal, expected return, inflation, tax | Corpus longevity years, depletion milestone, total withdrawn vs balance |
| **STP (Systematic Transfer)** | Source corpus, source return, target return, monthly transfer amount | Source balance depletion, target compounding trajectory, blended yield |
| **Target Corpus Calculator** | Target goal amount, years to goal, expected return, inflation | Required monthly SIP, required one-time lumpsum present value |
| **Retirement Corpus Calculator** | Current age, retirement age, life expectancy, monthly expenses, inflation | Required corpus, future monthly expense, annual savings required |
| **EMI & Loan Amortization** | Principal loan amount, annual interest rate, tenure (years) | Monthly EMI, total interest payable, principal vs interest split, amortization table |

---

## 13. Institutional Investment Policy Statement (IPS) Generator

### Governance Document (`/ips`)
- **Global Institutional Standards**: Formatted in compliance with CFA Institute wealth management standards.
- **Standard Governance Sections**:
  1. **Executive Profile & Account Governance**: Client entity, tax status, base currency, time horizon.
  2. **Investment Objectives**: Return requirement (nominal vs. real) and capital preservation mandates.
  3. **Risk Profile & Capacity**: Quantitative risk score, maximum drawdown tolerance, liquidity buffers.
  4. **Strategic Asset Allocation & Rebalancing Bands**: Minimum, target, and maximum bounds per asset class.
  5. **Liquidity & Cash Flow Constraints**: Emergency reserve requirements and anticipated outflows.
  6. **Tax & Legal Considerations**: Tax efficiency mandates and regulatory considerations.
  7. **Review & Monitoring Schedule**: Annual rebalancing and life-event triggers.
- **Interactive Customization**: Editable fields and instant PDF export.

---

## 14. 7-Page Executive Portfolio Dossier & Publication PDF Engine

### Publication Dossier (`/dossier` & `scripts/export-pdf.js`)
- **Complete Institutional Advisory Report**:
  - **Page 1**: Executive Cover Page & Client Engagement Summary.
  - **Page 2**: Comprehensive Financial Position, Net Worth & Asset Class Breakdown.
  - **Page 3**: Strategic Asset Allocation, Rebalancing Drift & MVO Efficient Frontier.
  - **Page 4**: Multi-Goal Financial Blueprint & Cash Flow Matching Milestones.
  - **Page 5**: Retirement Master Plan, Inflation-Indexed SWP & Monte Carlo Longevity.
  - **Page 6**: Crisis Stress-Testing, Tail-Risk Shocks & Institutional Mitigation Playbook.
  - **Page 7**: Investment Policy Statement (IPS) Sign-off & Advisory Governance.
- **Dual Export Mechanisms**:
  - **Browser 1-Click Button**: Uses CSS `@page { size: A4; margin: 0; }` print engine for browser PDF generation.
  - **Automated CLI Pipeline**: `npm run export:pdf` invokes headless Chromium to render all charts and export an optimized PDF (~640 KB) with embedded vector graphics.

---

## 15. Angel One SmartAPI Live Market Feed Connector

### Broker Integration (`/angel-connect`)
- **Live Market Data Pipeline**:
  - Connects to Angel One SmartAPI using client credentials, API key, and TOTP.
  - Fetches live market quotes for Nifty 50, Nifty Bank, Sensex, Gold, and Liquid ETFs.
  - Automatically compares active portfolio return assumptions against live market indices.
- **Standalone Connector Daemon**: Python-based connector script (`smartapi_connector.py`) with REST endpoints for automated portfolio synchronization.

---

## 16. State Management, Persistence & Plan Portability

- **Unified Context (`CalculatorContext.tsx`)**:
  - Reactive state management broadcasting client input updates to all components.
  - Automatic recalculation of wealth trajectories upon modifying any assumption.
- **Local Storage Auto-Save**:
  - Automatically persists all user modifications across page refreshes and browser restarts.
- **Plan Portability**:
  - **Export Plan**: Serializes the active financial plan to a `.json` configuration file.
  - **Import Plan**: Restores a previously saved plan instantly.
  - **Reset to Defaults**: 1-click restore to golden baseline assumptions.

---

## 17. Design System, Typography & Verification Standards

### Design Aesthetics & Typography
- **Calibri / Carlito System Font Family**:
  - Configured uniformly across screen and print layouts (`Calibri, Carlito, "Segoe UI", Candara, Arial, sans-serif`).
  - Zero external Google Web Font dependencies, preventing network latency and print blocking.
- **Financial Color Palette**:
  - Deep Slate Navy (`#0f172a`), Indigo Primary (`#4f46e5`), Emerald Surplus (`#059669`), Amber Warning (`#d97706`), Rose Deficit (`#e11d48`).
- **Institutional Micro-Interactions**:
  - Smooth slider responsiveness, hover states, interactive SVG Recharts tooltips, and collapsible data tables.

### Testing & Verification Pipeline
- **Unit Test Coverage**:
  - 37 automated unit tests across 6 dedicated test suites:
    - `tests/calculations.test.ts` (Compounding, CAGR, golden reference values)
    - `tests/formatters.test.ts` (Currency signs, compact numbers, percentages, dates)
    - `tests/mvo.test.ts` (Quadratic frontier sampling, Sharpe ratio, equity caps)
    - `tests/portfolioProjection.test.ts` (Multi-currency compounding, Fisher FX, rebalancing)
    - `tests/stressTest.test.ts` (GFC 2008, Stagflation, zero-asset resilience)
    - `tests/wealthEngine.test.ts` (1,000-run Monte Carlo determinism and convergence)
- **Automated Headless Chromium Audit (`scripts/audit-all.js`)**:
  - Navigates all 9 routes (`/`, `/retirement`, `/allocation`, `/goal`, `/mvo`, `/risk`, `/reports`, `/calculators`, `/dossier`).
  - Asserts **0 console errors, 0 runtime exceptions, and 0 layout overflow defects**.
- **Static Analysis**: Clean execution under `oxlint` and TypeScript strict mode (`tsc -b`).
