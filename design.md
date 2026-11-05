# SoundThesis — Quiet Conviction

## The design system for an adviser’s planning room

> SoundThesis turns a household’s financial complexity into an explainable
> recommendation. It should feel as composed as a private-investment committee
> paper: clear before it is clever, calm before it is colourful, and useful
> before it is impressive.

This is the product-design source of truth. It governs information
architecture, visual language, interaction patterns, responsive behaviour and
the client-facing Dossier. It intentionally does not contain backend,
deployment, authentication, or data-model documentation.

---

## 1. Product point of view

### The feeling: quiet conviction

SoundThesis is neither a consumer investing app nor a generic SaaS dashboard.
It is an advice studio: a place for someone to understand the household, make
a judgement, preserve the rationale, and guide a client through it.

The visual reference is a well-made research book on a large oak table:
off-white paper, deeply legible type, measured rules, excellent numerical
alignment, and one restrained mark of colour to establish direction.

| Dimension | Target | Meaning |
| --- | --- | --- |
| Density | 6 / 10 | Dense when comparing decisions; airy when absorbing a conclusion or completing a form. |
| Asymmetry | 5 / 10 | One stronger decision column balanced by a quieter evidence column. Never chaotic. |
| Motion | 3 / 10 | State changes are legible; decoration never competes with thought. |
| Ornament | 1 / 10 | Craft comes from typography, rhythm and data—not effects. |

The product should make an adviser feel: “I have the whole picture, I know
what deserves attention, and I can explain this recommendation plainly.”

### The non-negotiable design promise

Within ten seconds of landing anywhere in the client workspace, an adviser can
answer:

1. Which household and plan am I in?
2. What is the important planning conclusion right now?
3. What action should I take next, if any?
4. What evidence or assumption supports that conclusion?

Every primary page therefore has four visible layers:

| Layer | The question it answers | Required expression |
| --- | --- | --- |
| Context | Whose work is this? | Household identity, plan state, as-of or review date. |
| Conclusion | What does the adviser need to understand? | A one-sentence plan, policy or review position. |
| Evidence | Why should they believe it? | A small metric group, a decisive chart or table, assumptions where material. |
| Commitment | What should happen next? | One clear action, owner or review state. |

A screen without a conclusion is a database view. A screen without evidence is
a marketing page. A screen with more than one primary commitment is a backlog
being presented as an interface.

---

## 2. The operating model

### One client journey, five chapters

The client is the organising principle—not a calculator, report type, or
feature area. Every route belongs to one visible, memorable arc:

~~~text
HOUSEHOLD  →  PLAN  →  POLICY  →  DOSSIER  →  REVIEW
know           test      decide      explain      continue
~~~

| Chapter | Adviser’s job | Essential output | Do not make it |
| --- | --- | --- | --- |
| Household | Establish the relationship and known facts. | A selected household with a current planning context. | A wall of CRM cards. |
| Plan | Test funding, priorities, risk and trade-offs. | A clear plan position and named gaps. | A wizard users must complete blindly. |
| Policy | Convert evidence into a suitable posture. | A rationale-backed policy proposal. | An allocation chart before an objective. |
| Dossier | Prepare a client conversation and formal output. | A meeting-ready narrative and document. | A prettified app screen. |
| Review | Surface what changed and record a response. | A ranked queue and a next review. | A vanity KPI dashboard. |

### The attention budget

The application must be powerful without becoming loud. Each work surface has a
strict attention budget:

| Element | Maximum above the first scroll | Why |
| --- | --- | --- |
| Primary conclusion | 1 | A client situation has one most useful current reading. |
| Primary action | 1 | Prevents competing calls to action. |
| Key metrics | 4 | Enough evidence to orient; more belongs in the record. |
| High-attention notices | 2 | More than two signals a missing prioritisation step. |
| Charts | 1 | A page needs a visual argument, not a data gallery. |
| New concepts | 1 | Introduce only one unfamiliar method at a time. |

If more must be shown, rank it, group it, or make it inspectable. Never solve
complexity by shrinking type, adding badges, or turning every element into a
card.

### The context strip: one thread through every chapter

Client-scoped screens share one compact context strip immediately above the
page header:

~~~text
[PM] Priya & Rohan Mehta   •   Planning review due 18 Nov 2026   •   Draft plan
     [Switch household]                                      Saved 2 min ago
~~~

- The client name opens the household snapshot; it is not decorative text.
- Review state is plain-language and semantic: Draft, Ready for review,
  Discussed, Issued, Due for review.
- Saved is a quiet system state, never a primary action.
- Do not repeat net worth, risk score, or a row of coloured status pills here.
  Put those beside the decision they substantiate.
- Switching household preserves the current chapter/substep whenever valid.
  Switching Plan → Goals for one household opens Plan → Goals for the next,
  rather than teleporting to a dashboard.

### Navigation: layered access without losing depth

The permanent desktop rail contains only the five chapters and one expert area:

~~~text
SOUNDTHESIS

  Households
  Plan
  Policy
  Dossier
  Review

  ─────────────────────
  Tools & practice
~~~

This is a compression of the navigation, not a reduction of the product. Every
existing workflow remains reachable in one of four predictable ways:

