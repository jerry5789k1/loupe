import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AxiError, installSessionStartHooks, runAxiCli } from "axi-sdk-js";

import { createDesignOutput, DESIGN_SYSTEM_HINT } from "./design-reference.js";
import { clientHost, defaultPort, ensureStateDir, hostForUrl, serverLogFile, stateFile } from "./paths.js";
import { findPlaybook, listPlaybooks, playbookIds, PLAYBOOK_ROUTER_HELP } from "./playbooks.js";
import { createScaffoldHtml } from "./scaffold.js";
import { createSpecMarkdown, deriveSpecPath } from "./spec.js";
import { serve } from "./server.js";
import { canonicalFile, sessionKey, SessionStore } from "./session-store.js";
import { initDefaultTelemetry } from "./telemetry.js";

const COMMANDS = new Set(["open", "new", "spec", "poll", "end", "stop", "server", "playbook", "design", "setup"]);
const DESCRIPTION =
  "Loupe turns a proposed change into a structured visual review surface for the spec phase, so developers grasp a change by looking and clicking instead of reading walls of text. " +
  "Every Loupe artifact has the same guaranteed shape: §A Current World (a map of the relevant use cases with the blast radius highlighted), §B Grill (interactive cards the developer answers by clicking, each with an open field), and §C Goal Vision (a before -> after of the agreed change). " +
  "Run `loupe new <html-file>` to scaffold that structure, fill the marked slots, then `loupe <html-file>` to open the review and `loupe poll <html-file>` to receive the developer's grill answers and annotations.";
// Inlined at build time from package.json; falls back to reading package.json so source-run tests work.
export const VERSION =
  process.env.LAVISH_AXI_BUILD_VERSION ||
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

export async function run(argv) {
  await ensureStateDir();
  const normalizedArgv = normalizeArgv(argv);
  const isTopLevelHelp = argv.length === 1 && argv[0] === "--help";
  const command = telemetryCommandName(argv);
  const telemetry = initDefaultTelemetry({
    app: "lavish-axi",
    version: VERSION,
    platform: process.platform,
    arch: process.arch,
  });
  telemetry.pageview(`/${command}`, { command });
  try {
    await runAxiCli({
      description: DESCRIPTION,
      version: VERSION,
      argv: isTopLevelHelp ? [] : normalizedArgv,
      topLevelHelp: TOP_LEVEL_HELP,
      home: async () =>
        createHomeOutput({
          bin: process.argv[1] || "lavish-axi",
          sessions: isTopLevelHelp ? [] : await visibleSessions(),
          includeSessions: !isTopLevelHelp,
        }),
      commands: {
        open: openCommand,
        new: newCommand,
        spec: specCommand,
        poll: pollCommand,
        end: endCommand,
        stop: stopCommand,
        playbook: playbookCommand,
        design: designCommand,
        setup: setupCommand,
        server: serverCommand,
      },
      getCommandHelp,
    });
    telemetry.track("command", { command, status: "success" });
  } catch (error) {
    telemetry.track("command", { command, status: "error" });
    throw error;
  } finally {
    await telemetry.close(1_000);
  }
}

export function collapseHomeDirectory(file, home) {
  const normalizedFile = file.replaceAll("\\", "/");
  const normalizedHome = home.replaceAll("\\", "/");

  if (normalizedFile === normalizedHome) {
    return "~";
  }
  if (normalizedFile.startsWith(`${normalizedHome}/`)) {
    return `~/${normalizedFile.slice(normalizedHome.length + 1)}`;
  }
  return file;
}

export function normalizeArgv(argv) {
  const first = argv[0];
  if (!first || COMMANDS.has(first)) {
    return argv;
  }
  if (first.startsWith("-")) {
    return argv.some((arg) => isHtmlPath(arg)) ? ["open", ...argv] : argv;
  }
  return ["open", ...argv];
}

export function telemetryCommandName(argv) {
  const normalized = normalizeArgv(argv);
  return normalized[0] && !normalized[0].startsWith("-") ? normalized[0] : "home";
}

