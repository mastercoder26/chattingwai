# Project: Intelligent UI for Glimpse Workspace

## Architecture
The Intelligent UI system extends Glimpse's chat response rendering pipeline to support structured, interactive, streaming-resilient UI components natively alongside standard markdown.
- **Syntax**: CommonMark-compliant fenced code blocks ```` ```intelligent-ui ```` (alias ```` ```ui ````) enclosing JSON payloads.
- **Parsing & Streaming Engine** (`components/intelligent-ui/parser.ts`): Delimiter stack auto-repair closes partial strings, objects, and arrays during active token streaming. Strict schema validation via Zod; invalid or incomplete structures degrade gracefully into skeletons or clean fallback views without throwing exceptions.
- **Component Primitives** (`components/intelligent-ui/`):
  - `Tabs` (`tabs.tsx`): ARIA tablist/tab/tabpanel, keyboard navigation (arrows, home/end, enter/space).
  - `Comparison` (`comparison.tsx`): Responsive side-by-side columns, badges, pros/cons lists.
  - `Metrics` (`metrics.tsx`): Metric cards with values, labels, trends (up/down/neutral), and delta badges.
  - `Checklist` (`checklist.tsx`): Interactive clickable checkboxes operating in local React state without chat resubmission.
  - `Accordion` (`accordion.tsx`): Collapsible disclosure sections with animated chevrons and ARIA expanded state.
  - `Callout` (`callout.tsx`): Styled alert banners (info, note, warning, tip, success) with Lucide icons.
- **Theme & Design System** (`app/intelligent-ui.css`): Exclusively utilizes workspace CSS variables (`--bg`, `--surface`, `--line`, `--text`, `--muted`, `--accent`, `--hover`, `--soft`). Adapts seamlessly across Light, Dark, and all 5 accent themes (graphite, blue, sage, rose, violet). Respects `prefers-reduced-motion` and `prefers-contrast`.
- **Markdown Mounting** (`components/markdown.tsx`): Intercepts `pre` code blocks with `language-intelligent-ui` or `language-ui`, passing content to `<IntelligentUIRenderer>`. All other standard code blocks, KaTeX math, tables, and lists continue rendering without regression.
- **Prompt Pipeline** (`lib/prompts.ts` / `app/api/chat/route.ts`): Server-side system prompt construction instructing models on component syntax, schemas, and judicious usage criteria.
- **Streaming Auto-Scroll** (`components/chat-workspace.tsx`): Smart scroll anchoring that respects user manual scrolling during stream generation; does not snap back to bottom unless user is pinned to bottom.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tabs / Switchable Views | Switchable tab views with keyboard navigation and ARIA support | M2 | ORIGINAL_REQUEST §R1 |
| 2 | Side-by-Side Comparison Containers | Multi-column comparison cards with pros/cons and highlight badges | M2 | ORIGINAL_REQUEST §R1 |
| 3 | Stat & Metric Highlight Cards | Metric cards with value, trend indicators, and label details | M2 | ORIGINAL_REQUEST §R1 |
| 4 | Interactive Checklists | Clickable checkboxes with local toggle state (no chat resubmission) | M2 | ORIGINAL_REQUEST §R1 |
| 5 | Collapsible Accordions | Disclosure sections with smooth toggle and animated chevron | M2 | ORIGINAL_REQUEST §R1 |
| 6 | Styled Callout / Alert Banners | Semantic notice banners (info, note, tip, warning, success) | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Streaming-Resilient Parsing Engine | Delimiter auto-repair, partial JSON handling, graceful degradation | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Native Design System & Theming | Strictly uses CSS variables; Light/Dark and 5 accents support | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Accessibility & Reduced Motion | Keyboard focus, ARIA attributes, reduced-motion overrides | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Model Guidance & System Prompt | Server-side prompt configuration with schemas and judicious rules | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Interactive Functional Guardrails | In-bubble interaction without resubmission; markdown non-regression | M2, M4 | ORIGINAL_REQUEST §AC |
| 12 | Automated Verification & Baseline | Zero TypeScript errors, ESLint clean, npm test 100% pass, clean build | M4 | ORIGINAL_REQUEST §AC |
| 13 | Smart Streaming Auto-Scroll | Allow manual scroll-up during streaming without snapping to bottom | M2D | Follow-up 2026-10-16 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | E2E Testing Track | Independent opaque-box test suite (Tiers 1-4) in `tests/intelligent-ui-e2e.test.ts` publishing `TEST_READY.md` | none | **DONE** |
| M1 | Streaming Engine & Parser Core | `components/intelligent-ui/parser.ts`, `schema.ts`, `types.ts` with delimiter auto-repair, Zod validation, streaming resilience | none | **DONE** |
| M2 | Component Suite & Design Integration | 6 components in `components/intelligent-ui/`, `app/intelligent-ui.css`, mounting in `components/markdown.tsx`, local state | M1 | **DONE** |
| M2D | Smart Streaming Auto-Scroll | `components/chat-workspace.tsx` auto-scroll behavior preventing snap-back when user scrolls up during streaming | none | **DONE** |
| M3 | Server-Side Model Guidance | `lib/prompts.ts`, integration into `app/api/chat/route.ts`, prompt unit tests | none | **DONE** |
| M4 | Final Milestone & Verification | Phase 1: 100% E2E test pass; Phase 2: Adversarial coverage hardening; npm test (341 passing), typecheck (0 errors), lint (0 errors), build (clean) | M0, M1, M2, M2D, M3 | **DONE** |