| Access layer | Contains | Design rule |
| --- | --- | --- |
| Chapter rail | The five everyday adviser chapters. | Makes the current client journey obvious. |
| Chapter menu | All sibling workflows inside the current chapter. | Appears below the context strip or from the page title; preserves depth without rail clutter. |
| Contextual handoff | The next specialist tool from a real finding. | Launches with the household, relevant goal/policy and assumptions already in context. |
| Command palette | Every route and high-value action. | Gives experts direct access without asking everyone else to learn the whole map. |

- Exactly one rail item is active. A nested page highlights its chapter, not a
  duplicate utility route.
- A chapter menu is a structured local index, never a tiny hidden overflow
  containing essential work. It shows the current destination and its closest
  siblings.
- A contextual handoff has a return path. Opening a scenario, rebalancing plan
  or calculator should never strand the adviser in a detached tool.
- Tools & practice is closed by default in the rail but remains a full
  workspace, not a graveyard. It contains specialist planning tools, team
  management and internal quality tools.
- The command palette searches all routes and high-value actions; it is the
  expert shortcut, not an excuse for confusing navigation.

Mobile navigation is Households, Plan, Policy, Dossier and More. More contains
Review plus the complete Tools & practice index. Each target is at least 44px
tall. Do not place a floating action button over persistent navigation.

### Complete workflow map: nothing disappears

The design must preserve every current user capability. The table below is the
authoritative IA map for redesign work. A route may be renamed, placed inside a
chapter, or launched contextually, but it must not be silently omitted.

| Chapter / surface | Current workflows to retain | Primary entry | Best handoff |
| --- | --- | --- | --- |
| **Households** | Client CRM, household creation, sample household, client selection, relationship records and client directory views. | Households list. | Open client plan; create household; switch active household. |
| **Plan** | Master Plan; client profile; balance sheet; assets, liabilities and cash flows; goals; goal probability lab; goal conflict matrix/resolver; risk questionnaire/report; retirement and SWP; reverse planning; planning assumptions; plan health; Monte Carlo and failure analysis. | Plan overview. | Policy when the plan is ready; scenario or reverse planning when a funding decision needs testing. |
| **Policy** | Strategic allocation studio; allocation current-versus-target; target policy editor; allocation models; IPS desk; full IPS editor; policy centre; composition compare; drift monitor; rebalance tickets; implementation transition plan; stress testing; scenario lab; plan versus reality. | Policy overview / IPS desk. | Issue IPS; create implementation/rebalance plan; prepare dossier; return to a relevant Plan decision. |
| **Dossier** | Client dossier; reports and report history; printable/exportable plan report; accessible Markdown summary; client meeting workflow; meeting agenda and meeting log. | Dossier overview. | Record decision; schedule/review next action; return to policy or plan item. |
| **Review** | Practice overview; plan health monitoring; priority queue; recommendations; what changed; workflow suite; decision audit history. | Review queue. | Open affected household, policy or decision record. |
| **Tools & practice** | SIP, SWP, STP, EMI, lumpsum, goal, retirement corpus and portfolio-return calculators; practice team; practitioner/API client workspace; style guide; UI review. | Tools & practice index. | Apply result back to a selected plan, or return to originating workflow. |
| **Entry and setup** | Onboarding, sign-in/recovery, invitation and practice setup. | Before workspace. | Open the correct workspace chapter after completion. |

#### Chapter menus

Every chapter menu uses grouped, human names with one-line descriptions. It
contains all of the following; this is the anti-omission contract:

| Chapter | Chapter menu contents |
| --- | --- |
| Households | All households; Add household; Samples; relationship details. |
| Plan | Overview; Profile & household; Balance sheet; Cash flow; Goals; Goal conflicts; Risk; Retirement & SWP; Reverse planning; Assumptions; Plan results. |
| Policy | Policy overview; Strategic allocation; Current allocation; Policy editor; IPS desk; IPS editor; Stress & scenarios; Drift & rebalance; Implementation; Plan versus reality. |
| Dossier | Dossier; Reports & history; Meeting prep; Meeting record; Accessible summary. |
| Review | Attention queue; Practice overview; Recommendations; What changed; Decision history. |
| Tools & practice | Calculators; Team; API client workspace; Style guide; UI review. |

### Workflow handoff contract

Each transition keeps the adviser’s thought intact. A handoff must carry active
household, active plan/version, relevant goal or policy, source screen, and
return destination whenever those values exist.

| From | To | Handoff question | Required carried context |
| --- | --- | --- | --- |
| Goal funding | Reverse planning | What contribution, timing or corpus makes this goal feasible? | Goal, horizon, confidence threshold, current cash flow. |
| Plan position | Scenario / stress | Which assumption is actually driving this result? | Plan version, selected scenario, key assumptions. |
| Risk result | Policy | What policy is suitable for this capacity and preference? | Risk score/profile, liquidity need, goal horizon. |
| Current allocation | Policy / rebalance | What should change, why, and within which guardrails? | Current holdings/allocation, target policy, thresholds. |
| Policy proposal | IPS | Can this recommendation be expressed, reviewed and issued? | Rationale, method, targets, constraints, review cadence. |
| Policy or plan | Dossier / meeting | How do we explain the recommendation to this client? | Current conclusion, supporting figures, adviser rationale, open decisions. |
| Meeting | Decision history / review | What was agreed and when should it be revisited? | Decision, owner, date, follow-up and affected records. |
| Calculator | Plan | Does this exploratory result change the advised plan? | Calculator inputs/result, selected client/goal if one exists. |