export function createHomeOutput({ bin, sessions, includeSessions = true }) {
  return {
    bin: collapseHomeDirectory(bin, os.homedir()),
    description: DESCRIPTION,
    ...(includeSessions
      ? {
          sessions: sessions.map((session) => ({
            file: session.file,
            status: session.status,
            url: session.url,
            pending_prompts: session.pending_prompts || 0,
          })),
        }
      : {}),
    visual_guidance: [
      "Use visual hierarchy to make the most important decisions, risks, tradeoffs, and next actions obvious at a glance",
      "Use visual structure such as sections, cards, tables, diagrams, annotated snippets, and side-by-side comparisons instead of long prose",
      "Choose typography, spacing, color, and layout deliberately so the artifact has a clear point of view",
      "Prevent horizontal overflow at every nesting level: nested grid/flex children also need minmax(0, 1fr) tracks and min-width: 0, especially when badges, labels, or status text use wide pixel or monospace fonts; wrap, truncate, or contain long unbreakable text deliberately",
    ],
    playbooks: listPlaybooks(),
    help: [
      "Loupe is for the spec phase. `loupe new <html-file>` scaffolds two lenses, each with §A Current World / §B Grill / §C Goal Vision. Fill the Product Lens first (draw §A in mermaid and color the blast radius `class … hit`, write real click-to-answer Grill Cards, redraw §C from the answers). Leave the Code Lens empty until the developer clicks `Lock product intent` (a soft signal — the Code Lens is always visible/editable/annotatable): when the poll returns `PRODUCT INTENT LOCKED`, read the real codebase and fill the Code Lens (current architecture + blast radius, architecture Grill Cards, interface/architecture before -> after); greenfield projects are designed from scratch. `REOPEN PRODUCT INTENT` means go back to the Product Lens. Use `--product-only` for small changes, or `--greenfield` when there is no codebase (the Code Lens becomes a from-scratch architecture proposal, no before/after). Open with `loupe <html-file>` and poll for answers, gate signals, and annotations. Clarity over polish: prefer mermaid, drop any visual that does not aid understanding.",
      "Run `loupe <html-file>` to open or resume a Loupe review session",
      "Unless the user specifies another location, create HTML artifacts in the current working directory under `.lavish/`",
      "Lavish serves the html file through a local express.js server. If your html needs to reference other filesystem assets such as images, CSS, fonts, and local scripts, copy them into the same directory as the HTML file, then reference them with relative paths from that directory. Never prepend `/` to those asset paths - root paths won't work",
      "Run `loupe poll <html-file>` to wait for user feedback or browser-reported layout_warnings. It long-polls and stays silent until the user sends feedback, ends the session, or the real browser reports fresh layout_warnings, so leave it running - never kill it. Fix layout_warnings before involving the human. If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost",
      "Triage each annotation the poll returns and say which grade you assigned: a Tweak (local/cosmetic) -> patch the HTML in place; a Follow-up (a question / more detail) -> adjust that section within the current lens; Directional feedback (challenges the agreed product intent) -> do not silently redraw, ask the developer to confirm reopening the product intent first.",
      "Run `loupe end <html-file>` to end a session",
      "Run `loupe stop` to shut down the background server (it also self-stops when idle or after the last session ends with nothing connected)",
      `Run \`loupe playbook <playbook_id>\` for focused artifact guidance. ${PLAYBOOK_ROUTER_HELP}`,
      DESIGN_SYSTEM_HINT,
      "Use loupe when the user asks for a visual artifact, HTML explainer, interactive prototype, review surface, product or technical plan, comparison, report, or browser-based feedback loop",
    ],
  };
}

export function createPlaybookOutput(args) {
  const id = args[0];
  if (!id) {
    return {
      playbooks: listPlaybooks(),
      help: ["Run `loupe playbook <playbook_id>` for focused artifact guidance", PLAYBOOK_ROUTER_HELP],
    };
  }

  const playbook = findPlaybook(id);
  if (!playbook) {
    throw new AxiError(`Unknown playbook: ${id}`, "VALIDATION_ERROR", [
      `Run \`loupe playbook\` to list known IDs: ${playbookIds().join(", ")}`,
    ]);
  }

  return { playbook };
}

export function createOpenOutput({ file, url, status }) {
  return {
    session: { file, url, status },
    next_step: `Do not respond to the user just yet. Now you must run \`loupe poll ${file}\`. This command long-polls until the user sends feedback, ends the session, or the real browser reports layout_warnings from the in-iframe layout audit, and it stays silent the whole time - that is normal, never kill it. If layout_warnings arrive, fix overflow, clipped text, or overlapping unreadable content and re-check before involving the human. Do not pass --timeout-ms during normal agent use. If your harness limits how long a foreground command may run, run the poll as a background task and wait for it to finish; if the poll still gets killed or times out, just re-run it - queued feedback is never lost. After applying feedback, run \`loupe poll ${file} --agent-reply "<message for the user>"\` without --timeout-ms to show your response in Loupe and wait for more feedback.`,
  };
}

