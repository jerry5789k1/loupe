# Loupe v1 — autonomous build decisions

This log records the judgment calls made while building v1 (L0–L3) without live
review, so they can be inspected after the fact. Scope was fixed earlier: v1 is
the single Product Lens path — §A Current World + Blast Radius → §B Grill → §C
Goal Vision — reusing lavish-axi's transport untouched (see ADR-0001..0003).

## D1 — Rename scope: surface only, keep lavish internals

`loupe` becomes the command and "Loupe" the product name in everything the user
or agent sees (CLI description, help, `next_step` instructions, the skill). But
the **internal plumbing keeps its lavish-axi identity**: the env var names
(`LAVISH_AXI_*`), the state dir (`~/.lavish-axi`), the server `app` id used for
the version handshake, the SSE/SDK globals (`window.lavish`, `data-lavish-*`,
`/sdk.js`), and the source entry filename (`bin/lavish-axi.js`).

Why: the transport is upstream's, and the fork's value is the structure layer on
top (ADR-0002). Keeping internal identifiers identical to upstream means we can
still pull upstream transport fixes with minimal merge pain, and the scaffold —
which talks to `window.lavish` — keeps working without touching the SDK/server.
Cost: some brand bleed in advanced help (it says `loupe` but references
`LAVISH_AXI_HOST` and `~/.lavish-axi`). Acceptable for v1; env-var aliases can be
added later if it grates.

## D2 — `package.json` exposes only the `loupe` bin (revised)

Initially the package also exposed a `lavish-axi` bin alias. That collided with the
**already globally-installed published `lavish-axi`** on `npm link` (EEXIST), and it
would have hijacked the user's upstream `lavish-axi` (which the SessionStart hook
uses). So the alias was dropped: the package exposes only `loupe`. The upstream
`lavish-axi` install is left untouched; `loupe` is the fork's command. Install with
`npm link` (or `npm i -g .`) from the repo after `pnpm run build`.

## D3 — Package name `loupe` despite the npm collision

There is already a popular `loupe` package on npm (used by chai). This fork is not
being published, so the local bin name is what matters. If it is ever published,
switch to a scoped name (e.g. `@<scope>/loupe`); the bin command can stay `loupe`.

## D4 — Scaffold is self-contained and portable

`loupe new` writes one HTML file that renders correctly when opened directly
(mermaid from CDN; Grill submit guarded on `window.lavish` so it degrades to a
local "answered" state with no server). This preserves lavish's portability
principle and lets the agent preview/edit the file before any server is running.

## D5 — Grill answers ride the existing queuePrompt round-trip

Each Grill Card auto-wires its submit to `window.lavish.queuePrompt` with a
per-question `queueKey` (so re-answering replaces the prior unsent answer rather
than stacking). A single "Send answers to agent" button calls
`sendQueuedPrompts`. No new transport endpoint was needed — this is exactly the
reuse ADR-0002 intends.

## D6 — Guidance layer replaces lavish's skill with a Loupe workflow

The skill/home guidance is rewritten to teach the Loupe loop explicitly: run
`loupe new`, fill §A + Blast Radius, replace the example Grill Cards with real
questions, open + poll, then redraw §C from the answers — under clarity-over-polish
with mermaid as the default. Without this, an agent would not know the structure
exists and would fall back to free-form HTML (the failure mode Loupe removes).

## D7 — Dual lens / Gate / persistence stay out of v1

Per the agreed cut (L0–L3), the Code Lens, the product→code Gate, the
annotation-grading loop, spec persistence, and the Execute handoff are deferred to
v2. v1 proves the core hypothesis (visual + click beats walls of text) on the
single Product Lens before that machinery is built on top of it.

## D8 — How far the rebrand reached, concretely

Rebranded to Loupe: the CLI description/help/`next_step` strings, the stderr poll
banners (`[loupe]`), the generated skill (`skills/loupe/SKILL.md`), the design
guidance prose, the **browser chrome** the developer actually sees (page title,
`Loupe · review` wordmark, layout-gate and presence copy), the playbook guidance
prose, `package.json` (name/description/bin/repo URLs), and the README + AGENTS.md
header. Left on lavish-axi by design (D1): `LAVISH_AXI_*` env vars, `~/.lavish-axi`
state dir, server `app` id, the `window.lavish` / `data-lavish-*` / `injectLavishSdk`
/ `isLavishUi` code+DOM contract, `bin/lavish-axi.js` source entry, and arbitrary
test temp-dir names.

## D9 — Rendering fix: avoid `&` in mermaid labels; explicit `mermaid.run()`

