# Sound Thesis Institutional Platform 🚀

I've completely upgraded the system from a single HTML file into a modern, institutional-grade React web application. It matches the professional ethos and aesthetic of your `Sound_Thesis_Visual_Deck.pdf`.

## What's Inside?

### 1. Modern Architecture (Vercel-Ready)
- **Framework:** Scaffolded a lightning-fast React application using Vite + TypeScript.
- **Vercel Native:** The folder structure and `package.json` are standard. You can connect this repository straight to Vercel and it will automatically run `npm run build` to deploy it to the world.

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

### 4. Beautiful UI & Visualizations 🎨
- **Tailwind CSS & Lucide Icons:** Styled identically to your deck using cream backgrounds (`#F4F1EA`), strong navy text (`#1A233A`), and elegant gold accents (`#B68B40`).
- **Recharts Integration:** Responsive, interactive charts including accumulation trajectories, asset-class evolution, SWP drawdown, MVO efficient frontier and Monte Carlo fan charts.

### 5. Running Locally
Set your Angel One API key as an environment variable (optional — the UI also accepts manual entry):
```bash
# Vite will expose VITE_ANGEL_API_KEY to the client bundle
VITE_ANGEL_API_KEY=your_key npm run dev
```

To build for production:
```bash
npm run build
```