async function openCommand(args) {
  const file = args.find((arg) => !arg.startsWith("-"));
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `loupe <html-file>`"]);
  }
  await assertHtmlFile(file);
  const absolute = await canonicalFile(file);
  const noGate = args.includes("--no-gate");
  const baseUrl = await ensureServer({ forceRestart: shouldForceRestartForLocalBuild(process.argv[1] || "") });
  const response = await postJson(`${baseUrl}/api/sessions`, { file: absolute, noGate });
  if (shouldOpenBrowser(args, process.env)) {
    try {
      const open = (await import("open")).default;
      await open(response.url);
    } catch {
      response.status = "ready";
    }
  }
  return createOpenOutput({ file: absolute, url: response.url, status: response.status || "opened" });
}

export function shouldOpenBrowser(args, env) {
  return !args.includes("--no-open") && env.LAVISH_AXI_NO_OPEN !== "1";
}

export function deriveTitleFromPath(file) {
  const base = path.basename(file).replace(/\.html?$/i, "");
  const words = base.replace(/[-_]+/g, " ").trim();
  if (!words) return "Untitled change";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function createNewOutput({ file, productOnly = false, greenfield = false }) {
  const productSteps = `Fill the Product Lens \`LOUPE — fill:\` slots first: redraw §A as the real use-case flow with the Blast Radius colored (\`class … hit\`; quote mermaid labels with punctuation, e.g. \`X["Pay (guest)"]\`, since a bare \`&\` or \`(\` breaks the parse), replace the example Grill Cards with real product questions, and redraw §C Goal Vision once the user's grill answers arrive.`;
  const codeSteps = greenfield
    ? ` Leave the Code Lens empty until the user clicks "Lock product intent". When the poll returns "PRODUCT INTENT LOCKED", design the architecture FROM SCRATCH (this is greenfield — there is no codebase to read): §A proposed architecture marking the new pieces (\`class … new\`), design Grill Cards, then §C the interfaces/contracts to add (no before/after).`
    : ` Leave the Code Lens empty until the user clicks "Lock product intent" (a soft signal that never locks the UI). When the poll returns "PRODUCT INTENT LOCKED", read the real codebase and fill the Code Lens (§A current architecture + blast radius, architecture Grill Cards, then the interface/architecture before → after). If the poll returns "REOPEN PRODUCT INTENT", go back and re-grill the Product Lens.`;
  const gateSteps = productOnly ? "" : codeSteps;
  return {
    scaffold: {
      file,
      lenses: productOnly ? ["Product"] : ["Product", "Code"],
      mode: productOnly ? "product-only" : greenfield ? "greenfield" : "brownfield",
      sections: ["§A Current World", "§B Grill", "§C Goal Vision"],
      gated: !productOnly,
    },
    next_step: `Loupe scaffold written to ${file}. ${productSteps}${gateSteps} Then run \`loupe ${file}\` to open the review and \`loupe poll ${file}\` to receive grill answers, gate signals, and annotations. Do not respond to the user until the Product Lens is filled and opened.`,
  };
}

async function newCommand(args) {
  const file = args.find((arg) => !arg.startsWith("-"));
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `loupe new <html-file>`"]);
  }
  if (!isHtmlPath(file)) {
    throw new AxiError("Loupe expects an HTML file path", "VALIDATION_ERROR", ["Run `loupe new <html-file>`"]);
  }
  const absolute = path.resolve(file);
  if (existsSync(absolute) && !args.includes("--force")) {
    throw new AxiError(`File already exists: ${file}`, "VALIDATION_ERROR", [
      "Pass --force to overwrite it, or choose a different path",
    ]);
  }
  const productOnly = args.includes("--product-only");
  const greenfield = args.includes("--greenfield");
  const title = flagValue(args, "--title") || deriveTitleFromPath(file);
  const problem = flagValue(args, "--problem") || "";
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, createScaffoldHtml({ title, problem, productOnly, greenfield }), "utf8");
  return createNewOutput({ file: absolute, productOnly, greenfield: greenfield && !productOnly });
}

export function createSpecOutput({ specFile, htmlFile }) {
  return {
    spec: { file: specFile, canonical: htmlFile },
    next_step: `Companion spec written to ${specFile}. Fill the \`…\` slots with the decisions this Loupe Session actually settled (problem, blast radius, before → after for each lens, interface delta). It links back to the canonical artifact ${htmlFile} and is the source of truth for implementation — keep it in version control. Once filled, begin building the change.`,
  };
}