## Code Layout
- `components/intelligent-ui/types.ts`: TypeScript interfaces for the 6 component schemas and render options.
- `components/intelligent-ui/schema.ts`: Zod schemas validating component payloads.
- `components/intelligent-ui/parser.ts`: Delimiter auto-repair parser, partial stream handler, safe fallback.
- `components/intelligent-ui/tabs.tsx`: Switchable tabs component with ARIA and keyboard handling.
- `components/intelligent-ui/comparison.tsx`: Side-by-side comparison cards.
- `components/intelligent-ui/metrics.tsx`: Metric highlight cards with trend indicators.
- `components/intelligent-ui/checklist.tsx`: Interactive checklist with local React toggle state.
- `components/intelligent-ui/accordion.tsx`: Collapsible accordion sections.
- `components/intelligent-ui/callout.tsx`: Styled callout/alert banners.
- `components/intelligent-ui/index.tsx`: `<IntelligentUIRenderer>` dispatcher and skeleton fallback.
- `app/intelligent-ui.css`: Pure CSS styles using `--bg`, `--surface`, `--line`, `--text`, `--muted`, `--accent`, `--hover`, `--soft`.
- `components/markdown.tsx`: Integration hook detecting `intelligent-ui` code blocks.
- `components/chat-workspace.tsx`: Smart streaming auto-scroll implementation.
- `lib/prompts.ts`: Server-side system prompt builder and Intelligent UI guidance.
- `app/api/chat/route.ts`: Integration of prompt builder into chat completion route.
- `tests/intelligent-ui-e2e.test.ts`: Dual-track E2E requirement test suite (Tiers 1-4).
- `tests/intelligent-ui-parser.test.ts`: Unit tests for parser and auto-repair algorithm.
- `tests/intelligent-ui-layout.test.ts`: Unit tests for tabs, comparison, accordion.
- `tests/intelligent-ui-interactive.test.ts`: Unit tests for checklist, metrics, callout.
- `tests/intelligent-ui-integration.test.ts`: Integration tests for dispatcher and markdown.
- `tests/autoscroll.test.ts`: Unit tests for smart streaming auto-scroll pinning.
- `tests/prompt.test.ts`: Prompt builder verification and schema tests.
- `tests/adversarial-streaming-stress.test.ts`: Challenger 1 streaming stress suite (>9,000 iterations).
- `tests/adversarial-challenger-2.test.ts`: Challenger 2 interactive isolation & markdown non-regression suite.

## Verification Gate Verdicts
- **Reviewer 1 (Completeness)**: **APPROVE**
- **Reviewer 2 (Design & A11y)**: **APPROVE**
- **Challenger 1 (Streaming Stress)**: **APPROVE**
- **Challenger 2 (Interactive & Regression)**: **APPROVE**
- **Forensic Auditor (Integrity)**: **CLEAN**
- **Test Results**: 341 passed / 0 failed across 55 test suites.
- **Typecheck**: 0 TypeScript errors.
- **Lint**: 0 ESLint errors/warnings.
- **Build**: Next.js 16.3.8 Turbopack production build succeeded.
