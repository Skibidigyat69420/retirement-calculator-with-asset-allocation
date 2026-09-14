# SOUND THESIS — NEW VISUAL IDENTITY / UI-UX REBUILD
## Master AI-Harness Prompt for a Full Frontend Redesign

**Repository:** https://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/

**Primary objective:** Rebuild the entire visual identity and user experience of the existing Sound Thesis Wealth Planner inside the existing Vite + React application.

This is a **frontend/product-design implementation task**, not a request for a design mockup.

The harness must:

1. inspect the entire repository before changing it;
2. understand the existing pages, components, context, calculation modules, routes, assets and styling;
3. create a completely new visual identity;
4. substantially redesign the UI and UX;
5. preserve all existing financial functionality;
6. retain Vite + React;
7. support both light mode and dark mode with a persistent toggle;
8. make the product feel like a premium wealth-planning platform for **wealth practitioners**;
9. change all user-facing numeric/default financial inputs to start at `0` unless a value is technically required to render the interface safely;
10. ensure a zero-data initial state never produces `NaN`, `Infinity`, misleading results or fake "healthy" planning outputs;
11. work directly against the Git repository and commit the completed changes;
12. leave the repository in a runnable, buildable, tested state.

---

# 1. DO NOT TREAT THIS AS A COSMETIC SKIN

Do not merely:

```text
change colors
change border radius
change a few cards
```

The requested outcome is a **new product identity**.

The current application already contains a significant planning engine and many modules. The redesign must change:

```text
information architecture
navigation
page composition
visual hierarchy
interaction patterns
component language
typography
spacing
charts
inputs
empty states
loading states
status communication
responsive behavior
dark mode
motion
```

while preserving the underlying domain behavior.

Think:

> **New product, existing financial engine.**

not:

> Existing product, new color theme.

---

# 2. IMPORTANT REPOSITORY CONTEXT

The repository is already a large Vite + React application.

The current `App.tsx` uses:

```text
BrowserRouter
AuthProvider
CalculatorProvider
Layout
lazy-loaded route components
Suspense
```

and currently routes to:

```text
Dashboard
Risk
Master Plan
Goal Planner
Retirement
Reverse Planning
Allocation
Advanced Portfolio
Meeting Workflow
Decision History
Reports
Dossier
Calculators
IPS
Angel Connect
Angel Data
Practitioner
```

Preserve this broad functionality and gradually improve the information architecture around it. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/App.tsx

The current `src/` structure contains:

```text
assets
components
context
hooks
lib
pages
types
App.tsx
index.css
main.tsx
```

The existing repo also includes:

```text
api/
server/
supabase/
functions/
data/
scripts/
legacy/
tests/
ips/
ips-template/
```

so the frontend should not pretend this is a tiny single-screen calculator. The repository is already moving toward a broader platform. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/tree/main

---

# 3. READ THE WHOLE REPOSITORY FIRST

Before editing, inspect:

```text
README.md
Comprehensive Application Audit, Debug & Upgrade Plan.md
feature_list.md
sound_thesis_product_flow_ideas.md
walk_through.md
DATA_FLOW.mmd

package.json
vite.config.ts
tsconfig*.json
.env.example
vercel.json
render.yaml

src/App.tsx
src/index.css
src/main.tsx

src/components/**
src/context/**
src/hooks/**
src/lib/**
src/pages/**
src/types/**

api/**
server/**
functions/**
supabase/**
```

Do not skip files because they appear unrelated to visual design.

The application has many dependencies between visual components and shared state.

---

# 4. CURRENT DESIGN SYSTEM — REPLACE IT

The current `src/index.css` already has a design-token system, dark mode, glass utilities, emerald accents, shadows, focus rings, scrollbar styling and animation helpers. It is coherent, but the new task is to create a **different identity**, not merely extend those tokens. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/index.css

Therefore:

**Treat the current design tokens as legacy.**

Do not preserve the current visual language simply because it already exists.

Replace it with a new coherent system.

---

# 5. NEW BRAND POSITIONING

The application should feel like:

```text
private wealth
+
financial intelligence
+
calm editorial design
+
modern software
```

The emotional response should be:

```text
quiet confidence
precision
clarity
control
trust
taste
```

Not:

```text
bank portal
spreadsheet
generic SaaS dashboard
crypto app
consumer budgeting app
```

---

# 6. NEW IDENTITY DIRECTION

Create a completely new visual identity for:

## SOUND THESIS

Potential positioning line:

> **A clearer view of wealth.**

Alternative supporting language:

> **Plan with confidence. See the future clearly.**

The harness may refine the exact copy, but the visual language should communicate:

```text
measured
intelligent
premium
analytical
human
```

---

# 7. CORE DESIGN CONCEPT

Use the concept:

# "Editorial Financial Intelligence"

The UI should feel like a combination of:

```text
high-end wealth advisory report
+
Bloomberg-like information density
+
modern SaaS usability
+
premium editorial typography
```

But do not copy Bloomberg or another financial product literally.

Develop an original language.

---

# 8. VISUAL MATERIALITY

Use more visual depth than the current flat SaaS treatment.

Preferred:

```text
quiet tonal surfaces
hairline borders
large typographic anchors
subtle depth
dense data blocks
soft gradients used selectively
beautiful data visualization
asymmetric layouts
editorial spacing
```

Avoid:

```text
everything in a card
everything in a rounded rectangle
rainbow gradients
huge soft shadows
oversized SaaS pills
generic metric-card grid
```

One of the biggest goals is to reduce the feeling that every piece of information lives in its own card.

---

# 9. COLOR DIRECTION

Do not use the current green-on-white identity as the dominant system.

Create an elegant, distinctive palette.

Recommended starting direction:

## Light mode

```text
Canvas:
#F4F2ED

Primary ink:
#171815

Secondary ink:
#4E524B

Quiet text:
#7B7E76

Border:
#D9D8D1

Surface:
#FBFAF7

Raised:
#FFFFFF

Deep panel:
#20231F
```

Accent:

```text
Moss:
#667A63

Deep moss:
#4A5C47

Soft moss:
#E6ECE3
```

Warm accent:

```text
Brass:
#B3945A

Soft brass:
#F1EADF
```

Status:

```text
Positive:
#557A60

Warning:
#B07D3E

Negative:
#A65954

Info:
#64758A
```

These are starting points, not immutable requirements.

The design agent should tune them based on actual screenshots and contrast testing.

---

# 10. DARK MODE

Dark mode must feel deliberately designed, not inverted.

Use:

```text
Canvas:
#0E100E

Surface:
#151815

Raised:
#1B1F1B

Elevated:
#222722

Border:
#2A302A

Primary text:
#F1F1EA

Secondary text:
#B5B8AE

Muted:
#7E837A
```

Accent:

```text
Moss:
#8EA889

Deep moss:
#6E856A

Soft moss:
rgba(...)
```

Warm brass:

```text
#C5A66D
```

The dark theme should feel closer to:

```text
dark library / private study / premium terminal
```

than:

```text
black background + neon green
```

---

# 11. LIGHT/DARK TOGGLE — MANDATORY

Implement a genuine theme system.

Requirements:

```text
Light
Dark
System
```

Use a topbar theme control.

Recommended interaction:

```text
Sun
Moon
```

with a compact segmented/animated control.

Persist preference:

```text
localStorage
```

or existing preference storage.

The app should:

1. initialize from user preference;
2. fall back to system preference;
3. allow explicit Light/Dark selection;
4. preserve preference across sessions;
5. update charts;
6. update all surfaces;
7. update focus states;
8. update form controls;
9. update browser `color-scheme`.

Do not implement dark mode as a few `.dark` overrides on the body while leaving dozens of hard-coded white/black classes throughout the application.

Every semantic token must work in both themes.

---

# 12. THEME ARCHITECTURE

Use semantic tokens.

Example:

```css
:root {
  --canvas: ...
  --surface: ...
  --surface-raised: ...
  --surface-inset: ...

  --text-primary: ...
  --text-secondary: ...
  --text-muted: ...

  --border-subtle: ...
  --border-default: ...
  --border-strong: ...

  --accent: ...
  --accent-strong: ...
  --accent-soft: ...

  --positive: ...
  --warning: ...
  --negative: ...
  --info: ...

  --shadow-sm: ...
  --shadow-md: ...
  --shadow-lg: ...
}

.dark {
  ...
}
```

Do not scatter hex codes throughout page components.

---

# 13. THE NEW APP SHELL

The new shell should feel unmistakably premium.

Desktop:

