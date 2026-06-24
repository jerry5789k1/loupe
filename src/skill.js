import { createHomeOutput } from "./cli.js";
import { PLAYBOOK_ROUTER_HELP } from "./playbooks.js";

// Trigger string agents match against to auto-load the skill. Outcome-focused so it
// fires on "about to align with the developer on a change before building it" intents.
export const SKILL_DESCRIPTION =
  "Turn a proposed change into a structured, visual spec-review surface the developer can " +
  "grasp by looking and clicking instead of reading walls of text, using the loupe CLI. Use in " +
  "the spec phase, before building: when scoping a change, aligning on impact, or pinning down " +
  "requirements. Loupe guarantees an intention-first staged spine: ① Intention (current + target " +
  "diagrams, acceptance criteria, usage scenarios, decision forks), ② Code perspective (blast radius " +
  "derived from the real codebase), and ③ Destination (before -> after + plan + validation), filled " +
  "progressively as each stage locks.";

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function playbookList(playbooks) {
  return playbooks.map((p) => `- \`${p.id}\` - ${p.use_when}`).join("\n");
}

/**
 * Render the installable SKILL.md for the loupe skill. The body mirrors what
 * `loupe` prints with no arguments (minus live session state), while the
 * frontmatter adds discovery metadata for Agent Skills and Hermes Agent.
 *
 * @returns {string} full SKILL.md contents including YAML frontmatter
 */
export function createSkillMarkdown() {
  const home = createHomeOutput({ bin: "loupe", sessions: [], includeSessions: false });

  return `---
name: loupe
description: ${SKILL_DESCRIPTION}
argument-hint: <the change to inspect before building>
author: jerry5789k1 (fork of lavish-axi by Kun Chen)
metadata:
  hermes:
    tags: [spec, review, visualization, html]
    category: productivity
---

# Loupe

${home.description}

Loupe runs through the \`loupe\` CLI (a fork of lavish-axi). The commands below assume \`loupe\`
is on your PATH; if it is not, run it on demand with \`npx -y @marshalliqiu/loupe ...\` (no install
needed), or from a source checkout as \`node bin/lavish-axi.js ...\`.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked \`/loupe\` explicitly - inspect that change now, following the workflow below.
If it is empty, infer the change to inspect from the conversation.

## When to use

${home.help[home.help.length - 1]}

## Workflow

The scaffold is a three-stage spine. **Intention is the source of truth; everything downstream is derived from it.** Fill it PROGRESSIVELY — draw stage ② only after the developer locks ①, and ③ only after they approve ②. Never draw downstream before its upstream locks (a misread then costs only one redraw, not a cascade). The lock/approve signals are soft — the HTML is the source of truth and stays freely editable and annotatable.

1. \`loupe new <html-file>\` - scaffold the spine: ① Intention (current+target diagrams, acceptance criteria, usage scenarios, decision forks), ② Code perspective, ③ Destination, mermaid containers, and auto-wired forks. (Use \`--product-only\` to skip ②; \`--greenfield\` when there is no codebase.)
2. **Fill ① Intention only.** Draw the CURRENT state from the real code/context (factual) and the TARGET state as your read of the intent — color the blast radius (\`class … hit\`; quote labels with punctuation, e.g. \`X["Pay (guest)"]\`, since a bare \`&\` or \`(\` breaks the parse). Propose **acceptance criteria** — functional AND non-functional (latency, privacy, security, accessibility, cost): actively hunt the gaps the developer didn't state. Propose the **usage scenarios** as paths through the diagram. Write the **decision forks**: ONLY real forks (a choice that materially changes the spec AND needs the developer's judgment) — everything you can infer becomes a confirmable assumption drawn on the diagram, never a question. Each fork is opinionated (recommend one option + say why and the trade-off you bet on) and its options are compared as diagrams, not prose.
3. \`loupe <html-file>\` to open, then \`loupe poll <html-file>\` to long-poll for fork decisions and annotations. Stays silent until the developer acts - leave it running, never kill it. Each round the developer answers a batch of forks and sends once — redraw ONCE per round; never edit the artifact while they are reading or typing.
4. **Lock ① → derive ②.** When the poll returns \`INTENTION LOCKED\`, the intent + acceptance test are agreed. Now derive the **Code perspective**: trace the REAL codebase from the goal — the scope is DERIVED, not chosen (state it as one confirmable line, e.g. "Scope: single-module — boundary is \`checkout/\`"). If the trace stays in one module, focus on the interface + usage-scenario behavior diff; if it crosses modules, draw the high-level architecture (deep-module / improve-codebase-architecture thinking) with the blast radius and focus on interface contracts. Write the code forks. Greenfield (\`--greenfield\`) designs the architecture from scratch (\`class … new\`), no before/after. Then stop and let them review.
5. **Approve ② → derive ③.** When the poll returns \`CODE PERSPECTIVE APPROVED\`, fill the **Destination**: the before → after (ONE diagram, ONE purpose — the single relationship the change turns over, plus a one-line takeaway); the **work-DAG plan** (nodes = concrete changes, each tagged ⟵ with the locked decision it implements, edges = order/dependency, risky nodes ⚠); and the **validation pass** — prove with the design that every acceptance criterion and usage scenario is met, or name the ones that are not.
6. Reply with \`loupe poll <html-file> --agent-reply "<message>"\` to respond in the browser and keep the loop going.
7. \`REOPEN INTENTION\` means re-grill ①. Judge the magnitude: a detail refinement re-derives only the downstream that depends on what changed (use the plan's ⟵ links); a deviation from the overall goal restarts from scratch. Show which regime and the stale set before redrawing.
8. **Decide:** \`DECISION: EXECUTE\` means run \`loupe spec <html-file>\` to write the companion markdown spec, fill it with the agreed decisions, then begin implementing from it. \`ADJUST\` keeps iterating; \`CANCEL\` drops the change. Then \`loupe end <html-file>\`.

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
- Fix any \`layout_warnings\` the poll reports before involving the developer.

## Visual guidance

${bullets(home.visual_guidance)}

## Playbooks

Run \`loupe playbook <id>\` for focused, detailed guidance on any of these.
${PLAYBOOK_ROUTER_HELP}
For flows, architecture, state, or sequence diagrams, do not hand-build boxes-and-arrows from div/flexbox; use mermaid unless SVG is needed for richly annotated nodes.

${playbookList(home.playbooks)}

## Commands & rules

${bullets(home.help)}
`;
}
