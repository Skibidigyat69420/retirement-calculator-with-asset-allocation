# Sound Thesis Wealth Planner — Product Flow, UX & Feature Expansion

## Purpose

The current platform already has a strong quantitative foundation: a centralized `MasterPlanInputs` state model feeds deterministic calculations, Monte Carlo simulations, goals, retirement, allocation, MVO, reporting, IPS generation, and related modules.

The main opportunity is to evolve the product from an advanced collection of financial calculators into an **adviser operating system**.

The product should ultimately guide the adviser/client through:

> **Understand → Diagnose → Model → Decide → Implement → Monitor**

All recommendations should remain grounded in the same underlying plan state and calculation engines.

---

# 1. Recommended Overall Product Journey

Instead of organizing the experience primarily around individual calculators/modules, organize it around the client's planning journey.

## Stage 01 — Discover

Capture:

- Personal profile
- Age / retirement age / life expectancy
- Income
- Expenses
- Existing assets
- Liabilities
- Dependents
- Financial goals
- Risk profile
- Liquidity requirements
- Existing investments

### Output

Automatically generate a **Client Financial Snapshot**.

---

## Stage 02 — Diagnose

Answer:

> **Where does this client stand today?**

Show:

- Net worth
- Investable assets
- Savings rate
- Current asset allocation
- Financial health score
- Retirement readiness
- Goal funding status
- Liquidity adequacy
- Debt position
- Risk alignment

Then surface the most important problems automatically.

### Example

**3 things require attention**

1. Retirement corpus projected ₹1.4Cr short
2. Equity allocation is 11% above strategic target
3. Education goal has only 61% probability of success

The adviser should not have to manually inspect five different pages to discover these issues.

---

# 2. Add a Plan Health Score

Create a single top-level score:

## Financial Plan Health — 78/100

Break it into meaningful components.

| Area | Score | Status |
|---|---:|---|
| Retirement | 82 | Strong |
| Goals | 64 | Needs Attention |
| Liquidity | 91 | Strong |
| Risk Alignment | 73 | Review |
| Asset Allocation | 69 | Review |
| Debt | 88 | Strong |
| Tax Efficiency | 71 | Review |

Every score should have a transparent explanation.

### Important

The score should not be a black box.

Each component should have:

- Score
- Reason
- Inputs used
- What is driving the score
- How the client can improve it

Example:

> **Retirement: 82/100**
>
> Current plan has a 92% Monte Carlo success probability, but early-retirement downside scenarios create a meaningful shortfall risk.

---

# 3. Turn the Dashboard Into a Command Center

The dashboard should become the primary decision-making screen.

## Header

**Client Name**

**₹8.42Cr projected retirement corpus**

**92% probability of plan success**

### Plan Status

> **ON TRACK**

---

## What Changed?

Show the latest meaningful changes:

- Portfolio appreciated ₹18.4L
- Retirement probability improved 4%
- Education funding gap reduced ₹3.2L
- Equity allocation drifted +3.8%

---

## Recommended Actions

Example:

### 1. Redirect ₹35,000/month SIP toward debt

**Reason:** Equity allocation is 8% above target.

### 2. Increase education SIP by ₹12,000/month

**Reason:** Current goal probability is 67%.

### 3. Review retirement age

**Reason:** Moving retirement from 58 to 60 increases success probability from 82% to 94%.

Each recommendation should have:

- Impact
- Reason
- Confidence
- Supporting calculations
- Apply button
- Undo / compare option

---

# 4. Build a Central Recommendation Engine

This should become the intelligence layer above the existing calculation engines.

## Inputs

```text
Risk Profile
      ↓
Current Assets
      ↓
Cash Flow
      ↓
Goals
      ↓
Retirement
      ↓
Asset Allocation
      ↓
Tax
      ↓
Monte Carlo
      ↓
Stress Tests
      ↓
Recommendation Engine
```

## Outputs

Example:

### Priority 1 — Retirement

Increase retirement allocation by ₹35L over the next 24 months.

### Priority 2 — Education

Increase SIP by ₹15,000/month.

### Priority 3 — Portfolio

Reduce equity exposure from 72% → 65%.