```text
┌────────────────────────────────────────────────────────────────────┐
│ SOUND THESIS     Client / Plan context       Search  Theme  User  │
├───────────────┬────────────────────────────────────────────────────┤
│               │                                                    │
│ Dashboard     │                                                    │
│ Clients       │                    Main Content                    │
│ Plans         │                                                    │
│ Reviews       │                                                    │
│              │                                                    │
│ Portfolio     │                                                    │
│ Scenarios     │                                                    │
│ Reports       │                                                    │
│               │                                                    │
│ Practice      │                                                    │
│ Team          │                                                    │
│ Settings      │                                                    │
│               │                                                    │
└───────────────┴────────────────────────────────────────────────────┘
```

The current `Layout`, `Sidebar`, and `TopBar` can be refactored, but the new shell should not visually resemble the existing one. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/components/layout/Layout.tsx citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/components/layout/Sidebar.tsx

---

# 14. SIDEBAR DESIGN

Do not make the sidebar a wall of uniformly weighted links.

Use hierarchy.

Example:

```text
SOUND THESIS

WORKSPACE
Overview
Clients
Reviews
Tasks

PLAN
Master Plan
Retirement
Goals
Scenarios

PORTFOLIO
Allocation
Optimization
Stress Tests

DELIVER
Reports
IPS
Dossier

PRACTICE
Team
Integrations
Settings
```

Visual hierarchy:

```text
section label = tiny / muted
primary nav = readable / strong
active item = subtle filled plane + left indicator
```

No giant bright green active pill.

---

# 15. ACTIVE NAVIGATION

Use a refined active treatment.

Light:

```text
soft moss background
dark ink
small left rule
```

Dark:

```text
soft moss tint
light text
subtle glow
```

No heavy box-shadow.

---

# 16. SIDEBAR COLLAPSE

Desktop sidebar states:

```text
Expanded
Collapsed
```

Expanded:

```text
240–264px
```

Collapsed:

```text
68–76px
```

Collapsed mode still needs:

```text
tooltips
icons
active indicator
keyboard access
```

Persist the choice.

---

# 17. MOBILE NAVIGATION

Do not shrink the desktop sidebar.

Mobile:

```text
top bar
bottom navigation / drawer
```

Recommended bottom-level navigation:

```text
Home
Clients
Plans
Tasks
More
```

The `More` area can expose:

```text
Reports
Portfolio
Risk
Settings
Integrations
```

---

# 18. GLOBAL HEADER

The top bar should contain:

```text
Current practice
Current client / context
Global search
Theme
Notifications
Profile
```

Example:

```text
SOUND THESIS WEALTH
/
Raj Sharma
/
Retirement Plan
```

On the right:

```text
⌘K
☼ / ☾
○
Ketan
```

Keep it quiet.

---

# 19. BRAND MARK

Create a new wordmark/mark from scratch.

Do not use the current:

```text
ST
PRO
Wealth Advisory Engine
```

treatment unchanged.

The new identity could use:

```text
ST
```

but it needs to be redesigned.

Potential direction:

```text
monogram
geometric thesis mark
abstract upward/continuity symbol
```

Use SVG.

Create:

```text
LogoMark
Wordmark
Lockup
```

in:

```text
light
dark
```

versions.

Do not invent a complex illustration.

---

# 20. TYPOGRAPHY

Create a genuine type system.

Recommended:

### Interface

```text
Inter
```

### Editorial/display

```text
DM Serif Display
```

or

```text
Instrument Serif
```

Use the serif very selectively:

```text
hero
section anchor
major financial statement
report cover
```

Do NOT put body text in serif.

Potential hierarchy:

```text
Page title
34–42px

Hero number
48–72px

Section title
21–26px

Card title
15–17px

Body
14–16px

Metadata
12–13px
```

---

# 21. NUMERIC TYPOGRAPHY

Financial figures need a distinct typographic behavior.

Use:

```text
tabular numerals
```

for:

```text
₹ amounts
%
years
dates
scores
```

Create styles for:

```text
hero number
financial metric
table number
delta
```

Example:

```text
₹5.32 Cr
```

should feel like the most important object on the page without requiring a giant card around it.

---

# 22. SPACING SYSTEM

Create a disciplined spacing scale:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Use larger whitespace around important sections.

---

# 23. CONTAINERS

Avoid full-width everything.

Desktop content:

```text
max-width: 1440px
```

High-density data pages:

```text
max-width: 1520px
```

Editorial/report surfaces:

```text
max-width: 1200px
```

Use different content widths intentionally.

---

# 24. CARD PHILOSOPHY

Cards are not the default UI primitive.

Use cards for:

```text
contained interaction
metric group
decision object
preview
```

Do not wrap:

```text
every chart
every paragraph
every section
```

in white cards.

Mix:

```text
full-bleed sections
bordered panels
quiet surface areas
data tables
floating utility panels
```

---

# 25. BORDERS

Prefer:

```text
1px hairlines
```

over shadows.

Light mode:

```text
warm grey
```

Dark mode:

```text
soft charcoal
```

Use stronger borders only for:

```text
focus
selected
critical state
```

---

# 26. SHADOWS

Use extremely subtle shadows.

The product should not look like floating fintech cards everywhere.

Recommended:

```text
sm
0 1px 2px rgba(...)

md
0 4px 16px rgba(...)

lg
0 16px 40px rgba(...)
```

Only modals, popovers and floating panels get strong elevation.

---

# 27. GRADIENTS

Use gradients only as an identity accent.

Potential:

```text
warm parchment → soft moss
```

or dark:

```text
deep forest → charcoal
```

Use on:

```text
dashboard hero
login background
report cover
empty-state accent
```

Never use them behind every card.

---

# 28. TEXTURE

Consider extremely subtle texture:

```text
noise
paper grain
fine radial pattern
```

Only if implemented efficiently.

Never use huge background imagery behind financial tables.

---

# 29. MICRO-GRID / GRAPH PAPER MOTIF

A very subtle mathematical grid could reinforce planning.

Example:

```text
background-image:
linear-gradient(...)
```

Opacity should be extremely low.

Potential use:

```text
dashboard hero
scenario lab
empty state
```

This should become a recognizable brand signature.

---

# 30. DASHBOARD REBUILD

The current Dashboard is a very large page. Treat it as a product page that needs composition, not as a collection of widgets. The current source is approximately 1,000 lines, so the harness should decompose it into coherent visual sections/components rather than continuing to grow the monolith. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/pages/Dashboard.tsx

New structure:

```text
Dashboard
│
├── Greeting / hero
├── Practice pulse
├── Priority queue
├── Planning health
├── Recent clients
├── Upcoming reviews
├── Portfolio / wealth snapshot
└── Activity
```

---

# 31. DASHBOARD HERO

Top:

```text
Good morning, Ketan.

Your practice is moving in the right direction.
```

Then:

```text
72%
of active plans are on track
```

And:

```text
11 need your attention
```

Actions:

```text
+ New client
+ New plan
```

---

# 32. DASHBOARD PRACTICE PULSE

Instead of six equal cards, create one large visual composition.

Example:

```text
PRACTICE PULSE

128
Clients

94
Active plans

8
Reviews this week

11
Plans to review
```

Visual hierarchy:

```text
128 = largest
```

not all equal.

---

# 33. PRIORITY QUEUE

This should be visually prominent.

```text
TODAY

Raj Sharma
Retirement assumption changed
Needs review

Anita Mehta
Plan probability dropped below threshold
Needs attention

Vivek Shah
Annual review tomorrow
Upcoming
```

Use severity quietly.

---

# 34. CLIENT SEARCH

Add global search:

```text
⌘ K
```

Search:

```text
client
plan
goal
report
task
```

Results should include:

```text
Raj Sharma
₹6.84 Cr
82 plan health
```

---

# 35. CLIENT LIST REBUILD

Do not use the current application style of ordinary CRUD rows.

Create a high-end practice directory.

Columns:

```text
Client
Household
Wealth
Plan status
Retirement
Assigned
Last review
```

Use a dense but elegant table.

---

# 36. CLIENT ROW DESIGN

Primary line:

```text
Raj Sharma
```

Secondary:

```text
Raj & Priya Sharma
```

Wealth:

```text
₹6.84 Cr
```

Plan:

```text
On track · 82
```

Retirement:

```text
2033
```

Assigned:

```text
Ketan
```

Last review:

```text
2 days ago
```

---

# 37. CLIENT PROFILE HEADER

New visual:

```text
Raj Sharma
52 years · Mumbai

Planning since 2024

[ Review ]
[ New Plan ]
```

Under it:

```text
₹6.84 Cr
Net worth

₹4.72 Cr
Investable

2033
Target retirement
```

No giant cards needed.

---

# 38. CLIENT PROFILE — VISUAL STORY

The overview should read from:

```text
Current position
↓
Future position
↓
Risk
↓
Decision
↓
Next action
```

This should be visible at a glance.

