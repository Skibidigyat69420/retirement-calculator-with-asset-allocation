# Sound Thesis Wealth Planner

A comprehensive, institutional-grade individual wealth planning platform built with React, TypeScript, Vite, and Tailwind CSS. It connects life goals, cashflows, asset allocation, and risk profile into one probabilistic engine, and can enrich those projections with historical market data from Angel One SmartAPI and Yahoo Finance.

The tool is designed for financial advisers and sophisticated individuals who want more than a static spreadsheet. Every input feeds a single Monte Carlo wealth engine, so changes on one page instantly ripple through the dashboard, goal planner, retirement check, allocation view, MVO optimizer, and the Investment Policy Statement generator.

## How the System Flows

At the centre of the application is the `CalculatorContext`. It holds one canonical `MasterPlanInputs` object — your age, income, expenses, assets, SIP/STP/SWP settings, and goals — and produces two derived result objects:

- `result` from `src/lib/calculations.ts` — a deterministic accumulation and distribution timeline.
- `wealthResult` from `src/lib/wealthEngine.ts` — a richer Monte Carlo output with goal probabilities, rebalancing trades, tax summary, currency exposure, and percentile fan charts.

All ten route pages read from this context, so there is no hidden state drift. Update your monthly SIP in the Master Plan and the Dashboard, Reports, Retirement, and IPS pages all see the new number immediately.

The data pipeline works like this:

1. **Raw market data** is fetched ahead of time by Python scripts and stored as CSVs in `data/prices/` and as a bundled JSON file in `public/data/market-data.json`.
2. The frontend loads that bundle through `/api/market-data` and computes return, volatility, covariance, and correlation statistics.
3. Those statistics become the `AssumptionSet` that drives Monte Carlo simulations and the MVO optimizer.
4. If you authenticate Angel One SmartAPI, you can bypass the bundle and pull live historical candles, funds, holdings, positions, orders, and trades directly into the app.

## Core Planning Modules

### Dashboard
The executive landing page shows net worth, savings rate, risk profile, terminal corpus, and plan success probability at a glance. It highlights sustainability warnings and goals that fall below your risk-profile threshold, then provides quick-action links to every other module.

### Risk Questionnaire
Eight behavioural questions covering time horizon, capacity, attitude, experience, liquidity, and goals. The answers produce a risk profile that sets:

- Strategic allocation targets (equity, debt, gold, real estate, liquid, other)
- Maximum equity and volatility constraints for the MVO optimizer
- Goal success thresholds and Monte Carlo simulation count
- A glide path from today to retirement

The profile is persisted to `localStorage` and can be applied to the Master Plan with one click.

### Master Plan
The core modelling canvas, split into five tabs:

- **Profile** — age, retirement age, life expectancy, annual income, inflation.
- **Assets** — existing assets with category, currency, return assumption, and whether they liquidate into the retirement corpus.
- **Cashflows** — household income and expenditure, monthly SIP with step-up and equity/debt split, optional STP deployment of a lumpsum, and SWP needs in retirement.
- **Goals** — essential, important, and aspirational goals with target amounts, horizons, and inflation rates.
- **Results** — accumulation trajectory, asset-class evolution, SWP drawdown, Monte Carlo fan chart, rebalancing table, currency exposure, and a year-by-year projection table.

### Goal Planner
A drill-down into individual goals. For the selected goal it shows future value needed, present value required, probability of success, required monthly SIP, and a histogram of simulated outcomes with the success region highlighted. It also surfaces any SIP gap versus the current plan.

### Retirement Readiness
A focused FIRE-style check that compares the projected terminal corpus against the corpus required to sustain inflation-adjusted withdrawals through life expectancy. It reports the gap or surplus, plan success rate, and depletion age.

### Asset Allocation
Shows current allocation versus strategic target versus projected terminal allocation. You can drag strategic targets manually, reset them to your risk profile, or apply market-optimized targets derived from the MVO engine. The rebalancing table flags buy/sell/hold actions and the glide path card shows how allocation should drift as you age.

### MVO Optimizer
Mean-variance optimization using the longest available common daily history for the selected instrument basket. It displays:

