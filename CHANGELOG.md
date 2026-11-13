# Changelog

All notable product changes are documented here. Commit IDs are included when a release note needs a direct source reference.

## Unreleased — 2026-11-13

### Accessibility and interaction

- Added the Vercel UI SDK (`@ui-sdk/react` and `@ui-sdk/core`) and its project guidance.
- Rebuilt the active-household control as an accessible UI SDK combobox with type-to-filter, arrow-key navigation, selection feedback, and agent coverage.
- Replaced the add-household overlay with a UI SDK dialog that manages focus trapping, Escape, outside dismissal, and return focus.
- Moved keyboard focus to the main content region after page navigation.
- Replaced the client-directory card click target and reusable repeater pseudo-button with native buttons.
- Added selected-state announcements for directory views and client selection.

### Visual refinement

- Refined the existing advisory workspace appearance: app shell, client directory, client cards, dialogs, active controls, and authentication entry screen.
- Preserved the information architecture, routes, and workflow order.

### Verification

- `npm run build`
- `npm run test:unit` — 110 tests passing
- `npm run test:ui` — UI SDK household picker and keyboard repeater tests passing

Source: `370af79 Improve keyboard accessibility and interface polish`.

## 2026-11-12

- Fixed client creation behavior.

Source: `26dcbfb Client Creation Bug fix`.

## 2026-11-11

- Added live multi-currency plan reporting and INR conversion.
- Improved profile entry, risk visibility, workspace themes, shortcuts, and data encryption.

Sources: `d1f8f39`, `d888cbf`, `33020fe`, `363546f`, `2cb8033`, `32eb450`.

## 2026-11-04 to 2026-11-06

- Introduced the current client-first advisory flow: Households → Plan → Policy → Dossier → Review.
- Added the institutional IPS workspace, strategic allocation policy workflow, CRM lead desk, sample households, goal-probability analysis, dossier updates, and policy traceability.
- Hardened client-draft persistence, report generation, API behavior, and goal/resource synchronization.

Sources: `f19efd0`, `86b794c`, `bc37ecb`, `8e60a9b`, `4db2e3b`, `078e443`.

## 2026-11-02 to 2026-11-03

- Established the planning workspace redesign and refined the core layout, themes, and active-household experience.
- Added the Vercel serverless and SPA rewrite configuration used by the current deployment setup.

Sources: `d6ce70d`, `8fde078`, `def23d4`, `95593e5`.

## Earlier platform milestones

- Built the adviser operating system: goals, risk assessment, retirement and cash-flow planning, allocation, scenario analysis, reports, and dossier exports.
- Added the Fastify/Postgres practitioner backend, multi-tenant client records, planning persistence, and deployment configurations for Vercel and other hosts.

Representative sources: `b1406ea`, `5c4f304`, `afbccab`, `7bbc575`, `4e52756`, `2906884`, `4164f18`.

## Deployment trace

- `origin/main` currently resolves to `370af79`.
- Git recorded the latest push to `origin/main` on 2026-11-13 at 10:27 IST.
- The repository has a Vercel configuration in `vercel.json`, but no local `.vercel/project.json`; Vercel project/deployment identity must therefore be verified through the Vercel account before attributing a production URL or release to a Git commit.