---

# 39. CLIENT OVERVIEW

Sections:

```text
Financial snapshot
Planning health
Retirement outlook
Goal funding
Portfolio
Recent decisions
Next conversation
```

---

# 40. RETIREMENT HERO

This should be a signature visual.

Example:

```text
RETIREMENT OUTLOOK

₹5.32 Cr
Projected at retirement

₹4.86 Cr
Required

+₹46L
Surplus

82%
Plan probability
```

Then large chart.

---

# 41. RETIREMENT CHART

Use a clean, editorial chart.

Show:

```text
projected corpus
required corpus
retirement point
```

Do not fill the whole area with saturated colors.

Use:

```text
thin line
soft fill
subtle reference line
```

Dark mode gets tuned equivalents.

---

# 42. RETIREMENT EMPTY STATE

When all numeric inputs are zero:

Do NOT show:

```text
0%
On Track
₹0 required
₹0 projected
```

as though that were a meaningful plan.

Instead:

```text
Retirement plan not configured

Add the client's age, retirement target and current
financial position to generate a projection.

[ Start plan ]
```

This rule applies everywhere.

---

# 43. ZERO-DEFAULT REQUIREMENT

Every editable numeric field that currently has a non-zero demo/default value should start at:

```text
0
```

Examples:

```text
income = 0
expenses = 0
assets = 0
liabilities = 0
SIP = 0
STP = 0
SWP = 0
goal amount = 0
current corpus = 0
manual allocation = 0
```

For arrays:

```text
assets = []
goals = []
cashflows = []
```

not fake/demo data.

---

# 44. ZERO DEFAULTS — IMPORTANT EXCEPTION

The instruction is:

> financial/user-entered defaults should be zero.

But do not create invalid mathematics.

Fields that are technically categorical/system-required may use:

```text
empty/null
```

rather than fake non-zero values.

Examples:

```text
client name = ""
retirement age = 0
current age = 0
life expectancy = 0
currency = "INR"
```

The engine must recognize:

```text
currentAge === 0
```

as:

```text
incomplete profile
```

not as:

```text
real 0-year-old client
```

---

# 45. ZERO-STATE CALCULATION GUARD

When the application's state is effectively empty:

```text
all financial numbers = 0
profile incomplete
```

the UI must display:

```text
Not enough information
```

or:

```text
Planning not configured
```

instead of calculating nonsensical results.

No:

```text
NaN
Infinity
-0
1.797e308
```

anywhere in user-facing UI.

---

# 46. RESET TO ZERO

Add:

```text
Reset data
```

and:

```text
Start from zero
```

where appropriate.

Confirmation:

```text
Reset this planning workspace?

This will clear current inputs and return the workspace
to a blank planning state.

[ Cancel ]
[ Reset ]
```

After reset:

```text
All numeric fields = 0
arrays = []
profile text = blank
```

---

# 47. REMOVE DEMO DATA FROM DEFAULT UI

If the current application has demo/sample client values from scenarios or default inputs:

Do not display them on first load.

Demo seed data may remain available through:

```text
Load demo
```

or a clearly labeled demo environment.

Default application state:

```text
blank
zero
empty
```

---

# 48. ZERO-STATE DASHBOARD

The dashboard for a brand-new practice should be beautiful.

Example:

```text
Good morning.

Your workspace is ready.

Start by adding your first client.

[ Add first client ]
```

Then:

```text
Clients
0

Active plans
0

Reviews
0

At-risk plans
0
```

But avoid presenting zeros as if they were metrics requiring attention.

Instead emphasize onboarding.

---

# 49. ZERO-STATE VISUAL

Use a strong empty-state composition:

```text
          a subtle planning grid

             SOUND THESIS

        Build your first plan.

     Turn a client's financial picture
     into a clear view of the future.

          [ Add first client ]
```

No generic illustration from a template library unless it truly fits the new identity.

---

# 50. CLIENT CREATION MODAL

Create a premium stepped drawer/modal.

Step 1:

```text
Create client

Basic details
```

Step 2:

```text
Financial starting point
```

Step 3:

```text
Planning focus
```

Step 4:

```text
Start a plan?
```

Keep it fast.

---

# 51. MASTER PLAN REDESIGN

The current Master Plan is one of the core product surfaces.

Do not retain its current dense form composition.

Turn it into a **planning studio**.

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Plan title                                      Saved just now│
├───────────────┬───────────────────────────────┬──────────────┤
│ 01 Profile    │                               │              │
│ 02 Financials │     Current section            │ Live result  │
│ 03 Cashflow   │                               │              │
│ 04 Goals      │     form / table / chart       │              │
│ 05 Risk       │                               │              │
│ 06 Assumptions│                               │              │
│ 07 Outlook    │                               │              │
└───────────────┴───────────────────────────────┴──────────────┘
```

---

# 52. MASTER PLAN LEFT RAIL

Use a vertical progress rail.

```text
01
Profile         ✓

02
Financials      ✓

03
Cashflow        →

04
Goals           ○

05
Risk            ○

06
Assumptions     ○

07
Outlook         ○
```

Do not show a giant progress percentage unless useful.

---

# 53. MASTER PLAN RIGHT RAIL

Persistent result summary:

```text
PLAN OUTLOOK

Projected
—

Required
—

Funding
—

Probability
—

[ View details ]
```

Until sufficient data exists:

```text
Complete the profile
```

---

# 54. INPUT COMPONENT DESIGN

Inputs should feel editorial.

Example:

```text
CURRENT ANNUAL INCOME

₹
[ 0 ]

Annual gross income before tax
```

Do not put placeholder values such as:

```text
₹40,00,000
```

when the actual value is zero.

---

# 55. NUMBER INPUT BEHAVIOR

For financial inputs:

```text
0
```

by default.

Typing:

```text
150000
```

can render:

```text
₹1,50,000
```

but store:

```text
150000
```

Never store formatted strings in domain state.

---

# 56. CURRENCY INPUT

Create a reusable:

```text
CurrencyInput
```

Behavior:

```text
₹ 0
```

When focused:

```text
₹ 0|
```

When typing:

```text
₹ 1,50,000
```

Use tabular numerals.

---

# 57. PERCENTAGE INPUT

Example:

```text
Inflation
[ 0.0 ] %
```

Default:

```text
0
```

If the application needs an assumption set to perform a realistic projection, it should clearly display:

```text
Add an assumption
```

rather than secretly injecting a non-zero user input.

---

# 58. SLIDER DESIGN

Sliders should feel high quality.

Track:

```text
thin
```

Thumb:

```text
small
solid
slightly enlarged on interaction
```

Numeric value sits directly above/beside the thumb.

Do not make the entire input area a giant colored pill.

---

# 59. SEGMENTED CONTROLS

Use for:

```text
Nominal / Real
Current / Target
Light / Dark / System
Base / Conservative / Optimistic
```

They should feel like precision controls.

---

# 60. SCENARIO LAB — NEW IDENTITY

Scenario Lab should be one of the most beautiful screens.

Header:

```text
SCENARIO LAB

Explore the futures your client could face.
```

Then:

```text
Base
Conservative
Optimistic
What If
Stress
```

Use a central chart and an assumption rail.

---

# 61. SCENARIO LAB LAYOUT

```text
┌──────────────────────────────────────────────────────────┐
│ Scenario Lab                                  + Scenario │
├───────────────┬──────────────────────────────────────────┤
│ Scenarios     │                                          │
│               │      projection chart                    │
│ Base          │                                          │
│ Conservative  │                                          │
│ Optimistic    │                                          │
│ What if       │                                          │
│               │                                          │
├───────────────┼──────────────────────────────────────────┤
│ Assumptions   │ Key outcomes                              │
│               │ ₹5.32Cr                                  │
│ Age           │ 82%                                      │
│ Inflation     │ +₹46L                                   │
│ Return        │                                          │
└───────────────┴──────────────────────────────────────────┘
```

---

# 62. WHAT-IF MODE

The visual should feel almost like manipulating a model.

Controls:

```text
Retirement age
Monthly investment
Step-up
Inflation
Return
Lifestyle
```

Results move live.

Use animated interpolation, but never distort the actual numbers.

---

# 63. SCENARIO COMPARISON

Use a strong comparison table:

```text
                     Base      Retire at 57      Conservative

Corpus               ₹5.32Cr      ₹6.10Cr          ₹4.08Cr
Probability             82%          91%              61%
Depletion age            86           >90               77
Monthly SIP             82K          63K              1.05L
```

Highlight deltas rather than coloring entire rows.

---

# 64. RETIREMENT PAGE

The retirement page should not be a plain calculator report.

It should begin:

```text
RETIREMENT

