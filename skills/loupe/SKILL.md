---
name: loupe
description: Turn a proposed change into a structured, visual spec-review surface the developer can grasp by looking and clicking instead of reading walls of text, using the loupe CLI. Use in the spec phase, before building: when scoping a change, aligning on impact, or pinning down requirements. Loupe guarantees a §A Current World (with blast radius), §B Grill (click-to-answer questions), and §C Goal Vision (before -> after).
argument-hint: <the change to inspect before building>
author: jerry5789k1 (fork of lavish-axi by Kun Chen)
metadata:
  hermes:
    tags: [spec, review, visualization, html]
    category: productivity
---

# Loupe

Loupe turns a proposed change into a structured visual review surface for the spec phase, so developers grasp a change by looking and clicking instead of reading walls of text. Every Loupe artifact has the same guaranteed shape: §A Current World (a map of the relevant use cases with the blast radius highlighted), §B Grill (interactive cards the developer answers by clicking, each with an open field), and §C Goal Vision (a before -> after of the agreed change). Run `loupe new <html-file>` to scaffold that structure, fill the marked slots, then `loupe <html-file>` to open the review and `loupe poll <html-file>` to receive the developer's grill answers and annotations.

Loupe runs through the `loupe` CLI (a fork of lavish-axi). The commands below assume `loupe`
is on your PATH; if it is not, run it from the repo as `node bin/lavish-axi.js ...`.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked `/loupe` explicitly - inspect that change now, following the workflow below.
If it is empty, infer the change to inspect from the conversation.

## When to use

Use loupe when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop

## Workflow

The scaffold has two lenses with a Gate between them. Fill the Product Lens first; leave the Code Lens empty until the developer locks the product intent (the Gate is a soft signal — it never blocks editing or annotation of the always-visible Code Lens).

1. `loupe new <html-file>` - scaffold two lenses (Product + Code), each with §A Current World, §B Grill, §C Goal Vision, mermaid containers, and auto-wired Grill Cards. (Use `--product-only` for a small change that needs no architecture review.)
2. Fill the **Product Lens**: §A as the real use-case flow with the blast radius colored (`class … hit`; quote mermaid labels with punctuation, e.g. `X["Pay (guest)"]`, since a bare `&` or `(` breaks the parse); §B with real click-to-answer Grill Cards.
3. `loupe <html-file>` to open, then `loupe poll <html-file>` to long-poll for grill answers and annotations. Stays silent until the developer acts - leave it running, never kill it.
4. When product answers arrive, fill §C Product Goal Vision (before -> after UX), aligned with §A.
5. **Gate:** when the poll returns `PRODUCT INTENT LOCKED`, the developer has agreed the product change. Now read the REAL codebase and fill the **Code Lens**: §A current architecture + blast radius, architecture Grill Cards, then (after their answers) the interface/architecture before -> after. Greenfield? Pass `loupe new --greenfield` and the Code Lens is already shaped for from-scratch design (§A proposed architecture marking new pieces, §C interfaces/contracts to add, no before/after) — design it from the agreed product intent. `REOPEN PRODUCT INTENT` means a code finding changed their mind - go back and re-grill the Product Lens.
6. Reply with `loupe poll <html-file> --agent-reply "<message>"` to respond in the browser and keep the loop going, iterating on annotations.
7. **Decide:** the artifact ends with Execute / Adjust / Cancel. `DECISION: EXECUTE` means run `loupe spec <html-file>` to write the companion markdown spec, fill it with the agreed decisions, then begin implementing from it. `ADJUST` keeps iterating; `CANCEL` drops the change. Then `loupe end <html-file>`.

## Handling annotations (triage)

When the poll returns the developer's annotations, grade each one and respond accordingly (state the grade you assigned so they can correct it):

