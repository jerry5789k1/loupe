// Loupe scaffold generator.
//
// `loupe new <file>` writes a self-contained HTML artifact whose STRUCTURE is
// guaranteed by code (ADR-0001). v3 ships the intention-first staged spine
// (ADR-0008, supersedes the v2 two-lens/Gate shape):
//
//   ① INTENTION      current + target diagrams · acceptance criteria
//                    (functional + non-functional) · usage scenarios · decision
//                    forks → lock intention
//        │  (only ① is drawn first; ②/③ are filled as each stage locks)
//   ② CODE PERSPECTIVE   scope DERIVED by tracing goal × real codebase:
//                    one module → interface + behavior diff; cross-module →
//                    architecture view, interface focus → approve
//        │
//   ③ DESTINATION    before → after (one diagram, one purpose) + work-DAG plan
//                    (nodes ⟵ locked decisions · ⚠ risk) + validation pass
//                    (each criterion / scenario met or named) → execute / adjust / cancel
//
// The agent only fills the content slots marked `LOUPE — fill:`, and fills them
// PROGRESSIVELY — stage ② only after the intention locks, ③ only after ② is
// approved (the workflow enforces this; nothing in the UI is blocked — the HTML
// is the source of truth and stays freely editable and annotatable).
//
// Governing principles (ADR-0008):
//   • The diagram IS the message. Prose only for irreducible scalars.
//   • Render-simplicity rule B: static HTML + mermaid + the standard Loupe SDK,
//     and NOTHING else — no bespoke per-artifact JS. (v2's svg-pan-zoom is gone.)
//   • Diagram discipline: big enough to read · ONE diagram = ONE single purpose.
//   • Grill = decision-forks only · opinionated (a recommended option + why) ·
//     options compared as diagrams · inferable things → confirmable assumptions
//     drawn on the diagram, never asked.
//
// The artifact stays portable: mermaid loads from a CDN, and every interaction
// degrades gracefully when `window.lavish` is absent (opened directly).
//
// Mermaid label gotcha: `&` is mermaid's "and" operator, and `(` `)` `:` `,` etc.
// break an unquoted `[label]`. Quote any label with punctuation:
//   GOOD  M1["Auth gate (forces login)"]      BAD  M1[Auth gate (forces login)]

const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * One Decision Fork (ADR-0008). Opinionated: exactly one option is marked
 * `recommended`, and the agent fills `why` with the reasoning + the trade-off it
 * is betting on. Each option carries its own trade-off (gain / cost). Structural
 * options should also carry a mini mermaid diagram so the choice is made by
 * comparing pictures — the agent adds those when it fills the fork. Every fork
 * keeps an open field as an escape hatch. Submit is auto-wired by the page script.
 */
function forkCard({ id, decision, options = [], why = "" }) {
  const opts = options
    .map((opt) => {
      const rec = opt.recommended ? " data-recommended" : "";
      const badge = opt.recommended ? `<span class="loupe-opt-badge">◀ recommended</span>` : "";
      const trade =
        opt.gain || opt.cost
          ? `\n        <span class="loupe-opt-trade"><b>gain</b> ${escapeHtml(opt.gain || "—")} · <b>cost</b> ${escapeHtml(opt.cost || "—")}</span>`
          : "";
      return `      <label class="loupe-opt"${rec}>
        <input type="radio" name="choice" value="${escapeHtml(opt.label)}" />
        <span class="loupe-opt-label">${escapeHtml(opt.label)} ${badge}</span>${trade}
      </label>`;
    })
    .join("\n");
  const whyBlock = why
    ? `\n      <p class="loupe-fork-why">${escapeHtml(why)}</p>`
    : `\n      <p class="loupe-fork-why">LOUPE — fill: why you lean to the recommended option, and the trade-off you are betting on.</p>`;
  return `    <form class="loupe-fork" data-loupe-fork data-fork="${escapeHtml(id)}">
      <p class="loupe-fork-q">${escapeHtml(decision)}</p>
      <div class="loupe-opts">
${opts}
      </div>${whyBlock}
      <details class="loupe-open">
        <summary>None of these — I'll say it myself</summary>
        <textarea name="open" placeholder="Your own call…"></textarea>
      </details>
      <div class="loupe-card-actions">
        <button type="submit" class="loupe-btn primary">Queue decision</button>
        <span class="loupe-answered-note">✓ queued — change and re-queue any time</span>
      </div>
    </form>`;
}

// A single mermaid diagram in its own card. One diagram = one purpose (ADR-0008),
// so it renders at full width with no zoom engine — keep each diagram small enough
// to read by splitting purposes, not by adding pan/zoom.
function diagram(body) {
  return `        <div class="loupe-diagram">
          <pre class="mermaid">
${body}
          </pre>
        </div>`;
}

function blastLegend() {
  return `        <div class="loupe-legend">
          <span><i class="loupe-sw" style="background:#fff;border:1px solid var(--hair)"></i> unaffected</span>
          <span><i class="loupe-sw" style="background:var(--hit-bg);border:1px solid var(--hit)"></i> blast radius (touched)</span>
        </div>`;
}

// ───────────────────────────── ① INTENTION ─────────────────────────────

function intentionStage() {
  return `  <section class="loupe-stage" id="intention">
    <div class="loupe-stage-head"><span class="loupe-stage-num">①</span> Intention <span class="loupe-stage-sub">— the source of truth; everything downstream is derived from this</span></div>

    <!-- current + target: the agent's read of intent, verified ON the diagram -->
    <section class="loupe-section" id="intention-picture">
      <h2>What you have now → what you want</h2>
      <p class="loupe-section-hint">
        Verify by looking. The <b>target</b> is the agent's read of your intent — correct it by
        annotating the diagram. Inferred details are drawn as <em>confirmable assumptions</em>, not asked.
      </p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill: draw the CURRENT state from the real codebase/context (factual), then the
          TARGET state as your read of the intent. Color the blast radius <code>class X hit</code>.
          One diagram = one purpose; quote labels with punctuation, e.g. <code>X["Pay (guest)"]</code>.
        </div>
        <div class="loupe-pair">
          <div class="loupe-pair-col">
            <div class="loupe-pair-tag">Current</div>
${diagram(`flowchart TD
  A[Step one] --> B[Step two]
  B --> C[Step three]`)}
          </div>
          <div class="loupe-pair-col target">
            <div class="loupe-pair-tag">Target</div>
${diagram(`flowchart TD
  classDef hit fill:#fdecea,stroke:#d83a2e,stroke-width:2px,color:#1d1d1f;
  A[Step one] --> B[Step two]
  B --> C[Reworked step]
  class C hit`)}
          </div>
        </div>
${blastLegend()}
      </div>
    </section>

    <!-- acceptance test: the conditions the design is judged against -->
    <section class="loupe-section" id="intention-acceptance">
      <h2>Acceptance criteria &amp; usage scenarios</h2>
      <p class="loupe-section-hint">
        The test this change must pass. The agent proposes a starter set and hunts the gaps —
        especially the non-functional ones people forget; you edit, delete, add (annotate to change).
      </p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill: propose real acceptance criteria (functional AND non-functional: latency,
          privacy, security, accessibility, cost) and the concrete usage scenarios the design must
          handle. Each scenario is a path you can trace through the diagrams above.
        </div>
        <div class="loupe-criteria">
          <div class="loupe-crit-group">
            <div class="loupe-crit-label">Functional</div>
            <ul data-loupe-criteria="functional">
              <li>LOUPE — fill: e.g. "a guest completes checkout without an account"</li>
            </ul>
          </div>
          <div class="loupe-crit-group">
            <div class="loupe-crit-label">Non-functional</div>
            <ul data-loupe-criteria="non-functional">
              <li>LOUPE — fill: e.g. "no PII retained beyond 30 days"</li>
            </ul>
          </div>
          <div class="loupe-crit-group">
            <div class="loupe-crit-label">Usage scenarios</div>
            <ul data-loupe-scenarios>
              <li>LOUPE — fill: e.g. "S1 — returning guest, item in cart, no login"</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- decision forks: the only thing that earns a question -->
    <section class="loupe-section" id="intention-forks">
      <h2>Decisions to make</h2>
      <p class="loupe-section-hint">
        Only real forks — choices that change the spec and need your judgment. Pick by comparing the
        options; the agent recommends one and says why. Everything it could infer is an assumption above, not a question.
      </p>
      <div class="loupe-fill">
        LOUPE — fill: replace the example with the real product decision forks. Give each option a
        trade-off (gain / cost); for structural options add a mini diagram so the choice is visual.
      </div>
${forkCard({
  id: "example",
  decision: "Example: how far should this change reach?",
  options: [
    { label: "Just the affected step", gain: "smallest change", cost: "may not solve the root" },
    {
      label: "The whole flow",
      gain: "solves it end-to-end",
      cost: "larger blast radius",
      recommended: true,
    },
  ],
  why: "",
})}
    </section>

    <div class="loupe-lock-bar">
      <button type="button" class="loupe-btn primary" data-loupe-lock>Lock intention →</button>
      <span class="loupe-lock-note">Soft signal — nothing gets blocked. It tells the agent the intent is agreed, so it can derive stage ②.</span>
    </div>
  </section>`;
}

