# Intention-first staged spine with fork-based grilling

**Supersedes [0004](0004-dual-lens-with-hard-gate.md).** The two-Lens-up-front shape (draw the
Product Lens and Code Lens scaffold, each with §A/§B/§C, then fill) caused the failure the tool was
meant to remove: the agent draws a lot at once, keeps editing while the developer watches, and a
shift in intent forces a wasteful full redraw. This ADR replaces it with a **progressive,
lock-gated spine** in which intention is the single source of truth and nothing downstream is drawn
until what it depends on is locked.

## The spine

```
developer describes the need
        │
        ▼
 ① INTENTION    agent draws CURRENT-state (factual, from code) immediately,
                and the TARGET-state diagram as its read of the intent;
                developer verifies/corrects ON the diagram → locks intention
        │
        ▼
 ② CODE PERSPECTIVE  (scope is DERIVED, not chosen — see below)
        ├─ trace touches multiple modules / crosses architecture
        │     → high-level code-structure view; design with deep-module
        │       (improve-codebase-architecture) knowledge; FOCUS = interface design
        └─ trace stays inside one module
              → FOCUS = interface + usage-scenario behavior difference
        │  developer approves interface + architecture + local behavior
        ▼
 ③ DESTINATION   before → after + execution plan, derived from the locked
                 decisions → developer approves the destination and the plan
```

Both the **product** perspective (intent ①) and the **code-structure** perspective (②) remain
first-class — but they are now *sequenced and scope-gated*, not two full lenses drawn up front. The
Code perspective is only as heavy as the change: a whole architecture view for cross-module/
architectural changes, just an interface + behavior-diff for a single-module change.

**Scope is derived, not chosen.** The set of modules ② must address is neither a developer pick nor
an agent guess-to-confirm. The agent *traces the real current codebase* from the locked goal to
the modules that must change to reach it; that traced set **is** the blast radius, and
"single-module vs architectural" is merely a label describing what the trace found (how many
boundaries it crossed), not a route anyone selects. The authority is the codebase. The only thing
the developer can correct is a *trace that missed a caller or dependency* — that fixes the analysis,
it does not override a decision. So scope is never a fork; getting it right means the agent must
actually read the code, not infer from the goal alone.

Progressive disclosure is the cost control the developer asked for: only the current stage is
drawn, so a misread of intent costs *one* target redraw, never a downstream cascade.

## Principles this rests on

- **The diagram is the message (diagram-first).** Loupe relieves cognitive load by letting the
  developer decide by *looking*. Falling back to prose to convey the model defeats the purpose. Text
  is the fallback only for irreducible scalars (a timeout value, a retry count) where a diagram would
  be decoration. This governs every surface, including forks and assumptions.
- **Render-simplicity rule B.** An artifact is **static HTML + mermaid + the standard Loupe SDK, and
  nothing else** — no bespoke per-artifact JS. (The 0.2.0 svg-pan-zoom diagram feature violates this
  and is to be retired.) "Diagram too small" is solved by the diagram discipline below, not by a JS
  zoom engine.
- **Diagram discipline.** The diagram is the highest-leverage element, so: make it big enough to read
  the detail, and **one diagram = one single purpose** (like maps — a road map and a metro map are
  separate). Never overload a single diagram.

## The grill (stage ① detail, reused wherever we grill)

- **Forks only.** A question earns a place only if (a) answering it differently changes the spec/plan
  *materially* and (b) it genuinely needs the developer's judgment (the agent cannot resolve it from
  code/context). Everything the agent *can* infer becomes a **confirmable assumption shown on the
  diagram** (correct it by annotating), never a question. This kills the "scattered, imprecise"
  question pile.
- **Out-of-box + trade-offs.** Grilling searches beyond the literal change for better approaches and
  presents them as options, each with its trade-off named. Every choice has a trade-off; surfacing the
  non-obvious ones is how the developer's trade-off instinct compounds with use.
- **Opinionated.** Each fork carries the agent's recommended option + its reasoning and the trade-off
  it is betting on — but never hides the alternatives or their trade-offs. A recommendation is a
  thinking target to react to, not a default that buries the menu.
- **Visual option-compare.** A fork's options are compared as small outcome *diagrams* side by side
  (text only for true scalars), so the developer chooses by comparing pictures.
- **Per-round batch of independent forks.** Each round shows every fork that is currently
  independent; the developer answers them all and submits once. A fork that genuinely depends on one
  of those answers is deferred to the next round, correctly framed. The agent does the dependency
  analysis silently.

## The spec's test — acceptance criteria & usage scenarios

Stage ① captures not just the intent but the **test** the design will be judged against:

- **Acceptance Criteria** — the conditions that must hold for the change to be accepted, spanning
  **functional** requirements (what it must do) *and* **non-functional** ones (how well — latency,
  privacy, security, accessibility, cost…). The agent **proposes a starter set from the understood
  intent and actively hunts the gaps** — especially the NFRs humans routinely forget — then the
  developer edits, deletes, or adds. The developer stays the authority; the agent's job is to make
  the spec *complete*, not just transcribe it. A proposed criterion the developer didn't mean also
  doubles as early intention-verification.
- **Usage Scenarios** — concrete situations the design must handle, each rendered diagram-first as a
  **traced path through the current/target diagram** (a scenario is a walk across the map), with each
  criterion linked to the scenario(s) that exercise it.

These are a **live guard**, not a one-time checklist: every redraw re-derives satisfaction, and a
fork option that would break a criterion is flagged (✗) at the moment of choice, so a decision can
never quietly violate the accepted test.

## The destination (stage ③)

③ has two halves, both diagram-first:

- **before → after** — one diagram, one purpose (the single relationship the change turns over),
  with a one-line takeaway. Says *where we're going*.
- **work-DAG** — the execution plan as a graph: nodes are concrete changes, edges are
  must-precede/depends-on, every node **traces back (⟵) to the locked decision it implements** so the
  plan cannot smuggle in scope the developer never approved, and risky/unknown nodes are flagged (⚠)
  where they'll be seen *before* approval. Says *in what order, and what could bite*. It collapses to a
  short ordered diff-list only when the work is genuinely linear and small — the same
  diagram-only-where-it-carries-meaning rule as forks.
- **validation pass** — the agent must *prove with the design* that it satisfies the ① acceptance
  test: it traces **each Usage Scenario** through the after-diagram and marks **each Acceptance
  Criterion** met / not-met, the diagram path itself being the evidence ("scenario S2 walks 1→3→4 →
  satisfies C1, C2; C3 NOT met because …"). A destination that cannot account for every criterion is
  not done — the unmet ones are named, not hidden.

## Lock / unlock semantics

Re-opening an upstream stage is gated by the **magnitude** of the change, judged by the agent:

- **detail refinement** (the overall goal still holds) → *diff-aware re-derivation*: walk the ⟵
  traceability links, find the downstream subgraph that depends on what changed, and redraw only
  that. A small tweak costs a small redraw.
- **deviation from the goal itself** → *from scratch*: the goal is the root of the derivation tree,
  so moving it invalidates everything below it; that full restart is legitimate, not waste.

The agent classifies which regime applies and **surfaces the call plus the stale set (highlighted on
the diagram) before redrawing**, so a misclassification — or a re-derivation blast radius the
developer disagrees with — is catchable and overridable. This keeps re-opening surgical for the
common case (the developer's explicit token concern) without letting a real pivot leave stale,
goal-contradicting diagrams standing.

## Status

Accepted. Resolved across the design tree: the spine; the diagram-first / render-simplicity /
diagram-discipline principles; the grill model (forks-only, opinionated, visual option-compare,
per-round batch of independents, confirmable assumptions on the diagram); scope-as-derived for ②;
the ③ destination (before→after + traceable, risk-flagged work-DAG); and lock/unlock semantics.
Follow-up implementation work (scaffold, skill guidance, retiring svg-pan-zoom) flows from here.
