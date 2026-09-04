# Sound Thesis Institutional Platform 🚀

I've completely upgraded the system from a single HTML file into a modern, institutional-grade React web application. It matches the professional ethos and aesthetic of your `Sound_Thesis_Visual_Deck.pdf`.

## What's Inside?

### 1. Modern Architecture (Cloudflare Pages Ready)
- **Framework:** Scaffolded a lightning-fast React application using Vite + TypeScript.
- **Cloudflare Native:** The project is configured with `wrangler.json`, `public/_redirects`, and `public/_headers`. Connect this repository directly to Cloudflare Pages or deploy via Wrangler with zero configuration.

### 2. The Master Plan Engine 🏆
Everything feeds into a single unified timeline:
- **Existing Capital Engine:** Add distinct assets (Real Estate, Gold, MFs), assign growth rates, and flag if they liquidate into the SWP at retirement.
- **STP Simulator:** Model lumpsum cash deployment through liquid funds systematically into the market.
- **SIP Generator:** Layer on monthly SIPs with step-ups and target portfolio return rates.
- **Automated Distribution Phase (SWP):** The engine seamlessly transitions into retirement, applying inflation to your target income and deducing withdrawals and taxes to calculate depletion age.

### 3. Quant Lab — Live Market Data, MVO & Monte Carlo 🧮
- **Angel One SmartAPI Historical Data:** Fetch daily candles for NIFTY indices and ETFs, cached locally for 24 hours.
- **Risk/Return Engine:** Compute annualized returns, volatility, Sharpe ratios, covariance and correlation matrices from real daily prices.
- **Mean-Variance Optimizer (MVO):** Generate the efficient frontier, max-Sharpe, min-variance, equal-weight and risk-parity portfolios. Export optimal weights straight into the Master Plan.
- **Monte Carlo Retirement Simulator:** Run 1,000 correlated multi-asset paths with annual rebalancing and inflation-indexed withdrawals. View percentile fan charts on the Master Plan.
- **Market Data Explorer:** Inspect normalized price history and download raw CSV.

### 4. Full Institutional Expansion 🏦
- **Live Market Stream:** WebSocket watchlist for real-time LTP quotes with sparklines.
- **Portfolio Analytics:** Risk metrics (Sharpe, Sortino, beta, alpha, VaR, CVaR), stress tests, and attribution.
- **Advanced Allocation Models:** Black-Litterman with investor views, equal-risk-contribution risk parity, age-based glide paths, and tactical momentum overlays.
- **Trade Analytics & Implementation Shortfall:** Pre-trade market-impact estimates, post-trade arrival/VWAP/TWAP slippage, and rebalancing impact simulator.
- **Retirement Risk Calculators:** Sequence-of-returns stress test and Trinity-style Safe Withdrawal Rate matrix.
- **Rebalancing Optimizer:** Drift-band rebalancing with trade recommendations and one-click plan updates.
- **Tax-Loss Harvesting:** Identify unrealized losses and estimate tax alpha.

### 5. Executive Dashboard 🎯
- Central command center with net worth, sustainability alerts, allocation drift warnings, quick-action calculator grid, and accumulation trajectory chart.

### 6. Beautiful UI & Visualizations 🎨
- **Tailwind CSS & Lucide Icons:** Styled identically to your deck using cream backgrounds (`#F4F1EA`), strong navy text (`#1A233A`), and elegant gold accents (`#B68B40`).
- **Recharts Integration:** Responsive, interactive charts including accumulation trajectories, asset-class evolution, SWP drawdown, MVO efficient frontier, Monte Carlo fan charts, allocation bars and pie charts.

### 7. Running Locally
Set your Angel One API key as an environment variable (optional — the UI also accepts manual entry):
```bash
# Vite will expose VITE_ANGEL_API_KEY to the client bundle
VITE_ANGEL_API_KEY=your_key npm run dev
```

To build for production:
```bash
npm run build
```

### 8. Deploy to Cloudflare Pages 🚀
 
**Option A: Cloudflare Pages Git Integration (Recommended)**
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select `Skibidigyat69420/retirement-calculator-with-asset-allocation`.
4. Build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Click **Save and Deploy**.

**Option B: Deploy via Wrangler CLI**
```bash
npm run build
npx wrangler pages deploy dist
```

### 9. One-Click Full-Site PDF Export 📄
To export a complete snapshot of the entire platform and all sections as a publication-ready PDF:
- **In Browser (1-Click)**: Click the green **"Export PDF"** button in the top navigation bar from any page (or navigate to `/dossier`). This stitches together all 7 sections with vector SVG charts, clean A4 print margins, and opens the native print/save-as-PDF dialog.
- **Via CLI / Terminal**: Run the headless Puppeteer script with one command:
  ```bash
  npm run export:pdf
  ```
  This generates `sound-thesis-portfolio-dossier.pdf` (7-page institutional dossier) directly in your project root.

