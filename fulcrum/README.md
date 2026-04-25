# Fulcrum — The AI Scientist

> Challenge 04 · MIT Club of Northern California × MIT Club of Germany · Powered by Fulcrum Science

A frontend for an AI lab operations engine that compiles scientific hypotheses into source-grounded, executable experiment plans. Designed to plug directly into a Next.js / FastAPI / Tavily / vector-DB backend.

## Stack

- **Next.js 14** (App Router) + React 18
- **TypeScript** (strict)
- **Tailwind CSS** with a custom editorial design system
- **Framer Motion** for orchestrated reveals and overlay transitions
- **Lucide** for icons
- **Fraunces** (display) + **JetBrains Mono** (technical) via Google Fonts

## Run locally

```bash
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

or:

```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Visit http://localhost:3000.

## Project layout

```
app/
  layout.tsx          # Root layout, font loading
  page.tsx            # Main orchestrator — wires every panel together
  globals.css         # Design system, paper texture, scan lines
components/
  Masthead.tsx        # Editorial header with section nav
  HypothesisInput.tsx # §01 input + sample hypothesis cards
  KnowledgeUpload.tsx # local SOP/runbook/prior-run upload and embedding trigger
  CompilingOverlay.tsx# 8-stage animated compile sequence
  LiteratureQC.tsx    # §02 novelty signal + references
  SopMatchPanel.tsx   # §03 SOP fit analysis with confidence dial
  IntentCard.tsx      # Structured intent sidebar card
  WorkflowSummary.tsx # 6-cell stats banner
  WorkflowStepper.tsx # §04 vertical step list with classification badges
  StepInspector.tsx   # Right-drawer with decision-branch UI
  PlanTabs.tsx        # §05 materials/budget/timeline/validation/risks
  Trace.tsx           # §06 execution trace + SOP improvement signals
lib/
  api.ts              # FastAPI client
  mock-workflow.ts    # HeLa trehalose canonical demo workflow
  samples.ts          # All four challenge sample hypotheses
  display.ts          # Classification metadata, formatters
types/
  index.ts            # Full data model — mirrors backend schemas
```

## Backend

Run the FastAPI backend from `../backend` on port `8000`. The frontend calls it through `NEXT_PUBLIC_API_URL`.

Endpoints expected:

| Method | Path                                       | Returns               |
|--------|--------------------------------------------|-----------------------|
| POST   | `/api/intent`                              | `{ structured_intent }` |
| POST   | `/api/workflows/compile`                   | `{ workflow }`        |
| POST   | `/api/workflows/{id}/decisions`            | `{ workflow, trace_event }` |
| POST   | `/api/workflows/{id}/steps/{id}/modify`    | `{ workflow, trace_event }` |
| POST   | `/api/workflows/{id}/feedback`             | `{ ok: true }`        |
| GET    | `/api/workflows/{id}/trace`                | `{ events: [] }`      |
| GET    | `/api/sop-improvements`                    | `{ recommendations }` |

These match §20 of the implementation plan exactly.

## Design notes

The aesthetic is **scientific instrument / editorial**: paper-textured background, ink-black text, a single rust accent, corner crop marks on key panels, and small-caps mono labels throughout — meant to feel like a precision tool rather than a SaaS dashboard. Fraunces is used at multiple optical sizes; the display weight uses variable-font features (`opsz`, `SOFT`) for the masthead. JetBrains Mono handles all technical labels, catalog numbers, and tabular numerics.

## Demo flow

1. Land on the input page. Click any of the four sample hypotheses (HeLa trehalose, CRP biosensor, L. rhamnosus, Sporomusa).
2. Hit **Compile experiment plan** → 8-stage overlay runs, then results scroll into view.
3. Top-line stats banner shows step count, open decisions, external refs, schedule, budget, and SOP signals.
4. **Literature QC** shows novelty verdict + 3 references.
5. **SOP Match** shows confidence dial (78%), exact-reuse / adapt / missing columns.
6. **Workflow Stepper** — 10 steps with classification badges. Click any step to open the inspector drawer.
7. Click decision step (e.g. "Select trehalose delivery method") → 3 branch options with tradeoffs, risks, sources, and a recommendation marker. Pick one, leave a note, hit **Commit decision** → workflow recompiles, trace updates.
8. **Plan Tabs**: Materials with real catalog numbers, Budget with horizontal bars and confidence flags, Timeline as a Gantt-style chart, Validation primary/secondary endpoints, Risks by severity.
9. **SOP Improvement Signals** — surfaced when 87% of prior runs modified the same step.
10. Right sidebar holds a structured-intent card and a live execution trace.

## License

Hackathon project. Use freely.