No workflow may require re-entering facts that already exist in the active plan.
If a tool supports independent use, label it clearly as an independent
exploration and offer Apply to plan only as an explicit, reviewable action.

---

## 3. Page anatomy

### The standard work page

Every core workspace begins with the same hierarchy:

~~~text
CONTEXT STRIP

CHAPTER / OPTIONAL SUBSTEP                             [Quiet action] [Primary action]
Page title
One sentence that states the current conclusion or the job of this page.

FOCUS PANEL
The principal decision, position or editable work.

EVIDENCE
Metrics + one visual argument or comparison.

RECORD
Details, assumptions, source material, history and secondary utilities.
~~~

The first 700–800px of a page must make sense without a sidebar, tooltip,
modal, hover state, or a second scrollable region.

### The asymmetric evidence split

For decision pages, use the same 7:5 grid rather than a generic 50:50 card
pair:

~~~text
┌──────────────────────────────────────┬────────────────────────────┐
│                                      │                            │
│  DECISION / PRIMARY WORK             │  EVIDENCE / NEXT STEP      │
│  conclusion, editor, chart           │  measures, quality, action │
│                                      │                            │
└──────────────────────────────────────┴────────────────────────────┘
~~~

- At 1200px and above: 7 columns + 5 columns with a 24px gap.
- At 768–1199px: use two columns only when both can remain 320px wide;
  otherwise stack decision before evidence.
- Below 768px: always a single column. Decision precedes evidence; primary
  action remains visible in the header.
- The right column may be sticky only if it contains one short
  summary/next-action object. Never make a form, chart gallery, or nested
  scroll area sticky.

### The decision panel

The decision panel is the product’s signature composition. It is not a card
with a title and four widgets; it contains a position, implication and move.

~~~text
PLAN POSITION                                      Confidence threshold: 75%
Education funding is below the selected confidence level.
The current plan needs ₹18,000 more each month, a later start date, or a
change in priority.                                           [Review goal]

72% funding confidence     ₹18,000 / month gap     9 years to goal
~~~

Use this pattern for plan health, policy readiness, review queue items, and
meeting decisions. The conclusion must come from real data where possible; if
data is incomplete, say exactly what is missing and what unlocks it.

### The record zone

Details are vital in fiduciary work, but they follow the decision:

- Assumptions & methodology: inputs, confidence level, methods, data date.
- Line items: assets, liabilities, cash flow, goals, allocation sleeves.
- Decision history: what changed, who recorded it, and when.
- Advanced analysis: scenario labs, sensitivity models and diagnostics.

Use anchored local navigation for long, document-like pages. Do not hide
required content in accordions. Collapsible sections are for optional detail
only and show a meaningful summary while closed.

---

## 4. Chapter recipes

### 4.1 Households — find the relationship that needs you

**Job:** make the client list calm, scannable and actionable.

~~~text
Households                                    [Search] [Filter] [Add household]
14 active · 3 need attention

┌ Needs attention ────────────────────────────┐  ┌ All households ──────────────┐
│ Mehta household                             │  │ Name       Plan       Review │
│ Education funding review                    │  │ Priya...   Attention  18 Nov │
│ Due before 18 Nov              [Open plan]  │  │ …                            │
└─────────────────────────────────────────────┘  └──────────────────────────────┘
~~~

- The attention queue appears only when it points to real decisions. It ranks
  material consequence, review date, then recency.
- Desktop default is a compact table/list; comparison work needs scan lines.
  A grid is a user-selectable alternate view, not the default.
- One visible row action: Open plan. Export, archive and other rare actions
  live in a row menu.
- Show relationship owner and review date only when they exist. Never fill
  missing fields with invented or misleading placeholders.
- Adding a household is a short flow: identity first, planning purpose second.
  Financial detail belongs in Plan.

**Empty state**

~~~text
Start with a household
Create the relationship, then add the facts that make a plan possible.
                                                    [Add household]
                                      [Explore labelled sample workspace]
~~~

### 4.2 Plan — understand the position before editing inputs

**Job:** establish funding reality and prioritise the next planning move.

~~~text
Plan / Overview                                                [Save plan]
One household, one financial picture, one current planning position.

PROFILE  ·  FINANCES  ·  GOALS  ·  RISK  ·  STRATEGY  ·  REVIEW
complete    complete    attention  complete  waiting    locked

┌ Plan position ────────────────────────┐  ┌ Readiness ────────────────────┐
│ Retirement is on track.               │  │ 4 of 6 essentials complete     │
│ Education is the near-term pressure.  │  │ [Resolve goal timing]           │
│ [Review education goal]               │  │ Missing: insurance cover        │
└───────────────────────────────────────┘  └────────────────────────────────┘

Plan confidence / 72%       Monthly surplus / ₹48,000       Liquidity / 7.4 mo

