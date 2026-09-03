# Sound Thesis Wealth Planner — Product Flow, UX & Feature Expansion

## Purpose

The current platform already has a strong quantitative foundation: a centralized `MasterPlanInputs` state model feeds deterministic calculations, Monte Carlo simulations, goals, retirement, allocation, MVO, reporting, IPS generation, and related modules.

The main opportunity is to evolve the product from an advanced collection of financial calculators into an **adviser operating system**.

The product should ultimately guide the adviser/client through:

$$\text{Understand} \longrightarrow \text{Diagnose} \longrightarrow \text{Model} \longrightarrow \text{Decide} \longrightarrow \text{Implement} \longrightarrow \text{Monitor}$$

All recommendations should remain grounded in the same underlying plan state and calculation engines.

---

## 1. Recommended Overall Product Journey

Instead of organizing the experience primarily around individual calculators/modules, organize it around the client's planning journey.

### Stage 01 — Discover
**Capture:**
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

**Output:**
- Automatically generate a **Client Financial Snapshot**.

---

### Stage 02 — Diagnose
**Answer:** *Where does this client stand today?*

**Show:**
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

#### Example: "3 things require attention"
1. Retirement corpus projected **₹1.4Cr short**
2. Equity allocation is **11% above strategic target**
3. Education goal has only **61% probability of success**

*The adviser should not have to manually inspect five different pages to discover these issues.*

---

## 2. Add a Plan Health Score

Create a single top-level score:

$$\mathbf{Financial\ Plan\ Health\ —\ 78/100}$$

Break it into meaningful components:

| Area | Score | Status |
| :--- | :---: | :--- |
| **Retirement** | 82 | Strong |
| **Goals** | 64 | Needs Attention |
| **Liquidity** | 91 | Strong |
| **Risk Alignment** | 73 | Review |
| **Asset Allocation** | 69 | Review |
| **Debt** | 88 | Strong |
| **Tax Efficiency** | 71 | Review |

### Transparent Explanations
> [!IMPORTANT]
> The score should **not** be a black box.

Each component should provide:
- **Score**
- **Reason**
- **Inputs used**
- **What is driving the score**
- **How the client can improve it**

#### Example
- **Retirement**: `82/100`
- *Reason*: Current plan has a 92% Monte Carlo success probability, but early-retirement downside scenarios create a meaningful shortfall risk.

---

## 3. Turn the Dashboard Into a Command Center

The dashboard should become the primary decision-making screen.

### Header
- **Client Name**: Vikram & Ananya Sharma
- **₹8.42Cr** projected retirement corpus
- **92%** probability of plan success
- **Plan Status**: `ON TRACK`

### What Changed?
Show the latest meaningful changes:
- Portfolio appreciated **₹18.4L**
- Retirement probability improved **4%**
- Education funding gap reduced **₹3.2L**
- Equity allocation drifted **+3.8%**

### Recommended Actions
1. **Redirect ₹35,000/month SIP toward debt**
   - *Reason*: Equity allocation is 8% above target.
2. **Increase education SIP by ₹12,000/month**
   - *Reason*: Current goal probability is 67%.
3. **Review retirement age**
   - *Reason*: Moving retirement from 58 to 60 increases success probability from 82% to 94%.

Each recommendation should have:
- Impact
- Reason
- Confidence
- Supporting calculations
- **Apply** button
- **Undo / compare** option

---

## 4. Build a Central Recommendation Engine

This should become the intelligence layer above the existing calculation engines.

```
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
[ RECOMMENDATION ENGINE ]
```

### Outputs Example
- **Priority 1 — Retirement**: Increase retirement allocation by ₹35L over the next 24 months.
- **Priority 2 — Education**: Increase SIP by ₹15,000/month.
- **Priority 3 — Portfolio**: Reduce equity exposure from 72% → 65%.
- **Priority 4 — Liquidity**: Build ₹18L emergency reserve.

### Add "Why?" (Explainability)
Every recommendation should be explainable.

*Example: "Why am I being asked to reduce equity?"*
- Current equity = **72%**
- Target equity = **65%**
- Risk profile = **Balanced**
- Stress-test drawdown = **-24%**
- Retirement success probability = **87%** at current allocation
- Retirement success probability = **92%** at target allocation

*This creates an auditable decision trail.*

---

## 5. Create a Scenario Lab

Unify the existing retirement sensitivity and stress-testing concepts into a broader scenario interface.

### Scenario Lab Setup
Start with **Current Plan**:
- Retirement: Age 58
- Monthly expenses: ₹2.5L
- SIP: ₹1.2L
- Equity: 65%

Then allow 1-click scenarios:
- *What if I retire at 55?*
- *What if I increase SIP by ₹25k?*
- *What if markets fall 30%?*
- *What if inflation is 8%?*
- *What if I buy a ₹3Cr house?*
- *What if I stop working for 2 years?*
- *What if expenses increase 20%?*
- *What if life expectancy increases to 100?*

### Scenario Comparison Table

| Scenario | Success Prob | Terminal Corpus | Depletion Age |
| :--- | :---: | :---: | :---: |
| **Current Plan** | 92% | ₹8.4Cr | >95 |
| **Retire @55** | 71% | ₹6.2Cr | 82 |
| **+₹25k SIP** | 95% | ₹9.1Cr | >95 |
| **-30% Market Crash** | 83% | ₹7.0Cr | 90 |
| **₹3Cr House Purchase** | 76% | ₹5.8Cr | 86 |

**Synthesis Recommendation:**
> *Recommended: Increase SIP by ₹25k rather than delaying retirement.*

---

## 6. Add Goal Conflict Detection

The goal engine should not only evaluate goals individually. It must answer:

$$\text{Can the client afford all goals simultaneously?}$$

### Example Conflict Analysis

| Goal | Required Funding |
| :--- | :---: |
| **Retirement** | ₹6.2Cr |
| **Child Education** | ₹1.4Cr |
| **House Purchase** | ₹2.5Cr |
| **Luxury Travel** | ₹40L |
| **Total Demand** | **₹10.5Cr** |

- **Projected Available Wealth**: ₹8.7Cr
- **Funding Shortfall**: **₹1.8Cr**

### Priority Controls
Allow the adviser to rank priorities:
1. Retirement
2. Education
3. House
4. Lifestyle

Then dynamically calculate what gets sacrificed when the plan is underfunded, creating a clear trade-off view rather than multiple isolated probabilities.

---

## 7. Add a Funding Waterfall

Create a visual flow for household monthly surplus:

```
Monthly Surplus
    ₹2,10,000
        ↓
Emergency Reserve (₹25,000)
        ↓
Short-Term Goals (₹35,000)
        ↓
Education SIP (₹40,000)
        ↓
Retirement SIP (₹80,000)
        ↓
Wealth Creation Surplus (₹30,000)
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

*This connects Goal Planning + Allocation + Retirement into one coherent funding architecture.*

---

## 8. Adviser Mode vs Client Mode

The same quantitative engine should support two distinct interface modes.

### Adviser Mode
Expose full technical depth:
- MVO Efficient Frontier
- Covariance & Correlation matrices
- Sharpe ratio & Sortino ratio
- Volatility & Beta metrics
- Maximum drawdown
- Tax friction & drag
- Allocation drift & rebalancing bands
- Monte Carlo distributional assumptions
- Detailed cash flow ledgers
- IPS governance
- Implementation transition plan

### Client Mode
Simplify into high-impact, actionable language:
- *"You're on track for retirement."*
- *"Your current portfolio has a 92% probability of sustaining your planned lifestyle."*
- *"Your biggest current risk is your child's education goal."*
- *"We recommend increasing your monthly investment by ₹18,000."*
- Include a **"See Methodology"** expandable toggle to reveal the underlying quantitative calculations when asked.

---

## 9. Add an Implementation Plan

Provide a dedicated operational layer between recommendations and documentation.

### Portfolio Transition: Current $\to$ Target

| Asset Class | Current Value | Target Value | Delta |
| :--- | :---: | :---: | :---: |
| **Equity** | ₹1.82Cr | ₹1.63Cr | -₹19L |
| **Debt** | ₹64L | ₹83L | +₹19L |
| **Gold** | ₹21L | ₹24L | +₹3L |
| **Liquid** | ₹9L | ₹12L | +₹3L |

### Recommended Actions
- **BUY**: ₹12L Debt, ₹3L Gold
- **REDIRECT SIP**:
  - Equity SIP: ₹80k $\to$ ₹55k/month
  - Debt SIP: ₹30k $\to$ ₹55k/month
- **SELL**: ₹8L Equity, subject to LTCG tax impact

### Friction & Costs
- Estimated Tax Drag: **₹42,000**
- Estimated Transaction Costs: **₹8,000**
- **Expected Post-Implementation Allocation**: `65 / 25 / 7 / 3`

Adviser capabilities:
- **Apply**
- **Export**
- **Save as recommendation**
- **Compare before / after**
- **Record audit rationale**

---

## 10. Add Plan vs Reality (Portfolio Governance)

Connect live broker data with active plan governance:

| Asset Class | Strategic Plan | Actual Holdings | Drift |
| :--- | :---: | :---: | :---: |
| **Equity** | 65% | 73% | **+8% Overweight** |
| **Debt** | 25% | 18% | **-7% Underweight** |
| **Gold** | 7% | 6% | **-1% Underweight** |
| **Cash** | 3% | 3% | **0% On Track** |

### Calculated Consequence
> *If left unchanged, projected retirement success probability falls from **92% $\to$ 87%** due to increased tail-risk volatility.*

**Action**: Provide 1-click **"Correct Allocation"** transition trades.

---

## 11. Add Monte Carlo Failure Analysis

Do not stop at P10 / P50 / P90 percentiles. Lead with confidence and root-cause analysis:

1. **How confident are we?**
   - **92% Probability of Success**
   - **8% Probability of Shortfall**
2. **Why do failure scenarios occur?**
   - **42%**: Poor early-retirement returns (Sequence of Returns Risk)
   - **26%**: Inflation above assumption (>7.5% p.a.)
   - **18%**: Excessive early goal spending
   - **9%**: Longevity outlier (Age 95+)
   - **5%**: Other / Liquidity shock
3. **How can we mitigate the risk?**

| Action | New Success Probability |
| :--- | :---: |
| **Current Plan** | 92% |
| **Retire 2 years later (Age 60)** | **96%** |
| **Reduce living expenses by 10%** | **97%** |
| **Increase SIP by ₹20k/month** | **95%** |
| **Increase debt allocation by 10%** | **94%** |

---

## 12. Add Reverse Planning

Complement forward projections (*"Given inputs, what happens?"*) with goal-seeking reverse optimization (*"What do I need to achieve my target?"*).

### Example Target
$$\mathbf{Target:\ ₹10Cr\ retirement\ corpus\ by\ age\ 55}$$

The engine solves for all feasible combinations:
- **Path A**: Invest **₹2.1L/month** (Current age 55 retirement preserved).
- **Path B**: Defer retirement from **55 $\to$ 58** (Current ₹1.2L SIP preserved).
- **Path C**: Reduce post-retirement lifestyle spending by **13%**.
- **Path D (Blended)**: Retire at age 57 with a modest 5% spending moderation and ₹1.4L SIP.

---

## 13. Add a Client Meeting Workflow

Structure the adviser engagement as a 4-meeting journey:

```
Meeting 1 — Discovery
Profile → Assets → Cashflow → Goals → Risk
          ↓