What does financial independence look like
for this client?
```

Then primary metric.

---

# 65. GOAL PAGE

Create a timeline-driven experience.

Example:

```text
GOALS

2029 ─ Education ─ ₹50L
2032 ─ Home       ─ ₹1.2Cr
2033 ─ Retirement ─ ₹4.86Cr
2040 ─ Legacy     ─ ₹2Cr
```

This can use subtle timeline styling.

---

# 66. RISK PAGE

Risk should feel like an assessment/report, not a form.

Top:

```text
RISK PROFILE

Balanced
74 / 100
```

Then a radar or radial visual.

Then:

```text
What this means

The client can tolerate moderate equity volatility,
but goal rigidity reduces practical risk capacity.
```

---

# 67. ALLOCATION PAGE

Primary visual:

```text
CURRENT         TARGET
63%             60%
Equity          Equity

20%             25%
Debt            Debt
```

Use a split-ring or stacked visual.

Then:

```text
Rebalancing needed
```

with a clear action list.

---

# 68. MVO PAGE

Do not expose equations on first load.

Primary:

```text
Portfolio optimization
```

Modes:

```text
Balanced
Max Sharpe
Min Volatility
Risk Parity
Custom
```

Secondary:

```text
Efficient frontier
Correlation matrix
Statistics
Constraints
```

---

# 69. ADVANCED PORTFOLIO

Make it a power-user screen.

Use dense data.

Think:

```text
research terminal
```

but maintain the new visual language.

Small typography.

Lots of whitespace around sections.

Clear visual hierarchy.

---

# 70. REPORTS PAGE

Make reports feel like deliverables.

Header:

```text
CLIENT REPORTS

Create, review and deliver polished planning outputs.
```

List:

```text
Report
Client
Version
Created
Status
```

Actions:

```text
Preview
Download
Share
Archive
```

---

# 71. DOSSIER PAGE

Use an editorial composition.

Large cover preview.

```text
RAJ SHARMA

WEALTH PLAN

2026
```

Then document contents.

---

# 72. IPS PAGE

Make it feel like a formal institutional document.

Status:

```text
Draft
Review
Approved
Archived
```

No casual SaaS visual treatment.

---

# 73. MEETING WORKFLOW

Create a focused "meeting mode."

Layout:

```text
Client header
↓
Meeting stage
↓
Checklist
↓
Conversation context
↓
Notes
↓
Next actions
```

The meeting screen should feel like a command center.

---

# 74. DECISION HISTORY

This page should feel like a chronological investment notebook.

Example:

```text
15 SEP 2026

Retirement age
55 → 57

Impact
+₹62L projected resilience

Decision
Client prefers greater flexibility.

────────────────────

02 AUG 2026

Equity allocation
63% → 60%

Reason
Align with revised risk profile.
```

---

# 75. PRACTITIONER PAGE

The current Practitioner page should become the practice/team overview.

Sections:

```text
Your practice
Team
Client assignments
Review load
Recent activity
```

---

# 76. TEAM PAGE

Beautifully display:

```text
Wealth Practitioner
Ketan
72 clients

Wealth Practitioner
Aarav
41 clients
```

Do not call people "advisors" if the product terminology is:

```text
wealth practitioners
```

---

# 77. NOTIFICATIONS

Create a subtle notification center.

Example:

```text
3

Raj Sharma
Scenario is stale

Anita Mehta
Review due

Report ready
```

No huge notification cards.

---

# 78. PROFILE MENU

Top right:

```text
Ketan
Wealth Practitioner
```

Menu:

```text
Profile
Preferences
Security
Theme
Keyboard shortcuts
Sign out
```

---

# 79. THEME TOGGLE UX

Ideal control:

```text
○ System
☀ Light
☾ Dark
```

Could be a segmented switch.

Animate icon rotation/fade subtly.

Do not cause layout shift.

---

# 80. PAGE TRANSITIONS

Use Framer Motion already present in the project.

Existing `MotionConfig reducedMotion="user"` should remain conceptually supported. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/components/layout/Layout.tsx

Use:

```text
fade
slight translate
```

Typical:

```text
140–220ms
```

Avoid page animations that make professional workflows feel slow.

---

# 81. MOTION LANGUAGE

Use motion to explain:

```text
navigation
state change
calculation update
drawer opening
scenario changes
```

Do not use motion merely for decoration.

---

# 82. NUMBER ANIMATION

Use animation for major result transitions.

Example:

```text
₹4.84 Cr
→
₹5.32 Cr
```

Animate numeric interpolation.

Do not animate values continuously while the user types every digit; debounce appropriately.

---

# 83. CHART ANIMATION

On initial load:

```text
draw from left
```

When scenario changes:

```text
interpolate lines
```

Avoid completely redrawing charts every frame.

---

# 84. TOASTS

Toasts should use the new visual system.

Example:

```text
Plan saved
just now
```

No giant green boxes.

---

# 85. MODALS

Use large desktop dialogs sparingly.

For complex editing:

```text
side drawer
```

For confirmation:

```text
compact modal
```

For full planning:

```text
full-page route
```

---

# 86. DRAWERS

Drawers should support:

```text
edit asset
edit goal
view assumptions
view calculation
client quick edit
```

Width:

```text
420–640px
```

depending on content.

---

# 87. TOOLTIP SYSTEM

Every unfamiliar metric or advanced financial term should support tooltip/help.

Examples:

```text
Monte Carlo
Expected return
Volatility
Sharpe
Funding ratio
Depletion age
Sequence risk
```

Do not clutter the default UI with explanatory paragraphs.

---

# 88. EXPLAINABILITY PANEL

Every important metric gets:

```text
Why?
```

or:

```text
How calculated
```

This opens a right drawer.

Visual:

```text
RESULT
₹5.32 Cr

How calculated

Current corpus
₹1.20 Cr

Future contributions
₹2.10 Cr

Growth
₹2.02 Cr

Assumptions
...
```

---

# 89. TOOLTIP LANGUAGE

Use plain but financially accurate language.

Avoid:

```text
This metric has been algorithmically computed...
```

Prefer:

```text
The model estimates the corpus needed to fund
projected retirement spending through the selected horizon.
```

---

# 90. STATUS SYSTEM

Create a unified semantic status component.

Statuses:

```text
On track
Needs review
At risk
Incomplete
Stale
Saved
Saving
Error
```

Each status gets:

```text
icon
label
color
```

but never color alone.

---

# 91. BADGE DESIGN

Badges should be compact.

Examples:

```text
ON TRACK
NEEDS REVIEW
STALE
DRAFT
```

No oversized rounded candy pills.

---

# 92. TABLE DESIGN

Tables should feel like wealth-management research tables.

Use:

```text
tight header
subtle separators
tabular numeric columns
right alignment for numbers
left alignment for labels
```

Hover:

```text
very subtle surface shift
```

---

# 93. TABLE ROW ACTIONS

On hover:

```text
...
```

On keyboard focus:

```text
same accessible action state
```

Do not put five visible buttons in every row.

---

# 94. EMPTY TABLES

Example:

```text
No goals yet.

Add the first financial goal for this client.

[ Add goal ]
```

---

# 95. FORM ERRORS

Do not only show:

```text
Invalid value
```

Use:

```text
Retirement age must be later than current age.
```

or:

```text
Enter a positive annual spending amount.
```

---

# 96. ZERO VS INCOMPLETE

Important distinction:

```text
0
```

is a valid numeric value.

But:

```text
0 current age
```

means incomplete profile.

The UI must distinguish:

```text
zero
```

from:

```text
not configured
```

This is critical.

---

# 97. DEFAULT INPUT CONTRACT

Build a single source of truth:

```ts
createEmptyPlan()
```

Everything financial is zero/empty.

Example:

```ts
const createEmptyPlan = (): MasterPlanInputs => ({
  client: {
    name: '',
    age: 0,
    retirementAge: 0,
    lifeExpectancy: 0,
  },

  annualIncome: 0,
  monthlyExpenditure: 0,
  currentCorpus: 0,

  assets: [],
  goals: [],

  sip: {
    monthlyAmount: 0,
    stepUpPercent: 0,
  },

  stp: {
    lumpSum: 0,
  },

  swp: {
    monthlyAmount: 0,
    taxRate: 0,
  },
});
```

Adapt to actual repo types rather than copying this literally if field names differ.

---

# 98. ZERO-DEFAULT TEST

Add automated test:

```text
createEmptyPlan()

