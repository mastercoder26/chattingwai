# Intelligent UI Test Infrastructure & Quality Architecture

## 1. Overview & Test Philosophy

The Intelligent UI system enhances the Glimpse AI chat workspace by enabling large language models to generate and render structured, interactive UI components directly inline within conversational responses. Supported components include:
1. **Tabs / Switchable Views**
2. **Side-by-Side Comparisons**
3. **Stat & Metric Highlight Cards**
4. **Interactive Checklists**
5. **Collapsible Accordions**
6. **Styled Callout / Alert Banners**

### Testing Philosophy: Opaque-Box, Contract-Driven, and Streaming-Resilient
The end-to-end (E2E) testing suite in `tests/intelligent-ui-e2e.test.ts` is designed with an **opaque-box, contract-driven approach**:
- **Requirement-Driven**: Tests validate observable behaviors, contract specifications, and user-facing requirements defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`.
- **Fault-Tolerant & Streaming-Resilient**: The chat completion pipeline delivers tokens incrementally. The parsing engine and component renderers must gracefully handle incomplete, truncated, and malformed chunks without ever throwing unhandled runtime exceptions or flashing broken markup.
- **Contract & Implementation Coherence**: The test runner imports and tests the parsing engine (`components/intelligent-ui/parser.ts`), component schemas (`components/intelligent-ui/schema.ts`), streaming token accumulation, and DOM/HTML structure contracts.
- **Pure Node.js Test Runner**: Built on Node's native `node:test` and `node:assert/strict` executed seamlessly via `tsx --test`, ensuring lightweight, high-performance execution without heavy browser automation overhead.

---

## 2. Feature Inventory & Mapping

| Feature # | Component / Capability | Primary Spec & Contract | Verification Method |
|:---:|---|---|---|
| **F1** | **Tabs / Switchable Views** | `type: 'tabs'`, `tabs`/`items`, `activeTab` | Tab selection, ARIA `tablist`/`tab`/`tabpanel`, keyboard navigation, markdown rendering |
| **F2** | **Side-by-Side Comparison** | `type: 'comparison'`, `items`/`columns`, pros/cons, badges | Multi-column grid structure, badge highlights, pros/cons lists, key-value details |
| **F3** | **Stat & Metric Cards** | `type: 'metrics'` (alias `'stat'`), `metrics`/`items` | Value display, trend directions (`up`/`down`/`neutral`), delta percentages, numeric coercion |
| **F4** | **Interactive Checklists** | `type: 'checklist'`, `items`, `checked` state | In-bubble state toggle, no chat resubmission, progress counters, required item flags |
| **F5** | **Collapsible Accordions** | `type: 'accordion'`, `items`, `defaultOpen` | Disclosure expand/collapse, `aria-expanded`, animated chevron indicator, markdown content |
| **F6** | **Styled Callout Banners** | `type: 'callout'`, `variant` (`info`/`note`/`tip`/`warning`/`success`) | Semantic alert styling, icon mappings, optional title handling, markdown bodies |
| **F7** | **Streaming Parser & Delimiter Repair** | `parseStreamingPayload`, `repairStreamingJson` | Delimiter stack auto-repair (`{`, `[`, `"`), trailing comma cleanup, unhandled exception prevention |
| **F8** | **Native Design System Integration** | CSS variables (`--surface`, `--line`, `--text`, `--accent`) | Class name checks, semantic token validation, zero conflicting hardcoded styles |
| **F9** | **Accessibility & Reduced Motion** | ARIA attributes, semantic roles, reduced-motion compliance | Role contracts, ARIA expansion states, keyboard interaction semantics |
| **F10** | **Cross-Feature Composition** | Markdown code block interception ```` ```intelligent-ui ```` / ```` ```ui ```` | Multi-component pipelines, nested interactive payloads, sequential stream flows |

---

## 3. Systematic 4-Tier Test Suite Architecture

The test suite is structured across 4 systematic tiers to ensure exhaustive coverage from atomic features to complex real-world workflows:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4-TIER TEST SUITE ARCHITECTURE                  │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage (>=5 tests per component = >=30 tests)      │
│  - Tabs, Comparison, Metrics, Checklist, Accordion, Callout            │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary & Corner Cases (>=5 tests per component = >=30 tests)│
│  - Empty arrays, missing optionals, malformed JSON, streaming cuts,    │
│    extreme strings, unicode, escaped quotes, trailing commas           │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Combinations (>=6 pairwise tests)               │
│  - Tabs + Checklists, Accordions + Metrics, Comparison + Callouts,     │
│    Tabs + Comparison, Accordion + Checklist, Callout + Metrics, Stream │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 4: Real-World Application Scenarios (>=5 realistic scenarios)   │
│  - Product Comparison Matrix (Cloud Database Engine Evaluation)        │
│  - Developer Onboarding Checklist (Zero to Production Deploy)          │
│  - Performance Benchmark Dashboard (API Gateway Latency & Throughput)  │
│  - Technical Incident Postmortem (RCA Callout + Timeline + Checklist)  │
│  - Infrastructure Migration Guide (Multi-Cloud Tabs + Caveat Callouts) │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (>=30 Tests)
Covers the happy path, core properties, schema validation, and fundamental user interactions for each of the 6 components:
- **Tabs (5 tests)**: Basic tab definition, active tab selection, switching contract, icon and rich markdown rendering, CommonMark block unwrapping.
- **Comparison (5 tests)**: Two-column cards, multi-column cards with badges/highlights, pricing & key-value details, pros/cons balance, schema flexibility (`items` vs `columns`).
- **Metrics (5 tests)**: Metric card value & unit, trend direction indicators (`up`/`down`/`neutral`), delta percentages, alias normalization (`stat` -> `metrics`), numeric coercion.
- **Checklist (5 tests)**: Title & task list, mixed checked/unchecked states, required task flags, label/text flexibility, local state toggle contract without chat resubmission.
- **Accordion (5 tests)**: Multi-item disclosure sections, `defaultOpen` behavior, rich markdown/code in accordion body, toggle state tracking, item id generation.
- **Callout (5 tests)**: `info`, `warning`, `success`, `tip`, and `note` variants with optional title omissions.

### Tier 2: Boundary & Corner Cases (>=30 Tests)
Adversarial and extreme boundary conditions:
- **Tabs (5 tests)**: Empty items array, missing optional properties, mid-stream truncated JSON, 10KB+ extreme markdown content, special characters & escaped quotes.
- **Comparison (5 tests)**: Empty comparison items, missing pros/cons arrays, truncated streaming JSON, HTML/markdown meta-characters escaping, trailing comma auto-repair.
- **Metrics (5 tests)**: Empty metrics array, missing change/description, cut off mid-number stream, extreme floats/negatives/currency symbols, whitespace & multiline padding.
- **Checklist (5 tests)**: Empty items array, missing `checked` property default to false, unclosed streaming payload, backticks & markdown brackets in item text, omitted title.
- **Accordion (5 tests)**: Empty accordion list, missing `defaultOpen` default to false, mid-stream token cutoff, deeply nested markdown/tables/KaTeX, whitespace-only titles.
- **Callout (5 tests)**: Omitted title, truncated streaming content, invalid variant fallback to `info`, multi-paragraph code blocks in content, whitespace content.

### Tier 3: Cross-Feature Combinations (>=6 Tests)
Validates component composability and multi-component conversational flow:
1. Tabs containing interactive Checklists inside tab panels.
2. Accordion sections encapsulating Stat and Metric cards.
3. Side-by-side Comparison containing Callout alert banners.
4. Tabs switching between architectural Comparisons.
5. Troubleshooting Accordion containing interactive Checklists.
6. Executive Summary Callout paired with Stat/Metric highlights.
7. Sequential multi-component chat stream pipeline (Callout -> Metrics -> Accordion).

### Tier 4: Real-World Application Scenarios (>=5 Tests)
End-to-end integration scenarios simulating genuine model output:
1. **Cloud Database Engine Evaluation**: Multi-database comparison (Postgres vs DynamoDB vs CockroachDB) with pros/cons, latencies, and badges.
2. **Production Onboarding Checklist**: Multi-phase deployment checklist with required items and completion progress tracking.
3. **API Gateway Performance Dashboard**: Comprehensive benchmark metrics (throughput, p99 latency, error rate, memory) with trend deltas.
4. **Production Incident Postmortem**: Severe outage report combining RCA callout, event timeline accordion, and action item checklist.
5. **Zero-Downtime Migration Guide**: Multi-provider migration with configuration tabs, prerequisite callouts, and rollback steps.

---

## 4. Coverage Thresholds & Quality Gates

The test suite enforces the following quantitative quality gates:

| Quality Gate | Minimum Requirement | Verified Status |
|---|---|---|
| **Total Test Cases** | $\ge 71$ tests | **72 tests configured** |
| **Tier 1 (Feature Coverage)** | $\ge 5$ tests per component ($\ge 30$ total) | 30 tests |
| **Tier 2 (Boundary & Corner)** | $\ge 5$ tests per component ($\ge 30$ total) | 30 tests |
| **Tier 3 (Cross-Feature Combinations)**| $\ge 6$ tests | 7 tests |
| **Tier 4 (Real-World Scenarios)** | $\ge 5$ tests | 5 tests |
| **Unhandled Exception Tolerance** | 0 unhandled exceptions on invalid input | 0 exceptions (100% fail-safe) |
| **TypeScript Typecheck** | 0 errors (`npm run typecheck`) | Clean |
| **ESLint Static Analysis** | 0 errors/warnings (`npm run lint`) | Clean |

---

## 5. Execution Command & Continuous Verification

The E2E test suite is executed directly via `tsx`:

```bash
# Run the complete E2E test suite
npx tsx --test tests/intelligent-ui-e2e.test.ts

# Run the complete workspace test suite
npm test
```