// ───────────────────────── ② CODE PERSPECTIVE ─────────────────────────

function codeStage() {
  return `  <section class="loupe-stage loupe-derived" id="code" data-loupe-stage="code">
    <div class="loupe-stage-head"><span class="loupe-stage-num">②</span> Code perspective <span class="loupe-stage-sub">— filled after you lock the intention</span></div>

    <section class="loupe-section" id="code-scope">
      <h2>What the code must change to get there</h2>
      <p class="loupe-section-hint">
        Scope is <b>derived, not chosen</b>: the agent traces the goal through the real codebase to
        the modules that must change. Correct it only if the trace missed a caller/dependency.
      </p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill after the intention locks: trace the REAL codebase. State the derived scope as
          one confirmable line (e.g. "Scope: single-module — boundary is <code>checkout/</code>"). If
          the trace stays in one module, focus on the interface + usage-scenario behavior diff; if it
          crosses modules, draw the high-level architecture (deep-module / improve-codebase-architecture
          thinking) with the blast radius and focus on the interface contracts. Greenfield: design the
          architecture from scratch and mark new pieces <code>class X new</code>. Quote punctuated labels.
        </div>
        <p class="loupe-scope" data-loupe-scope>Scope: <em>LOUPE — fill: derived scope + the boundary you traced</em></p>
${diagram(`flowchart TD
  classDef hit fill:#fdecea,stroke:#d83a2e,stroke-width:2px,color:#1d1d1f;
  M1[Module A] --> M2[Module B]
  M2 --> M3[Affected module]
  class M3 hit`)}
${blastLegend()}
      </div>
    </section>

    <section class="loupe-section" id="code-forks">
      <h2>Code decisions</h2>
      <p class="loupe-section-hint">Interface / boundary / migration forks — same rules: forks only, opinionated, visual.</p>
      <div class="loupe-fill">LOUPE — fill: real architecture/interface decision forks (where new behavior lives, data shape, migration).</div>
${forkCard({
  id: "code-example",
  decision: "Example: where should the new behavior live?",
  options: [
    { label: "Extend the affected module", gain: "least churn", cost: "module grows broader" },
    {
      label: "New module behind an interface",
      gain: "clean seam, testable",
      cost: "one more boundary",
      recommended: true,
    },
  ],
  why: "",
})}
    </section>

    <div class="loupe-lock-bar">
      <button type="button" class="loupe-btn primary" data-loupe-approve="code">Approve code perspective →</button>
      <button type="button" class="loupe-link" data-loupe-reopen>↩ Reopen intention (this changed my mind)</button>
    </div>
  </section>`;
}

