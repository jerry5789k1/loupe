# Loupe

Loupe is a spec-phase tool, forked from lavish-axi. Before an AI agent commits to building a change, Loupe turns that change into an interactive, visual review surface — so the developer understands it by _looking_ and _clicking_ instead of reading walls of text. The name comes from a jeweler's loupe: pick it up, inspect the change up close, then decide whether to proceed.

## Language

**Loupe Session**:
One run of the tool over a single proposed change: from the developer's initial description, through grilling, to the execute/cancel decision.
_Avoid_: review, ticket

**Current World** (§A):
The conceptual diagram of how things are _before_ the change, with the affected parts highlighted. The first thing the developer sees. Has two layers: the base map (relevant use cases / existing architecture) and the highlight overlay (Blast Radius).
_Avoid_: as-is, status quo diagram, baseline

**Blast Radius**:
The set of parts (use cases, modules, interfaces) that this change will touch, drawn as a highlight layer on top of the Current World. The thing mermaid's plain boxes could not express — Loupe's reason to exist.
_Avoid_: scope, impact area, affected set

**Lens**:
One of the two perspectives every change is reviewed through. The **Product Lens** (use cases, user impact, UX) is always settled first; the **Code Lens** (architecture, interfaces, module relationships) is opened only after the Product Lens is locked.
_Avoid_: view, angle, perspective (use "Lens")

**Gate**:
The checkpoint between the two Lenses. A _soft signal_, not a UI lock: the agent leaves the Code Lens empty until the developer locks the Product intent, but the Code Lens is always visible, editable, and annotatable (the artifact stays the source of truth). Passing the Gate in reverse (a Code-Lens finding overturns the Product intent) requires an explicit developer signal — it never happens silently.
_Avoid_: phase, step, stage, lock

**Grill** / **Grill Card**:
The interactive Q&A that sharpens detail and validates goals between Current World and Goal Vision. Each question is a **Grill Card** — a structured, clickable element (choice, toggle, slider, mark-on-diagram), and every card also carries an open-ended answer field as an escape hatch. Answers poll back to drive the next render.
_Avoid_: questionnaire, form, interview

**Goal Vision** (§C):
The before → after conceptual diagram, generated from the developer's grill answers. Rendered per Lens: UX before/after under the Product Lens; interface + architecture before/after under the Code Lens.
_Avoid_: proposal, target state, after diagram

**Spec**:
What a completed Loupe Session persists. Two faces of one artifact: the **canonical** is a portable HTML file (the diagrams, viewable without a server); the **companion** is a terse markdown file in the repo (decision list + link, for the agent to re-read and for version control).
_Avoid_: doc, plan, PRD

**Scaffold**:
The code-generated skeleton Loupe guarantees for every Session: the section structure, the Gate between Lenses, the mermaid containers, and the interactive components — into which the agent fills content. The structure is enforced by code; the meaning of each diagram is supplied by the agent. This is what Loupe adds on top of lavish-axi's transport layer.
_Avoid_: template, skeleton, layout

**Execute**:
The developer's final decision to green-light the change. Hands the locked Spec back to the coding agent to begin implementation — not a copy-paste handoff. Its opposites are Cancel and Adjust.
_Avoid_: approve, ship, commit
