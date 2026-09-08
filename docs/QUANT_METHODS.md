# Quantitative Methods — Sound Thesis Wealth Planner

This document is the authoritative description of the financial domain engine:
what it computes, how it is tested, and how results are versioned for
reproducibility. It implements spec sections 4–5 (quantitative correctness
gate), 143–147 (calculation versioning, fixtures, seeded Monte Carlo), and
185–190 (validation, output contract, metadata).

## Engine versioning

`ENGINE_VERSION` is exported from `src/lib/constants.ts` (currently **2.1.0**).
Per spec §143, any bug fix or formula change that alters engine outputs must
bump this version so stored reports/results can be tied to the engine that
produced them. Old reports must never be silently recalculated.

Every engine result carries a `metadata: CalculationMetadata` block
(spec §189):

```ts
interface CalculationMetadata {
  engineVersion: string;      // ENGINE_VERSION
  assumptionVersion: string;  // hashAssumptions() — FNV-1a content hash of the assumption set
  simulationCount: number;    // Monte Carlo paths simulated
  seed?: number;              // concrete numeric seed (generated per calculation if not supplied)
  calculatedAt: string;       // ISO timestamp
  source: 'server' | 'preview'; // 'preview' for the bundled TS engine; backend labels 'server'
}
```

Seeds: `runWealthEngine` / `runRetirementMonteCarlo` accept `string | number | null`.
`resolveNumericSeed` (exported from `src/lib/wealthEngine.ts`) normalizes to a
number — string seeds are hashed with the same algorithm as
`createSeededRandom`, and `null` generates a fresh per-calculation seed so
production results stay reproducible from their metadata (spec §146).
Tests always pass a fixed seed, making stochastic fixtures stable.

## Simulation methodology

### Return model

Category returns are multivariate normal: `r = μ + L·z`, where `L` is the
Cholesky factor of the category covariance matrix and `z` is a vector of
independent standard normals (Box–Muller). **The Cholesky factor already
embeds the standard deviations — volatility must never be multiplied again.**
The audit's most severe defect was a second `× stdDevs[i]` scaling that
suppressed equity volatility from ~15% to ~2%, materially overstating success
rates. `tests/quant/regressions.test.ts` and `tests/quant/seededMonteCarlo.test.ts`
pin realized volatility to ≈15%.

Per-asset custom `returnRate`s override category means (value-weighted within a
category); assets without custom rates use the category assumption mean.

### wealthEngine.ts (`runWealthEngine`)

Deterministic mean-return path (`buildSnapshots` via `simulateOnePath` with
`useMeanReturns = true`) drives snapshots, terminal values, CAGRs and the
deterministic depletion age. Stochastic Monte Carlo (`buildMonteCarlo`) drives
success rates, percentiles and goal distributions. Both share one simulation
core so the deterministic and stochastic views never diverge in their cash-flow
logic.

Key conventions:

- **Snapshots** record per-year per-category values (`yearlyCategoryValues`),
  not terminal values copied into every year.
- **Depletion age** is the *first* distribution year the corpus cannot cover
  the gross withdrawal (forward search).
- **STP**: the lumpsum is deducted from the liquid bucket at t₀ and tracked in a
  running `stpLiquid` balance — transfers leave liquid, so nothing is
  double-counted.
- **`liquidateAtRetirement = false`** assets are "retained": they stay invested
  (and keep appearing in totals) but are excluded from the SWP corpus at the
  accumulation→distribution transition.
- **Income tax** during accumulation uses a progressive slab schedule on income
  that grows with inflation each year.
- Goal funding in the deterministic path uses nominal FV discounted at the
  nominal portfolio rate (no double inflation discounting).

Known modeling simplifications (documented, intentionally unchanged):

- SIP contributions are added monthly but earn no intra-year return in the
  deterministic path (annual compounding convention).
- `swp.postRetirementReturn` is not applied by `simulateOnePath`; the
  deterministic distribution path continues asset/category return rates.
  `calculations.ts` (`calculateMasterPlan`) and `monteCarlo.ts`
  (`runRetirementMonteCarlo`) do honor `postRetirementReturn`. Aligning the
  wealthEngine is a candidate follow-up.

