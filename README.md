# Sound Thesis Wealth Planner

A comprehensive, institutional-grade individual wealth planning platform built with React, TypeScript, Vite, and Tailwind CSS. It connects life goals, cashflows, asset allocation, and risk profile into one probabilistic engine, calibrated with historical market data.

The tool is designed for financial advisers and sophisticated individuals who want more than a static spreadsheet. Every input feeds a single Monte Carlo wealth engine, so changes on one page instantly ripple through the dashboard, goal planner, retirement check, allocation view, and the Investment Policy Statement generator.

## Inputs to Outputs: How Everything Works

This planner is built around a single rule: every input should flow to every relevant output. There is no hidden state and no page-specific silos.

### The three input layers

1. **Who you are** — entered through the Risk Questionnaire and Master Plan Profile.
   - Age, retirement age, life expectancy
   - Annual income and monthly expenditure
   - Risk tolerance, capacity, knowledge, liquidity needs, goal flexibility, and behavioural stability
2. **What you own and commit** — entered through Master Plan Assets and Cashflows.
   - Existing assets by category and currency
   - Monthly SIP amount, step-up rate, and equity/debt split
   - Optional STP: a lumpsum deployed monthly into equity/debt
   - SWP: target monthly income in retirement, post-retirement return, tax rate
3. **What you want** — entered through Master Plan Goals.
   - Essential, important, and aspirational goals with target amounts, horizons, and inflation

### How inputs become outputs

All inputs live in one object, `MasterPlanInputs`, managed by `CalculatorContext`. Two engines transform that object into results:

- `src/lib/calculations.ts` — a deterministic accumulation and distribution timeline.
- `src/lib/wealthEngine.ts` — a correlated Monte Carlo simulation that produces goal success rates, percentile fan charts, rebalancing trades, tax and currency summaries, and sustainability checks.

Because every page reads from the same context, the output you see on the Dashboard, Goal Planner, Retirement page, Allocation page, Reports, and IPS is always consistent. Change your SIP on the Cashflows tab and every chart, metric, and recommendation updates immediately.

### Where market data fits in

Market data is an enrichment layer that calibrates the assumptions driving projections.

1. A Python fetcher downloads historical price series for Indian indices/ETFs and international ETFs.
2. The fetcher bundles prices into `public/data/market-data.json`.
3. The frontend loads the bundle through `/api/market-data` and computes annualised return, volatility, Sharpe ratio, max drawdown, covariance, and correlation.
4. Those statistics become the `AssumptionSet` used by the wealth and projections engines.

If the bundle is missing, the app falls back to sensible long-term assumptions and every planning feature still works.

## Core Planning Modules

### Dashboard
The executive landing page shows net worth, savings rate, risk profile, terminal corpus, and plan success probability at a glance. It highlights sustainability warnings and goals that fall below your risk-profile threshold, then provides quick-action links to every other module.

### Risk Questionnaire
A comprehensive assessment based on established risk-profiling practice, including the Grable & Lytton Risk Tolerance Scale and CFA Institute guidance. Questions are grouped into weighted dimensions:

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| Time Horizon | 15% | When the money is likely to be needed |
| Risk Tolerance | 25% | Emotional willingness to accept losses and volatility |
| Risk Capacity | 20% | Financial ability to recover from losses — income stability, net worth, future liabilities |
| Knowledge & Experience | 10% | Understanding of markets and prior exposure to volatile assets |
| Liquidity Needs | 10% | How much capital must stay accessible |
| Goal Flexibility | 10% | Whether goals are fixed or can shift |
| Behavioural Stability | 10% | Past behaviour, regret aversion, and monitoring frequency |

The weighted score maps to one of five profiles — Conservative, Moderate, Balanced, Growth, or Aggressive — and sets:

- Strategic allocation targets (equity, debt, gold, real estate, liquid, other)
- Volatility tolerance limits
- Goal success thresholds and Monte Carlo simulation count
- A glide path from today's equity weight to the equity weight at retirement

The profile is persisted to `localStorage` and can be applied to the Master Plan with one click.

### Master Plan
The core modelling canvas, split into tabs:

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
Shows current allocation versus strategic target versus projected terminal allocation. You can adjust strategic targets manually or reset them to your risk profile. The rebalancing table flags buy/sell/hold actions with pre-trade implementation shortfall impact, and the glide path card shows how allocation shifts across time.

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