- An efficient frontier chart with max-Sharpe, min-variance, equal-weight, and risk-parity portfolios highlighted
- A correlation matrix
- Per-asset return, volatility, Sharpe, and max drawdown
- Strategy cards that let you apply weights to the Master Plan's SIP/STP split or add proxy assets

The optimizer respects the risk profile's max-equity and volatility targets. The equity mask is inferred from each instrument's category, so a "max equity 60%" constraint actually caps equity-like assets rather than the whole portfolio.

### Angel Connect & Angel Data
Angel Connect handles SmartAPI authentication, live TOTP generation, and portfolio sync. Once connected, the Angel Data page shows a SELECT *-style dump of profile, RMS/funds, holdings, positions, order book, and trade book. You can also refresh this data live from the broker.

### Plan Reports
A consolidated printable summary of the whole plan: profile snapshot, risk profile, current versus target allocation, Monte Carlo fan chart, goal probability summary by priority, tax summary, and currency exposure.

### IPS Template
Generates a CFA Institute-aligned Investment Policy Statement from the current plan inputs. You can export it as Markdown, print it, or save it to the local `ips/` folder during development. Saved IPS files are listed on the page and can be reloaded or downloaded.

## Quantitative Engine

### Wealth Engine (`src/lib/wealthEngine.ts`)
Runs year-by-year simulations from today through life expectancy. During accumulation it applies correlated asset-class returns, adds SIP contributions, deploys STP lumpsums, and funds goals as they come due. During distribution it applies inflation-indexed SWP withdrawals and taxes. The engine outputs:

- Mean-path snapshots
- Terminal corpus, nominal and real CAGR
- Sustainability flag and depletion age
- Goal-level success rates and probability distributions
- Overall Monte Carlo success rate with percentile fan chart
- Current, target, and projected allocation
- Rebalancing trades
- Tax summary and currency exposure

### Projections (`src/lib/projections.ts`)
A parallel stochastic projection engine used by the Allocation page. It runs hundreds of correlated paths, computes probability of success against all goals, and produces yearly asset-class evolution data for charts.

### MVO (`src/lib/mvo.ts`)
Builds long-only portfolios by sampling the feasible region, then refines the max-Sharpe and min-variance candidates with gradient steps. The frontier is assembled by keeping the lowest-volatility portfolio within each return bucket. Constraints include per-asset bounds, an equity mask, max total equity, and max volatility.

### Assumptions (`src/lib/assumptions.ts`)
Maps market-data symbols to asset categories and builds category-level return/volatility/covariance/correlation assumptions. When market data is unavailable it falls back to sensible long-term defaults.

## Market Data Backend

The frontend does not need Angel One credentials for MVO, allocation, or plan reports. It reads from a pre-built bundle by default. Credentials are only required for live broker refresh.

### Bundled data
`public/data/market-data.json` contains daily price histories, per-symbol statistics, and covariance/correlation matrices for the default instrument basket. The bundle mixes Indian indices and ETFs with international ETFs sourced from Yahoo Finance.

### Fetching data

```bash
# Indian + international bundle (uses Angel One when creds are present, Yahoo Finance otherwise)
npm run fetch:data

# Yahoo Finance only
npm run fetch:yahoo

# Full Angel One SELECT * dump: profile, funds, holdings, positions, orders, trades, historical candles, quotes
npm run fetch:angel:all

# Live streaming quote feed to CSV
npm run live:angel

# Build a consolidated market database CSV
npm run build:market-db
```

Fetched outputs land in:

- `data/prices/{symbol}.csv` — one CSV per instrument
- `data/angel_one/{timestamp}/` — full Angel One account snapshot
- `public/data/market-data.json` — bundle consumed by the app

## API Routes

The `api/` folder contains Vercel-style serverless functions. During local development they are served by a custom Vite plugin in `vite.config.ts`.

- `GET /api/market-data` — serve the bundled market data
- `POST /api/market-data` — refresh the bundle by running the Python fetcher
- `POST /api/save-ips` — save an IPS Markdown document to `./ips/`
- `GET /api/list-ips` — list saved IPS documents
- `GET /api/load-ips?filename=...` — load a saved IPS document
- `GET /api/angel-one-snapshot` — serve the latest Angel One snapshot

