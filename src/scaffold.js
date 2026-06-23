// Loupe scaffold generator.
//
// `loupe new <file>` writes a self-contained HTML artifact whose STRUCTURE is
// guaranteed by code (ADR-0001). v2 ships two lenses with a hard Gate between
// them (ADR-0004):
//
//   Product Lens              §A Current World · §B Grill · §C Goal Vision
//        │  Gate: lock product intent (a SOFT signal)
//        ▼
//   Code Lens                 §A Current Architecture · §B Grill · §C Goal Vision
//
// The agent only fills the content slots marked `LOUPE — fill:`. The Gate is a soft
// signal, NOT a UI lock: the Code Lens is always fully visible, editable, and
// annotatable (the HTML is the source of truth — nothing may block editing or
// annotation). Locking the product intent (and the reverse "reopen product intent")
// just signals the agent through the same lavish queuePrompt round-trip the Grill
// Cards use, so it fills the Code Lens against an agreed product change.
//
// The artifact stays portable: mermaid loads from a CDN, and every interaction
// degrades gracefully when `window.lavish` is absent (opened directly).
//
// Pinned ESM mermaid build (the module lavish's own diagram guidance uses, so it
// loads inside Loupe's sandboxed iframe and from a direct file:// open).
//
// Mermaid label gotcha: `&` is mermaid's "and" operator, and `(` `)` `:` `,` etc.
// break an unquoted `[label]`. Quote any label with punctuation:
//   GOOD  M1["Auth gate (forces login)"]      BAD  M1[Auth gate (forces login)]

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs";

// Pinned svg-pan-zoom (via esm.sh so it loads as an ES module next to mermaid).
// Each rendered diagram becomes a pannable/zoomable viewport so a large flow is no
// longer squished to the card width — drag empty space to pan, wheel/buttons to zoom.
const SVG_PAN_ZOOM_CDN = "https://esm.sh/svg-pan-zoom@3.6.2";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * One Grill Card. `type` is "radio" (single) or "checkbox" (multi). The submit is
 * auto-wired by the page script; every card keeps an open field as an escape hatch.
 */
function grillCard({ question, prompt, type = "radio", options = [] }) {
  const inputs = options
    .map(
      (opt) =>
        `        <label><input type="${type}" name="answer" value="${escapeHtml(opt)}" /> ${escapeHtml(opt)}</label>`,
    )
    .join("\n");
  return `    <form class="loupe-grill-card" data-loupe-grill data-question="${escapeHtml(question)}">
      <p class="loupe-q">${escapeHtml(prompt)}</p>
      <div class="loupe-options">
${inputs}
      </div>
      <details class="loupe-open">
        <summary>I'd rather say it myself</summary>
        <textarea name="open" placeholder="Your own answer…"></textarea>
      </details>
      <div class="loupe-card-actions">
        <button type="submit" class="loupe-btn primary">Queue answer</button>
        <span class="loupe-answered-note">✓ queued — edit and re-queue any time</span>
      </div>
    </form>`;
}