### Assumptions (`src/lib/assumptions.ts`)
Maps market-data symbols to asset categories and builds category-level return/volatility/covariance/correlation assumptions. When market data is unavailable it falls back to sensible long-term defaults.

## Market Data Backend

The frontend reads from a pre-built bundle by default.

### Bundled data
`public/data/market-data.json` contains daily price histories, per-symbol statistics, and covariance/correlation matrices for the default instrument basket. The bundle mixes Indian indices and ETFs with international ETFs sourced from Yahoo Finance.

### Fetching data

```bash
# Update market data bundle from Yahoo Finance
npm run fetch:data
```

Fetched outputs land in:

- `data/prices/{symbol}.csv` — one CSV per instrument
- `public/data/market-data.json` — bundle consumed by the app

### Verifying the feed

After fetching, confirm the bundle is healthy:

```bash
# While the dev server is running
curl -s http://127.0.0.1:5173/api/market-status | python3 -m json.tool
```

The status endpoint returns symbol count, source, date range, and whether covariance/correlation matrices are present.

## API Routes & Endpoints

Static routing is handled by `vercel.json` and Vite proxy (for local development).

- `GET /api/market-data` — serve the bundled 10-year market data
- `GET /api/market-status` — bundle metadata and health check

## Project Structure

```
├── public/                 # Static assets and bundled market data
│   └── data/               # Bundled market data served to the frontend
├── data/                   # Generated price CSVs
├── scripts/                # Python fetchers and Node test scripts
├── src/
│   ├── components/         # Reusable UI, charts, layout
│   ├── context/            # CalculatorContext — global plan state
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Calculation engines, wealth simulator
│   ├── pages/              # Route-level pages
│   ├── types/              # TypeScript types
│   ├── App.tsx             # Router
│   └── main.tsx            # Entry point
├── ips-template/           # CFA-aligned IPS reference template
├── .env.example            # Environment variable template
├── vercel.json             # Vercel deployment, SPA rewrites & security headers
└── README.md
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Recharts
- Framer Motion
- Oxlint
- Python 3 + yfinance/pandas/numpy (data fetchers)
- Vercel (hosting & edge CDN)

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Python 3.10+ and `venv`

### Installation

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

### Environment Variables

Copy `.env.example` to `.env` to configure backend and database parameters if running self-hosted:

```bash
cp .env.example .env
```

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

The project is configured for static hosting on **Vercel**.

### Deploy via Vercel Dashboard (Git-Connected)
1. Import repository `Skibidigyat69420/retirement-calculator-with-asset-allocation` into your [Vercel Dashboard](https://vercel.com).
2. Build configuration (auto-detected via `vercel.json`):
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Click **Deploy**.

### Deploy via Vercel CLI
```bash
npm run build
npx vercel --prod
```

`vercel.json` handles SPA fallback rewrites (`/*` -> `/index.html`), asset caching headers, and HTTP security headers.

- **IPS persistence and plan saving:** Plans and questionnaire answers are saved directly in browser local storage for instant access across sessions. You can also export full markdown reports using the **Export MD** download button.
- **Currency display is INR-first.** `formatCurrency` always formats numbers as ₹. If you hold USD assets, the value is still shown in ₹ unless you mentally apply the FX assumption. The engine does model FX drift and volatility for foreign-currency assets in Monte Carlo projections.
- **SIP return inputs.** The Cashflows tab lets you edit equity and debt return assumptions for SIPs, but the wealth engine currently uses the category assumptions from market data or defaults rather than those manual fields.

## Methodology

1. **Profile & Constraints** — capture age, income, assets, liabilities, time horizon, inflation, and tax assumptions.
2. **Risk Profiling** — translate behavioural answers into strategic allocation targets and simulation parameters.
3. **Goals** — define essential, important, and aspirational goals with target amounts, horizons, and inflation.
4. **Cashflows** — model monthly SIPs, annual step-ups, STP deployment of idle capital, and inflation-indexed SWP needs.
5. **Asset Allocation** — compare current, target, and projected weights, and identify rebalancing gaps.
6. **Probability** — run correlated Monte Carlo simulations to estimate the probability of meeting each goal and sustaining withdrawals through life expectancy.
7. **Execution & Documentation** — review implementation shortfall and rebalancing costs, then generate an IPS for the client file.

## License and Disclaimer

MIT — for educational and advisory use. Not financial advice.

This tool is for planning and educational purposes only. It does not constitute investment, tax, or legal advice. Past performance is not indicative of future results. Always consult a qualified financial adviser before making investment decisions.