Meeting 2 — Diagnosis
Current position → Problems → Scenario analysis
          ↓
Meeting 3 — Recommendation
Target allocation → Funding plan → Rebalancing → Implementation
          ↓
Meeting 4 — Delivery
Dossier → IPS → Action list
```

### Persistent Progress Indicator
$$\text{Client Planning Progress — 72\%}$$
- [x] Discovery
- [x] Risk Profile
- [x] Goals
- [x] Master Plan
- [ ] Implementation Transition
- [ ] IPS Sign-off

---

## 14. Add Decision History & Audit Trail

Record every strategic plan modification with timestamps and rationales:

- **03 Sep 2026**: Retirement age changed `55 → 58` *(Reason: Improve retirement probability from 71% to 92%)*.
- **03 Sep 2026**: Equity allocation changed `70% → 65%` *(Reason: Risk profile alignment and stagflation stress test)*.

**Benefits:**
- Institutional compliance audit trail
- Adviser accountability
- Client transparency
- 1-click ability to revert to previous versions

---

## 15. Improve the Existing MVO Flow

Replace the static ₹1Cr proxy asset allocation with dynamic capital routing:

### "Apply MVO Strategy" Dialog
Ask the adviser: *Where should these weights be applied?*
1. **Current Portfolio** (Rebalance existing capital)
2. **Future SIP Inflows** (Direct ongoing cash flows)
3. **STP Deployment** (Systematic transfer schedule)
4. **New Lumpsum Investment** (Enter custom amount, e.g. ₹50,00,000, and calculate exact rupee allocations)

---

## 16. Resolve SIP Return Assumption Inconsistency

Establish a single, auditable return assumption framework:

### Return Assumption Sourcing
- **Market-Derived Consensus** (Historical 10-year rolling CAGR)
- **Conservative Margin-of-Safety** (Lower quartile return)
- **Manual Adviser Override** (Custom input with recorded rationale)

**Clear UI Labeling:**
- *Equity Return*: `11.2% p.a.` (Source: 10-year market-data estimate) `[Override]`
- If overridden: `9.0% p.a.` (Source: Adviser override — Conservative buffer)

---

## 17. Advanced Allocation Architecture

Explicitly separate Strategic and Tactical overlays:

- **Strategic Layer**:
  - Mean-Variance Optimization (MVO)
  - Risk Parity
  - Black-Litterman Model
- **Tactical Layer**:
  - Valuation tilt (PE/PB percentile)
  - Momentum tilt
  - Macroeconomic regime overlay
  - Volatility targeting

*(Note: Unfinished models should be clearly badged as "Advanced Portfolio Lab — Coming Soon" to maintain institutional credibility).*

---

## 18. Recommended Final Information Architecture

```
CLIENT / ADVISER OS
│
├── Overview
│   └── Financial Health / Plan Status / Command Center
│
├── Discover
│   ├── Profile & Family
│   ├── Assets & Balance Sheet
│   ├── Cash Flow & Inflows
│   ├── Goals Architecture
│   └── Risk Tolerance & Capacity
│
├── Diagnose
│   ├── Net Worth Aggregation
│   ├── Retirement Readiness
│   ├── Goal Funding Gap Analysis
│   ├── Liquidity & Emergency Buffer
│   └── Risk Alignment Review
│
├── Plan
│   ├── Master Plan Simulation
│   ├── Scenario Lab (What-If Analysis)
│   ├── Goal Conflict & Funding Waterfall
│   └── Retirement & SWP Longevity
│
├── Portfolio
│   ├── Strategic Asset Allocation
│   ├── MVO Frontier
│   ├── Rebalancing & Drift Analysis
│   ├── Plan vs Reality (Broker Holdings)
│   └── Crisis Stress-Testing
│
├── Implement
│   ├── Actionable Recommendations
│   ├── Buy / Sell / Hold Schedule
│   ├── SIP Redirection
│   └── Transition Plan with Tax Drag
│
└── Deliver
    ├── Financial Reports
    ├── Investment Policy Statement (IPS)
    └── 7-Page Executive Client Dossier (PDF)