- **Tweak** — local/cosmetic (wording, a wrong arrow, a color, a mislabeled node): patch the HTML in place, reply briefly.
- **Follow-up** — a question or request for detail ("why doesn't X happen?", "show the error path"): adjust the relevant section within the current lens, then reply.
- **Directional** — challenges the agreed product intent or the premise ("we shouldn't force this", "the real problem is Y"): do NOT silently redraw. Surface it and ask the developer to confirm reopening the product intent (the reverse gate) before invalidating the Code Lens; proceed only on explicit consent.

## Principles

- Clarity over polish: prefer mermaid; remove any visual that does not increase understanding.
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

- Loupe is for the spec phase. `loupe new <html-file>` scaffolds two lenses, each with §A Current World / §B Grill / §C Goal Vision. Fill the Product Lens first (draw §A in mermaid and color the blast radius `class … hit`, write real click-to-answer Grill Cards, redraw §C from the answers). Leave the Code Lens empty until the developer clicks `Lock product intent` (a soft signal — the Code Lens is always visible/editable/annotatable): when the poll returns `PRODUCT INTENT LOCKED`, read the real codebase and fill the Code Lens (current architecture + blast radius, architecture Grill Cards, interface/architecture before -> after); greenfield projects are designed from scratch. `REOPEN PRODUCT INTENT` means go back to the Product Lens. Use `--product-only` for small changes, or `--greenfield` when there is no codebase (the Code Lens becomes a from-scratch architecture proposal, no before/after). Open with `loupe <html-file>` and poll for answers, gate signals, and annotations. Clarity over polish: prefer mermaid, drop any visual that does not aid understanding.
- Run `loupe <html-file>` to open or resume a Loupe review session
- Unless the user specifies another location, create HTML artifacts in the current working directory under `.lavish/`
- Lavish serves the html file through a local express.js server. If your html needs to reference other filesystem assets such as images, CSS, fonts, and local scripts, copy them into the same directory as the HTML file, then reference them with relative paths from that directory. Never prepend `/` to those asset paths - root paths won't work
- Run `loupe poll <html-file>` to wait for user feedback or browser-reported layout_warnings. It long-polls and stays silent until the user sends feedback, ends the session, or the real browser reports fresh layout_warnings, so leave it running - never kill it. Fix layout_warnings before involving the human. If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost
- Triage each annotation the poll returns and say which grade you assigned: a Tweak (local/cosmetic) -> patch the HTML in place; a Follow-up (a question / more detail) -> adjust that section within the current lens; Directional feedback (challenges the agreed product intent) -> do not silently redraw, ask the developer to confirm reopening the product intent first.
- Run `loupe end <html-file>` to end a session
- Run `loupe stop` to shut down the background server (it also self-stops when idle or after the last session ends with nothing connected)
- Run `loupe playbook <playbook_id>` for focused artifact guidance. One artifact often combines several playbooks (for example a plan that includes a comparison and a diagram), so MUST open each matching playbook before writing HTML.
- Loupe does not auto-inject any design system - artifacts stay portable so they render identically when opened directly without loupe running. Before writing any HTML, decide the design direction in this strict priority order, and only move to the next step when the current one truly yields nothing: (1) if the user asked for a specific look or named design system, use that; (2) otherwise you must first inspect the project the artifact is about - the subject or product whose content or UI it represents, which may differ from your current working directory - and match that project's design system: Tailwind or theme config, shared CSS variables or design tokens, component library, brand assets, or existing styled pages. If the artifact previews, proposes, or mocks a specific app's UI, render it in that app's own design system so it faithfully shows the product, even when you are running in a different repo; (3) only when both steps come up empty, use the Loupe-recommended Tailwind CSS browser runtime v4 + DaisyUI v5, available via CDN - run `loupe design` for a content-to-playbook router, a copy-pasteable CDN snippet, a Mermaid CDN snippet/init for diagrams, and the DaisyUI component reference, and prefer the Tailwind/DaisyUI CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user. When you deliver the artifact, state which of the three design sources you used and why.
- Use loupe when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop
