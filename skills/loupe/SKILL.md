---
name: loupe
description: Turn a proposed change into a structured, visual spec-review surface the developer can grasp by looking and clicking instead of reading walls of text, using the loupe CLI. Use in the spec phase, before building: when scoping a change, aligning on impact, or pinning down requirements. Loupe guarantees an intention-first staged spine: ① Intention (current + target diagrams, acceptance criteria, usage scenarios, decision forks), ② Code perspective (blast radius derived from the real codebase), and ③ Destination (before -> after + plan + validation), filled progressively as each stage locks.
argument-hint: <the change to inspect before building>
author: jerry5789k1 (fork of lavish-axi by Kun Chen)
metadata:
  hermes:
    tags: [spec, review, visualization, html]
    category: productivity
---

# Loupe

Loupe turns a proposed change into a structured visual review surface for the spec phase, so developers grasp a change by looking and clicking instead of reading walls of text. Every Loupe artifact follows the same intention-first staged spine: ① Intention (current + target diagrams, acceptance criteria, usage scenarios, and the decision forks worth the developer's judgment), ② Code perspective (the blast radius derived by tracing the goal through the real codebase), and ③ Destination (the before -> after plus a work-DAG plan and a validation pass against the acceptance criteria). The agent fills it progressively — each stage is derived only after the one above it is locked. Run `loupe new <html-file>` to scaffold that structure, fill ① first, then `loupe <html-file>` to open the review and `loupe poll <html-file>` to receive the developer's decisions and annotations.

Loupe runs through the `loupe` CLI (a fork of lavish-axi). The commands below assume `loupe`
is on your PATH; if it is not, run it on demand with `npx -y @marshalliqiu/loupe ...` (no install
needed), or from a source checkout as `node bin/lavish-axi.js ...`.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked `/loupe` explicitly - inspect that change now, following the workflow below.
If it is empty, infer the change to inspect from the conversation.

## When to use

Use loupe when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop

## Workflow

The scaffold is a three-stage spine. **Intention is the source of truth; everything downstream is derived from it.** Fill it PROGRESSIVELY — draw stage ② only after the developer locks ①, and ③ only after they approve ②. Never draw downstream before its upstream locks (a misread then costs only one redraw, not a cascade). The lock/approve signals are soft — the HTML is the source of truth and stays freely editable and annotatable.

1. `loupe new <html-file>` - scaffold the spine: ① Intention (current+target diagrams, acceptance criteria, usage scenarios, decision forks), ② Code perspective, ③ Destination, mermaid containers, and auto-wired forks. (Use `--product-only` to skip ②; `--greenfield` when there is no codebase.)
2. **Fill ① Intention only.** Draw the CURRENT state from the real code/context (factual) and the TARGET state as your read of the intent — color the blast radius (`class … hit`; quote labels with punctuation, e.g. `X["Pay (guest)"]`, since a bare `&` or `(` breaks the parse). Propose **acceptance criteria** — functional AND non-functional (latency, privacy, security, accessibility, cost): actively hunt the gaps the developer didn't state. Propose the **usage scenarios** as paths through the diagram. Write the **decision forks**: ONLY real forks (a choice that materially changes the spec AND needs the developer's judgment) — everything you can infer becomes a confirmable assumption drawn on the diagram, never a question. Each fork is opinionated (recommend one option + say why and the trade-off you bet on) and its options are compared as diagrams, not prose.
3. `loupe <html-file>` to open, then `loupe poll <html-file>` to long-poll for fork decisions and annotations. Stays silent until the developer acts - leave it running, never kill it. Each round the developer answers a batch of forks and sends once — redraw ONCE per round; never edit the artifact while they are reading or typing.
4. **Lock ① → derive ②.** When the poll returns `INTENTION LOCKED`, the intent + acceptance test are agreed. Now derive the **Code perspective**: trace the REAL codebase from the goal — the scope is DERIVED, not chosen (state it as one confirmable line, e.g. "Scope: single-module — boundary is `checkout/`"). If the trace stays in one module, focus on the interface + usage-scenario behavior diff; if it crosses modules, draw the high-level architecture (deep-module / improve-codebase-architecture thinking) with the blast radius and focus on interface contracts. Write the code forks. Greenfield (`--greenfield`) designs the architecture from scratch (`class … new`), no before/after. Then stop and let them review.
5. **Approve ② → derive ③.** When the poll returns `CODE PERSPECTIVE APPROVED`, fill the **Destination**: the before → after (ONE diagram, ONE purpose — the single relationship the change turns over, plus a one-line takeaway); the **work-DAG plan** (nodes = concrete changes, each tagged ⟵ with the locked decision it implements, edges = order/dependency, risky nodes ⚠); and the **validation pass** — prove with the design that every acceptance criterion and usage scenario is met, or name the ones that are not.
6. Reply with `loupe poll <html-file> --agent-reply "<message>"` to respond in the browser and keep the loop going.
7. `REOPEN INTENTION` means re-grill ①. Judge the magnitude: a detail refinement re-derives only the downstream that depends on what changed (use the plan's ⟵ links); a deviation from the overall goal restarts from scratch. Show which regime and the stale set before redrawing.
8. **Decide:** `DECISION: EXECUTE` means run `loupe spec <html-file>` to write the companion markdown spec, fill it with the agreed decisions, then begin implementing from it. `ADJUST` keeps iterating; `CANCEL` drops the change. Then `loupe end <html-file>`.

## Handling annotations (triage)

When the poll returns the developer's annotations, grade each one and respond accordingly (state the grade you assigned so they can correct it):

- **Tweak** — local/cosmetic (wording, a wrong arrow, a color, a mislabeled node, a corrected assumption on the diagram): patch the HTML in place, reply briefly.
- **Follow-up** — a question or request for detail ("why doesn't X happen?", "show the error path"): adjust the relevant section within the current stage, then reply.
- **Directional** — challenges the locked intention or the premise ("we shouldn't force this", "the real problem is Y"): do NOT silently redraw. Surface it and ask the developer to confirm reopening the intention before invalidating the derived stages; proceed only on explicit consent.

## Principles

- **The diagram is the message.** Decide by looking; use prose only for irreducible scalars. Prefer mermaid; remove any visual that does not increase understanding.
- **One diagram = one single purpose**, big enough to read. Split purposes instead of cramming or shrinking.
- **Render-simplicity:** the artifact is static HTML + mermaid + the standard SDK, and nothing else — no bespoke per-artifact JS.
- **Forks only, opinionated, visual.** Inferable things are confirmable assumptions on the diagram, not questions.
- **Turn-taking:** redraw once per submitted round; never edit while the developer is reading or typing.
- The structure is guaranteed by the scaffold - do not flatten it back into a wall of bullet points.
- Fix any `layout_warnings` the poll reports before involving the developer.

## Visual guidance

- Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance
- Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose
- Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view
- Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately

## Playbooks

Run `loupe playbook <id>` for focused, detailed guidance on any of these.
One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; use mermaid unless SVG is needed for richly annotated nodes.

- `diagram` - Map relationships, flows, state, and architecture
- `table` - Turn dense records into scan-friendly review surfaces
- `comparison` - Show options, tradeoffs, and current vs target behavior
- `plan` - Explain a product or technical plan before implementation
- `code` - Render source code, code files, patches, PR diffs, and before/after code inside Loupe artifacts
- `input` - Must be used when the agent needs to collect user input on decisions, choices, preferences, triage, scope, or other structured feedback from within the artifact
- `slides` - Create a deliberate presentation when slides are requested

## Commands & rules

- Loupe is for the spec phase. `loupe new <html-file>` scaffolds the intention-first spine: ① Intention, ② Code perspective, ③ Destination. Fill it PROGRESSIVELY. Fill ① only: draw current + target in mermaid (color the blast radius `class … hit`), propose acceptance criteria (functional AND non-functional) and usage scenarios, and write decision FORKS — only choices that materially change the spec and need the developer's judgment; everything you can infer becomes a confirmable assumption drawn on the diagram, never a question. Each fork is opinionated (recommend one option + why) with options compared as diagrams. When the poll returns `INTENTION LOCKED`, derive ② Code perspective: trace the REAL codebase from the goal — scope is DERIVED not chosen — and focus on interfaces (single-module: interface + behavior diff; cross-module: architecture view). When the poll returns `CODE PERSPECTIVE APPROVED`, derive ③ Destination: before → after (one diagram, one purpose) + a work-DAG plan whose nodes trace back to locked decisions with risky nodes flagged + a validation pass proving each acceptance criterion/scenario is met. `REOPEN INTENTION` re-grills ① (detail tweak → re-derive only the dependent subgraph; goal deviation → from scratch). `--product-only` skips ②; `--greenfield` designs ② from scratch (no before/after). The diagram is the message; one diagram one purpose; static HTML + mermaid only, no bespoke JS.
- Run `loupe <html-file>` to open or resume a Loupe review session
- Unless the user specifies another location, create HTML artifacts in the current working directory under `.lavish/`
- Lavish serves the html file through a local express.js server. If your html needs to reference other filesystem assets such as images, CSS, fonts, and local scripts, copy them into the same directory as the HTML file, then reference them with relative paths from that directory. Never prepend `/` to those asset paths - root paths won't work
- Run `loupe poll <html-file>` to wait for user feedback or browser-reported layout_warnings. It long-polls and stays silent until the user sends feedback, ends the session, or the real browser reports fresh layout_warnings, so leave it running - never kill it. Fix layout_warnings before involving the human. If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost
- Triage each annotation the poll returns and say which grade you assigned: a Tweak (local/cosmetic, including a corrected assumption on the diagram) -> patch the HTML in place; a Follow-up (a question / more detail) -> adjust that section within the current stage; Directional feedback (challenges the locked intention) -> do not silently redraw, ask the developer to confirm reopening the intention first.
- Run `loupe end <html-file>` to end a session
- Run `loupe stop` to shut down the background server (it also self-stops when idle or after the last session ends with nothing connected)
- Run `loupe playbook <playbook_id>` for focused artifact guidance. One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
- Loupe does not auto-inject any design system - artifacts stay portable so they render identically when opened directly without loupe running. Before writing any HTML, decide the design direction in this strict priority order, and only move to the next step when the current one truly yields nothing: (1) if the user asked for a specific look or named design system, use that; (2) otherwise you must first inspect the project the artifact is about - the subject or product whose content or UI it represents, which may differ from your current working directory - and match that project's design system: Tailwind or theme config, shared CSS variables or design tokens, component library, brand assets, or existing styled pages. If the artifact previews, proposes, or mocks a specific app's UI, render it in that app's own design system so it faithfully shows the product, even when you are running in a different repo; (3) only when both steps come up empty, use the Loupe-recommended Tailwind CSS browser runtime v4 + DaisyUI v5, available via CDN - run `loupe design` for a content-to-playbook router, a copy-pasteable CDN snippet, a Mermaid CDN snippet/init for diagrams, and the DaisyUI component reference, and prefer the Tailwind/DaisyUI CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user. When you deliver the artifact, state which of the three design sources you used and why.
- Use loupe when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop
