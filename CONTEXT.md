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

---

> **Model in revision (ADR-0008).** The two-Lens-up-front shape (Lens / Gate / Scaffold of both lenses, each §A/§B/§C) is being superseded by an **intention-first staged spine**. The terms below are the language of that new model; **Lens** and **Gate** as "two full perspectives drawn up front with a checkpoint between" are retired — the product and code-structure perspectives survive as _sequenced, scope-gated stages_, not parallel lenses.

**Intention**:
The developer's actual goal for the change — what they want to be true after, not how to build it. The single source of truth a Loupe Session is organized around: it is captured and locked first (Stage ①), and everything downstream is derived from it, so re-opening it invalidates what follows.
_Avoid_: requirement, ask, spec (the Spec is the _output_; Intention is the _input_)

**Stage**:
One step of the spine, drawn only after the previous one is locked: ① Intention, ② Code Perspective, ③ Destination. Progressive disclosure — nothing in a later Stage is rendered until what it depends on is locked, so a change of mind upstream never forces a downstream redraw.
_Avoid_: phase, lens, section

**Decision Fork**:
A point where the design genuinely splits into two or more viable paths, the choice _materially_ changes the spec/plan, and _which_ path to take needs the developer's judgment (the agent cannot resolve it from code/context). The only thing that earns a grill question. Each Fork is opinionated (carries the agent's recommended option + reasoning) and its options are compared as small outcome diagrams, not a prose menu.
_Avoid_: question, choice, option (reserve "option" for the branches _within_ a Fork)

**Confirmable Assumption**:
Something the agent _can_ infer from the code or context, rendered on the diagram as a stated assumption the developer corrects by annotating — never asked as a question. The complement of a Decision Fork: inferable ⇒ assumption, judgment-required ⇒ fork.
_Avoid_: default, guess, prefilled answer

**Acceptance Criteria**:
The conditions that must hold for the change to be accepted — both **functional** (what it must do) and **non-functional** (how well: latency, privacy, security, accessibility, cost). Captured in Stage ① as the spec's test. The agent proposes a starter set and actively hunts the gaps (especially the NFRs humans forget); the developer is the authority and edits freely. A live guard, re-checked on every redraw — a fork option that would break one is flagged ✗ at the moment of choice.
_Avoid_: requirements, definition of done, checklist

**Usage Scenario**:
A concrete situation the design must handle, rendered diagram-first as a traced path through the Current/Target diagram (a scenario is a walk across the map). Each Acceptance Criterion links to the scenario(s) that exercise it; at the Destination the agent traces each scenario through the after-diagram to prove — or disprove — that the design satisfies the criteria.
_Avoid_: use case, user story, test case