function productLens() {
  return `  <section class="loupe-lens" id="product-lens">
    <div class="loupe-lens-head"><span class="loupe-lens-kicker">Product Lens</span> What changes for the user</div>

    <!-- ===== §A PRODUCT CURRENT WORLD ===== -->
    <section class="loupe-section" id="product-current-world">
      <div class="loupe-section-label"><b>§A</b> Current World</div>
      <h2>Where this change lands today</h2>
      <p class="loupe-section-hint">
        Map the relevant use cases as they are now, then highlight the Blast Radius —
        the parts this change will touch.
      </p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill: replace the mermaid with the real use-case flow. Color touched
          nodes with <code>class X hit</code> (predefined). Quote labels with punctuation,
          e.g. <code>X["Pay (guest)"]</code>; a bare <code>&amp;</code> / <code>(</code> breaks the parse.
        </div>
        <div class="loupe-diagram">
          <pre class="mermaid">
flowchart TD
  classDef hit fill:#fdecea,stroke:#d83a2e,stroke-width:2px,color:#1d1d1f;

  A[Step one] --> B[Step two]
  B --> C[Affected step]
  C --> D[Another affected step]
  class C,D hit
          </pre>
        </div>
        <div class="loupe-legend">
          <span><i class="loupe-sw" style="background:#fff;border:1px solid var(--hair)"></i> unaffected</span>
          <span><i class="loupe-sw" style="background:var(--hit-bg);border:1px solid var(--hit)"></i> touched by this change (Blast Radius)</span>
        </div>
      </div>
    </section>

    <!-- ===== §B PRODUCT GRILL ===== -->
    <section class="loupe-section" id="product-grill">
      <div class="loupe-section-label"><b>§B</b> Grill</div>
      <h2>Questions to sharpen the change</h2>
      <p class="loupe-section-hint">
        Answer by clicking — every card also has an open field. Your answers shape the vision below.
      </p>
      <div class="loupe-fill">
        LOUPE — fill: replace the example with the real product questions (impact, scope, edge cases).
      </div>
${grillCard({
  question: "example-scope",
  prompt: "Example: how far should this change reach?",
  type: "radio",
  options: ["Just the affected steps", "The whole flow", "Not sure yet"],
})}
    </section>

    <!-- ===== §C PRODUCT GOAL VISION ===== -->
    <section class="loupe-section" id="product-vision">
      <div class="loupe-section-label"><b>§C</b> Goal Vision</div>
      <h2>Before → after, for the user</h2>
      <p class="loupe-section-hint">
        The same map as §A, re-drawn for the agreed change, side by side so the delta is visible.
      </p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill after grill answers arrive: redraw both sides, keeping the layout aligned with §A.
        </div>
        <div class="loupe-ba">
          <div class="loupe-ba-col before">
            <div class="loupe-ba-tag">Before</div>
            <div class="loupe-diagram">
              <pre class="mermaid">
flowchart TD
  A[Step one] --> B[Step two]
  B --> C[Affected step]
              </pre>
            </div>
          </div>
          <div class="loupe-ba-col after">
            <div class="loupe-ba-tag">After</div>
            <div class="loupe-diagram">
              <pre class="mermaid">
flowchart TD
  classDef new fill:#eaf4ec,stroke:#1f8b4c,stroke-width:2px,color:#1d1d1f;
  A[Step one] --> B[Step two]
  B --> C[Reworked step]
  class C new
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>`;
}

function gate() {
  return `  <div class="loupe-gate" id="lens-gate">
    <div class="loupe-gate-text">
      <strong>Gate — agree the product change first</strong>
      <p>Settle the Product Lens above, then lock the intent so the agent fills the Code Lens against an agreed change. (A soft signal — it never blocks editing or annotation.)</p>
    </div>
    <button type="button" class="loupe-btn primary" data-loupe-lock>Lock product intent →</button>
  </div>`;
}