Funding outlook
[one outcome-band chart with selected threshold and as-of date]

Priority actions                              Goal funding
1. Confirm education timing                   Education 72%   [Review]
2. Add insurance information                  Retirement 89%  [Open]
~~~

- The planning spine communicates readiness. It is not a lock-step wizard:
  advisers can revisit any completed or relevant step.
- Status names are outcomes: Complete, Needs data, Needs judgement, Ready,
  Not started. Never show mysterious checkmarks without labels.
- A goal, risk or cash-flow page retains the Plan header and local spine,
  making it clear that the user remains inside one planning surface.
- One decisive chart is enough in the overview. Scenario work is linked from
  the insight it helps explain.
- Distinguish model result from adviser judgement. For example: “Model
  indicates 72% confidence. Adviser has not yet reviewed.”

### 4.3 Policy — make the recommendation explainable

**Job:** move from plan evidence to a governed proposal, then an issued IPS.

~~~text
Policy / Strategic allocation                       [Save proposal] [Issue IPS]
Draft · annual review · based on plan saved 05 Nov 2026

Policy intent
Build long-term real growth while preserving a 12-month education reserve.
Risk budget: moderate · Liquidity floor: ₹… · Method: goals & cash-flow led

┌ Current → policy mix ───────────────────┐  ┌ Guardrails ──────────────────┐
│ Equity             48%  → 55%           │  │ Rebalance at ±5%              │
│ High-quality debt  34%  → 25%           │  │ Review annually               │
│ Gold               10%  → 10%           │  │ No illiquid additions         │
└─────────────────────────────────────────┘  └────────────────────────────────┘

Rationale & evidence
[adviser rationale field] [source/citation] [record recommendation]
~~~

- Objective, horizon, risk capacity, risk preference, liquidity and constraints
  come before allocation. A target mix without intent is an unattributed output.
- Current-to-policy uses the same asset class order, colour mapping and
  percentage precision everywhere, including the Dossier.
- Use aligned bars and values as primary comparison. A donut is only compact,
  supporting context.
- Rationale is a first-class record, not a small description field at the
  bottom of an allocation page.
- Issue IPS is unavailable until prerequisites are intelligible. Explain the
  exact missing prerequisite nearby; never rely on a disabled button alone.
- Do not overstate status: Draft → Ready for adviser review → Discussed →
  Issued → Due for review. Client approval requires an actual recorded event.

### 4.4 Dossier — a client conversation, not a dashboard export

**Job:** create a coherent meeting narrative and formal accessible record.

The Dossier is a distinct document environment. It is light-only, designed
first for print/PDF, and free of application navigation inside its pages.

**Narrative sequence**

1. What we heard — people, mandate, scope and planning purpose.
2. Where you are — balance sheet, cash flow, liquidity and plan position.
3. What matters now — priorities, risks, trade-offs and unresolved items.
4. Our recommendation — policy, rationale, implementation changes.
5. How we continue — owners, review cadence and decision record.

~~~text
PRIVATE & CONFIDENTIAL                                         01

Priya & Rohan Mehta
Your education goal needs a clearer funding decision.

The plan is sustainable overall. To reach the selected education confidence
level, we recommend agreeing one of three funding paths before 18 November.

Prepared for discussion · 05 November 2026 · SoundThesis
~~~

- A page headline is a conclusion or a useful question, never a generic label
  such as Goals or Asset Allocation.
- One page makes one argument. Three conclusions require three pages.
- Text remains selectable and accessible; no chart or graphic contains the
  only instance of material copy.
- Accessible Markdown preserves the same conclusions, figures, assumptions and
  status as the visual document.
- The toolbar contains Back, Accessible summary and Export PDF only.
- The Dossier uses explicit light colours. Dark-mode application variables must
  never leak into it.

### 4.5 Review — run the practice through meaningful queues

**Job:** turn the practice overview into a prioritised working list.

~~~text
Review
Today’s meaningful follow-up, ranked by client consequence.

REVIEW DUE (3)                  PLAN ATTENTION (2)            RECENT DECISIONS
Mehta / 18 Nov                 Kapoor / liquidity             Shah / proposal saved
[Open household]               [Resolve issue]                [View record]
~~~

- The review page has three ranked queues: Review due, Plan attention and
  Recent decisions. Each shows no more than five items and links to a
  household or audit record.
- A total without an associated action is noise. Delete it.
- Detail views separate facts (“Plan saved”) from interpretation (“Goal
  confidence fell below threshold”).
- Never frame monitoring as automated advice. Show status, source, calculation
  date and review responsibility clearly.

### 4.6 Specialist workflows — depth without a second product

Specialist capabilities are not lesser features. They are simply entered at the
moment they answer a real adviser question. Each keeps the chapter frame,
context strip, evidence language and return path of its parent.