### Priority 4 — Liquidity

Build ₹18L emergency reserve.

---

## Add "Why?"

Every recommendation should be explainable.

Example:

> **Why am I being asked to reduce equity?**

Show:

- Current equity = 72%
- Target equity = 65%
- Risk profile = Balanced
- Stress-test drawdown = -24%
- Retirement success probability = 87% at current allocation
- Retirement success probability = 92% at target allocation

This creates an auditable decision trail.

---

# 5. Create a Scenario Lab

Unify the existing retirement sensitivity and stress-testing concepts into a broader scenario interface.

## Scenario Lab

Start with:

**Current Plan**

- Retirement: 58
- Monthly expenses: ₹2.5L
- SIP: ₹1.2L
- Equity: 65%

Then allow one-click scenarios:

- What if I retire at 55?
- What if I increase SIP by ₹25k?
- What if markets fall 30%?
- What if inflation is 8%?
- What if I buy a ₹3Cr house?
- What if I stop working for 2 years?
- What if expenses increase 20%?
- What if life expectancy increases to 100?

---

## Scenario Comparison

| Scenario | Success | Corpus | Depletion |
|---|---:|---:|---:|
| Current | 92% | ₹8.4Cr | >95 |
| Retire @55 | 71% | ₹6.2Cr | 82 |
| +₹25k SIP | 95% | ₹9.1Cr | >95 |
| -30% crash | 83% | ₹7.0Cr | 90 |
| ₹3Cr house | 76% | ₹5.8Cr | 86 |

Then generate a recommendation:

> **Recommended:** Increase SIP by ₹25k rather than delaying retirement.

---

# 6. Add Goal Conflict Detection

The goal engine should not only evaluate goals individually.

It should answer:

> **Can the client afford all goals simultaneously?**

Example:

| Goal | Required Funding |
|---|---:|
| Retirement | ₹6.2Cr |
| Child Education | ₹1.4Cr |
| House | ₹2.5Cr |
| Travel | ₹40L |
| **Total** | **₹10.5Cr** |

Projected available wealth:

**₹8.7Cr**

### Funding shortfall

**₹1.8Cr**

---

## Priority Controls

Allow the adviser to rank:

1. Retirement
2. Education
3. House
4. Lifestyle

Then dynamically calculate what gets sacrificed when the plan is underfunded.

This should create a clear trade-off view rather than simply showing multiple independent probabilities.

---

# 7. Add a Funding Waterfall

Create a visual flow for household surplus.

Example:

```text
Monthly Surplus
₹2,10,000
      ↓
Emergency Reserve
₹25,000
      ↓
Short-Term Goals
₹35,000
      ↓
Education
₹40,000
      ↓
Retirement
₹80,000
      ↓
Wealth Creation
₹30,000
```

The engine should explain why the allocation was chosen based on:

- Goal horizon
- Goal priority
- Probability of success
- Risk profile
- Liquidity
- Expected return
- Retirement shortfall
- Tax friction

This connects Goal Planning + Allocation + Retirement into one funding architecture.

---

# 8. Adviser Mode vs Client Mode

The same quantitative engine should support two interfaces.

## Adviser Mode

Expose:

- MVO
- Covariance
- Correlation
- Sharpe ratio
- Volatility
- Max drawdown
- Tax friction
- Allocation drift
- Rebalancing
- Monte Carlo assumptions
- Detailed cashflows
- IPS
- Implementation plan

## Client Mode

Simplify the presentation.

Example:

> **You're on track for retirement.**
>
> Your current portfolio has a 92% probability of sustaining your planned lifestyle.
>
> Your biggest current risk is your child's education goal.
>
> We recommend increasing your monthly investment by ₹18,000.

Add:

**See Methodology**

to reveal the underlying calculations.

---

# 9. Add an Implementation Plan

There should be a dedicated layer between recommendations and documentation.

## Portfolio Transition

### Current → Target

| Asset | Current | Target |
|---|---:|---:|
| Equity | ₹1.82Cr | ₹1.63Cr |
| Debt | ₹64L | ₹83L |
| Gold | ₹21L | ₹24L |
| Liquid | ₹9L | ₹12L |