`/api/angelone/*` is proxied to `https://apiconnect.angelone.in` for SmartAPI calls from the browser.

## Project Structure

```
├── api/                    # Vercel serverless functions
├── data/                   # Generated price CSVs and Angel One snapshots
├── public/data/            # Bundled market data served to the frontend
├── scripts/                # Python fetchers and Node test scripts
├── smartapi_connector.py   # Standalone Python SmartAPI reference
├── src/
│   ├── components/         # Reusable UI, charts, layout
│   ├── context/            # CalculatorContext — global plan state
│   ├── hooks/              # useMarketData, useLiveFeed
│   ├── lib/                # Calculation engines and utilities
│   ├── pages/              # Route-level pages
│   ├── types/              # TypeScript types
│   ├── App.tsx             # Router
│   └── main.tsx            # Entry point
├── ips-template/           # CFA-aligned IPS reference template
├── .env.example            # Environment variable template
├── vercel.json             # Vercel rewrite rules
└── README.md
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Recharts
- Framer Motion
- Oxlint
- Angel One SmartAPI (optional live refresh)
- Python 3 + yfinance/pandas/numpy (data fetchers)
- Vercel serverless functions

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

Copy `.env.example` to `.env` and fill in your Angel One credentials if you want live refresh:

```bash
cp .env.example .env
```

```env
VITE_ANGEL_API_KEY=your_api_key_here
ANGEL_CLIENT_CODE=YOUR_CLIENT_CODE
ANGEL_PIN=YOUR_PIN
ANGEL_TOTP_SECRET=YOUR_TOTP_SECRET
```

> **Note:** The default market-data bundle and all planning features work without Angel One credentials. Add them only if you want live broker data.

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

## Deployment

The project is configured for static hosting on Vercel.

```bash
npm i -g vercel
vercel --prod
```

`vercel.json` routes `/api/angelone/*` to Angel One and all other paths to `index.html` for client-side routing.

## Important Notes and Limitations

- **IPS persistence on Vercel is ephemeral.** The `/api/save-ips` endpoint writes to the local filesystem, which disappears after each serverless request. For persistent IPS storage, run the app locally or on a long-running server, or use the **Export MD** download button.
- **Currency display is INR-first.** `formatCurrency` always formats numbers as ₹. If you hold USD assets, the value is still shown in ₹ unless you mentally apply the FX assumption. The engine does model FX drift and volatility for foreign-currency assets in Monte Carlo projections.
- **MVO weights applied to assets use a fixed ₹1 crore notional.** When you click "Add to Assets" from the MVO page, the optimizer's weights are multiplied by a constant base value to create proxy asset entries. This is meant for visualisation, not as a literal rebalancing instruction.
- **Advanced Allocation page.** The Allocation page links to `/advanced-allocation` for Black-Litterman, risk parity, and tactical overlays, but that route is not yet implemented.
- **SIP return inputs.** The Cashflows tab lets you edit equity and debt return assumptions for SIPs, but the wealth engine currently uses the category assumptions from market data or defaults rather than those manual fields.

## Methodology

1. **Profile & Constraints** — capture age, income, assets, liabilities, time horizon, inflation, and tax assumptions.
2. **Risk Profiling** — translate behavioural answers into strategic allocation targets and simulation parameters.
3. **Goals** — define essential, important, and aspirational goals with target amounts, horizons, and inflation.
4. **Cashflows** — model monthly SIPs, annual step-ups, STP deployment of idle capital, and inflation-indexed SWP needs.
5. **Asset Allocation** — compare current, target, and projected weights, run MVO, and identify rebalancing gaps.
6. **Probability** — run correlated Monte Carlo simulations to estimate the probability of meeting each goal and sustaining withdrawals through life expectancy.
7. **Execution & Documentation** — review implementation shortfall and rebalancing costs, then generate an IPS for the client file.

## License and Disclaimer

MIT — for educational and advisory use. Not financial advice.

This tool is for planning and educational purposes only. It does not constitute investment, tax, or legal advice. Past performance is not indicative of future results. Always consult a qualified financial adviser before making investment decisions.