| Workflow family | Streamlined home | Local structure and job |
| --- | --- | --- |
| Household details, assets, liabilities, cash flows and insurance | Plan → Profile & financial picture | A short local section rail: Household, Resources, Cash flow, Protection. Editing happens beside a compact live summary, not inside separate disconnected pages. |
| Goals, goal probability and goal conflicts | Plan → Goals | Overview, Funding detail, Conflicts. The goal list is the landing state; probability lab and conflict resolver open from a selected goal or conflict. |
| Risk questionnaire and risk report | Plan → Risk | Assess, Capacity & preference, Result. The result provides an explicit handoff to Policy with score, constraints and liquidity implications. |
| Retirement, SWP and reverse planning | Plan → Retirement & income | Retirement overview, SWP, Reverse plan. Reverse planning begins with the selected retirement/goal context and can apply a reviewed scenario back to Plan. |
| Assumptions, Monte Carlo, failure analysis and sensitivity | Plan → Test plan | Assumptions, Outcomes, Failure paths, Sensitivity. These are analysis views attached to the active plan version, never anonymous calculators. |
| Strategic allocation, current allocation and composition compare | Policy → Allocation | Intent, Current position, Proposed policy, Comparison. Current and target figures share one visual grammar. |
| Stress test, scenario lab and plan versus reality | Policy → Analyse | Stress, Scenarios, Reality check. Each opens from a policy or plan conclusion and labels the scenario, basis date and limitations. |
| Drift monitor, rebalance tickets and transition planning | Policy → Implement | Drift, Rebalance, Transition. The landing view ranks material variance, then makes the target, trade-off and required approval explicit. |
| IPS desk, policy centre and full IPS editor | Policy → Document | Policy brief, IPS desk, Full editor, Issue history. The desk guides normal issuance; full editor remains available for clause-level work. |
| Reports, dossier, accessible summary and client meeting workflow | Dossier → Prepare | Dossier, Reports, Meeting prep, Meeting record, Accessible summary. A meeting record captures decisions and sends them to Review. |
| Practice pulse, priority queue, recommendations, what changed and audit log | Review | Attention queue, Practice pulse, Recommendations, What changed, Decision history. These are distinct review lenses over the same client records. |
| SIP, SWP, STP, EMI, lumpsum, goal, retirement corpus and return calculators | Tools & practice → Calculators | Calculator index plus individual calculators. Each supports independent exploration and an explicit, reviewable Apply to plan path when a household is active. |
| Practice team and practitioner/API client workspace | Tools & practice → Practice | Team, Roles & invitations, Client operations. These are operational, not part of an individual household’s plan navigation. |
| Style guide and UI review | Tools & practice → Product quality | Internal-only, visibly separated from client/adviser workflows; never shown in client-facing navigation or exports. |
| Onboarding, invitations, sign-in and recovery | Entry & setup | A brief linear setup sequence that returns people to the most appropriate chapter, without exposing product tools prematurely. |

**Rules for specialist screens**

- Name the parent chapter in the header and provide a Back to [parent] action
  when launched contextually.
- Show the question the specialist tool is answering before its controls.
- Carry active plan version and data basis into every model, simulation and
  report. Independent tools say Independent exploration clearly.
- Results that change a client record require an explicit Apply or Record action
  followed by an audit event; never overwrite a plan silently.
- Expert tools may be denser, but they still use the conclusion → evidence →
  record hierarchy and must have an understandable empty state.

---

## 5. Visual language

### 5.1 Colour: paper, ink, one direction

Use one muted Verdigris accent. It represents intentional movement: selected
state, focus, primary action and a specifically chosen recommendation. It must
not be overloaded to mean good, profitable, or safe.

#### Light application palette

| Token | Value | Role |
| --- | --- | --- |
| canvas | #F6F6F2 | Main background: warm mineral paper. |
| surface | #FEFFFC | Raised work surface, menus and form fields. |
| surface-muted | #ECEEE8 | Quiet inset, selected row wash, inactive control. |
| ink | #17201D | Primary text, strong icons, data emphasis. |
| ink-soft | #44504A | Body copy, table values, secondary headings. |
| muted | #6B7770 | Labels, metadata, inactive elements. |
| line | #D9DED7 | Hairline dividers and standard borders. |
| line-strong | #BFC8C0 | Strong control border and section separator. |
| verdigris | #176B5B | Product accent: action, focus, selected state. |
| verdigris-wash | #E1F0EA | Accent background, never used as text. |

#### Dark application palette

| Token | Value | Role |
| --- | --- | --- |
| canvas | #101714 | Main background. |
| surface | #18211E | Raised work surface. |
| surface-muted | #222E29 | Inset and selected state. |
| ink | #F0F4EF | Primary text. |
| ink-soft | #CBD4CD | Supporting copy. |
| muted | #94A299 | Metadata. |
| line | #2D3933 | Borders. |
| line-strong | #445249 | Strong separator. |
| verdigris | #63BEA7 | Accent on dark. |
| verdigris-wash | #173D34 | Accent fill. |

#### Semantic colour

Status colour is always paired with an icon and text. It is not a second
product accent.

| Meaning | Light | Dark | Examples |
| --- | --- | --- | --- |
| Positive | #1D774B | #62C98E | On track, complete, ready. |
| Attention | #9B5D17 | #E9AE55 | Needs data, review due, needs judgement. |
| Critical | #B33C40 | #EE8688 | Material shortfall, failed export, destructive action. |
| Informative | #2A6782 | #79B9D5 | Methodology, source, contextual note. |

#### Dossier palette: permanently light