function codeLens() {
  return `  <section class="loupe-lens loupe-codelens" id="code-lens" data-loupe-codelens>
      <div class="loupe-lens-head"><span class="loupe-lens-kicker">Code Lens</span> What changes in the code <span class="loupe-lens-note">— the agent fills this once the product intent is locked</span></div>

      <!-- ===== §A CODE CURRENT ARCHITECTURE ===== -->
      <section class="loupe-section" id="code-current-world">
        <div class="loupe-section-label"><b>§A</b> Current Architecture</div>
        <h2>How the code is shaped today</h2>
        <p class="loupe-section-hint">
          The modules / interfaces involved as they are now, with the Blast Radius highlighted.
        </p>
        <div class="loupe-card">
          <div class="loupe-fill">
            LOUPE — fill after the Gate: read the REAL codebase and draw the current
            architecture (modules, interfaces, data flow); color touched nodes
            <code>class X hit</code> and quote labels with punctuation (e.g.
            <code>X["Auth (login)"]</code>). No codebase yet (greenfield)? Replace this with
            the proposed from-scratch architecture and say so.
          </div>
          <div class="loupe-diagram">
            <pre class="mermaid">
flowchart TD
  classDef hit fill:#fdecea,stroke:#d83a2e,stroke-width:2px,color:#1d1d1f;

  M1[Module A] --> M2[Module B]
  M2 --> M3[Affected module]
  class M3 hit
            </pre>
          </div>
          <div class="loupe-legend">
            <span><i class="loupe-sw" style="background:#fff;border:1px solid var(--hair)"></i> unaffected</span>
            <span><i class="loupe-sw" style="background:var(--hit-bg);border:1px solid var(--hit)"></i> touched (Blast Radius)</span>
          </div>
        </div>
      </section>

      <!-- ===== §B CODE GRILL ===== -->
      <section class="loupe-section" id="code-grill">
        <div class="loupe-section-label"><b>§B</b> Grill</div>
        <h2>Questions to sharpen the design</h2>
        <p class="loupe-section-hint">Architecture and interface decisions — answer by clicking.</p>
        <div class="loupe-fill">
          LOUPE — fill: real questions about interfaces, data shape, boundaries, migration.
        </div>
${grillCard({
  question: "code-example-boundary",
  prompt: "Example: where should the new behavior live?",
  type: "radio",
  options: ["Extend the affected module", "New module behind an interface", "Not sure yet"],
})}
      </section>

      <!-- ===== §C CODE GOAL VISION ===== -->
      <section class="loupe-section" id="code-vision">
        <div class="loupe-section-label"><b>§C</b> Goal Vision</div>
        <h2>Before → after: interfaces &amp; architecture</h2>
        <p class="loupe-section-hint">
          What is added / changed / removed in the code, aligned with §A so the delta is visible.
        </p>
        <div class="loupe-card">
          <div class="loupe-fill">
            LOUPE — fill after code grill answers: redraw the architecture before → after and
            list the interface delta (added / changed / removed signatures, endpoints, configs).
          </div>
          <div class="loupe-ba">
            <div class="loupe-ba-col before">
              <div class="loupe-ba-tag">Before</div>
              <div class="loupe-diagram">
                <pre class="mermaid">
flowchart TD
  M1[Module A] --> M2[Module B]
  M2 --> M3[Affected module]
                </pre>
              </div>
            </div>
            <div class="loupe-ba-col after">
              <div class="loupe-ba-tag">After</div>
              <div class="loupe-diagram">
                <pre class="mermaid">
flowchart TD
  classDef new fill:#eaf4ec,stroke:#1f8b4c,stroke-width:2px,color:#1d1d1f;
  M1[Module A] --> M2[Module B]
  M2 --> M4[New module]
  class M4 new
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="loupe-reopen-bar">
        <button type="button" class="loupe-link" data-loupe-reopen>↩ Reopen product intent (the code review changed my mind)</button>
      </div>
  </section>`;
}

function codeLensGreenfield() {
  return `  <section class="loupe-lens loupe-codelens" id="code-lens" data-loupe-codelens>
      <div class="loupe-lens-head"><span class="loupe-lens-kicker">Code Lens</span> What we'll build <span class="loupe-lens-note">— greenfield: no existing code, designed from the agreed product intent</span></div>

      <!-- ===== §A PROPOSED ARCHITECTURE (from scratch) ===== -->
      <section class="loupe-section" id="code-current-world">
        <div class="loupe-section-label"><b>§A</b> Proposed Architecture</div>
        <h2>How we'll shape the code from scratch</h2>
        <p class="loupe-section-hint">
          The modules and interfaces to build for the agreed change. No "before" — this is greenfield.
        </p>
        <div class="loupe-card">
          <div class="loupe-fill">
            LOUPE — fill after the Gate: design the architecture from scratch from the agreed product
            intent; mark the core new pieces with <code>class X new</code> and quote labels with
            punctuation (e.g. <code>X["Auth (token)"]</code>).
          </div>
          <div class="loupe-diagram">
            <pre class="mermaid">
flowchart TD
  classDef new fill:#eaf4ec,stroke:#1f8b4c,stroke-width:2px,color:#1d1d1f;

  Client[Client] --> Api[New API]
  Api --> Svc[New service]
  Svc --> Store[(New store)]
  class Api,Svc,Store new
            </pre>
          </div>
          <div class="loupe-legend">
            <span><i class="loupe-sw" style="background:#eaf4ec;border:1px solid #1f8b4c"></i> new (to build)</span>
          </div>
        </div>
      </section>

      <!-- ===== §B CODE GRILL ===== -->
      <section class="loupe-section" id="code-grill">
        <div class="loupe-section-label"><b>§B</b> Grill</div>
        <h2>Questions to sharpen the design</h2>
        <p class="loupe-section-hint">Architecture and interface decisions — answer by clicking.</p>
        <div class="loupe-fill">
          LOUPE — fill: real questions about boundaries, data shape, build order, what to defer.
        </div>
${grillCard({
  question: "greenfield-shape",
  prompt: "Example: what is the first piece to build?",
  type: "radio",
  options: ["The data model", "The API surface", "An end-to-end thin slice", "Not sure yet"],
})}
      </section>

      <!-- ===== §C INTERFACES & CONTRACTS (all new) ===== -->
      <section class="loupe-section" id="code-vision">
        <div class="loupe-section-label"><b>§C</b> Interfaces &amp; contracts</div>
        <h2>What to build, concretely</h2>
        <p class="loupe-section-hint">
          The shapes the new code exposes — endpoints, signatures, data. No before/after; it is all new.
        </p>
        <div class="loupe-card">
          <div class="loupe-fill">
            LOUPE — fill after grill answers: list the interfaces / endpoints / data shapes to add.
          </div>
          <ul class="loupe-contracts">
            <li><span class="loupe-tag-add">add</span> <code>…</code></li>
            <li><span class="loupe-tag-add">add</span> <code>…</code></li>
          </ul>
        </div>
      </section>

      <div class="loupe-reopen-bar">
        <button type="button" class="loupe-link" data-loupe-reopen>↩ Reopen product intent (the design changed my mind)</button>
      </div>
  </section>`;
}

