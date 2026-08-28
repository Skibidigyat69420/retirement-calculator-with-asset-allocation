# Sound Thesis Wealth Planner

A comprehensive, institutional-grade individual wealth planning suite built with React, TypeScript, Vite, and Tailwind CSS. It connects to the Angel One SmartAPI for historical market data and provides probability-based goal planning, asset allocation optimization, retirement modelling, implementation shortfall analysis, and a CFA Institute-aligned Investment Policy Statement generator.

## Features

### Core Planning
- **Executive Dashboard** — Net worth, savings rate, goal health, allocation, and trajectory at a glance.
- **Master Plan** — Tab-based life model: profile, existing assets, cashflows (SIP/STP/SWP), goals, and probabilistic results.
- **Goal Planner** — Monte Carlo probability distributions, future value, present value needed, success rate, and required SIP for each goal.
- **Asset Allocation** — Current vs target vs projected allocation, rebalancing gaps, glide path reference, and probability of success under the target mix.
- **Retirement Readiness** — FIRE-style corpus gap analysis.

### Quantitative Tools
- **MVO Optimizer** — Efficient frontier, max-Sharpe, min-variance, equal-weight, and risk-parity portfolios using the historical data backend; falls back to category assumptions offline.
- **Advanced Allocation** — Black-Litterman, risk parity, glide path, and tactical models.
- **Portfolio Analytics** — Risk metrics, attribution, and stress tests.
- **Trade Analytics** — Pre-trade cost estimates, post-trade implementation shortfall, rebalancing impact simulator, and FX/currency contribution.
- **Sequence Risk** — Early-retirement return shock analysis.
- **SWR Matrix** — Safe withdrawal rate probability grid.
- **Tax Loss Harvesting** — Identify harvestable losses and estimate tax alpha.

### Data & Connectivity
- **Historical Data Backend** — Real daily prices for Indian indices and ETFs are fetched from Yahoo Finance, stored as CSV/JSON, and served by a Vercel serverless function at `/api/market-data`.
- **Angel One SmartAPI** — Optional live refresh for instrument-level candles, holdings, funds, and streaming quotes when you authenticate.
- **Live Market** — Streaming quote watchlists (when connected).
- **Market Data** — Browse and download price history.

### Documentation
- **IPS Template** — Generate and export a CFA Institute-aligned Investment Policy Statement (`ips-template/IPS.md`).

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Recharts
- Framer Motion
- Oxlint
- Angel One SmartAPI
- Python + yfinance (historical data fetcher)
- Vercel serverless functions (`api/`) for backend data serving

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Python 3.10+ and `venv`
- Angel One trading account + SmartAPI credentials (only for live broker refresh)

### Installation

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install yfinance pandas numpy
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Angel One credentials:

```bash
cp .env.example .env
```

```env
VITE_ANGEL_API_KEY=your_api_key_here
ANGEL_CLIENT_CODE=YOUR_CLIENT_CODE
ANGEL_PIN=YOUR_PIN
ANGEL_TOTP_SECRET=YOUR_TOTP_SECRET
```

> **Note:** The historical data backend does **not** require Angel One credentials. Add them only if you want live broker refresh.

### Fetch Historical Data

Download real daily prices and rebuild the market-data bundle:

```bash
npm run fetch:data
```

This populates:
- `data/prices/{symbol}.csv` — one CSV per instrument
- `public/data/market-data.json` — aligned prices, returns, covariance, correlation, and statistics
- Vercel function `api/market-data.js` reads from `public/data/market-data.json` at runtime

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Project Structure

```
├── api/                 # Vercel serverless functions
├── data/                # Generated price CSVs
├── public/              # Static assets and bundled market data
│   └── data/
│       └── market-data.json
├── src/
│   ├── components/      # Reusable UI components and charts
│   ├── context/         # CalculatorContext for global state
│   ├── hooks/           # Custom React hooks (market data, etc.)
│   ├── lib/             # Calculation engines and utilities
│   ├── pages/           # Top-level route pages
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Router and providers
│   └── main.tsx         # Entry point
├── ips-template/        # CFA Institute-aligned IPS template
├── scripts/             # Helper scripts
├── smartapi_connector.py # Python reference connector for SmartAPI
└── README.md
```

## Key Modules

### `src/lib/assumptions.ts`
Derives category-level return, volatility, and correlation assumptions from Angel One market data. Falls back to sensible defaults when live data is unavailable.

### `src/lib/goals.ts`
Monte Carlo goal simulator using correlated asset-class returns. Outputs future value, PV needed, success rate, required SIP, and probability distribution histograms.

### `src/lib/projections.ts`
Year-by-year asset-class balance projections under mean and stochastic return assumptions. Computes probability of success against all goals plus SWP, rebalancing gaps, and glide-path targets.

### `src/lib/calculations.ts`
Deterministic accumulation and distribution engine: SIP, STP, SWP, asset growth, and depletion analysis.

### `src/lib/mvo.ts`
Mean-variance optimizer using random portfolio sampling to approximate the efficient frontier and identify max-Sharpe, min-variance, equal-weight, and risk-parity portfolios.

### `src/lib/implementationShortfall.ts`
Post-trade implementation shortfall, pre-trade square-root market impact model, and rebalancing impact simulator.

## Angel One SmartAPI

The app uses the **historical data backend by default**, so no broker login is required for MVO, Market Data, or allocation analytics.

To refresh data live from Angel One SmartAPI:

1. Add your credentials to `.env`.
2. Go to **Angel Connect** in the app and authenticate.
3. Click **Fetch Live from Angel One** on the MVO or Market Data pages.

A Python reference connector is included at `smartapi_connector.py` for server-side or standalone use.

## Wealth Planning Methodology

1. **Profile & Constraints** — Capture age, income, assets, liabilities, time horizon, inflation, and tax assumptions.
2. **Goals** — Define essential, important, and aspirational goals with target amounts, horizons, and inflation.
3. **Cashflows** — Model monthly SIPs, annual step-ups, STP deployment of idle capital, and inflation-indexed SWP needs.
4. **Asset Allocation** — Set strategic targets, compare current vs projected weights, and run MVO.
5. **Probability** — Run correlated Monte Carlo simulations to estimate the probability of meeting each goal and sustaining withdrawals through life expectancy.
6. **Execution** — Estimate implementation shortfall and rebalancing costs before placing trades.
7. **Documentation** — Generate an IPS for the client file.

## Deployment

This project is configured for static hosting (e.g., Vercel, Netlify, GitHub Pages).

### Vercel

```bash
npm i -g vercel
vercel
```

The `vercel.json` in the repo routes all paths to `index.html` for client-side routing.

## License

MIT — for educational and advisory use. Not financial advice.

## Disclaimer

This tool is for planning and educational purposes only. It does not constitute investment, tax, or legal advice. Past performance is not indicative of future results. Always consult a qualified financial adviser before making investment decisions.