| Token | Value | Role |
| --- | --- | --- |
| document-field | #EEF0EB | Viewer surround. |
| document-page | #FFFFFC | Print page. |
| document-ink | #17201D | All principal copy. |
| document-detail | #5B6861 | Captions and metadata. |
| document-rule | #D8DDD6 | Rules and tables. |
| document-verdigris | #176B5B | Quiet section mark. |
| document-stone | #D8CCAC | Editorial highlight only; never status. |

### 5.2 Type: human, exact and durable

Use Satoshi for interface and editorial hierarchy and JetBrains Mono for all
numerical and timestamped information. The pairing is human enough for advice
and exact enough for serious planning work.

| Role | Size / leading | Weight | Use |
| --- | --- | --- | --- |
| Display | clamp(2rem, 3.4vw, 3.5rem) / 1.04 | 600 | Dossier cover and rare major conclusions. |
| Page title | clamp(1.5rem, 2vw, 2rem) / 1.15 | 600 | Application page title. |
| Section title | 1.125rem / 1.28 | 600 | Panels and decision zones. |
| Body | 0.875rem / 1.55 | 450 | Default working copy. |
| Small | 0.75rem / 1.4 | 500 | Labels, metadata, compact table heading. |
| Metric | 1.5rem / 1 | 550 | Key values; always mono. |

- Use tabular numerals for currency, percentages, dates, IDs and comparison
  tables. Monetary values are right aligned.
- Body copy stays within 64–68 characters per line where practical.
- Use sentence case throughout. Tiny uppercase labels are allowed only at
  11px/600 with 0.07em tracking.
- Font weight creates hierarchy; oversized text does not.
- Do not use Inter, generic serif fonts, generic system-only typography or
  pure black. No large gradient text.

### 5.3 Space, shape and depth

Use a 4px spatial unit. Empty space signals that a thought is complete.

~~~text
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80
~~~

| Situation | Rule |
| --- | --- |
| Page gutter | 20px mobile, 32px tablet, 40px desktop. |
| Content width | 1440px max; narrative/text columns 680px max. |
| Section gap | 32px standard, 48px at major chapter shifts. |
| Panel padding | 16px compact, 24px default, 32px document/presentation. |
| Control radius | 6px. |
| Panel radius | 10px. |
| Dialog radius | 14px. |
| Elevation | A 1px rule by default; shadow only for temporary layers. |

Use no glassmorphism, blurred card backs, ambient gradients, glowing borders,
or decorative bento boxes. A menu, popover, drawer or dialog may use one
soft, background-tinted shadow:

~~~css
0 18px 48px rgba(20, 31, 26, 0.14), 0 2px 8px rgba(20, 31, 26, 0.06)
~~~

---

## 6. Component grammar

### Page header

~~~text
PLAN / GOALS                                      [Export] [Save plan]
Goal funding
Education needs a decision before the next review.
~~~

- The eyebrow appears only when it clarifies a chapter/substep.
- The second line states a conclusion when data exists; otherwise it describes
  the page job plainly.
- One primary action maximum. A secondary/reversible action may sit beside it.
- Never repeat the title in the supporting copy.

### Metric strip

~~~text
PLAN CONFIDENCE       MONTHLY SURPLUS        LIQUID RUNWAY
72%                   ₹48,000                7.4 months
Below 75% threshold   After committed costs   Target: 6 months
~~~

- Three measures are ideal; four is the ceiling.
- Metrics are a strip with rules/dividers, not four decorated cards.
- Each measure includes a label, mono value, and contextual basis.
- A metric becomes interactive only if it opens a relevant explanation.
- Never show unexplained arrows, fake precision, or a metric with no period,
  denominator or source.

### Sections and panels

~~~text
Funding outlook                                                [View analysis]
How goal timing and savings shape the selected confidence threshold.
──────────────────────────────────────────────────────────────────────────────
content
~~~

- Use whitespace and a rule before adding a containing panel.
- A panel is justified by an editable group, comparison, decision, or temporary
  elevated state. It is not a default wrapper.
- Never nest more than two bordered/elevated surfaces.
- A tint establishes selected state, a live recommendation, or an inline note;
  it does not decorate categories.

### Buttons and actions

| Type | Treatment | Use |
| --- | --- | --- |
| Primary | Verdigris fill, white text, matching 1px border. | Meaningful commitment: Save proposal, Issue IPS. |
| Secondary | Surface, strong hairline border, ink text. | Parallel/reversible action: Export, Compare. |
| Quiet | Transparent with ink-soft text. | Navigation and light utility action. |
| Destructive | Critical fill or quiet critical text. | Reset, archive, discard, delete. |

- Labels begin with a specific verb: Review goal, Record recommendation,
  Prepare dossier. Never Submit, Continue or Click here.
- Standard controls: 36px desktop; touch contexts and mobile: 44px minimum.
- Press state: translate down 1px and darken slightly. No bounce, ripple or
  glowing focus effect.
- Disabled state explains the blocking prerequisite nearby or on focus. It
  never relies on opacity alone.
- Confirm irreversible loss and formal issuance. Do not confirm routine saves.

### Forms