```

---

## 19. Core Product Philosophy

> **The application should stop feeling like:**
> *"Here are 12 financial calculators."*
>
> **It should feel like:**
> *"Here is the client's financial situation, here are the risks, here are the possible futures, and here is what we should do."*

The calculators and quantitative engines remain underneath as transparent, rigorous foundations. The UX becomes the **decision layer** above them.

---

## 20. Development Priority Roadmap

### Tier 1 — Highest Impact (Core Orchestration)
- [ ] **Plan Health Score** (Transparent 0–100 composite index with explanatory drivers)
- [ ] **Central Recommendation Engine** (Rule-based decision intelligence layer)
- [ ] **Scenario Lab** (Interactive what-if comparison matrix)
- [ ] **Goal Conflict Detection** (Simultaneous affordability & priority sacrifice engine)
- [ ] **Implementation Plan** (Transition trades, tax drag, and SIP redirection)
- [ ] **Plan vs. Reality** (Live broker drift detection & corrective actions)

### Tier 2 — High Value (Adviser Workflows & Experience)
- [ ] **Monte Carlo Failure Analysis** (Root-cause diagnosis of failure scenarios)
- [ ] **Reverse Planning** (Goal-seeking solver for required SIP / retirement age)
- [ ] **Adviser Mode vs. Client Mode** (Dual persona toggles)
- [ ] **Decision History & Audit Trail** (Logged changes with rationales)
- [ ] **Guided 4-Meeting Client Flow**
- [ ] **Surplus Funding Waterfall**

### Tier 3 — Advanced Quantitative Enhancements
- [ ] **Black-Litterman Model**
- [ ] **Risk Parity Allocation**
- [ ] **Tactical Macro Overlays**
- [ ] **Tax-Lot Specific Harvesting Optimization**
- [ ] **Continuous Real-Time Broker Synchronization**

---

## 21. Target End-State Workflow

```
UNDERSTAND CLIENT
       ↓
DISCOVER & PROFILE
       ↓
BUILD FINANCIAL MODEL
       ↓
DIAGNOSE PROBLEMS & GAPS
       ↓
RUN FUTURE SCENARIOS
       ↓
IDENTIFY GOAL CONFLICTS
       ↓
OPTIMIZE ASSET ALLOCATION
       ↓
GENERATE RECOMMENDATIONS
       ↓
BUILD IMPLEMENTATION PLAN
       ↓
EXECUTE & RECORD DECISIONS
       ↓
COMPARE PLAN VS REALITY
       ↓
MONITOR & GOVERN
       ↓
UPDATE MASTER PLAN
```

**Guiding Rule:**
*Every input must propagate through the system, but every output must ultimately answer a client decision.*
