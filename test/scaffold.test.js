import assert from "node:assert/strict";
import test from "node:test";

import {
  createNewOutput,
  createSpecOutput,
  deriveTitleFromPath,
  normalizeArgv,
  telemetryCommandName,
} from "../src/cli.js";
import { createScaffoldHtml } from "../src/scaffold.js";
import { createSpecMarkdown, deriveSpecPath } from "../src/spec.js";

test("scaffold guarantees the three-stage spine, in order (ADR-0008)", () => {
  const html = createScaffoldHtml({ title: "Guest checkout" });
  const ids = ["intention", "code", "destination"];
  const positions = ids.map((id) => html.indexOf(`id="${id}"`));
  assert.ok(
    positions.every((p) => p > -1),
    "all three stages present",
  );
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i] > positions[i - 1], `${ids[i]} comes after ${ids[i - 1]}`);
  }
  assert.match(html, /data-loupe-scaffold="v3"/);
});

test("stage ① intention carries the acceptance test (criteria + scenarios) and forks", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /data-loupe-criteria="functional"/);
  assert.match(html, /data-loupe-criteria="non-functional"/);
  assert.match(html, /data-loupe-scenarios/);
  assert.match(html, /data-loupe-fork/, "decision forks present");
  // current + target picture, verified on the diagram
  assert.match(html, /Current/);
  assert.match(html, /Target/);
});

test("forks are opinionated: a recommended option and a per-option trade-off", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /data-recommended/, "one option is marked recommended");
  assert.match(html, /loupe-opt-trade/, "options carry a gain/cost trade-off");
  assert.match(html, /loupe-fork-why/, "the agent's reasoning slot is present");
});

test("nothing blocks editing or annotation (HTML is the source of truth)", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.doesNotMatch(html, /loupe-lock-overlay/, "no blocking lock overlay");
  // pointer-events:none must never sit on content — the v3 scaffold has none at all.
  for (const line of html.match(/[^\n]*pointer-events: none[^\n]*/g) || []) {
    assert.fail(`unexpected pointer-events:none — would block interaction: ${line}`);
  }
});

test("lock / approve / reopen send the staged signals to the agent", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /data-loupe-lock/, "lock intention control");
  assert.match(html, /data-loupe-approve="code"/, "approve code perspective control");
  assert.match(html, /data-loupe-reopen/, "reopen intention control");
  assert.match(html, /INTENTION LOCKED/);
  assert.match(html, /CODE PERSPECTIVE APPROVED/);
  assert.match(html, /REOPEN INTENTION/);
});

test("--product-only drops the ② code stage but keeps ① and ③", () => {
  const html = createScaffoldHtml({ title: "x", productOnly: true });
  assert.match(html, /id="intention"/);
  assert.match(html, /id="destination"/);
  assert.match(html, /data-loupe-product-only="true"/);
  assert.doesNotMatch(html, /id="code"/, "no code perspective stage");
});

test("--greenfield designs ② from scratch (no before/after)", () => {
  const html = createScaffoldHtml({ title: "x", greenfield: true });
  assert.match(html, /data-loupe-greenfield="true"/, "root marks greenfield for `loupe spec` to detect");
  assert.match(html, /from scratch/i);
  assert.match(html, /classDef new/);
  assert.match(html, /id="code"/);
});

test("the default (brownfield) ② derives scope from the real codebase", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.doesNotMatch(html, /data-loupe-greenfield/);
  assert.match(html, /Scope is <b>derived, not chosen<\/b>|derived, not chosen/);
  assert.match(html, /data-loupe-scope/);
});

test("--product-only wins over --greenfield (no ② stage at all)", () => {
  const html = createScaffoldHtml({ title: "x", productOnly: true, greenfield: true });
  assert.doesNotMatch(html, /id="code"/);
  assert.doesNotMatch(html, /data-loupe-greenfield/);
});

test("scaffold embeds the title and problem", () => {
  const html = createScaffoldHtml({ title: "Guest checkout", problem: "Forced login kills conversions" });
  assert.match(html, /<h1>Guest checkout<\/h1>/);
  assert.match(html, /Forced login kills conversions/);
});

test("scaffold escapes HTML in title and problem", () => {
  const html = createScaffoldHtml({ title: "<script>x</script>", problem: 'a "b" <c>' });
  assert.doesNotMatch(html, /<h1><script>x<\/script><\/h1>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(html, /a &quot;b&quot; &lt;c&gt;/);
});

test("scaffold wires mermaid, the hit (blast radius) classDef, and fork auto-wiring", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /mermaid@11/);
  assert.match(html, /classDef hit/);
  assert.match(html, /form\[data-loupe-fork\]/);
  assert.match(html, /window\.lavish/);
});