Expected:
all numeric user inputs = 0
all arrays = []
all user text fields = ''
```

Also test:

```text
render application
```

Expected:

```text
no NaN
no Infinity
no impossible chart axes
no false success states
```

---

# 99. ZERO-STATE TEST FOR EVERY MAJOR PAGE

Verify:

```text
Dashboard
Master Plan
Goals
Risk
Retirement
Allocation
MVO
Reports
Dossier
Meeting
Decision History
Calculators
```

when no data exists.

Every page needs a purposeful empty state.

---

# 100. DEFAULT CLIENT DATA

Do not create:

```text
Private Client
```

as a fake client if the user hasn't created one.

Use:

```text
No client selected
```

or:

```text
Create your first client
```

---

# 101. NO FAKE COMPLETION

Current sidebar logic derives workflow completion from:

```text
inputs.assets.length > 0
annualIncome > 0
risk completeness
wealthResult.sustainable
manual targets
client name
```

The new UI must not show:

```text
completed
```

or:

```text
healthy
```

from default state.

Revisit existing completion logic and align it to explicit plan status. The current Sidebar is directly coupled to `CalculatorContext` and workflow completion. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/components/layout/Sidebar.tsx

---

# 102. PLAN COMPLETION STATES

Use:

```text
Not started
In progress
Ready for review
Reviewed
Active
```

A blank plan is:

```text
Not started
```

not:

```text
0% healthy
```

---

# 103. DATA-DENSE SCREENS

Some screens genuinely need density:

```text
MVO
portfolio analytics
cashflow timeline
decision history
reports
```

Do not force everything into sparse consumer-fintech layouts.

---

# 104. EDITORIAL SCREENS

Other screens should have more breathing room:

```text
dashboard hero
client overview
retirement outlook
risk explanation
report preview
```

Use page-type-specific composition.

---

# 105. RESPONSIVE DESIGN

Breakpoints:

```text
mobile < 640
tablet 640–1024
desktop 1024–1440
wide > 1440
```

The redesign must be intentionally responsive, not merely Tailwind stacking.

---

# 106. MOBILE DASHBOARD

Mobile order:

```text
Greeting
Priority
Practice pulse
Clients
Reviews
Health
Activity
```

Do not put a huge chart before the user's urgent work.

---

# 107. MOBILE CLIENT VIEW

Header:

```text
Raj Sharma
₹6.84 Cr
```

Then:

```text
Plan health
82

Retirement
2033

Next action
```

Then tabs:

```text
Overview
Plan
Portfolio
More
```

---

# 108. MOBILE PLANNING

Use:

```text
single-column
sticky result footer
step navigation
bottom sheet
```

Example:

```text
Projected corpus
₹5.32 Cr

[ Continue ]
```

---

# 109. MOBILE SCENARIO LAB

Use:

```text
chart top
controls below
scenario switcher horizontally scrollable
```

Avoid three-column desktop tables on mobile.

---

# 110. MOBILE TABLES

Convert table rows to:

```text
summary card
expand for details
```

where appropriate.

---

# 111. ACCESSIBILITY

Target:

```text
WCAG 2.2 AA
```

Maintain:

```text
focus visibility
keyboard support
semantic buttons
labels
aria-current
role tab
role dialog
screen-reader descriptions
reduced motion
contrast
```

The existing repository already has some accessibility infrastructure, including skip navigation and focus rings. Preserve the underlying accessibility intent while redesigning the visuals. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/index.css

---

# 112. DARK MODE ACCESSIBILITY

Verify:

```text
contrast
muted text readability
chart lines
status colors
focus ring
disabled controls
selection
```

Do not simply darken the background.

---

# 113. CHART DESIGN SYSTEM

Create a single chart theme.

Variables:

```text
axis
grid
primary series
secondary series
reference line
tooltip surface
tooltip text
positive
negative
```

All chart components must consume it.

The repository already has many chart components; consolidate their styling instead of rewriting mathematical data transformations. citehttps://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/tree/main/src/components/charts

---

# 114. CHART COLORS

Use restrained identity colors.

Example:

```text
primary = moss
required/reference = brass
secondary = slate
negative = muted red
positive = moss-green
```

Avoid:

```text
blue + purple + red + green + orange
```

all at once.

---

# 115. CHART TOOLTIPS

Tooltip:

```text
2038

Age 54

Projected
₹4.72 Cr

Required
₹4.41 Cr

Surplus
₹31L
```

Use a floating surface matching theme.

---

# 116. DATA VISUALIZATION HIERARCHY

The most important series gets:

```text
strongest contrast
```

Secondary:

```text
lower saturation
```

Reference:

```text
dashed
```

Do not make every line equally prominent.

---

# 117. NET WORTH VISUAL

Use a strong horizontal composition:

```text
₹6.84 Cr
Net worth

↑ ₹48L since last review
```

Below:

```text
Assets
₹8.11Cr

Liabilities
₹1.27Cr
```

---

# 118. GOAL VISUAL

Use:

```text
progress ring
timeline
funding bar
```

not a generic card grid.

---

# 119. RISK VISUAL

Use a restrained radial/radar representation.

Do not overdecorate.

The information should remain legible.

---

# 120. ALLOCATION VISUAL

Prefer:

```text
stacked horizontal bar
```

for fast comparison.

Use donut only as supporting visual.

---

# 121. PLAN HEALTH VISUAL

Use a circular/arc score sparingly.

Better:

```text
82
Plan health

██████████████████░░
```

with dimensional breakdown beneath.

---

# 122. DATA STATES

Every financial visual supports:

```text
loading
empty
partial
complete
stale
error
```

Do not only implement:

```text
data exists
```

---

# 123. LOADING SKELETONS

Skeletons should match actual layout.

Do not use:

```text
generic grey rectangle
```

everywhere.

Example chart skeleton:

```text
axis
few shimmer bars
```

Example table skeleton:

```text
rows
realistic column widths
```

---

# 124. SKELETON ANIMATION

Very subtle.

Use opacity shimmer.

Respect reduced motion.

---

# 125. ONBOARDING

Brand-new practice:

```text
Welcome to Sound Thesis.

Let's build your workspace.
```

Steps:

```text
Practice
Team
First client
First plan
```

Progress indicator:

```text
1 / 4
```

Do not force an onboarding tour of every feature.

---

# 126. EMPTY DASHBOARD COPY

Potential:

```text
Nothing has been planned yet.

Your practice starts with one client.

[ Add your first client ]
```

Secondary:

```text
You can always load a demo workspace from settings.
```

if demo functionality exists.

---

# 127. CLIENT ZERO STATE

```text
No client selected

Choose a client from the directory
or create your first one.
```

---

# 128. PLAN ZERO STATE

```text
No active plan

Build a plan around the client's goals,
cashflows and desired retirement date.

[ Create plan ]
```

---

# 129. SCENARIO ZERO STATE

```text
No scenarios yet

Explore alternatives after setting up the base plan.

[ Create scenario ]
```

---

# 130. REPORT ZERO STATE

```text
No reports yet

Generate a planning report after the plan is ready.
```

---

# 131. TASK ZERO STATE

```text
You're clear.

No outstanding implementation tasks.
```

---

# 132. NAVIGATION PHILOSOPHY

The application should stop feeling like:

```text
calculator pages
```

and start feeling like:

```text
workspace sections
```

Suggested navigation:

```text
Overview

Clients
Plans
Reviews
Tasks

Portfolio
Scenarios
Retirement

Reports
IPS
Dossier

Practice
Team
Integrations
Settings
```

Keep old routes available while migration occurs.

---

# 133. ROUTE CONTEXT

Eventually routes should support:

```text
/clients/:clientId
/clients/:clientId/plans/:planId
```

but this task is primarily visual.

Do not break existing route behavior while redesigning.

If route migration is necessary, preserve aliases.

---

# 134. LEGACY ROUTES

Maintain compatibility:

```text
/risk
/master-plan
/goal
/retirement
/allocation
/reports
/ips
/dossier
```

until the new navigation points to the updated experience.

---

# 135. LEGACY COMPONENT STRATEGY

Do not delete large components until their replacements work.

Prefer:

```text
old page
↓
new shell
↓
new wrapper
↓
existing logic
```

then progressively extract.

---

# 136. COMPONENT ARCHITECTURE

Build reusable primitives:

```text
AppShell
Sidebar
TopBar
PageHeader
SectionHeader
Metric
MetricGroup
FinancialMetric
DataTable
EmptyState
StatusBadge
Tooltip
Drawer
Modal
Tabs
SegmentedControl
CurrencyInput
PercentInput
NumberInput
DateInput
ProgressBar
ProgressRing
CommandPalette
ThemeToggle
UserMenu
OrganizationSwitcher
ClientSwitcher
SaveIndicator
```

---

# 137. PRODUCT COMPONENTS

Then compose:

```text
ClientHeader
ClientSummary
PlanHealth
RetirementHero
GoalTimeline
RiskSummary
AllocationSummary
ScenarioComparison
RecommendationPanel
ActivityTimeline
ReviewQueue
MeetingChecklist
ReportPreview
```

---

# 138. COMPONENT API DESIGN

Components should be data-driven.

Bad:

```tsx
<ClientCard hardcodedEverything />
```

Better:

```tsx
<ClientSummary
  client={client}
  metrics={metrics}
  status={status}