First open showed blank diagrams ("無法看"). Cause: node labels like
`Checkout & pay` — `&` is mermaid's "and" operator, so the diagram failed to
parse and rendered nothing. Fixed by keeping `&` out of labels (e.g. "Checkout
and pay") and noting it in the scaffold. Also switched the mermaid init from
`startOnLoad: true` to an explicit pinned-ESM `import` + `await mermaid.run()` to
remove a load-event race, with the raw `<pre class="mermaid">` source left as a
visible fallback if the CDN is unreachable. Verified by rendering the example in a
headless browser: §A draws with the blast-radius nodes highlighted, no console
errors.

Most reliable way to view an artifact: **open the file directly** (`open
examples/guest-checkout.html`) — a plain file:// page with no sandbox or layout
gate. The `loupe <file>` server path also works; add `--no-gate` to skip the
open-time layout curtain.

## Final v1 status

`pnpm run check` is green: build + lint + format + typecheck + **226 tests** (the
original 218 plus 8 for the scaffold) + skill freshness. New code: `src/scaffold.js`
and the `new` command in `src/cli.js`, covered by `test/scaffold.test.js`.

Try it:

```sh
node bin/lavish-axi.js new /tmp/demo.html --problem "..."   # or `loupe new` once linked
node bin/lavish-axi.js /tmp/demo.html                       # opens the review in a browser
```

Not committed — left in the working tree for review (no commit was requested).
`git -C ~/loupe status` / `git -C ~/loupe diff` shows everything.

## v2 — dual lens with hard gate (follow-up build)

Built the Code Lens + the product→code Gate (ADR-0004), the L4 cut deferred in D7.
`loupe new` now scaffolds two lenses; the Code Lens ships behind a lock overlay
and is filled only after the developer clicks "Lock product intent" (which signals
the agent via the existing queuePrompt round-trip). `--product-only` reproduces the
v1 single-lens artifact. Reopening the product intent from the Code Lens is an
explicit, consented click (Q6). Verified by headless render: the two-lens nav, the
🔒 gate, and the Product Lens §A all draw correctly with no console errors.
Still deferred: annotation-grading loop, persisted specs, Execute handoff.

## L6 — Execute handoff + companion spec (follow-up build)

Added the closing loop (ADR-0005): every artifact ends with a **Decision** section
(Execute / Adjust / Cancel). Execute signals the agent (via queuePrompt) to persist
the companion spec and implement. New `loupe spec <html>` writes `<stem>.spec.md` — a
terse decisions list + a link back to the canonical HTML — detecting product-only vs
dual-lens from the artifact. The HTML stays the canonical visual; the markdown is the
text source of truth for the implementing agent and version control. Example companion
filled at `examples/guest-checkout.spec.md`. Still deferred: annotation-grading loop,
richer greenfield mode.

## Soft-gate revision — the artifact must stay editable and annotatable

User feedback: the Code Lens lock overlay (blur + `pointer-events: none`) was wrong — it
**blocked annotation** on the Code Lens and made the HTML hard to modify, contradicting
"the HTML is the source of truth." Removed the overlay entirely. The Gate is now a **soft
signal**: the Code Lens is always visible, editable, and annotatable; locking the product
intent only tells the agent (via queuePrompt) to fill the Code Lens against an agreed change.
ADR-0004 amended. New standing rule baked into the scaffold and guidance: **nothing in a
Loupe artifact may block editing or annotation** (no `pointer-events: none`, no disabling of
content, no blocking overlays).

## L5 — annotation triage protocol (follow-up build)

Added the post-vision feedback grading (ADR-0006): the agent triages each annotation the poll returns
into **Tweak** (local → patch in place), **Follow-up** (question → answer in the section), or
**Directional** (challenges the agreed change → must ask the developer to confirm reopening the
product intent before redrawing). The agent states the grade it assigned so the developer can correct
it. This lives in the guidance layer (skill + home help) plus the existing reverse-gate consent
control — the grading is agent judgment over lavish's annotations, so there is no new UI on the
annotation surface (ADR-0002). This closes the interaction loop: §A → grill → §C → triaged
annotations → decision.

## L7 — greenfield mode (follow-up build)

`loupe new --greenfield` (ADR-0007) reshapes the Code Lens for projects with no codebase: §A becomes
"Proposed Architecture" (new pieces marked `class … new`, no blast radius), §C becomes a flat
"Interfaces & contracts to add" list (no before/after), and the companion spec switches to a
from-scratch framing. The mode is recorded as `data-loupe-greenfield` on the root so `loupe spec`
detects it. The Product Lens is unchanged (a new product still replaces a current way of doing
things). Brownfield remains the default. This completes the L0–L7 roadmap.

## Environment note (not a design decision)

`pnpm` on this machine is provided via corepack but its signature check is broken;
all pnpm/corepack calls need `COREPACK_INTEGRITY_KEYS=0`. `pnpm run check` runs
build + lint + format + typecheck + 226 tests + skill-freshness.