- Labels sit above controls; placeholders are examples, never labels.
- Group fields by the user’s real-world question: household, income, committed
  spending, liquidity, goals and protection.
- Use one or two columns. Three is allowed only for tightly related compact
  fields such as amount, frequency and date.
- Autosave drafts and show a quiet recency state. Explicit Save marks a
  milestone, record or state change.
- Validate on blur or completion attempt, not while a person enters an amount.
  Error copy names recovery: “Enter an age from 18 to 100.”
- Mark exceptions as optional rather than putting asterisks on every field.

### Tables

- Tables are decision tools. Sentence-case headings, strong alignment and
  divider rhythm matter more than card styling.
- Header row uses muted text, 12px and 600 weight. Monetary and percentage
  values are right aligned in mono.
- No zebra striping by default. Hover may use surface-muted.
- A clickable row has a visible destination and hover state. Do not rely on a
  mystery chevron on every record.
- Contextual actions belong in the final narrow column.
- On mobile, ordinary tables become labelled stacked records. Do not create
  horizontal scrolling for everyday planning work.

### Charts and numerical visualisation

Use charts only when visual form answers a meaningful question faster than an
aligned table.

| Question | First choice | Do not lead with |
| --- | --- | --- |
| Is the plan likely to remain funded? | Outcome band/fan chart with threshold. | Decorative radial gauge. |
| What goal deserves action? | Ranked horizontal funding bars. | Six tiny donut/radial charts. |
| What changes under an assumption? | One sensitivity line or tornado. | Multiple unrelated mini-charts. |
| What allocation should change? | Aligned current → target bars and values. | A donut as the only comparison. |
| When does cash flow occur? | A labelled horizontal timeline. | A pie chart. |

Rules:

- Chart titles are conclusions: “Education falls below the selected threshold
  in downside scenarios,” not “Monte Carlo analysis.”
- Show an as-of date, scenario, assumptions and method near consequential
  charts.
- Tooltips are supplementary. A user understands the conclusion without hover.
- Use direct labels for up to six series. Beyond that, reduce, group or provide
  an adjacent table.
- Asset-class colours stay stable across app and Dossier. Status colours do not
  become chart palettes.
- Charts do not autoplay, loop, or animate values after initial load.

### Status, alerts, loading and absence

| State | Pattern |
| --- | --- |
| Complete | Icon + Ready for review or On track; positive styling only when useful. |
| Attention | Icon + actionable phrase: Needs goal timing or Review due. |
| Critical | Consequence, recovery action and relevant detail. |
| Neutral | Quiet factual text: Draft, Not assessed, Last saved 2 min ago. |
| Loading | Layout-shaped skeletons; never a full-screen spinner for a work page. |
| Empty | Explain the outcome that becomes possible, then one primary action. |
| No results | Retain query/filter and show a clear action. |

Never stack coloured alert banners. Three errors on one page indicate a failure
to prioritise or validate earlier.

---

## 7. Dossier direction

### Document is not interface

The Dossier feels like one deliberately edited report, not application cards
placed on 16:9 slides.

**Visual rules**

- Document field is soft mineral grey; page is near-white; text is document ink.
- Wide margins, fine horizontal rules, small folios, and one Verdigris section
  mark establish page rhythm.
- Cover is left aligned and asymmetric: conclusion at left, confidentiality and
  document information at top right. Never centre giant type over a gradient.
- Use a small document wordmark, not app navigation or dashboard header.
- Strong figures use JetBrains Mono; prose uses Satoshi.
- One page makes one point. It may contain a chart, table, pull conclusion and
  short copy—but not a dashboard grid.
- Material text remains in the DOM and prints with its intended colour.

**Page types**

| Type | Composition |
| --- | --- |
| Cover | Strong conclusion, one-line context, confidentiality/date/author. |
| Chapter opener | Large numbered point, one paragraph of framing, no data clutter. |
| Position | Decision statement + 3 metrics + one chart. |
| Comparison | Aligned table/bar comparison + short interpretation. |
| Recommendation | Rationale left; explicit actions, owner and timing right. |
| Record | Review cadence, assumptions, disclosures, decision history. |

**Export contract**

- Print page: 13.333 × 7.5in, light colour scheme and exact colour adjustment.
- App shell and document controls are hidden from printed output.
- Accessible Markdown mirrors headings, conclusions, figures, methods,
  assumptions and recommendations in semantic reading order.
- Never imply projections are guarantees. Print assumptions and report date.

---

## 8. Motion, accessibility and trust

### Motion

Motion helps someone track an interaction. It never advertises that the app is
alive.

| Interaction | Motion |
| --- | --- |
| Button/control | 120–160ms colour/transform change. |
| Drawer/popover | 180–220ms opacity + 8–12px transform. |
| Route transition | 220–260ms opacity + 4–6px vertical transform. |
| New list content | One-time 25–40ms stagger, maximum 6 items. |
| Loading | Layout-matched skeleton shimmer only. |

- Default easing: cubic-bezier(0.16, 1, 0.3, 1) entering; cubic-bezier(0.4,
  0, 0.2, 1) exiting.
- Animate only opacity and transform. Never animate position, width, height or
  box shadow.