/>
```

---

# 139. NO HARD-CODED CLIENT DATA

Do not hardcode:

```text
Raj Sharma
₹6.84 Cr
82%
```

into visual components.

These may exist in:

```text
demo seed
fixture
test
```

but not production component markup.

---

# 140. DEMO MODE

If demo mode is useful:

```text
Load Demo Workspace
```

Explicitly distinguish:

```text
DEMO
```

from real client data.

---

# 141. ICONOGRAPHY

Use Lucide or the existing icon system.

Create consistent sizing:

```text
14
16
18
20
24
```

Do not introduce random icon libraries unless necessary.

---

# 142. ICON STYLE

Use:

```text
1.5–1.8 stroke
```

Avoid mixed:

```text
solid icon
outlined icon
emoji
```

in the same surface.

---

# 143. AVATARS

Use initials by default.

Example:

```text
RS
```

No fake profile photos.

---

# 144. AVATAR COLOR

Generate deterministic subtle tones from user/client ID.

Do not hardcode five colors manually.

---

# 145. BUTTON HIERARCHY

Primary:

```text
moss filled
```

Secondary:

```text
quiet surface / border
```

Tertiary:

```text
text button
```

Danger:

```text
muted red
```

Avoid multiple competing primary buttons.

---

# 146. BUTTON COPY

Prefer:

```text
Create client
Create plan
Save scenario
Generate report
Review
Continue
```

Avoid:

```text
Submit
Click here
Process
Execute
```

---

# 147. FORM COPY

Use section headers:

```text
Your client's current position
```

instead of:

```text
Inputs
```

Use:

```text
How much do they spend each year?
```

instead of:

```text
Annual expenditure
```

for user-facing explanatory forms.

But retain concise labels for dense professional screens.

---

# 148. INPUT HELP

Use:

```text
small muted helper text
```

Example:

```text
Expected inflation
6.0%

Used to estimate future spending.
```

---

# 149. FOCUS STATES

Theme-aware:

```text
2px moss focus ring
```

with accessible contrast.

Never remove focus outlines without replacement.

---

# 150. DISABLED STATES

Do not grey everything to the point of illegibility.

Use:

```text
lower contrast
reduced interaction
```

but retain readable text.

---

# 151. ERROR COLOR USAGE

Reserve red for:

```text
real problems
```

not:

```text
required field marker
```

or:

```text
ordinary warnings
```

---

# 152. WARNING USAGE

Amber:

```text
stale scenario
```

or:

```text
plan needs review
```

not every informational message.

---

# 153. LOADING COPY

Use concise:

```text
Calculating...
Generating...
Saving...
Syncing...
```

Not:

```text
Please wait while our systems...
```

---

# 154. SUCCESS COPY

Use:

```text
Saved
Report ready
Scenario created
```

---

# 155. ERROR COPY

Use:

```text
We couldn't save that change.
```

plus:

```text
Retry
```

Do not expose stack traces.

---

# 156. HEADER INFORMATION HIERARCHY

Every page should have:

```text
eyebrow / breadcrumb
title
supporting context
primary action
secondary action
```

Example:

```text
RETIREMENT

Raj Sharma

Retirement outlook

[ Run scenario ]
```

---

# 157. PAGE TITLE SYSTEM

Create shared:

```tsx
<PageHeader />
```

with variants:

```text
standard
hero
compact
workspace
```

---

# 158. SECTION HEADER SYSTEM

```text
<SectionHeader
  title="Planning health"
  description="..."
  action={...}
/>
```

Keep visual rhythm consistent.

---

# 159. COMMAND PALETTE DESIGN

New identity:

```text
⌘ K

Search clients, plans and actions

Recent
Raj Sharma
Retirement Plan

Actions
Create client
Create plan
Generate report
```

Use keyboard-first interaction.

---

# 160. SEARCH RESULT PREVIEWS

For client result:

```text
Raj Sharma
₹6.84 Cr · 82 health · 2033 retirement
```

This makes search useful for practitioners.

---

# 161. THEME PERSISTENCE

Use:

```text
theme preference = light | dark | system
```

Initialize:

```text
saved user preference
else system preference
```

Avoid a flash of incorrect theme during app startup.

---

# 162. FOUC PREVENTION

Before React renders, add a minimal theme bootstrap if necessary.

Goal:

```text
correct theme on first paint
```

No white flash in dark mode.

---

# 163. CHART THEME SWITCHING

Charts must consume semantic theme tokens.

Do not write:

```text
stroke="#15803d"
```

in twenty chart files.

Use:

```text
getChartTheme()
```

or CSS variables where supported.

---

# 164. SVG THEME COLORS

If SVG is used:

```text
currentColor
CSS variables
```

where practical.

---

# 165. DARK REPORT PREVIEW

If reports are printable documents, keep report content itself primarily light/print-oriented.

Do not force dark backgrounds into PDF outputs merely because the app is in dark mode.

---

# 166. REPORT PREVIEW APP CHROME

App can be dark.

Report page can remain paper-style.

This distinction is intentional.

---

# 167. NEW LOGIN

Rebuild login as a brand statement.

Desktop:

```text
┌────────────────────────────┬─────────────────────────────┐
│                            │                             │
│ SOUND THESIS               │ Welcome back               │
│                            │                             │
│ A clearer view             │ Work email                 │
│ of wealth.                 │ [________________]          │
│                            │                             │
│ Plan. Model.               │ Password                   │
│ Decide.                    │ [________________]          │
│                            │                             │
│ subtle market/grid motif   │ [ Sign in ]                │
│                            │                             │
│                            │ Forgot password             │
│                            │                             │
└────────────────────────────┴─────────────────────────────┘
```

---

# 168. LOGIN DARK MODE

Dark mode login can have:

```text
deep black-green canvas
subtle grid
small brass line
soft spotlight
```

No giant neon glow.

---

# 169. AUTH PAGES

Also redesign:

```text
forgot password
reset password
invitation
onboarding
```

to match the same identity.

---

# 170. SETTINGS

Settings should feel like a modern control room.

Sections:

```text
Profile
Practice
Brand
Preferences
Security
Integrations
```

Theme setting belongs here too, even though quick toggle exists.

---

# 171. PRACTICE BRAND SETTINGS

Later if multi-tenant branding exists, use:

```text
Logo
Accent
Report style
Footer
```

But the platform's default identity remains controlled by the core design system.

---

# 172. DESIGN TOKENS

Create:

```text
colors
spacing
radius
typography
shadows
motion
z-index
breakpoints
```

as a formal token layer.

Example:

```text
--radius-sm
--radius-md
--radius-lg

--space-1
...
--space-12

