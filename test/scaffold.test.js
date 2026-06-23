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

test("scaffold guarantees both lenses, each with §A -> §B -> §C in order", () => {
  const html = createScaffoldHtml({ title: "Guest checkout" });
  const ids = [
    "product-current-world",
    "product-grill",
    "product-vision",
    "code-current-world",
    "code-grill",
    "code-vision",
  ];
  const positions = ids.map((id) => html.indexOf(`id="${id}"`));
  assert.ok(
    positions.every((p) => p > -1),
    "all six lens sections present",
  );
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i] > positions[i - 1], `${ids[i]} comes after ${ids[i - 1]}`);
  }
});

test("the Gate sits before the Code Lens and is a soft signal (no UI lock)", () => {
  const html = createScaffoldHtml({ title: "x" });
  const gate = html.indexOf('id="lens-gate"');
  const codeLens = html.indexOf('id="code-lens"');
  assert.ok(gate > -1 && codeLens > gate, "gate appears before the code lens");
  assert.match(html, /data-loupe-lock/, "has a lock-product-intent control");
  assert.match(html, /data-loupe-reopen/, "has a reverse-gate reopen control");
});

test("the Code Lens never blocks editing or annotation (HTML is the source of truth)", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.doesNotMatch(html, /loupe-lock-overlay/, "no blocking lock overlay");
  assert.doesNotMatch(html, /loupe-codelens locked/, "code lens is not shipped locked");
  // pointer-events:none is only allowed on the decorative gesture hint, where it makes
  // the hint click-THROUGH (the opposite of blocking). Nothing else may disable interaction.
  for (const line of html.match(/[^\n]*pointer-events: none[^\n]*/g) || []) {
    assert.match(line, /loupe-diagram-hint/, "pointer-events:none only on the click-through hint, never on content");
  }
});

test("--product-only drops the Gate and Code Lens", () => {
  const html = createScaffoldHtml({ title: "x", productOnly: true });
  assert.match(html, /id="product-current-world"/);
  assert.doesNotMatch(html, /id="code-lens"/);
  assert.doesNotMatch(html, /id="lens-gate"/);
  assert.doesNotMatch(html, /Gate — agree the product change/);
});

test("--greenfield reshapes the Code Lens for from-scratch design", () => {
  const html = createScaffoldHtml({ title: "x", greenfield: true });
  assert.match(html, /data-loupe-greenfield="true"/, "root marks greenfield for `loupe spec` to detect");
  assert.match(html, /Proposed Architecture/);
  assert.match(html, /Interfaces &amp; contracts/);
  assert.match(html, /loupe-contracts/);
  assert.match(html, /classDef new/);
  // still gated, still annotatable, no blocking
  assert.match(html, /id="code-lens"/);
  assert.doesNotMatch(html, /loupe-lock-overlay/);
});

test("the default (brownfield) Code Lens keeps the current → after framing", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.doesNotMatch(html, /data-loupe-greenfield/);
  assert.doesNotMatch(html, /Proposed Architecture/);
  assert.match(html, /Current Architecture/);
});

test("--product-only wins over --greenfield (no Code Lens at all)", () => {
  const html = createScaffoldHtml({ title: "x", productOnly: true, greenfield: true });
  assert.doesNotMatch(html, /id="code-lens"/);
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

test("scaffold wires mermaid, the hit (blast radius) classDef, and grill auto-wiring", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /mermaid@11/);
  assert.match(html, /classDef hit/);
  assert.match(html, /form\[data-loupe-grill\]/);
  assert.match(html, /window\.lavish/);
});

test("scaffold makes diagrams pannable/zoomable at full size", () => {
  const html = createScaffoldHtml({ title: "x" });
  // useMaxWidth:true keeps a viewBox (no transient overflow); svg-pan-zoom then
  // fits/enlarges each diagram to fill its tall viewport.
  assert.match(html, /useMaxWidth: true/);
  assert.match(html, /svg-pan-zoom@3/);
  assert.match(html, /\.loupe-diagram \.mermaid svg/);
  assert.match(html, /controlIconsEnabled: true/);
  // pan/zoom must not swallow the click the annotation picker needs (artifact-sdk.js
  // listens for click in capture phase); preventMouseEventsDefault:false keeps nodes annotatable.
  assert.match(html, /preventMouseEventsDefault: false/);
  // A plain wheel must scroll the page, not hijack it: native wheel-zoom off, and
  // zoom only on a modifier+wheel at the cursor.
  assert.match(html, /mouseWheelZoomEnabled: false/);
  assert.match(html, /e\.ctrlKey \|\| e\.metaKey/);
  assert.match(html, /zoomAtPointBy/);
  // The fixed-height frame must not overflow, or the layout audit flags clipped-text:
  // zero the <pre> margin and block the svg to kill its baseline descender gap.
  assert.match(html, /\.loupe-diagram \.mermaid \{[^}]*margin: 0/);
  assert.match(html, /\.loupe-diagram svg \{ display: block/);
});

test("interactions degrade gracefully without window.lavish", () => {
  const html = createScaffoldHtml({ title: "x" });
  // The queue() helper guards on window.lavish so opening the file directly never throws.
  assert.match(html, /if \(!\(window\.lavish && typeof window\.lavish\.queuePrompt === "function"\)\) return;/);
  assert.match(html, /setAttribute\("data-answered", "true"\)/);
});

test("the gate lock and reopen send signals to the agent", () => {
  const html = createScaffoldHtml({ title: "x" });
  assert.match(html, /PRODUCT INTENT LOCKED/);
  assert.match(html, /REOPEN PRODUCT INTENT/);
});

test("deriveTitleFromPath humanizes the filename", () => {
  assert.equal(deriveTitleFromPath("/tmp/guest-checkout.html"), "Guest checkout");
  assert.equal(deriveTitleFromPath("add_dark_mode.htm"), "Add dark mode");
  assert.equal(deriveTitleFromPath(".html"), "Untitled change");
});

test("createNewOutput reports both lenses and the gated workflow by default", () => {
  const out = createNewOutput({ file: "/abs/x.html" });
  assert.deepEqual(out.scaffold.lenses, ["Product", "Code"]);
  assert.equal(out.scaffold.gated, true);
  assert.match(out.next_step, /LOUPE — fill|Product Lens/);
  assert.match(out.next_step, /PRODUCT INTENT LOCKED/);
  assert.match(out.next_step, /loupe \/abs\/x\.html/);
});

test("createNewOutput in product-only mode reports a single lens and no gate", () => {
  const out = createNewOutput({ file: "/abs/x.html", productOnly: true });
  assert.deepEqual(out.scaffold.lenses, ["Product"]);
  assert.equal(out.scaffold.gated, false);
  assert.doesNotMatch(out.next_step, /PRODUCT INTENT LOCKED/);
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

test("companion spec carries the title, a link back, and the lens decisions", () => {
  const md = createSpecMarkdown({ title: "Guest checkout", htmlBasename: "guest-checkout.html" });
  assert.match(md, /# Guest checkout — spec/);
  assert.match(md, /\]\(\.\/guest-checkout\.html\)/);
  assert.match(md, /## Product Lens/);
  assert.match(md, /## Code Lens/);
});

test("product-only companion spec omits the Code Lens", () => {
  const md = createSpecMarkdown({ title: "x", htmlBasename: "x.html", productOnly: true });
  assert.match(md, /## Product Lens/);
  assert.doesNotMatch(md, /## Code Lens/);
});

test("greenfield companion spec frames the Code Lens as from-scratch", () => {
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