function codeStageGreenfield() {
  return `  <section class="loupe-stage loupe-derived" id="code" data-loupe-stage="code" data-loupe-greenfield="true">
    <div class="loupe-stage-head"><span class="loupe-stage-num">②</span> Code perspective <span class="loupe-stage-sub">— greenfield: designed from scratch once the intention locks</span></div>

    <section class="loupe-section" id="code-scope">
      <h2>How we'll shape the code from scratch</h2>
      <p class="loupe-section-hint">No existing codebase — this is the proposed architecture for the agreed intent. No "before".</p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill after the intention locks: design the architecture from scratch from the agreed
          intent; mark core new pieces <code>class X new</code>. Focus on the interfaces/contracts to
          build. Quote labels with punctuation, e.g. <code>X["Auth (token)"]</code>.
        </div>
${diagram(`flowchart TD
  classDef new fill:#eaf4ec,stroke:#1f8b4c,stroke-width:2px,color:#1d1d1f;
  Client[Client] --> Api[New API]
  Api --> Svc[New service]
  Svc --> Store[(New store)]
  class Api,Svc,Store new`)}
        <div class="loupe-legend"><span><i class="loupe-sw" style="background:#eaf4ec;border:1px solid #1f8b4c"></i> new (to build)</span></div>
      </div>
    </section>

    <section class="loupe-section" id="code-forks">
      <h2>Code decisions</h2>
      <p class="loupe-section-hint">Boundary / data-shape / build-order forks — forks only, opinionated, visual.</p>
      <div class="loupe-fill">LOUPE — fill: real from-scratch decision forks (boundaries, data shape, what to build first, what to defer).</div>
${forkCard({
  id: "greenfield-shape",
  decision: "Example: what is the first piece to build?",
  options: [
    { label: "The data model", gain: "stable foundation", cost: "no working slice yet" },
    {
      label: "An end-to-end thin slice",
      gain: "proves the whole path early",
      cost: "rework as it widens",
      recommended: true,
    },
  ],
  why: "",
})}
    </section>

    <div class="loupe-lock-bar">
      <button type="button" class="loupe-btn primary" data-loupe-approve="code">Approve architecture →</button>
      <button type="button" class="loupe-link" data-loupe-reopen>↩ Reopen intention (this changed my mind)</button>
    </div>
  </section>`;
}

// ───────────────────────────── ③ DESTINATION ─────────────────────────────

function destinationStage({ greenfield = false } = {}) {
  const beforeAfter = greenfield
    ? `        <div class="loupe-fill">LOUPE — fill: greenfield has no "before" — draw the target architecture as the after, one diagram one purpose.</div>
${diagram(`flowchart TD
  classDef new fill:#eaf4ec,stroke:#1f8b4c,stroke-width:2px,color:#1d1d1f;
  Client[Client] --> Api[API]
  Api --> Svc[Service]
  class Api,Svc new`)}`
    : `        <div class="loupe-fill">LOUPE — fill: ONE diagram, ONE purpose — the single relationship this change turns over, before → after, with a one-line takeaway.</div>
        <div class="loupe-pair">
          <div class="loupe-pair-col">
            <div class="loupe-pair-tag">Before</div>
${diagram(`flowchart TD
  A[Step one] --> B[Step two]
  B --> C[Affected step]`)}
          </div>
          <div class="loupe-pair-col target">
            <div class="loupe-pair-tag">After</div>
${diagram(`flowchart TD
  classDef new fill:#eaf4ec,stroke:#1f8b4c,stroke-width:2px,color:#1d1d1f;
  A[Step one] --> B[Step two]
  B --> C[Reworked step]
  class C new`)}
          </div>
        </div>`;

  return `  <section class="loupe-stage loupe-derived" id="destination" data-loupe-stage="destination">
    <div class="loupe-stage-head"><span class="loupe-stage-num">③</span> Destination <span class="loupe-stage-sub">— filled after the code perspective is approved</span></div>

    <section class="loupe-section" id="destination-vision">
      <h2>Where we're going</h2>
      <p class="loupe-section-hint">The before → after of the one relationship the change turns over.</p>
      <div class="loupe-card">
${beforeAfter}
        <p class="loupe-takeaway"><b>Takeaway:</b> <em>LOUPE — fill: the one-line delta this diagram shows.</em></p>
      </div>
    </section>

    <section class="loupe-section" id="destination-plan">
      <h2>The plan — in what order, and what could bite</h2>
      <p class="loupe-section-hint">
        A work-DAG: each node is a concrete change that traces back (⟵) to a locked decision; risky
        nodes are flagged (⚠). Collapses to an ordered list only when the work is truly linear.
      </p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill: draw the execution plan as a graph. Nodes = concrete changes (each tagged ⟵
          with the decision it implements); edges = must-precede/depends-on; mark risky/unknown nodes ⚠.
        </div>
${diagram(`flowchart TD
  N1["1 · change A  ⟵ Fork: ..."] --> N2["2 · change B  ⚠ risk: ..."]
  N2 --> N3["3 · test the scenarios"]`)}
      </div>
    </section>

    <section class="loupe-section" id="destination-validation">
      <h2>Does the design pass the test?</h2>
      <p class="loupe-section-hint">
        The agent proves, with the design, that every ① acceptance criterion and usage scenario is
        satisfied — or names the ones that are not. Nothing is hidden.
      </p>
      <div class="loupe-card">
        <div class="loupe-fill">
          LOUPE — fill: for each criterion and scenario from ①, mark met / not-met and cite the
          diagram path that proves it (e.g. "S2 walks 1→3→4 → satisfies C1, C2; C3 NOT met because …").
        </div>
        <ul class="loupe-validation" data-loupe-validation>
          <li><span class="loupe-check">○</span> LOUPE — fill: criterion / scenario → met? evidence</li>
        </ul>
      </div>
    </section>

    <section class="loupe-section loupe-decision" id="decision">
      <h2>Ready to build this?</h2>
      <p class="loupe-section-hint">
        Execute hands the agreed spec back to the agent to implement; Adjust keeps iterating; Cancel drops it.
      </p>
      <div class="loupe-decision-actions">
        <button type="button" class="loupe-btn primary" data-loupe-decision="execute">Execute — build it →</button>
        <button type="button" class="loupe-btn" data-loupe-decision="adjust">Adjust — keep iterating</button>
        <button type="button" class="loupe-btn" data-loupe-decision="cancel">Cancel — don't build</button>
      </div>
      <div class="loupe-reopen-bar">
        <button type="button" class="loupe-link" data-loupe-reopen>↩ Reopen intention</button>
      </div>
    </section>
  </section>`;
}