async function specCommand(args) {
  const file = args.find((arg) => !arg.startsWith("-"));
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `loupe spec <html-file>`"]);
  }
  if (!isHtmlPath(file)) {
    throw new AxiError("Loupe expects the canonical HTML file path", "VALIDATION_ERROR", [
      "Run `loupe spec <html-file>`",
    ]);
  }
  const absoluteHtml = path.resolve(file);
  if (!existsSync(absoluteHtml)) {
    throw new AxiError(`File not found: ${file}`, "NOT_FOUND", [
      "Create the artifact first with `loupe new <html-file>`",
    ]);
  }
  const out = flagValue(args, "--out");
  const specFile = out ? path.resolve(out) : deriveSpecPath(absoluteHtml);
  if (existsSync(specFile) && !args.includes("--force")) {
    throw new AxiError(`Spec already exists: ${specFile}`, "VALIDATION_ERROR", [
      "Pass --force to overwrite it, or choose a different --out path",
    ]);
  }
  const html = readFileSync(absoluteHtml, "utf8");
  const productOnly = !html.includes('id="code-lens"');
  const greenfield = html.includes("data-loupe-greenfield");
  const title = deriveTitleFromPath(absoluteHtml);
  await mkdir(path.dirname(specFile), { recursive: true });
  await writeFile(
    specFile,
    createSpecMarkdown({ title, htmlBasename: path.basename(absoluteHtml), productOnly, greenfield }),
    "utf8",
  );
  return createSpecOutput({ specFile, htmlFile: absoluteHtml });
}

async function pollCommand(args) {
  const file = args[0];
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `loupe poll <html-file>`"]);
  }
  const absolute = await canonicalFile(file);
  const baseUrl = await ensureServer();
  const agentReply = flagValue(args, "--agent-reply");
  if (agentReply) {
    await postJson(`${baseUrl}/api/${sessionKey(absolute)}/agent-reply`, { text: agentReply });
  }
  const timeoutMs = flagValue(args, "--timeout-ms");
  const timeoutQuery = timeoutMs ? `&timeoutMs=${encodeURIComponent(timeoutMs)}` : "";
  // The indefinite poll looks hung from the agent's side (stdout stays empty until the user
  // acts), so narrate the wait on stderr and leave re-run guidance behind if the agent's
  // harness kills the process anyway. stderr keeps the stdout JSON contract intact.
  const onPollSignal = (signal) => {
    process.stderr.write(`\n${pollInterruptedText(absolute)}\n`);
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  if (!timeoutMs) {
    // Register before the banner write below: a harness that kills the poll as soon as the
    // banner appears can deliver the signal before the next statement runs, and without a
    // handler the default disposition exits silently with no re-run guidance.
    process.on("SIGINT", onPollSignal);
    process.on("SIGTERM", onPollSignal);
  }
  const waitReporter = timeoutMs ? null : startPollWaitReporter({ file: absolute });
  try {
    const response = await fetchJson(`${baseUrl}/api/poll?file=${encodeURIComponent(absolute)}${timeoutQuery}`, {
      retries: 3,
      retryDelayMs: 500,
    });
    return createPollOutput({ file: absolute, response });
  } finally {
    waitReporter?.stop();
    if (!timeoutMs) {
      process.off("SIGINT", onPollSignal);
      process.off("SIGTERM", onPollSignal);
    }
  }
}

export function pollWaitBannerText(file) {
  return (
    `[loupe] Long-polling for user feedback or layout_warnings on ${file}. This stays silent until the user sends feedback, ends the session, or the browser reports fresh layout_warnings - leave it running. ` +
    `If it gets killed or times out, re-run \`loupe poll ${file}\` - queued feedback is never lost.`
  );
}

export function pollWaitTickText(elapsedMs) {
  const minutes = Math.round(elapsedMs / 60_000);
  return `[loupe] Still waiting for user feedback (${minutes}m). Also waiting for fresh layout_warnings. Leave this running until the user acts or the browser reports fresh layout_warnings.`;
}

export function pollInterruptedText(file) {
  return (
    `[loupe] Poll interrupted before user feedback arrived. The user may still be reviewing - ` +
    `re-run \`loupe poll ${file}\` to keep waiting; queued feedback is never lost.`
  );
}