- Honour prefers-reduced-motion; reduced mode is a valid, polished experience.
- No endless floats, looping pulses, animated counters, bouncing arrows, or
  decorative particle/grain movement.

### Accessibility is part of credibility

- Meet WCAG 2.2 AA for text and essential controls in both themes.
- Use a visible 2px Verdigris focus ring with 2px offset. Never remove focus
  without a visible replacement.
- Keyboard order follows visual order; menus, drawers, modals, popovers and
  command palette return focus correctly.
- Every consequential chart has a title, conclusion, date/assumption context,
  and accessible equivalent data or summary.
- Colour never carries a decision alone. Pair it with text, icon, labels, order
  or pattern.
- Support 200% zoom, browser text resizing, touch targets, high-contrast modes,
  small screens and reduced motion.

### Trust is a visual feature

For consequential recommendations, show what the number means:

- source or calculation method;
- as-of date and relevant period;
- assumption set/scenario and confidence threshold;
- advisory status: model result, draft proposal, adviser reviewed, issued;
- practical trade-off or limitation where material.

Never fabricate names, client information, citations, historical returns,
model certainty, testimonials, or approvals. A sample is always visibly
labelled as a sample.

---

## 9. Responsive rules

| Width | Behaviour |
| --- | --- |
| < 768px | One column, 20px page gutters, bottom nav, side panels become drawers, records stack, header actions wrap with primary first. |
| 768–1199px | 32px gutters; two columns only when both retain 320px; no persistent contextual column. |
| ≥ 1200px | 40px gutters; rail and optional 7:5 evidence split; broad tables and short sticky evidence module permitted. |

Non-negotiables:

- No horizontal scrolling for core navigation, normal forms or everyday tables.
- Headings may wrap naturally. Avoid default truncation.
- Content remains in normal flow: no overlapping absolute-positioned summaries,
  labels or callouts that collide under zoom.
- Keep prose at 14px or larger; touch targets are 44px or larger.
- A Dossier page may scale in its viewer but retains print dimensions and does
  not reflow into a vertical app page.

---

## 10. What SoundThesis never does

Do not:

- Use Inter, generic system-only typography, generic serif fonts, pure black,
  purple/blue neon, or more than one product accent.
- Use gradients, glassmorphism, glows, glossy 3D cards, custom cursors or
  overlap as a shortcut to premium.
- Put a hero illustration, giant centred marketing headline, or scroll prompt
  on an adviser work page.
- Begin a page with three equal feature cards, six KPI tiles, badge confetti,
  spinning gauges, tiny dashboards or a carousel.
- Make all containers rounded cards; most content uses spacing and rules.
- Hide material data in a tooltip, hover-only state, icon without text, or
  colour-only distinction.
- Make a donut the principal allocation decision view.
- Use false precision, implied guarantees, fake citations, or placeholders
  such as John Doe.
- Use empty AI copy: Elevate, seamless, next-gen, unlock, powerful insights,
  world-class, or your journey.
- Show an action in the rail, header, toolbar and panel simultaneously.
- Let dark application styles contaminate a client-facing Dossier.

---

## 11. Implementation order

This is a product system, not an all-at-once visual rewrite. Adopt it in this
order so the workflow improves before the surface becomes prettier.

### 1. Establish the foundation

1. Replace global tokens with the Paper / Ink / Verdigris palette and Satoshi +
   JetBrains Mono type stack.
2. Define shared spacing, radius, controls, typography, status and document
   tokens in src/index.css.
3. Refine shared Button, PageHeader, MetricCard, StatusBadge, Card, fields,
   table primitives, EmptyState and Skeleton components first.
4. Add the persistent context strip and standard page header.

### 2. Fix information architecture

1. Simplify rail and mobile navigation into five chapters plus Tools.
2. Group existing routes as Plan, Policy, Dossier and Review subviews.
3. Preserve command-palette access to every specialised route.
4. Map every existing IPS, report and delivery entry point to a canonical
   chapter home, with contextual links or redirects that preserve its purpose.
   Do not delete, hide beyond discovery, or regress a workflow during the
   streamlining.

### 3. Rebuild the decision flow

1. Make Households a list-led relationship directory with a ranked queue.
2. Make Plan start with position, readiness, priority actions and one outcome
   chart before detailed editors.
3. Make Policy follow intent → target mix → guardrails → rationale → record.
4. Make Dossier and Meeting Workflow follow one client narrative.
5. Make Review a three-queue operating view rather than a metric dashboard.

### 4. Verify the system

- [ ] Household and plan status are clear at a glance.
- [ ] Every screen has one conclusion, one next action and inspectable evidence.
- [ ] No key decision relies on hover, colour alone, or a hidden drawer.
- [ ] Metric groups obey the four-metric ceiling.
- [ ] Large, small, dark, keyboard, reduced-motion, empty, error and loading
      states have been reviewed.
- [ ] Dossier is correct in browser preview and print/PDF.
- [ ] Diff check, build and relevant test suites pass.

---

## Final test

Before shipping any screen, ask:

> Does this make a careful adviser feel better informed and less overwhelmed—
> and can they explain the recommended next move to a client in one breath?

If the answer is no, remove, rank, clarify or defer. SoundThesis earns its
quality through judgement made visible.