--ease-standard
--ease-emphasis
--duration-fast
--duration-normal
```

---

# 173. CSS ARCHITECTURE

Do not create a giant `index.css` full of page-specific hacks.

Prefer:

```text
global tokens
global base styles
component styles
utility classes
```

Page-specific styling stays close to the component.

---

# 174. REMOVE VISUAL DEBT

As part of the redesign, look for:

```text
duplicate utility classes
inconsistent border radii
one-off colors
one-off shadows
hard-coded widths
magic margins
```

Replace with system tokens.

---

# 175. REMOVE LEGACY VISUAL TOKENS

Where old aliases exist:

```text
cream
paper
warm
navy
gold
emerald
```

do not keep proliferating them.

Migrate components to the new semantic vocabulary.

---

# 176. DESIGN SYSTEM DOCUMENTATION

Create:

```text
docs/UI_SYSTEM.md
```

including:

```text
brand principles
color
typography
spacing
buttons
inputs
cards
tables
charts
states
dark mode
responsive behavior
motion
accessibility
```

---

# 177. STORY / COMPONENT PREVIEW

If practical, build a simple internal route or preview page:

```text
/style-guide
```

or:

```text
/design-system
```

showing:

```text
buttons
inputs
badges
cards
tables
charts
theme
```

Do not expose this in normal practitioner navigation unless explicitly needed.

---

# 178. VISUAL QA PAGE

Create a hidden/internal:

```text
/ui-review
```

containing:

```text
all components
both themes
light/dark
mobile/desktop
states
```

This helps the swarm compare consistency.

---

# 179. PAGE-BY-PAGE REDESIGN ORDER

Implement:

1. App shell
2. Login
3. Dashboard
4. Clients
5. Client overview
6. Master Plan
7. Retirement
8. Goals
9. Risk
10. Scenario Lab
11. Allocation
12. MVO
13. Advanced Portfolio
14. Meetings
15. Decision History
16. Reports
17. IPS
18. Dossier
19. Practitioner / Team
20. Settings
21. Calculators
22. Integrations
23. Mobile QA

---

# 180. DO NOT DESIGN SCREEN-BY-SCREEN IN ISOLATION

Before implementing all pages, establish:

```text
global shell
design tokens
component primitives
typography
buttons
inputs
tables
charts
status system
theme
```

Then rebuild the pages.

---

# 181. AGENT SWARM — UI/UX SPECIFIC

Use specialized subagents.

## Agent 0 — Design Director / Orchestrator

Own:

```text
new identity
design principles
agent coordination
visual consistency
final acceptance
```

---

# 182. Agent 1 — Repository Visual Archaeologist

Inspect:

```text
all components
pages
CSS
layout
charts
images
icons
style utilities
```

Produce:

```text
docs/UI_AUDIT.md
```

For each major screen record:

```text
current composition
current components
reuse opportunities
visual debt
interaction problems
redesign recommendation
```

---

# 183. Agent 2 — Brand Identity Designer

Own:

```text
logo
wordmark
color
typography
visual motifs
theme direction
brand tokens
```

Deliver:

```text
docs/BRAND_SYSTEM.md
```

and corresponding SVG/CSS implementation.

---

# 184. Agent 3 — Design System Engineer

Own:

```text
tokens
primitives
buttons
inputs
tabs
badges
cards
tables
modals
drawers
tooltips
```

No page-specific business logic.

---

# 185. Agent 4 — Theme Engineer

Own:

```text
light
dark
system
theme persistence
FOUC prevention
chart theme
focus states
```

Test:

```text
every page
every component
both themes
```

---

# 186. Agent 5 — App Shell Engineer

Own:

```text
Sidebar
TopBar
PageHeader
breadcrumbs
organization switcher
client switcher
command palette
user menu
notifications
mobile navigation
```

---

# 187. Agent 6 — Dashboard UX Engineer

Own:

```text
Dashboard
empty state
practice pulse
priority queue
reviews
activity
```

---

# 188. Agent 7 — Client Workspace Engineer

Own:

```text
Clients
Client Overview
Profile
Financials
client header
client search
```

---

# 189. Agent 8 — Planning Experience Engineer

Own:

```text
Master Plan
Goals
Risk
Retirement
planning wizard
inputs
zero state
result rail
```

---

# 190. Agent 9 — Scenario / Analytics Engineer

Own:

```text
Scenario Lab
What-If
MVO
Stress
Allocation
charts
```

---

# 191. Agent 10 — Delivery Experience Engineer

Own:

```text
Reports
IPS
Dossier
Meeting mode
Decision history
```

---

# 192. Agent 11 — Responsive / Mobile Engineer

Own:

```text
mobile layouts
tablet
responsive tables
bottom navigation
drawers
touch interactions
```

---

# 193. Agent 12 — Accessibility Engineer

Own:

```text
keyboard
ARIA
focus
reduced motion
contrast
screen reader
```

---

# 194. Agent 13 — Zero-State / Data State Engineer

Own:

```text
zero defaults
empty state
loading state
partial state
error state
stale state
reset state
```

---

# 195. Agent 14 — Visual QA Engineer

Own:

```text
screenshots
visual regression
layout checks
theme comparison
responsive checks
```

---

# 196. Agent 15 — Final Product Reviewer

Act as:

```text
senior wealth practitioner
plus
principal product designer
```

Ask:

```text
Does this feel expensive?
Is it fast to understand?
Can I see what matters?
Are numbers trustworthy?
Does dark mode look designed?
Does zero-state look intentional?
Can I work with 100 clients without feeling lost?
```

---

# 197. AGENT DEPENDENCIES

```text
Agent 0
   ↓
Agent 1
   ↓
┌──────────────┬──────────────┐
│ Brand        │ Zero State   │
│ Agent 2      │ Agent 13     │
└──────┬───────┴──────┬───────┘
       ▼              ▼
Design System     Theme
Agent 3           Agent 4
       │              │
       └──────┬───────┘
              ▼
         App Shell
          Agent 5
              │
      ┌───────┼──────────────┐
      ▼       ▼              ▼
 Dashboard  Client        Planning
   Agent 6   Agent 7       Agent 8
                              │
                              ▼
                         Analytics
                          Agent 9
                              │
                              ▼
                          Delivery
                          Agent 10
                              │
                         ┌────┴────┐
                         ▼         ▼
                     Mobile      A11y
                     Agent 11   Agent 12
                         │         │
                         └────┬────┘
                              ▼
                          Visual QA
                          Agent 14
                              │
                              ▼
                       Final Reviewer
                          Agent 15
```

---

# 198. GIT WORKFLOW — MANDATORY

The harness must work directly with:

```text
https://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/
```

The first step is:

```bash
git remote -v
git status
git branch --show-current
git log -5 --oneline
```

If the repository is not connected to the expected remote:

```bash
git remote remove origin
git remote add origin https://github.com/Skibidigyat69420/retirement-calculator-with-asset-allocation.git
```

If authentication is required, use the harness's configured Git credentials/token mechanism.

Do not paste credentials into source files.

---

# 199. GIT BRANCHING

Create:

```text
ui-rebuild
```

from the current `main` unless the harness environment explicitly requires another branch strategy.

Subagents may use worktrees:

```text
worktrees/agent-brand
worktrees/agent-design-system
...
```

The orchestrator owns final integration.

---

# 200. COMMIT STRATEGY

Use meaningful commits.

Examples:

```text
feat(ui): establish new visual identity
feat(ui): rebuild application shell
feat(ui): add persistent theme system
feat(ui): redesign dashboard
feat(ui): redesign client workspace
feat(ui): redesign planning studio
feat(ui): rebuild scenario lab
feat(ui): redesign portfolio analytics
feat(ui): redesign reporting surfaces
fix(ui): normalize zero-state behavior
test(ui): add visual regression coverage
```

Do not make one 5,000-file opaque commit.

---

# 201. GIT SAFETY

Before modifying:

```bash
git status
```

Do not overwrite uncommitted user work.

If the working tree contains changes:

```text
inspect them
```

and preserve them.

Do not:

```bash
git reset --hard
git clean -fd
```

unless explicitly authorized.

---

# 202. REPO CONNECTIVITY

The final harness must verify:

```bash
git remote -v
git status
git log -1 --oneline
```

Then:

```text
build
test
commit
push
```

If push permissions do not exist, do not fake completion.

Report:

```text
commit created locally
push blocked by repository authentication
```

But still leave the local branch clean and committed.

---

# 203. BUILD CHECK

Every major milestone:

```bash
npm run build
npm run lint
```

or the actual scripts discovered in `package.json`.

The current package already uses Vite and frontend tooling; do not assume scripts without inspecting `package.json`. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/package.json

---

# 204. TYPECHECK

Run:

```bash
npx tsc --noEmit
```

or the repository's equivalent.

No new TypeScript errors.

---

# 205. DEV SERVER QA

Start the app.

Verify:

```text
login
dashboard
all routes
navigation
theme toggle
zero state
mobile
```

No console errors.

---

# 206. VISUAL REGRESSION

Use Playwright or the repo's existing test tooling where possible.

Capture:

```text
login light
login dark
dashboard light
dashboard dark
client light
client dark
plan light
plan dark
scenario light
scenario dark
reports light
reports dark
mobile
```

---

# 207. ZERO-DEFAULT QA

Fresh browser profile.

Expected:

```text
no demo client
no fake numbers
all financial fields zero
all arrays empty
```

The app should look intentionally empty, not broken.

---

# 208. DARK MODE QA

Fresh browser.

System light:

```text
light by default
```

User selects dark:

```text
dark
```

Refresh:

```text
dark persists
```

Select system:

```text
follows OS
```

---

# 209. DARK MODE CONTRAST QA

Test:

```text
text
buttons
tabs
badges
tooltips
chart lines
table separators
input borders
disabled controls
```

---

# 210. ZERO-STATE MATHEMATICS

For every calculation page:

```text
no NaN
no Infinity
no divide by zero
no fake probability
no fake funding ratio
```

Where a result cannot yet be computed:

```text
—
```

or:

```text
Not configured
```

---

# 211. FINANCIAL DASHBOARD EMPTY STATE

Do not create fake "healthy" labels.

Example:

```text
Plan health
Not available