export function startPollWaitReporter({
  file,
  write = (line) => {
    process.stderr.write(line);
  },
  intervalMs = 60_000,
}) {
  write(`${pollWaitBannerText(file)}\n`);
  let elapsedMs = 0;
  const timer = setInterval(() => {
    elapsedMs += intervalMs;
    write(`${pollWaitTickText(elapsedMs)}\n`);
  }, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}

export function createPollOutput({ file, response }) {
  if (response.status === "missing") {
    throw new AxiError("No active Loupe session for this file", "NOT_FOUND", [`Run \`loupe ${file}\` first`]);
  }
  if (response.status === "feedback") {
    const layoutWarnings = Array.isArray(response.layout_warnings) ? response.layout_warnings : [];
    return {
      session: { file, status: "feedback" },
      dom_snapshot: response.dom_snapshot || "",
      prompts: response.prompts || [],
      ...(layoutWarnings.length > 0 ? { layout_warnings: layoutWarnings } : {}),
      next_step: createFeedbackNextStep(file, layoutWarnings.length),
    };
  }
  if (response.status === "ended") {
    return { session: { file, status: "ended" } };
  }
  return {
    session: { file, status: response.status || "waiting" },
    next_step: `No user feedback arrived before the optional timeout. Run \`loupe poll ${file}\` without --timeout-ms to wait indefinitely - queued feedback is never lost, so re-running the poll is always safe.`,
  };
}

function createFeedbackNextStep(file, layoutWarningCount) {
  const layoutPrefix =
    layoutWarningCount > 0
      ? `${layoutWarningCount} layout warning${layoutWarningCount === 1 ? "" : "s"} detected - fix horizontal overflow, clipped text, or overlapping unreadable content in ${file}, then reload or re-open the artifact and re-check before involving the human. `
      : `Apply the requested changes to ${file}. `;
  return `${layoutPrefix}Do not respond to the user just yet. Now you must run \`loupe poll ${file} --agent-reply "<message for the user>"\` without --timeout-ms unless the user ended the session. The poll waits silently until the user sends more feedback, ends the session, or reports fresh layout_warnings - never kill it. If your harness limits how long a foreground command may run, run the poll as a background task; if it still gets killed or times out, just re-run it - queued feedback is never lost.`;
}

async function endCommand(args) {
  const file = args[0];
  if (!file) {
    throw new AxiError("HTML file path is required", "VALIDATION_ERROR", ["Run `loupe end <html-file>`"]);
  }
  const absolute = await canonicalFile(file);
  const baseUrl = await ensureServer();
  const response = await postJson(`${baseUrl}/api/end`, { file: absolute });
  return { session: { file: absolute, status: response.status || "ended" } };
}

// Explicitly shut down the running Loupe server. Unlike `end` (which closes a single
// session), this stops the background process so it stops dangling between sessions.
export async function stopCommand(args) {
  const port = Number(flagValue(args, "--port") || defaultPort());
  const baseUrl = `http://${hostForUrl(clientHost())}:${port}`;
  return shutdownServerOnPort(port, { baseUrl, currentVersion: VERSION });
}

export async function shutdownServerOnPort(
  port,
  {
    baseUrl = `http://${hostForUrl(clientHost())}:${port}`,
    currentVersion = VERSION,
    fetchHealth: healthFetcher = fetchHealth,
    requestShutdown: shutdownRequester = requestShutdown,
    waitForPortFree: portFreeWaiter = waitForPortFree,
    killProcessOnPort: portKiller = killProcessOnPort,
    processMatchesLavish = processOnPortMatchesLavish,
  } = {},
) {
  const health = await healthFetcher(baseUrl);
  if (!health) {
    return { server: { status: "not-running", port } };
  }
  if (!(await canControlServerOnPort(port, health, processMatchesLavish))) {
    return { server: { status: "not-lavish", port } };
  }
  await shutdownRequester(baseUrl);
  let freed = await portFreeWaiter(baseUrl, 3000);
  if (!freed && shouldKillProcessOnPort(currentVersion, health)) {
    portKiller(port);
    freed = await portFreeWaiter(baseUrl, 3000);
  }
  return { server: { status: freed ? "stopped" : "stopping", port } };
}

async function playbookCommand(args) {
  return createPlaybookOutput(args);
}

async function designCommand() {
  return createDesignOutput();
}

async function setupCommand(args) {
  if (args.length !== 1 || args[0] !== "hooks") {
    throw new AxiError("Unknown setup action", "VALIDATION_ERROR", ["Run `loupe setup hooks`"]);
  }

  const errors = [];
  installSessionStartHooks({
    marker: "loupe",
    binaryNames: ["loupe"],
    distEntrypoints: ["dist/cli.mjs", "bin/lavish-axi.js"],
    homeDir: resolveHookHomeDir(),
    onError: (message) => errors.push(message),
  });

  if (errors.length > 0) {
    throw new AxiError("Failed to install loupe agent hooks", "SERVER_ERROR", errors);
  }

  return {
    hooks: { status: "installed", integrations: "Claude Code, Codex, OpenCode" },
    help: ["Restart your agent session to receive loupe ambient context"],
  };
}

export function resolveHookHomeDir(env = process.env, fallback = os.homedir()) {
  return env.HOME || fallback;
}

async function serverCommand(args) {
  const port = Number(flagValue(args, "--port") || defaultPort());
  const debug = args.includes("--verbose") || process.env.LAVISH_AXI_DEBUG === "1";
  const server = await serve({ port, stateFile: stateFile(), version: VERSION, debug });
  await server.done;
  return "";
}

async function visibleSessions() {
  const store = new SessionStore(stateFile());
  return (await store.listSessions()).filter((session) => session.status !== "ended");
}

async function assertHtmlFile(file) {
  if (!isHtmlPath(file)) {
    throw new AxiError("Loupe expects an HTML file", "VALIDATION_ERROR", ["Run `loupe <html-file>`"]);
  }
  try {
    await access(file);
  } catch {
    throw new AxiError(`File not found: ${file}`, "NOT_FOUND", [
      "Create the HTML artifact first, then run `loupe <html-file>`",
    ]);
  }
}

function isHtmlPath(file) {
  return file.toLowerCase().endsWith(".html") || file.toLowerCase().endsWith(".htm");
}

async function ensureServer({ forceRestart = false } = {}) {
  const port = defaultPort();
  const baseUrl = `http://${hostForUrl(clientHost())}:${port}`;
  const existing = await fetchHealth(baseUrl);
  if (existing && !shouldRestartServer(VERSION, existing, forceRestart)) {
    return baseUrl;
  }
  if (existing) {
    if (!(await canControlServerOnPort(port, existing, processOnPortMatchesLavish))) {
      throw new AxiError(`Port ${port} is occupied by a non-Lavish server`, "SERVER_ERROR", [
        `Stop the process using port ${port}, or set LAVISH_AXI_PORT to another port`,
      ]);
    }
    // Stale server from an older release is squatting on the port. Ask it to shut down
    // gracefully so the upgraded client doesn't keep handing users an old chrome.
    await requestShutdown(baseUrl);
    const freed = await waitForPortFree(baseUrl, 2000);
    if (!freed) {
      // Pre-handshake servers (any release older than this change) don't expose /shutdown
      // so the POST 404'd. Fall back to SIGTERM by PID so the very first upgrade still
      // works, then keep waiting.
      if (shouldKillProcessOnPort(VERSION, existing)) {
        killProcessOnPort(port);
        await waitForPortFree(baseUrl, 3000);
      }
    }
  }
  await startServer(port);
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const health = await fetchHealth(baseUrl);
    if (health && !shouldRestartServer(VERSION, health)) {
      return baseUrl;
    }
    await delay(100);
  }
  throw new AxiError("Loupe server did not start", "SERVER_ERROR", [
    `Run \`loupe server --port ${port}\` to inspect server startup`,
  ]);
}