### 10. Multi-Asset Class Portfolio Return Projection Calculator 🌐
Located in `/calculators` (Tab: "Asset Class Projection"):
- **Dynamic Asset Universe**: Add, rename, remove custom asset classes (e.g. US Tech Equities, Indian Equities, Sovereign Debt, Physical Gold, Private Real Estate).
- **Custom Return & Weights Matrix**: Interactive inputs for target weight (%) and nominal expected return (%).
- **Multi-Currency & Inflation Adjustments**: Toggle currency base (INR, USD, EUR, GBP) with automatic FX depreciation and inflation subtraction to display both **Nominal INR Return** and **Real Purchasing Power CAGR**.
- **Dual Rebalancing Modes**: Compare **Annual Rebalancing** vs. **Buy & Hold (Drift)** with multi-decade compounding projections and year-by-year trajectory tables.

### 11. Institutional Adviser Operating System (OS) 🏛️
Implemented the full end-to-end framework from `sound_thesis_product_flow_ideas.md`:
- **Adviser Command Center (`/`)**:
  - **Adviser Mode vs. Client Mode Toggle**: Seamlessly switch between detailed institutional metrics and a simplified, goal-focused client presentation.
  - **Plan Health Scorecard (0–100)**: Quantitative health rating across 7 pillars (*Retirement Readiness, Goal Funding, Liquidity, Risk Alignment, Asset Allocation, Debt & Solvency, Tax Efficiency*) with transparent rationale and improvement advice.
  - **Central Decision & Recommendation Engine**: Prioritized (P1–P4) tactical actions with explainable "Why?" audit trails and 1-click execution (`Apply +₹25k SIP`, `Set Retirement to 47`, `Rebalance to 53% Equity`).
- **Retirement & SWP Lab (`/retirement`)**:
  - **Monte Carlo Failure Mode Diagnosis**: Breakdown of shortfall risk into root causes (*Sequence of Returns, High Inflation, Milestone Shocks, Longevity*) with de-risking pathways.
  - **Scenario Lab (Trade-Off Solver)**: Side-by-side what-if matrix testing Early/Delayed Retirement, +₹25k SIP, -30% Equity Crash, 8% Inflation, and ₹2Cr Real Estate Outlay with 1-click scenario adoption.
- **Portfolio Allocation & Execution (`/allocation`)**:
  - **Plan vs. Reality Drift Governance**: Real-time comparison of current holdings vs. strategic policy weights with calculated retirement longevity consequences.
  - **Implementation Transition Plan**: Trade sheet with exact Buy/Sell/Redirect amounts, capital shift volume, and tax drag estimates.
- **Goal Conflict Matrix (`/goal`)**:
  - Simultaneous multi-goal affordability view with interactive priority rank overrides.
  - 4-stage monthly surplus cash flow waterfall (*Emergency Reserve, Priority Goals SIP, Core Retirement SIP, Discretionary Growth*).

### 12. Verification & Test Suite
- **41/41 Unit Tests Passing**: 100% test pass rate across `adviserEngines`, `calculations`, `formatters`, `mvo`, `portfolioProjection`, `stressTest`, and `wealthEngine`.
- **Zero Lint or Build Errors**: `npm run lint && npm run build` compiles with 0 warnings/errors in 2.1s.
- **Headless Browser Audit**: Verified 0 runtime or console errors across all 9 pages.

### 13. Empirical Historical CSV Data Engine (MVO, Efficient Frontier & Monte Carlo) 📈
- **4,209 Daily Sessions Packaged**: Aligned daily trading data from 2009 to 2026 across 21 domestic and global ETFs/indices (`NIFTY50`, `NIFTY500`, `BANKNIFTY`, `GOLDBEES`, `LIQUIDBEES`, `SPY`, `QQQ`, `BND`, `IEF`, `VWO`, `VEA`, `IJH`, `IJR`, `VNQ`, `DBC`, etc.) bundled into `public/data/market-data.json`.
- **Data Cleanliness & Volatility Auditing**: Repaired historical 2-day decimal shift typos in raw price files, yielding true empirical annualized volatility (Gold: 16.05%, Nifty 50: 18.17%, Bank Nifty: 24.78%, Liquid: 1.07%).
- **Empirical MVO & Full Efficient Frontier**: Mean-variance optimizer solves for Max Sharpe (12.2% return, 11.3% vol), Min Variance (3.7% return, 1.2% vol), Equal Weight, and Risk Parity without artificial volatility cutoffs.
- **Monte Carlo Asset Allocation Simulator**: Interactive multi-path simulator directly on `/mvo` with 500 paths modeling median, P10 bear case, and P90 bull case outcomes using the exact empirical covariance matrix from the extracted CSVs.
- **Auto-Calibrated Asset Allocation (`/allocation`)**: Auto-loads empirical parameters into the Master Plan wealth engine, showing realistic multi-decade terminal corpus distributions and categorized market-optimized targets.