---

## Recommended Actions

### BUY

- ₹12L Debt
- ₹3L Gold

### REDIRECT SIP

- Equity SIP: ₹80k → ₹55k
- Debt SIP: ₹30k → ₹55k

### SELL

- ₹8L Equity, subject to tax impact

---

## Implementation Cost

- Estimated tax: ₹42,000
- Estimated transaction costs: ₹8,000

### Expected allocation after implementation

**65 / 25 / 7 / 3**

The adviser should be able to:

- Apply
- Export
- Save as recommendation
- Compare before/after
- Record rationale

---

# 10. Add Plan vs Reality

This becomes especially important once broker connectivity is available.

## Your Plan

- Equity: 65%
- Debt: 25%
- Gold: 7%
- Cash: 3%

## Actual Portfolio

- Equity: 73%
- Debt: 18%
- Gold: 6%
- Cash: 3%

### Drift

**+8% equity overweight**

Then calculate the consequence:

> If left unchanged, projected retirement success falls from 92% → 87%.

Then provide:

**Correct Allocation**

and implementation actions.

This makes the broker connection useful for portfolio governance rather than simply displaying live holdings.

---

# 11. Add Monte Carlo Failure Analysis

Do not make the primary user experience:

> P10 / P50 / P90

Lead with:

## How confident are we?

**92%**

Then:

> **8% probability of falling short**

Add:

### Why do the failure scenarios occur?

Example:

- 42% — poor early-retirement returns
- 26% — inflation above assumption
- 18% — excessive goal spending
- 9% — longevity
- 5% — other

Then:

### How can we reduce the risk?

| Action | Success Probability |
|---|---:|
| Current plan | 92% |
| Retire 2 years later | 96% |
| Reduce expenses 10% | 97% |
| Increase SIP ₹20k | 95% |
| Increase debt allocation | 94% |

This converts probability into decision support.

---

# 12. Add Reverse Planning

Current planning mostly answers:

> Given my inputs, what happens?

Add:

> **What do I need to do to achieve my target?**

Example:

## Target

**₹10Cr retirement corpus by age 55**

The engine solves for:

- Required SIP
- Required current corpus
- Maximum annual spending
- Maximum goal spending
- Required return
- Retirement age
- Required allocation

Then present multiple pathways.

### Path A

Invest ₹2.1L/month.

### Path B

Retire at 58.

### Path C

Reduce retirement spending by 13%.

### Path D

Combine later retirement + lower spending.

This is more useful than a static retirement calculator.

---

# 13. Add a Client Meeting Workflow

For adviser usage, create a guided workflow.

## Meeting 1 — Discovery

Profile → Assets → Cashflow → Goals → Risk

↓

## Meeting 2 — Diagnosis

Current position → Problems → Scenario analysis

↓

## Meeting 3 — Recommendation

Target allocation → Funding plan → Rebalancing → Implementation

↓

## Meeting 4 — Delivery

Dossier → IPS → Action list

---

## Persistent Progress

Example:

**Client Planning Progress — 72%**

- Discovery ✓
- Risk ✓
- Goals ✓
- Plan ✓
- Implementation ○
- IPS ○

This gives the application a narrative and makes it usable during actual client meetings.

---

# 14. Add Decision History

Every important plan change should be recorded.

Example:

### 03 Sep 2026

**Retirement age changed**

55 → 58

**Reason:** Improve retirement probability.

---

### 03 Sep 2026

**Equity allocation changed**

70% → 65%

**Reason:** Risk profile + stress test.

---

This provides:

- Audit trail
- Adviser accountability
- Client transparency
- Historical comparison
- Ability to revert decisions

---

# 15. Improve the Existing MVO Flow

The current MVO "Add to Assets" behavior uses a fixed ₹1Cr notional for proxy assets.

Replace that with:

## Apply MVO Strategy

Ask:

**Apply these weights to:**

- Current Portfolio
- Future SIP
- STP deployment
- New investment
- Custom amount

If the user selects:

**New Investment**

then ask:

> Investment amount: ₹50,00,000

and calculate actual rupee allocations.