// Pure helper so the upgrade-detection logic is unit-testable without spinning up HTTP.
// Returns true when the running server is a different (or pre-handshake) version than
// what this CLI was built with - i.e. the user just upgraded and the stale server needs
// to step aside.
export function shouldRestartServer(currentVersion, healthBody, forceRestart = false) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (forceRestart && healthBody.app === "lavish-axi") return true;
  if (typeof healthBody.version !== "string" || healthBody.version === "") return true;
  return healthBody.version !== currentVersion;
}

export function shouldForceRestartForLocalBuild(executablePath, sourceServerExists = localSourceServerExists()) {
  const localBuildEntry = fileURLToPath(new URL("../dist/cli.mjs", import.meta.url));
  return sourceServerExists && path.resolve(executablePath) === path.resolve(localBuildEntry);
}

function localSourceServerExists() {
  return existsSync(fileURLToPath(new URL("../src/server.js", import.meta.url)));
}

export function shouldKillProcessOnPort(currentVersion, healthBody) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (typeof healthBody.version !== "string" || healthBody.version === "") return true;
  if (healthBody.app !== "lavish-axi") return false;
  return healthBody.version !== currentVersion;
}

async function canControlServerOnPort(port, healthBody, processMatchesLavish) {
  if (!healthBody || typeof healthBody !== "object") return false;
  if (healthBody.app === "lavish-axi") return true;
  if (typeof healthBody.version === "string" && healthBody.version !== "") return false;
  return processMatchesLavish(port);
}

async function fetchHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function requestShutdown(baseUrl) {
  try {
    await fetch(`${baseUrl}/shutdown`, { method: "POST" });
  } catch {
    // Best effort. If the server died before answering, the port will free up on its own.
  }
}

async function waitForPortFree(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await fetchHealth(baseUrl))) return true;
    await delay(100);
  }
  return false;
}

// Last-resort fallback for the bootstrap upgrade case: a pre-handshake server is squatting
// on the port and doesn't expose /shutdown, so we resolve its PID via lsof and SIGTERM it.
// macOS/Linux only - Windows users would need to kill manually, but loupe isn't
// shipped for Windows today.
function killProcessOnPort(port) {
  try {
    const result = spawnSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    if (result.status !== 0) return;
    for (const line of result.stdout.split("\n")) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          // Process already gone or permission denied - either way nothing we can do.
        }
      }
    }
  } catch {
    // lsof missing or unsupported platform - the outer caller will surface SERVER_ERROR.
  }
}

