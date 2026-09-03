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
