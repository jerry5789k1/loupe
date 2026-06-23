# 🔍 Loupe

**Inspect a change before you build it.**

Loupe is a spec-phase tool that turns a proposed change into a structured, interactive review
surface — so you grasp it by _looking_ and _clicking_ instead of reading walls of text. It is a
fork of [lavish-axi](https://github.com/kunchenguid/lavish-axi): it keeps lavish's transport
(local server, browser review, annotate, long-poll feedback) and adds a guaranteed structure on top.

Every Loupe artifact has the same three sections:

| Section              | What it shows                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **§A Current World** | A map of the relevant use cases as they are today, with the **blast radius** (the parts this change touches) highlighted.                       |
| **§B Grill**         | Interactive cards you answer by **clicking** — single/multi choice, with an open field on every card for nuance. Your answers shape the vision. |
| **§C Goal Vision**   | The **before → after** of the agreed change, re-drawn from your grill answers so the delta is visible at a glance.                              |

The structure is guaranteed by code (a scaffold), not by asking the agent nicely — so artifacts
can't decay into a bullet list of nouns. Diagrams default to **mermaid**: clarity over polish.

## Two lenses, one gate

A change has two truths to review, so every artifact has two **lenses**, with a hard **gate** between:

```
Product Lens                   §A use cases + blast radius · §B grill · §C UX before→after
      │   you click "Lock product intent"  ← the gate (a soft signal)
      ▼
Code Lens (filled after lock)  §A architecture + blast radius · §B grill · §C interface/arch before→after
```

The agent fills the Code Lens only after you agree the product change — then it reads the **real
codebase** (greenfield projects are designed from scratch). The gate is a _soft signal_: the Code
Lens is never locked or blurred, so the whole artifact stays freely editable and annotatable (the
HTML is the source of truth). Reopening the product intent from the Code Lens is an explicit click,
so a code note can't silently overturn the agreed product change. Use `loupe new --product-only` to
skip the Code Lens for small changes, or `loupe new --greenfield` when there is no codebase yet — the
Code Lens then becomes a from-scratch architecture proposal (§A proposed architecture, §C interfaces
to build) instead of a current → after.

## Flow

```
loupe new <file>   →  agent fills the Product Lens (§A + blast radius, Grill Cards)
       │
loupe <file>       →  you review, answer the Grill Cards by clicking, see §C before → after
       │
[Lock product intent]  →  agent reads the codebase, fills the Code Lens (§A/§B/§C)
       │
[Execute]          →  agent runs `loupe spec`, persists the decisions, starts building
```

Your annotations are **triaged**: a _tweak_ (wording, a wrong arrow) is patched in place; a
_follow-up_ (a question) is answered in the relevant section; _directional_ feedback (challenging the
agreed change) is never silently applied — the agent asks you to confirm reopening the product intent
first. The artifact ends with a **Decision** — Execute / Adjust / Cancel. Execute persists a companion
spec (`loupe spec <file>` → `<file>.spec.md`: the decisions + a link to the HTML) and hands the
change back to the agent to implement; it does not make you copy-paste a plan.

## Usage

```sh
loupe new spec/guest-checkout.html   # scaffold the §A/§B/§C structure
# (the agent fills the `LOUPE — fill:` slots: draws §A in mermaid, writes real Grill Cards)
loupe spec/guest-checkout.html       # open the review in your browser
loupe poll spec/guest-checkout.html  # long-poll for your grill answers and annotations
loupe spec spec/guest-checkout.html  # on Execute: write the companion spec (guest-checkout.spec.md)
```

`loupe new` also accepts `--title "..."`, `--problem "..."`, `--product-only`, `--greenfield`, and `--force`.

## Install

**Zero setup.** Loupe is an AXI — any capable agent can run the CLI with nothing installed. Just tell your agent:

> Use `npx @marshalliqiu/loupe new <file>` to map out what we discussed before building it.

**Session hook.** Want Loupe's ambient context — including your live open sessions — fed into every agent session instead of loading on demand? Install globally and opt into the hook:

```sh
npm install -g @marshalliqiu/loupe
loupe setup hooks
```

This installs a `SessionStart` hook for Claude Code, Codex, and OpenCode that surfaces open sessions, playbooks, and usage guidance at the start of each session. Restart your agent session afterward so the hook takes effect.

**From source.**

```sh
git clone https://github.com/jerry5789k1/loupe.git
cd loupe
pnpm install --frozen-lockfile
pnpm run build
npm link            # puts `loupe` on your PATH (or: pnpm link --global)
```

## Develop

```sh
pnpm install
pnpm run check   # build + lint + format + typecheck + tests + skill freshness
```

See [`CONTEXT.md`](CONTEXT.md) for the domain model, [`docs/adr/`](docs/adr) for the foundational
decisions, and [`docs/v1-build-decisions.md`](docs/v1-build-decisions.md) for how v1 was built.

## Status

Both lenses with the soft gate (Product → lock → Code, grounded in the real codebase), each with
§A Current World / §B Grill / §C Goal Vision, plus the Decision step: Execute persists a companion
spec and hands off to implementation. Deferred: the annotation-grading loop and richer greenfield
support.

---

Forked from [lavish-axi](https://github.com/kunchenguid/lavish-axi) by Kun Chen (MIT).