function decisionSection() {
  return `  <section class="loupe-section loupe-decision" id="decision">
    <div class="loupe-section-label"><b>✓</b> Decision</div>
    <h2>Ready to build this?</h2>
    <p class="loupe-section-hint">
      When the vision above is right, decide. Execute hands the agreed spec back to the agent to
      implement; Adjust keeps iterating; Cancel drops it.
    </p>
    <div class="loupe-decision-actions">
      <button type="button" class="loupe-btn primary" data-loupe-decision="execute">Execute — build it →</button>
      <button type="button" class="loupe-btn" data-loupe-decision="adjust">Adjust — keep iterating</button>
      <button type="button" class="loupe-btn" data-loupe-decision="cancel">Cancel — don't build</button>
    </div>
  </section>`;
}

/**
 * Render the Loupe v2 scaffold.
 *
 * @param {{ title?: string, problem?: string, productOnly?: boolean, greenfield?: boolean }} [options]
 * @returns {string} self-contained HTML
 */
export function createScaffoldHtml({
  title = "Untitled change",
  problem = "",
  productOnly = false,
  greenfield = false,
} = {}) {
  const safeTitle = escapeHtml(title);
  const safeProblem = problem ? escapeHtml(problem) : "";
  const isGreenfield = greenfield && !productOnly;

  const nav = productOnly
    ? `    <a href="#product-current-world">§A Current World</a>
    <a href="#product-grill">§B Grill</a>
    <a href="#product-vision">§C Goal Vision</a>`
    : `    <span class="loupe-nav-group">Product</span>
    <a href="#product-current-world">§A</a>
    <a href="#product-grill">§B</a>
    <a href="#product-vision">§C</a>
    <span class="loupe-nav-lock" title="opens after the gate">🔒</span>
    <span class="loupe-nav-group">Code</span>
    <a href="#code-current-world">§A</a>
    <a href="#code-grill">§B</a>
    <a href="#code-vision">§C</a>`;

  const code = isGreenfield ? codeLensGreenfield() : codeLens();
  const lensBlocks = productOnly ? productLens() : `${productLens()}\n\n${gate()}\n\n${code}`;
  const lenses = `${lensBlocks}\n\n${decisionSection()}`;

  return `<!DOCTYPE html>
<html lang="en" data-loupe-scaffold="v2"${isGreenfield ? ' data-loupe-greenfield="true"' : ""}>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Loupe — ${safeTitle}</title>
<style>
  /* Loupe clarity styles (ADR-0003: clarity over polish). Restrained, legible. */
  :root {
    --bg: #f6f6f7;
    --surface: #ffffff;
    --ink: #1d1d1f;
    --ink-2: #5b5b60;
    --ink-3: #8a8a8f;
    --hair: rgba(0, 0, 0, 0.1);
    --accent: #0b6bcb;
    --hit: #d83a2e;
    --hit-bg: #fdecea;
    --radius: 14px;
    --maxw: 880px;
    --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang TC", "Noto Sans TC",
      sans-serif;
  }
  * { box-sizing: border-box; }
  html { background: var(--bg); }
  body {
    margin: 0; font-family: var(--font); color: var(--ink); line-height: 1.55;
    -webkit-font-smoothing: antialiased; padding: 0 20px 120px;
  }
  .loupe-wrap { max-width: var(--maxw); margin: 0 auto; }

  header.loupe-head { padding: 56px 0 8px; }
  .loupe-kicker { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
  header.loupe-head h1 { font-size: 30px; font-weight: 680; letter-spacing: -0.02em; margin: 8px 0 0; }
  .loupe-problem { color: var(--ink-2); font-size: 17px; margin-top: 10px; }

  nav.loupe-nav {
    position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    padding: 14px 0; background: linear-gradient(var(--bg) 70%, transparent); margin-top: 24px;
  }
  nav.loupe-nav a {
    font-size: 13px; font-weight: 550; color: var(--ink-2); text-decoration: none;
    padding: 6px 11px; border-radius: 999px; border: 1px solid var(--hair); background: var(--surface);
  }
  nav.loupe-nav a:hover { color: var(--ink); }
  .loupe-nav-group { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-left: 6px; }
  .loupe-nav-lock { color: var(--ink-3); }

  .loupe-lens { margin-top: 28px; }
  .loupe-lens-head { font-size: 15px; font-weight: 600; color: var(--ink-2); margin: 8px 0 4px; }
  .loupe-lens-kicker {
    display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--accent); background: #eaf2fb; border-radius: 999px; padding: 3px 10px; margin-right: 8px;
  }

  section.loupe-section { margin-top: 32px; scroll-margin-top: 64px; }
  .loupe-section-label { display: inline-flex; align-items: baseline; gap: 8px; font-size: 13px; font-weight: 600; color: var(--ink-3); letter-spacing: 0.02em; margin-bottom: 4px; }
  .loupe-section-label b { color: var(--accent); font-size: 14px; }
  section.loupe-section h2 { font-size: 21px; font-weight: 640; letter-spacing: -0.015em; margin: 0 0 4px; }
  .loupe-section-hint { color: var(--ink-3); font-size: 14px; margin: 0 0 18px; }

  .loupe-card { background: var(--surface); border: 1px solid var(--hair); border-radius: var(--radius); padding: 22px; }

  /* A pannable/zoomable viewport: the diagram renders at full size inside a fixed
     frame so it never shrinks to fit the card. Drag empty space to pan, wheel to zoom. */
  .loupe-diagram { position: relative; height: clamp(320px, 52vh, 580px); min-width: 0; overflow: hidden; border: 1px solid var(--hair); border-radius: var(--radius); background: var(--surface); cursor: grab; }
  .loupe-diagram:active { cursor: grabbing; }
  .loupe-diagram .mermaid { width: 100%; height: 100%; min-width: 0; }
  .loupe-diagram svg { width: 100% !important; height: 100% !important; max-width: none !important; }
  .loupe-legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; font-size: 13px; color: var(--ink-2); }
  .loupe-legend span { display: inline-flex; align-items: center; gap: 7px; }
  .loupe-sw { width: 13px; height: 13px; border-radius: 4px; display: inline-block; }

  .loupe-ba { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 720px) { .loupe-ba { grid-template-columns: 1fr; } }
  .loupe-ba-col .loupe-ba-tag { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px; color: var(--ink-3); }
  .loupe-ba-col.after .loupe-ba-tag { color: var(--accent); }

  .loupe-grill-card { background: var(--surface); border: 1px solid var(--hair); border-radius: var(--radius); padding: 20px; margin-bottom: 14px; }
  .loupe-grill-card[data-answered="true"] { border-color: var(--accent); }
  .loupe-q { font-size: 16px; font-weight: 580; margin: 0 0 14px; }
  .loupe-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .loupe-options label { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--hair); border-radius: 10px; cursor: pointer; font-size: 15px; }
  .loupe-options label:hover { border-color: var(--accent); }
  .loupe-open { width: 100%; }
  .loupe-open summary { cursor: pointer; font-size: 13px; color: var(--ink-3); list-style: none; }
  .loupe-open summary::-webkit-details-marker { display: none; }
  .loupe-open textarea { width: 100%; margin-top: 8px; padding: 10px; border: 1px solid var(--hair); border-radius: 10px; font: inherit; font-size: 14px; resize: vertical; min-height: 64px; }
  .loupe-card-actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
  .loupe-btn { font: inherit; font-size: 14px; font-weight: 560; cursor: pointer; border: 1px solid var(--hair); background: var(--surface); color: var(--ink); padding: 8px 16px; border-radius: 999px; }
  .loupe-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .loupe-btn:disabled { opacity: 0.55; cursor: default; }
  .loupe-answered-note { font-size: 13px; color: var(--accent); display: none; }
  .loupe-grill-card[data-answered="true"] .loupe-answered-note { display: inline; }

  /* gate (soft signal — never blocks editing or annotation) */
  .loupe-gate {
    display: flex; align-items: center; gap: 18px; justify-content: space-between; flex-wrap: wrap;
    margin: 36px 0 8px; padding: 18px 22px; border: 1px solid var(--accent); border-radius: var(--radius);
    background: #eef5fd;
  }
  .loupe-gate-text strong { display: block; font-size: 15px; }
  .loupe-gate-text p { margin: 4px 0 0; font-size: 13px; color: var(--ink-2); }
  .loupe-lens-note { font-weight: 400; color: var(--ink-3); }
  .loupe-reopen-bar { margin-top: 20px; }
  .loupe-link { background: none; border: none; color: var(--ink-3); font: inherit; font-size: 13px; cursor: pointer; text-decoration: underline; padding: 4px 0; }
  .loupe-link:hover { color: var(--accent); }
  .loupe-contracts { margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .loupe-contracts li { display: flex; align-items: center; gap: 10px; font-size: 14px; }
  .loupe-tag-add { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #1f8b4c; background: #eaf4ec; border-radius: 6px; padding: 2px 7px; }

  .loupe-decision { border-top: 1px solid var(--hair); padding-top: 16px; }
  .loupe-decision-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
  .loupe-decision-actions .loupe-btn[disabled] { opacity: 1; outline: 2px solid var(--accent); outline-offset: 2px; }

  .loupe-send-bar { position: sticky; bottom: 0; margin-top: 24px; padding: 16px 0; background: linear-gradient(transparent, var(--bg) 30%); display: flex; justify-content: flex-end; gap: 12px; }

  .loupe-fill { border: 1px dashed var(--accent); border-radius: 10px; padding: 10px 14px; margin: 10px 0; font-size: 13px; color: var(--accent); background: #f0f6fd; }
</style>
</head>
<body>
<div class="loupe-wrap">

  <header class="loupe-head">
    <div class="loupe-kicker">🔍 Loupe · inspect before you build</div>
    <h1>${safeTitle}</h1>
    ${safeProblem ? `<p class="loupe-problem">${safeProblem}</p>` : `<!-- LOUPE — fill: one-line statement of the problem this change solves -->`}
  </header>

  <nav class="loupe-nav">
${nav}
  </nav>

${lenses}

  <div class="loupe-send-bar">
    <button type="button" class="loupe-btn primary" data-loupe-send>Send answers to agent</button>
  </div>

</div>

<script type="module">
  import mermaid from "${MERMAID_CDN}";
  // useMaxWidth:false lets each diagram render at its natural size; svg-pan-zoom then
  // fits it into the .loupe-diagram viewport, so a big flow stays readable instead of
  // being scaled down to the card width.
  mermaid.initialize({ startOnLoad: false, theme: "base", securityLevel: "loose", flowchart: { useMaxWidth: false } });
  try {
    await mermaid.run();
  } catch (e) {
    console.error("Loupe: mermaid render failed", e);
  }
  // Make every rendered diagram pannable/zoomable. Loaded after mermaid so the SVGs
  // exist; isolated in its own try so a CDN/offline failure leaves diagrams static but intact.
  try {
    const svgPanZoom = (await import("${SVG_PAN_ZOOM_CDN}")).default;
    for (const svg of document.querySelectorAll(".loupe-diagram .mermaid svg")) {
      svg.style.maxWidth = "none";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svgPanZoom(svg, {
        zoomEnabled: true,
        controlIconsEnabled: true, // built-in zoom in / out / reset(fit) buttons
        fit: true,
        center: true,
        minZoom: 0.2,
        maxZoom: 12,
        dblClickZoomEnabled: false, // leave double-click free; pan is drag, annotate is click
      });
    }
  } catch (e) {
    console.error("Loupe: pan/zoom init failed (diagrams stay static)", e);
  }
</script>

<script>
  // Loupe interactions, all built on the lavish queuePrompt round-trip. Everything
  // degrades gracefully when window.lavish is absent (artifact opened directly).
  (function () {
    function queue(text, key, send) {
      if (!(window.lavish && typeof window.lavish.queuePrompt === "function")) return;
      window.lavish.queuePrompt(text, { tag: "loupe", text: text, queueKey: key });
      if (send && typeof window.lavish.sendQueuedPrompts === "function") window.lavish.sendQueuedPrompts();
    }

    // Grill Cards
    function readAnswer(form) {
      const data = new FormData(form);
      const choices = data.getAll("answer").filter(Boolean);
      const open = (data.get("open") || "").toString().trim();
      const parts = [];
      if (choices.length) parts.push(choices.join(", "));
      if (open) parts.push("(note: " + open + ")");
      return { text: parts.join(" "), choices: choices, open: open };
    }
    document.querySelectorAll("form[data-loupe-grill]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const question = form.getAttribute("data-question") || "grill";
        const ans = readAnswer(form);
        if (!ans.text) return;
        queue("Grill answer [" + question + "]: " + ans.text, "grill:" + question, false);
        form.setAttribute("data-answered", "true");
      });
    });

    // Send-all
    const sendBtn = document.querySelector("[data-loupe-send]");
    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        if (window.lavish && typeof window.lavish.sendQueuedPrompts === "function") window.lavish.sendQueuedPrompts();
      });
    }

    // Gate: a soft signal. The Code Lens is never blocked — the HTML stays freely
    // editable and annotatable (the source of truth). Locking just tells the agent
    // the product change is agreed, so it fills the Code Lens against it.
    const codeLens = document.querySelector("[data-loupe-codelens]");
    const lockBtn = document.querySelector("[data-loupe-lock]");
    if (lockBtn) {
      lockBtn.addEventListener("click", function () {
        lockBtn.disabled = true;
        lockBtn.textContent = "Product intent locked ✓";
        queue(
          "PRODUCT INTENT LOCKED — the product change is agreed. Now fill the Code Lens: read the real codebase, draw §A current architecture with the blast radius, write the architecture Grill Cards, and (after answers) the interface/architecture before → after.",
          "gate:lock",
          true,
        );
        if (codeLens) codeLens.scrollIntoView({ behavior: "smooth" });
      });
    }

    // Reverse gate: reopening product intent is an explicit, consented signal (ADR-0004).
    const reopenBtn = document.querySelector("[data-loupe-reopen]");
    if (reopenBtn) {
      reopenBtn.addEventListener("click", function () {
        if (lockBtn) {
          lockBtn.disabled = false;
          lockBtn.textContent = "Lock product intent →";
        }
        queue(
          "REOPEN PRODUCT INTENT — the code review surfaced a product-level problem; re-grill the product lens before continuing.",
          "gate:reopen",
          true,
        );
        const g = document.getElementById("lens-gate");
        if (g) g.scrollIntoView({ behavior: "smooth" });
      });
    }

    // Decision: execute / adjust / cancel. Execute tells the agent to persist the
    // companion spec (loupe spec) and implement; the others keep or drop the change.
    const decisionBtns = document.querySelectorAll("[data-loupe-decision]");
    decisionBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const kind = btn.getAttribute("data-loupe-decision");
        let text;
        if (kind === "execute") {
          text =
            "DECISION: EXECUTE — the developer approved this change. Persist the companion spec (run 'loupe spec' on this artifact and fill it with the agreed decisions), then begin implementing.";
        } else if (kind === "cancel") {
          text = "DECISION: CANCEL — do not build this change.";
        } else {
          text = "DECISION: ADJUST — keep iterating; do not build yet.";
        }
        queue(text, "decision", true);
        decisionBtns.forEach(function (b) {
          b.disabled = false;
        });
        btn.disabled = true;
      });
    });
  })();
</script>

</body>
</html>
`;
}
