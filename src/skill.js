import { createHomeOutput } from "./cli.js";
import { PLAYBOOK_ROUTER_HELP } from "./playbooks.js";

// Trigger string agents match against to auto-load the skill. Outcome-focused so it
// fires on "about to align with the developer on a change before building it" intents.
export const SKILL_DESCRIPTION =
  "Turn a proposed change into a structured, visual spec-review surface the developer can " +
  "grasp by looking and clicking instead of reading walls of text, using the loupe CLI. Use in " +
  "the spec phase, before building: when scoping a change, aligning on impact, or pinning down " +
  "requirements. Loupe guarantees a §A Current World (with blast radius), §B Grill (click-to-answer " +
  "questions), and §C Goal Vision (before -> after).";

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
is on your PATH; if it is not, run it from the repo as \`node bin/lavish-axi.js ...\`.

## Request

$ARGUMENTS

If the request above is non-empty, the user invoked \`/loupe\` explicitly - inspect that change now, following the workflow below.
If it is empty, infer the change to inspect from the conversation.

## When to use

${home.help[home.help.length - 1]}

## Workflow

The scaffold has two lenses with a Gate between them. Fill the Product Lens first; leave the Code Lens empty until the developer locks the product intent (the Gate is a soft signal — it never blocks editing or annotation of the always-visible Code Lens).

1. \`loupe new <html-file>\` - scaffold two lenses (Product + Code), each with §A Current World, §B Grill, §C Goal Vision, mermaid containers, and auto-wired Grill Cards. (Use \`--product-only\` for a small change that needs no architecture review.)
2. Fill the **Product Lens**: §A as the real use-case flow with the blast radius colored (\`class … hit\`; quote mermaid labels with punctuation, e.g. \`X["Pay (guest)"]\`, since a bare \`&\` or \`(\` breaks the parse); §B with real click-to-answer Grill Cards.
3. \`loupe <html-file>\` to open, then \`loupe poll <html-file>\` to long-poll for grill answers and annotations. Stays silent until the developer acts - leave it running, never kill it.
4. When product answers arrive, fill §C Product Goal Vision (before -> after UX), aligned with §A.
5. **Gate:** when the poll returns \`PRODUCT INTENT LOCKED\`, the developer has agreed the product change. Now read the REAL codebase and fill the **Code Lens**: §A current architecture + blast radius, architecture Grill Cards, then (after their answers) the interface/architecture before -> after. Greenfield? Pass \`loupe new --greenfield\` and the Code Lens is already shaped for from-scratch design (§A proposed architecture marking new pieces, §C interfaces/contracts to add, no before/after) — design it from the agreed product intent. \`REOPEN PRODUCT INTENT\` means a code finding changed their mind - go back and re-grill the Product Lens.
6. Reply with \`loupe poll <html-file> --agent-reply "<message>"\` to respond in the browser and keep the loop going, iterating on annotations.
7. **Decide:** the artifact ends with Execute / Adjust / Cancel. \`DECISION: EXECUTE\` means run \`loupe spec <html-file>\` to write the companion markdown spec, fill it with the agreed decisions, then begin implementing from it. \`ADJUST\` keeps iterating; \`CANCEL\` drops the change. Then \`loupe end <html-file>\`.

## Handling annotations (triage)

When the poll returns the developer's annotations, grade each one and respond accordingly (state the grade you assigned so they can correct it):

- **Tweak** — local/cosmetic (wording, a wrong arrow, a color, a mislabeled node): patch the HTML in place, reply briefly.
- **Follow-up** — a question or request for detail ("why doesn't X happen?", "show the error path"): adjust the relevant section within the current lens, then reply.
- **Directional** — challenges the agreed product intent or the premise ("we shouldn't force this", "the real problem is Y"): do NOT silently redraw. Surface it and ask the developer to confirm reopening the product intent (the reverse gate) before invalidating the Code Lens; proceed only on explicit consent.

## Principles

- Clarity over polish: prefer mermaid; remove any visual that does not increase understanding.
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