Build a client plan to calculate readiness.
```

---

# 212. DEFAULT ASSUMPTIONS

Important:

Do not use hidden non-zero financial values merely to make the charts pretty.

The initial blank state can display:

```text
No projection yet
```

rather than creating fake data.

When the user explicitly asks to use an assumption set:

```text
apply assumption set
```

then populate assumptions.

---

# 213. DEMO DATA

If visual review needs sample data, use:

```text
demo fixtures
```

loaded explicitly.

Never silently include the demo data in the default runtime.

---

# 214. PREVIEWING THE DESIGN

Before rebuilding all pages, the orchestrator should establish:

```text
login
app shell
dashboard
client profile
planning page
scenario page
```

as the core visual reference set.

Once those are approved internally, propagate the identity to the rest of the application.

---

# 215. DESIGN REFERENCE SCREENS

The following screens define the new identity:

```text
01 Login
02 Dashboard
03 Client Overview
04 Planning Studio
05 Scenario Lab
06 Retirement
07 Portfolio
08 Report Preview
```

Other screens inherit the same design system.

---

# 216. VISUAL TEST CRITERIA

Each reference screen should be judged on:

```text
Hierarchy
Spacing
Typography
Density
Contrast
Brand consistency
Data legibility
Action clarity
Responsiveness
Dark mode
```

---

# 217. UI PERFORMANCE

Do not add huge animation libraries.

Framer Motion is already part of the application.

Use it strategically.

Charts are already present.

Do not introduce heavy 3D rendering.

Do not use giant image backgrounds that hurt performance.

---

# 218. CODE QUALITY

Do not create:

```text
1,500-line Dashboard.tsx
1,000-line Sidebar.tsx
```

Break large screens into domain components.

But do not fragment tiny pieces excessively.

---

# 219. COMPONENT SIZE

As a practical heuristic:

```text
visual primitive < 150 lines
feature component < 300 lines
page ideally < 500 lines
```

These are guidelines, not hard laws.

---

# 220. BUSINESS LOGIC BOUNDARY

Do not move financial formulas into visual components during redesign.

A page should consume:

```text
result
```

not compute:

```text
five different formulas inline
```

---

# 221. EXISTING ENGINE PRESERVATION

The redesign should not modify financial logic merely because the visual structure changes.

If the UI exposes a previously hidden bug, create a targeted fix through the quantitative workflow.

---

# 222. FORM STATE PRESERVATION

Do not break:

```text
CalculatorContext
riskAnswers
manualTargets
saved plans
decision history
meeting state
```

without a migration strategy.

The current `CalculatorContext` is still the application's main shared state boundary. citehttps://raw.githubusercontent.com/Skibidigyat69420/retirement-calculator-with-asset-allocation/main/src/context/CalculatorContext.tsx

---

# 223. DESIGN REBUILD WITHOUT STATE REWRITE

The safest sequence:

```text
1. New tokens
2. New primitives
3. New shell
4. New page wrappers
5. New visual composition
6. Keep existing calculation hooks
7. Keep existing state
8. Gradually extract
```

---

# 224. SCREEN-SPECIFIC PERFORMANCE

Dashboard:

```text
load summary first
```

Charts:

```text
lazy render
```

Advanced analytics:

```text
load on demand
```

---

# 225. ACCESSIBLE RESPONSIVE TABLE

Example:

Desktop:

```text
Client | Wealth | Plan | Retirement | Health | Practitioner
```

Mobile:

```text
Raj Sharma
₹6.84Cr

Retirement
2033

Plan health
82

Ketan
```

---

# 226. KEYBOARD NAVIGATION

Support:

```text
Tab
Shift+Tab
Enter
Space
Esc
Arrow keys
```

For:

```text
tabs
dropdowns
sliders
dialogs
command palette
```

---

# 227. SHORTCUTS

Implement:

```text
⌘ K
```

for command palette.

Optional:

```text
N
```

for new client.

```text
P
```

for new plan.

But do not trigger shortcuts when focused inside an input.

---

# 228. REDUCED MOTION

Respect:

```text
prefers-reduced-motion
```

Do not make charts/displays inaccessible.

---

# 229. PRINT

Keep report/IPS/Dossier print-friendly.

App chrome should disappear when printing.

---

# 230. NEW UI/UX SUCCESS CRITERIA

The finished app should visually feel like a completely different product.

Someone who saw the old app should immediately notice:

```text
new brand
new typography
new palette
new layout
new navigation
new component style
new chart language
new interaction model
```

while still recognizing the underlying financial functionality.

---

# 231. FINAL PRODUCT FEEL

A wealth practitioner should open the app and feel:

> "This is a serious professional planning workspace."

They should not feel:

> "This is a collection of calculators."

---

# 232. FINAL ZERO-STATE FEEL

A new user with zero data should feel:

> "I'm at the beginning of a professional workspace."

They should not feel:

> "Something is broken because everything says 0."

---

# 233. FINAL DARK MODE FEEL

Dark mode should feel:

```text
premium
quiet
focused
analytical
```

not:

```text
gaming
crypto
neon
```

---

# 234. FINAL LIGHT MODE FEEL

Light mode should feel:

```text
warm
editorial
clean
precise
```

not:

```text
sterile white dashboard
```

---

# 235. FINAL IDENTITY WORDS

The new design should consistently communicate:

```text
Clarity
Confidence
Continuity
Context
Precision
```

---

# 236. FINAL AGENT REVIEW CHECKLIST

Before declaring success:

## Identity

```text
□ New logo
□ New wordmark
□ New typography
□ New palette
□ New visual motifs
□ New component language
```

## Theme

```text
□ Light
□ Dark
□ System
□ Persistence
□ No flash
□ Charts adapt
□ Forms adapt
□ Focus adapts
```

## UX

```text
□ New shell
□ New dashboard
□ New client workspace
□ New planning studio
□ New scenario lab
□ New portfolio
□ New reporting
□ New meeting mode
□ New settings
```

## Zero-state

```text
□ Every numeric default = 0
□ Arrays empty
□ No demo client
□ No fake metrics
□ No NaN
□ No Infinity
□ No fake health
□ No fake success
□ Reset returns to zero
```

## Responsive

```text
□ 360px
□ 768px
□ 1440px
```

## Accessibility

```text
□ keyboard
□ focus
□ labels
□ contrast
□ reduced motion
□ screen-reader semantics
```

## Quality

```text
□ build
□ lint
□ typecheck
□ tests
□ visual QA
□ console clean
```

---

# 237. FINAL GIT CHECKLIST

Before completion:

```bash
git status
git diff --stat
git diff
npm run build
npm run lint
```

Run the relevant test suite.

Then:

```bash
git add .
git commit -m "feat(ui): rebuild Sound Thesis visual identity"
```

If the repository is authenticated:

```bash
git push origin ui-rebuild
```

or the branch prescribed by the development workflow.

If the intention is to integrate directly into `main` and permissions permit:

```bash
git push origin main
```

Do not push blindly if the branch protection policy requires a PR.

---

# 238. GIT FINAL STATE

The final output of the harness must state:

```text
Remote:
<repository>

Branch:
<branch>

Commit:
<sha>

Build:
PASS / FAIL

Lint:
PASS / FAIL

Typecheck:
PASS / FAIL

Tests:
PASS / FAIL

Visual QA:
PASS / FAIL

Theme:
PASS / FAIL

Zero-state:
PASS / FAIL
```

Never claim that code was pushed unless `git push` actually succeeded.

---

# 239. FINAL INSTRUCTION TO THE HARNESS

**Build the redesign.**

Do not return a list of suggestions.

Do not return wireframes without implementing them.

Do not merely restyle three pages.

Do not stop at a design system.

Do not leave half the old UI behind while calling the product redesigned.

Read the repository.

Understand the current architecture.

Create the new visual identity.

Build the new shell.

Rebuild the major workflows.

Propagate the identity across every page.

Keep light/dark/system themes.

Make the zero-data state completely intentional.

Set all user-entered financial defaults to zero/empty.

Prevent invalid calculations from appearing as real results.

Preserve the existing financial engine.

Preserve functionality.

Use the agent swarm.

Run visual QA.

Run mobile QA.

Run accessibility QA.

Run build/typecheck/lint/tests.

Commit the actual work.

Push to the Git repository when credentials and repository policy permit.

Leave the application in a state where opening the site immediately makes it obvious that **Sound Thesis has a new identity**.

---

# 240. NORTH STAR

The finished product should feel like:

```text
                    SOUND THESIS

              A CLEARER VIEW OF WEALTH.

       ┌────────────────────────────────────────┐
       │                                        │
       │  Clients        Plans        Scenarios  │
       │                                        │
       │  ───────────────────────────────────   │
       │                                        │
       │  Understand the client                 │
       │  Model the future                      │
       │  Make the decision                     │
       │  Remember why                           │
       │                                        │
       └────────────────────────────────────────┘
```

The UI is the interface to the planning engine.

The identity should make the application feel trustworthy before the user has even entered the first number.

**Build it accordingly.**