### monteCarlo.ts (`runRetirementMonteCarlo`)

Two-phase simulation: accumulation (corpus + SIP, SIP step-up applied
**annually**: `monthly *= (1 + stepUp/100)` at each year boundary) and
distribution (inflation-growing withdrawals, grossed up by the tax rate,
first-depletion-year tracking). Yearly percentiles are computed across paths
per year.

### goals.ts (`simulateGoal`, `calculateGoalPV`, `requiredMonthlySIPForGoal`)

Goal FV inflates at the goal's own inflation rate. PV and required-SIP math
use the nominal portfolio return against the nominal FV (nominal/nominal
consistency — mixing real rates with nominal FVs double-discounts inflation).
Volatility comes exclusively from the covariance matrix, same Cholesky model
as the wealth engine.

### assumptions.ts

`buildAssumptionsFromMarketData` derives category means/stds from aligned
market data and builds a default covariance (correlation 0.2 off-diagonal)
overridden by empirical covariance when ≥ 2 mapped symbols have aligned
histories. The correlation matrix is a **deep row copy** of the covariance
before normalization — a shallow copy corrupts the covariance in place.

`hashAssumptions` produces the stable `assumptionVersion` content hash.

### calculations.ts (`calculateMasterPlan`)

Deterministic yearly projection: assets grow at per-asset rates (+ FX mean for
foreign currency), STP deploys from a **running yearly balance** (never
re-deployed), SIP step-up compounds year over year, and non-liquidated assets
are excluded from the SWP corpus exactly once (no double-counting retained
value in terminal corpus).

### mvo.ts (`runMVO`)

Efficient frontier from constrained random sampling (seeded), refined by
projected gradient ascent on the Sharpe ratio. The Sharpe gradient is

```
∂S/∂wᵢ = μᵢ/σ − ((μᵀw − rf)/σ²) · (Σw)ᵢ/σ
```

using the full return derivative `μ` (not `μ − rf`). `applyEquityCap` is
applied **after every gradient step and every sampling projection**, so the
equity cap binds at the refined optimum. The unconstrained refinement target is
the analytic tangent portfolio `w ∝ Σ⁻¹(μ − rf·1)`.

### portfolioAnalytics.ts (`computePortfolioMetrics`)

Portfolio volatility is `√(wᵀΣw)` with the **full covariance matrix**
(when provided), aggregating holding weights by category — not the sum of
squared individual variances, which ignores diversification/correlation.

## Test fixtures

All quant tests live in `tests/quant/`:

- `fixtures.test.ts` — deterministic closed-form checks (SIP/annuity formulas,
  STP deployment, goal PV parity, `wᵀΣw` for MVO and portfolio analytics,
  zero-vol determinism) plus the spec §145 fixture `basic_retirement_01`
  (age 40 → 60 → 85, ₹50L corpus, ₹50K SIP, 6% inflation, 10%/8% returns,
  ₹1L/mo need) with hand-derived references: corpus at 60 ≈ ₹6.80Cr,
  required corpus ≈ ₹7.61Cr (finite-horizon real annuity) → materially
  sub-1 stochastic success rate.
- `regressions.test.ts` — one pin per audit fix; each test targets the exact
  defect (double σ scaling, annual SIP step-up, covariance mutation, per-year
  snapshots, STP double-counting, retained assets, custom returns, income
  growth, forward depletion search, MVO gradient/cap, full-covariance variance).
- `seededMonteCarlo.test.ts` — seeded determinism (bit-identical reruns),
  per-calculation seed generation, volatility ≈ intended (not ~2%), metadata
  contract, assumption-hash sensitivity.

Tolerance policy: deterministic closed forms use relative tolerance ≤ 1e-9.
Stochastic fixtures use seeded RNG with wide-but-meaningful bands (e.g.
realized CV within [12%, 15%] for a 15% vol asset); unseeded stochastic
outputs are only range-asserted, never point-asserted (spec §145).

Run everything: `npm run test:unit` (`npx tsx --test tests/**/*.test.ts`).