/**
 * Render the Loupe v3 scaffold (the intention-first staged spine, ADR-0008).
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
    ? `    <span class="loupe-nav-group">①</span>
    <a href="#intention-picture">Picture</a>
    <a href="#intention-acceptance">Test</a>
    <a href="#intention-forks">Forks</a>
    <a href="#destination">③ Destination</a>`
    : `    <a href="#intention">① Intention</a>
    <span class="loupe-nav-lock" title="derived after you lock ①">🔒</span>
    <a href="#code">② Code</a>
    <a href="#destination">③ Destination</a>`;

  const codeStageHtml = isGreenfield ? codeStageGreenfield() : codeStage();
  const stages = productOnly
    ? `${intentionStage()}\n\n${destinationStage({ greenfield: isGreenfield })}`
    : `${intentionStage()}\n\n${codeStageHtml}\n\n${destinationStage({ greenfield: isGreenfield })}`;

  return `<!DOCTYPE html>
<html lang="en" data-loupe-scaffold="v3"${isGreenfield ? ' data-loupe-greenfield="true"' : ""}${productOnly ? ' data-loupe-product-only="true"' : ""}>
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
    --maxw: 960px;
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

  .loupe-stage { margin-top: 40px; }
  .loupe-stage-head { font-size: 15px; font-weight: 600; color: var(--ink-2); margin: 8px 0 4px; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .loupe-stage-num {
    display: inline-block; font-size: 13px; font-weight: 700; color: #fff; background: var(--accent);
    border-radius: 999px; min-width: 22px; height: 22px; line-height: 22px; text-align: center; padding: 0 6px;
  }
  .loupe-stage-sub { font-weight: 400; color: var(--ink-3); font-size: 13px; }
  /* derived stages (②③) read as pending until the agent fills them; never UI-blocked. */
  .loupe-derived .loupe-stage-num { background: var(--ink-3); }

  section.loupe-section { margin-top: 28px; scroll-margin-top: 64px; }
  section.loupe-section h2 { font-size: 21px; font-weight: 640; letter-spacing: -0.015em; margin: 0 0 4px; }
  .loupe-section-hint { color: var(--ink-3); font-size: 14px; margin: 0 0 18px; }

  .loupe-card { background: var(--surface); border: 1px solid var(--hair); border-radius: var(--radius); padding: 22px; }

  /* One diagram = one purpose, rendered at full width — NO zoom engine (rule B).
     useMaxWidth:true makes mermaid fit the container, so there is no overflow. */
  .loupe-diagram { min-width: 0; overflow: hidden; border: 1px solid var(--hair); border-radius: var(--radius); background: var(--surface); padding: 10px; }
  .loupe-diagram .mermaid { width: 100%; min-width: 0; margin: 0; padding: 0; text-align: center; }
  .loupe-diagram svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
  .loupe-legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; font-size: 13px; color: var(--ink-2); }
  .loupe-legend span { display: inline-flex; align-items: center; gap: 7px; }
  .loupe-sw { width: 13px; height: 13px; border-radius: 4px; display: inline-block; }

  /* current/target and before/after pairs */
  .loupe-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  @media (max-width: 760px) { .loupe-pair { grid-template-columns: 1fr; } }
  .loupe-pair-col .loupe-pair-tag { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px; color: var(--ink-3); }
  .loupe-pair-col.target .loupe-pair-tag { color: var(--accent); }
  .loupe-takeaway { margin: 14px 0 0; font-size: 14px; color: var(--ink-2); }

  /* acceptance test */
  .loupe-criteria { display: flex; flex-direction: column; gap: 16px; }
  .loupe-crit-label { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px; }
  .loupe-criteria ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; font-size: 15px; }
  .loupe-validation { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 15px; }
  .loupe-validation .loupe-check { color: var(--ink-3); margin-right: 8px; font-weight: 700; }
  .loupe-scope { font-size: 14px; color: var(--ink-2); background: #f0f6fd; border: 1px solid var(--hair); border-radius: 10px; padding: 8px 12px; margin: 0 0 16px; }

  /* decision forks */
  .loupe-fork { background: var(--surface); border: 1px solid var(--hair); border-radius: var(--radius); padding: 20px; margin-bottom: 14px; }
  .loupe-fork[data-answered="true"] { border-color: var(--accent); }
  .loupe-fork-q { font-size: 16px; font-weight: 600; margin: 0 0 14px; }
  .loupe-opts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .loupe-opt { display: flex; flex-direction: column; gap: 4px; padding: 11px 13px; border: 1px solid var(--hair); border-radius: 10px; cursor: pointer; font-size: 15px; }
  .loupe-opt:hover { border-color: var(--accent); }
  .loupe-opt[data-recommended] { border-color: var(--accent); background: #f5f9fe; }
  .loupe-opt input { margin-right: 4px; }
  .loupe-opt-label { font-weight: 560; }
  .loupe-opt-badge { font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--accent); margin-left: 6px; }
  .loupe-opt-trade { font-size: 13px; color: var(--ink-2); padding-left: 24px; }
  .loupe-opt-trade b { color: var(--ink-3); font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  .loupe-fork-why { font-size: 14px; color: var(--ink-2); margin: 4px 0 12px; }

  .loupe-open { width: 100%; }
  .loupe-open summary { cursor: pointer; font-size: 13px; color: var(--ink-3); list-style: none; }
  .loupe-open summary::-webkit-details-marker { display: none; }
  .loupe-open textarea { width: 100%; margin-top: 8px; padding: 10px; border: 1px solid var(--hair); border-radius: 10px; font: inherit; font-size: 14px; resize: vertical; min-height: 64px; }
  .loupe-card-actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
  .loupe-btn { font: inherit; font-size: 14px; font-weight: 560; cursor: pointer; border: 1px solid var(--hair); background: var(--surface); color: var(--ink); padding: 8px 16px; border-radius: 999px; }
  .loupe-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .loupe-btn:disabled { opacity: 0.55; cursor: default; }
  .loupe-answered-note { font-size: 13px; color: var(--accent); display: none; }
  .loupe-fork[data-answered="true"] .loupe-answered-note { display: inline; }

  .loupe-lock-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 22px; }
  .loupe-lock-note { font-size: 13px; color: var(--ink-3); }
  .loupe-reopen-bar { margin-top: 18px; }
  .loupe-link { background: none; border: none; color: var(--ink-3); font: inherit; font-size: 13px; cursor: pointer; text-decoration: underline; padding: 4px 0; }
  .loupe-link:hover { color: var(--accent); }

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

${stages}

  <div class="loupe-send-bar">
    <button type="button" class="loupe-btn primary" data-loupe-send>Send to agent</button>
  </div>

</div>

<script type="module">
  import mermaid from "${MERMAID_CDN}";
  // useMaxWidth:true makes mermaid emit a viewBox so each SVG scales to fit its
  // container width — one diagram, one purpose, no zoom engine (ADR-0008 rule B).
  mermaid.initialize({ startOnLoad: false, theme: "base", securityLevel: "loose", flowchart: { useMaxWidth: true } });
  try {
    await mermaid.run();
  } catch (e) {
    console.error("Loupe: mermaid render failed", e);
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

    // Decision Forks — pick an option (or the open field), queue the decision.
    function readFork(form) {
      const data = new FormData(form);
      const choice = (data.get("choice") || "").toString().trim();
      const open = (data.get("open") || "").toString().trim();
      const parts = [];
      if (choice) parts.push(choice);
      if (open) parts.push("(note: " + open + ")");
      return parts.join(" ");
    }
    document.querySelectorAll("form[data-loupe-fork]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const id = form.getAttribute("data-fork") || "fork";
        const text = readFork(form);
        if (!text) return;
        queue("Decision [" + id + "]: " + text, "fork:" + id, false);
        form.setAttribute("data-answered", "true");
      });
    });

    // Send-all: the developer answers a whole round of forks, then sends once
    // (ADR-0008 turn-taking — one redraw per round, not live churn).
    const sendBtn = document.querySelector("[data-loupe-send]");
    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        if (window.lavish && typeof window.lavish.sendQueuedPrompts === "function") window.lavish.sendQueuedPrompts();
      });
    }

    // Lock intention — a soft signal. Nothing in the UI is blocked (the HTML is
    // the source of truth). It tells the agent the intent is agreed so it derives ②.
    const lockBtn = document.querySelector("[data-loupe-lock]");
    if (lockBtn) {
      lockBtn.addEventListener("click", function () {
        lockBtn.disabled = true;
        lockBtn.textContent = "Intention locked ✓";
        queue(
          "INTENTION LOCKED — the intent, acceptance criteria, and usage scenarios are agreed. Now derive stage ② Code perspective: trace the real codebase from the goal, state the derived scope, draw the blast radius, and write the code decision forks. Then stop and let the developer review.",
          "lock:intention",
          true,
        );
        const code = document.getElementById("code") || document.getElementById("destination");
        if (code) code.scrollIntoView({ behavior: "smooth" });
      });
    }

    // Approve a derived stage (② code perspective). Tells the agent to derive ③.
    document.querySelectorAll("[data-loupe-approve]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        btn.textContent = "Approved ✓";
        queue(
          "CODE PERSPECTIVE APPROVED — the interface, architecture, and local behavior change are agreed. Now derive stage ③ Destination: the before → after, the work-DAG plan (nodes trace back to locked decisions, risky nodes flagged), and the validation pass against every acceptance criterion and usage scenario.",
          "approve:code",
          true,
        );
        const dest = document.getElementById("destination");
        if (dest) dest.scrollIntoView({ behavior: "smooth" });
      });
    });

    // Reopen intention — the agent judges magnitude: a detail tweak re-derives only
    // the dependent subgraph (via the plan's ⟵ links); a goal-level deviation restarts
    // from scratch. The agent surfaces which, and the stale set, before redrawing.
    document.querySelectorAll("[data-loupe-reopen]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (lockBtn) {
          lockBtn.disabled = false;
          lockBtn.textContent = "Lock intention →";
        }
        queue(
          "REOPEN INTENTION — re-grill the intention. Judge the magnitude: if this is a detail refinement, re-derive only the downstream that depends on what changed; if it deviates from the overall goal, restart from scratch. Show which regime and the stale set before redrawing.",
          "reopen:intention",
          true,
        );
        const intent = document.getElementById("intention");
        if (intent) intent.scrollIntoView({ behavior: "smooth" });
      });
    });

    // Decision: execute / adjust / cancel.
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
