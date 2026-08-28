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
- **MVO Optimizer** — Efficient frontier, max-Sharpe, min-variance, equal-weight, and risk-parity portfolios using live Angel One daily data; falls back to category assumptions offline.
- **Advanced Allocation** — Black-Litterman, risk parity, glide path, and tactical models.
- **Portfolio Analytics** — Risk metrics, attribution, and stress tests.
- **Trade Analytics** — Pre-trade cost estimates, post-trade implementation shortfall, rebalancing impact simulator, and FX/currency contribution.
- **Sequence Risk** — Early-retirement return shock analysis.
- **SWR Matrix** — Safe withdrawal rate probability grid.
- **Tax Loss Harvesting** — Identify harvestable losses and estimate tax alpha.

### Data & Connectivity
- **Angel One SmartAPI** — Authenticate, fetch historical daily candles, and compute returns, volatility, covariance, and correlations.
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

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Angel One trading account + SmartAPI credentials

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Angel One credentials:

```bash
cp .env.example .env
```

```env
VITE_ANGEL_API_KEY=mnk8SRp
ANGEL_CLIENT_CODE=YOUR_CLIENT_CODE
ANGEL_PIN=YOUR_PIN
ANGEL_TOTP_SECRET=YOUR_TOTP_SECRET
```

> **Note:** The API key `mnk8SRp` is pre-configured as the default. Replace the client ID, PIN, and TOTP secret with your own Angel One credentials.

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
├── public/              # Static assets
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

The app is designed to use Angel One SmartAPI for historical daily price data.

1. Go to **Angel Connect** in the app.
2. Enter your client ID, password, and TOTP secret (or generate TOTP from the secret).
3. Authenticate to obtain a JWT session.
4. Use the MVO, Market Data, or Live Market pages with live data.

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