test("render-simplicity rule B: static HTML + mermaid only, NO bespoke JS (pan/zoom retired)", () => {
  const html = createScaffoldHtml({ title: "x" });
  // useMaxWidth:true lets mermaid fit the container width — one diagram, one purpose.
  assert.match(html, /useMaxWidth: true/);
  // the v2 svg-pan-zoom engine and its API are gone.
  assert.doesNotMatch(html, /svg-pan-zoom/);
  assert.doesNotMatch(html, /zoomAtPointBy/);
  assert.doesNotMatch(html, /controlIconsEnabled/);
  // mermaid is the only imported module besides the standard SDK.
  const imports = [...html.matchAll(/import .* from "[^"]+"/g)].map((m) => m[0]);
  assert.ok(
    imports.every((line) => line.includes("mermaid")),
    `only mermaid is imported, got: ${imports.join(" | ")}`,
  );
});

test("interactions degrade gracefully without window.lavish", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /if \(!\(window\.lavish && typeof window\.lavish\.queuePrompt === "function"\)\) return;/);
  assert.match(html, /setAttribute\("data-answered", "true"\)/);
});

test("deriveTitleFromPath humanizes the filename", () => {
  assert.equal(deriveTitleFromPath("/tmp/guest-checkout.html"), "Guest checkout");
  assert.equal(deriveTitleFromPath("add_dark_mode.htm"), "Add dark mode");
  assert.equal(deriveTitleFromPath(".html"), "Untitled change");
});

test("createNewOutput reports the full progressive spine by default", () => {
  const out = createNewOutput({ file: "/abs/x.html" });
  assert.deepEqual(out.scaffold.stages, ["① Intention", "② Code perspective", "③ Destination"]);
  assert.equal(out.scaffold.progressive, true);
  assert.match(out.next_step, /stage ① Intention ONLY/);
  assert.match(out.next_step, /INTENTION LOCKED/);
  assert.match(out.next_step, /CODE PERSPECTIVE APPROVED/);
  assert.match(out.next_step, /loupe \/abs\/x\.html/);
});

test("createNewOutput in product-only mode reports two stages and no ② derivation", () => {
  const out = createNewOutput({ file: "/abs/x.html", productOnly: true });
  assert.deepEqual(out.scaffold.stages, ["① Intention", "③ Destination"]);
  assert.doesNotMatch(out.next_step, /CODE PERSPECTIVE APPROVED.*INTENTION LOCKED/s);
  assert.doesNotMatch(out.next_step, /trace the REAL codebase/);
});

test("createNewOutput in greenfield mode tells the agent to design from scratch", () => {
  const out = createNewOutput({ file: "/abs/x.html", greenfield: true });
  assert.equal(out.scaffold.mode, "greenfield");
  assert.match(out.next_step, /FROM SCRATCH/);
});

test("scaffold ends with a Decision section offering execute / adjust / cancel", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /id="decision"/);
  assert.match(html, /data-loupe-decision="execute"/);
  assert.match(html, /data-loupe-decision="adjust"/);
  assert.match(html, /data-loupe-decision="cancel"/);
  assert.match(html, /DECISION: EXECUTE/);
  assert.match(html, /loupe spec/);
});

test("product-only scaffold still has a Decision section", () => {
  const html = createScaffoldHtml({ title: "x", productOnly: true });
  assert.match(html, /id="decision"/);
  assert.match(html, /data-loupe-decision="execute"/);
});

test("deriveSpecPath maps the html path to a sibling .spec.md", () => {
  assert.equal(deriveSpecPath("spec/guest-checkout.html"), "spec/guest-checkout.spec.md");
  assert.equal(deriveSpecPath("/abs/x.htm"), "/abs/x.spec.md");
});

test("companion spec carries the title, a link back, and the staged decisions", () => {
  const md = createSpecMarkdown({ title: "Guest checkout", htmlBasename: "guest-checkout.html" });
  assert.match(md, /# Guest checkout — spec/);
  assert.match(md, /\]\(\.\/guest-checkout\.html\)/);
  assert.match(md, /## ① Intention/);
  assert.match(md, /## ② Code perspective/);
  assert.match(md, /## ③ Destination/);
  assert.match(md, /Acceptance criteria/);
});

test("product-only companion spec omits the ② code perspective", () => {
  const md = createSpecMarkdown({ title: "x", htmlBasename: "x.html", productOnly: true });
  assert.match(md, /## ① Intention/);
  assert.doesNotMatch(md, /## ② Code perspective/);
});

test("greenfield companion spec frames ② as from-scratch", () => {
  const md = createSpecMarkdown({ title: "x", htmlBasename: "x.html", greenfield: true });
  assert.match(md, /greenfield/i);
  assert.match(md, /Proposed architecture/);
  assert.doesNotMatch(md, /Architecture change \(before/);
});

test("createSpecOutput reports the companion file and links the canonical artifact", () => {
  const out = createSpecOutput({ specFile: "/abs/x.spec.md", htmlFile: "/abs/x.html" });
  assert.equal(out.spec.file, "/abs/x.spec.md");
  assert.equal(out.spec.canonical, "/abs/x.html");
  assert.match(out.next_step, /source of truth/);
});

test("`new` and `spec` are recognized commands, not normalized to open", () => {
  assert.deepEqual(normalizeArgv(["new", "x.html"]), ["new", "x.html"]);
  assert.equal(telemetryCommandName(["new", "x.html"]), "new");
  assert.deepEqual(normalizeArgv(["spec", "x.html"]), ["spec", "x.html"]);
  assert.equal(telemetryCommandName(["spec", "x.html"]), "spec");
});