This is more intuitive than creating ₹1Cr proxy assets.

---

# 16. Fix the SIP Return Assumption Inconsistency

The current README notes that the Cashflows tab allows manual equity/debt return assumptions, while the wealth engine currently uses category assumptions from market data/defaults instead.

This should be resolved.

Preferred approach:

### Planning Return Assumption

Allow:

- Market-derived assumption
- Manual override
- Conservative assumption
- Historical assumption

Clearly label the active method.

Example:

> **Equity return assumption: 11.2%**
>
> Source: 10-year market-data estimate
>
> [Override]

If overridden:

> **Equity return assumption: 9.0%**
>
> Source: Adviser override

This makes the model auditable.

---

# 17. Improve Advanced Allocation

The current product documentation indicates that Advanced Allocation links to Black-Litterman, risk parity and tactical overlays, but the route is not yet implemented.

Do not expose unfinished functionality as if it were operational.

Either:

- Remove the navigation temporarily, or
- Show it as **Advanced Portfolio Lab — Coming Soon**

When implemented, it should eventually include:

### Strategic

- MVO
- Risk Parity
- Black-Litterman

### Tactical

- Valuation tilt
- Momentum tilt
- Macro overlay
- Volatility targeting

All tactical changes should be explicitly separated from strategic allocation.

---

# 18. Recommended Final Information Architecture

```text
CLIENT
│
├── Overview
│   └── Financial Health / Plan Status
│
├── Discover
│   ├── Profile
│   ├── Assets
│   ├── Cashflow
│   ├── Goals
│   └── Risk
│
├── Diagnose
│   ├── Net Worth
│   ├── Retirement
│   ├── Goal Funding
│   ├── Liquidity
│   └── Risk
│
├── Plan
│   ├── Master Plan
│   ├── Scenario Lab
│   ├── Goal Funding
│   └── Retirement
│
├── Portfolio
│   ├── Allocation
│   ├── MVO
│   ├── Rebalancing
│   ├── Plan vs Reality
│   └── Stress Test
│
├── Implement
│   ├── Recommendations
│   ├── Buy / Sell / Hold
│   ├── SIP Changes
│   └── Transition Plan
│
└── Deliver
    ├── Reports
    ├── IPS
    └── Client Dossier
```

---

# 19. Core Product Philosophy

The application should stop feeling like:

> **"Here are 12 financial calculators."**

It should feel like:

> **"Here is the client's financial situation, here are the risks, here are the possible futures, and here is what we should do."**

The calculators and quantitative engines remain underneath.

The UX becomes the decision layer above them.

---

# 20. Development Priority

## Tier 1 — Highest Impact

1. Plan Health Score
2. Recommendation Engine
3. Scenario Lab
4. Goal Conflict Detection
5. Implementation Plan
6. Plan vs Reality

## Tier 2

7. Failure Analysis
8. Reverse Planning
9. Adviser / Client Mode
10. Decision History
11. Guided Client Meeting Flow
12. Funding Waterfall

## Tier 3

13. Black-Litterman
14. Risk Parity
15. Tactical overlays
16. Tax-lot optimization
17. Continuous broker synchronization

---

# 21. Target End-State

The final platform should operate as:

```text
UNDERSTAND
     ↓
DISCOVER CLIENT
     ↓
BUILD FINANCIAL MODEL
     ↓
DIAGNOSE PROBLEMS
     ↓
RUN FUTURE SCENARIOS
     ↓
IDENTIFY GOAL CONFLICTS
     ↓
OPTIMIZE PORTFOLIO
     ↓
GENERATE RECOMMENDATIONS
     ↓
BUILD IMPLEMENTATION PLAN
     ↓
EXECUTE / TRACK
     ↓
COMPARE PLAN VS REALITY
     ↓
MONITOR
     ↓
UPDATE PLAN
```

The key principle is:

> **Every input should propagate through the system, but every output should ultimately help answer a decision.**

The existing centralized state and calculation architecture is already well suited to this direction. The next major development effort should therefore focus less on adding isolated calculators and more on **orchestration, recommendation logic, scenario comparison, implementation workflows, and adviser UX**.