function processOnPortMatchesLavish(port) {
  try {
    const pids = spawnSync("lsof", ["-t", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
    if (pids.status !== 0) return false;
    for (const line of pids.stdout.split("\n")) {
      const pid = Number(line.trim());
      if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
      const command = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
      if (command.status === 0 && /lavish-axi/.test(command.stdout)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function startServer(port) {
  await ensureStateDir();
  const entry = resolveServerEntry();
  let logFd = null;
  try {
    logFd = openSync(serverLogFile(), "a");
  } catch {
    // If logging cannot be initialized, keep the server behavior unchanged.
  }
  try {
    const child = spawn(process.execPath, [entry, "server", "--port", String(port)], createServerSpawnOptions(logFd));
    child.unref();
  } finally {
    if (logFd !== null) closeSync(logFd);
  }
}

// The detached server child must point at a node-executable entry that actually invokes
// run(). In source layout that's `../bin/lavish-axi.js` (which calls run on import). In the
// published bundle, only `dist/cli.mjs` ships and it self-invokes via the bundled bin
// wrapper. Pick whichever exists.
export function resolveServerEntry() {
  const binEntry = fileURLToPath(new URL("../bin/lavish-axi.js", import.meta.url));
  if (existsSync(binEntry)) return binEntry;
  return fileURLToPath(import.meta.url);
}

/**
 * @param {number | null} logFd
 * @returns {import("node:child_process").SpawnOptions}
 */
export function createServerSpawnOptions(logFd = null) {
  const stdio = /** @type {import("node:child_process").StdioOptions} */ (
    logFd === null ? "ignore" : ["ignore", logFd, logFd]
  );
  return {
    detached: true,
    stdio,
    env: { ...process.env, LAVISH_AXI_NO_OPEN: "1" },
  };
}

export async function fetchJson(url, { retries = 0, retryDelayMs = 250 } = {}) {
  let response;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      response = await fetch(url);
      break;
    } catch (error) {
      if (error instanceof AxiError) throw error;
      if (attempt >= retries) throw serverConnectionError();
      await delay(retryDelayMs);
    }
  }

  if (!response) throw serverConnectionError();
  if (!response.ok) {
    throw new AxiError(`Loupe request failed: ${response.status}`, "SERVER_ERROR");
  }
  try {
    return await response.json();
  } catch {
    throw pollResponseInterruptedError();
  }
}

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw serverConnectionError();
  }
  if (!response.ok) {
    throw new AxiError(`Loupe request failed: ${response.status}`, "SERVER_ERROR");
  }
  return response.json();
}

function serverConnectionError() {
  return new AxiError("Loupe server connection failed", "SERVER_ERROR", [
    "Run `loupe server --verbose` or inspect `~/.lavish-axi/server.log` (`LAVISH_AXI_STATE_DIR/server.log` when set) for server startup or crash diagnostics",
    "Re-run the last `loupe poll <html-file>` command after the server is healthy",
  ]);
}

function pollResponseInterruptedError() {
  return new AxiError("Loupe poll response was interrupted", "SERVER_ERROR", [
    "Run `loupe server --verbose` or inspect `~/.lavish-axi/server.log` (`LAVISH_AXI_STATE_DIR/server.log` when set) for server startup or crash diagnostics",
    "Re-run the last `loupe poll <html-file>` command after the server is healthy",
  ]);
}

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return args[index + 1] || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCommandHelp(command) {
  return COMMAND_HELP[command] || null;
}

const TOP_LEVEL_HELP = `loupe - Loupe\n\nUsage:\n  loupe\n  loupe <html-file> [--no-open] [--no-gate]\n  loupe new <html-file> [--title "..."] [--problem "..."] [--product-only] [--greenfield] [--force]\n  loupe spec <html-file> [--out <file.md>] [--force]\n  loupe poll <html-file> [--agent-reply "..."]\n  loupe end <html-file>\n  loupe stop\n  loupe playbook [playbook_id]\n  loupe design\n  loupe setup hooks\n\n${DESIGN_SYSTEM_HINT}\n\nNote: poll long-polls indefinitely by default until the user sends feedback, ends the session, or the browser reports fresh layout_warnings, staying silent while it waits - never kill it. Fix layout_warnings before involving the human. Do not pass --timeout-ms during normal agent use; it is for tests and debugging only. If your harness limits how long a foreground command may run, run the poll as a background task; if it gets killed or times out anyway, just re-run it - queued feedback is never lost.\n\n`;

const COMMAND_HELP = {
  open: `Usage: loupe <html-file> [--no-open] [--no-gate]\n\nOpen or resume a Loupe review session for an HTML artifact. Use --no-open when you need to ensure the server/session exists without opening another browser window. Use --no-gate to skip the open-time layout curtain for this browser open.\n`,
  new: `Usage: loupe new <html-file> [--title "..."] [--problem "..."] [--product-only] [--force]\n\nWrite a Loupe scaffold: a self-contained HTML artifact with two lenses, each holding §A Current World, §B Grill, and §C Goal Vision, mermaid containers, and auto-wired Grill Cards. Fill the Product Lens first; leave the Code Lens empty until the user locks the product intent, then fill it from the real codebase. The gate is a soft signal — the Code Lens is never UI-locked, so it stays editable and annotatable. Fill the \`LOUPE — fill:\` slots, then open it with \`loupe <html-file>\`. Pass --product-only for a single Product Lens (small changes), or --greenfield when there is no codebase yet (the Code Lens becomes a from-scratch architecture proposal instead of current → after). Refuses to overwrite an existing file unless --force is passed.\n`,
  spec: `Usage: loupe spec <html-file> [--out <file.md>] [--force]\n\nWrite the companion spec for a Loupe artifact: a terse markdown file (default \`<html-file>.spec.md\`) with the decisions list and a link back to the canonical HTML. Run this when the developer clicks Execute; fill the \`…\` slots with what the Session settled, keep it in version control, and use it as the source of truth for implementation. Detects product-only vs dual-lens from the artifact. Refuses to overwrite unless --force.\n`,
  poll: `Usage: loupe poll <html-file> [--agent-reply "..."]\n\nThis command long-polls indefinitely for queued user prompts and browser-reported layout_warnings, then returns them to the agent. It stays silent while it waits - that is normal, never kill it. Fix layout_warnings before involving the human. Do not pass --timeout-ms during normal agent use; it is for tests and debugging only. If your harness limits how long a foreground command may run, run the poll as a background task and wait for it to finish; if it still gets killed or times out, just re-run it - queued feedback is never lost. Use --agent-reply after applying prior feedback to display your response in Loupe before waiting again.\n`,
  end: `Usage: loupe end <html-file>\n\nEnd a Loupe session.\n`,
  stop: `Usage: loupe stop [--port <port>]\n\nShut down the background Loupe server. The server also stops itself when no browser or poll has been connected for a while (LAVISH_AXI_IDLE_TIMEOUT_MS, default 30m) and immediately when the last session ends with nothing connected.\n`,
  playbook: `Usage: loupe playbook [playbook_id]\n\nList focused artifact guidance playbooks, or show one playbook by ID. Known IDs: diagram, table, comparison, plan, code, input, slides.\n\n${PLAYBOOK_ROUTER_HELP}\n\nExamples:\n  loupe playbook\n  loupe playbook diagram\n  loupe playbook input\n`,
  design: `Usage: loupe design\n\nShow a copy-pasteable CDN snippet for Tailwind CSS browser runtime v4 + DaisyUI v5 + themes, Mermaid diagram tooling, a content-to-playbook router, an optional layout safety CSS snippet, plus technical reference for DaisyUI components. ${PLAYBOOK_ROUTER_HELP} Lavish artifacts stay portable HTML. This CDN snippet is the design fallback, not the default: inspect the subject project before falling back, and paste the layout safety CSS only when useful for dense nested grid/flex layouts, badges, wide fonts, or local media. The strict priority order is: (1) if the user asked for a specific look or named design system, follow that; (2) otherwise, match the design system of the project the artifact is about, not necessarily your current working directory. If the artifact previews, proposes, or mocks a specific app's UI, use that app's own design system; (3) only when both come up empty, prefer the Lavish-recommended Tailwind + DaisyUI CDN snippet over hand-writing styles unless explicitly instructed otherwise by the user.\n`,
  setup: `Usage: loupe setup hooks\n\nInstall or repair agent SessionStart hooks for loupe ambient context in Claude Code, Codex, and OpenCode. Restart your agent session afterward to receive the context.\n`,
  server: `Usage: loupe server [--port 4387] [--verbose]\n\nRun the local Loupe server. Pass --verbose (or set LAVISH_AXI_DEBUG=1) to log session and watcher events to stderr. Detached server output is appended to ~/.lavish-axi/server.log, or LAVISH_AXI_STATE_DIR/server.log when set, for startup and crash diagnostics.\n\nLAVISH_AXI_HOST sets the bind address (default 127.0.0.1; a wildcard 0.0.0.0 or :: binds every interface). Binding beyond loopback exposes an unauthenticated server that can read and serve arbitrary local files to anything that can reach it, so only do so on a trusted network. LAVISH_AXI_LINK_HOST sets the hostname written into generated session links (default: the bind address, or loopback when bound to a wildcard). LAVISH_AXI_NO_OPEN=1 (or --no-open) suppresses the local browser launch.\n`,
};

export { createDesignOutput };
