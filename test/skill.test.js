import assert from "node:assert/strict";
import test from "node:test";

import { createHomeOutput } from "../src/cli.js";
import { SKILL_DESCRIPTION, createSkillMarkdown } from "../src/skill.js";

test("createSkillMarkdown emits valid frontmatter naming the loupe skill", () => {
  const md = createSkillMarkdown();
  assert.ok(md.startsWith("---\n"), "starts with frontmatter fence");
  const end = md.indexOf("\n---\n", 4);
  assert.ok(end > 0, "frontmatter is closed");
  const frontmatter = md.slice(4, end);
  assert.match(frontmatter, /^name: loupe$/m);
  assert.match(frontmatter, /^description: /m);
  assert.match(frontmatter, /^argument-hint: /m);
  assert.ok(frontmatter.includes(SKILL_DESCRIPTION), "frontmatter carries the skill description");
});

test("createSkillMarkdown emits Hermes Agent metadata in frontmatter", () => {
  const md = createSkillMarkdown();
  const frontmatter = md.slice(4, md.indexOf("\n---\n", 4));

  assert.match(frontmatter, /^author: jerry5789k1 \(fork of lavish-axi by Kun Chen\)$/m);
  assert.match(frontmatter, /^metadata:\n {2}hermes:\n {4}tags: \[[^\]]+\]\n {4}category: \S+$/m);
  assert.doesNotMatch(frontmatter, /^version:/m, "version is omitted to avoid release churn");
});

test("createSkillMarkdown handles explicit /lavish invocation arguments", () => {
  const md = createSkillMarkdown();
  const body = md.slice(md.indexOf("\n---\n", 4) + 5);

  assert.ok(body.includes("$ARGUMENTS"), "body consumes slash-command arguments");
  assert.match(body, /empty/i, "explains the model-invoked case where no arguments are passed");
});

test("createSkillMarkdown mirrors the no-args home output", () => {
  const md = createSkillMarkdown();
  const home = createHomeOutput({ bin: "loupe", sessions: [], includeSessions: false });

  assert.ok(md.includes(home.description), "includes the product description");

  for (const item of home.visual_guidance) {
    assert.ok(md.includes(item), `includes visual guidance: ${item.slice(0, 32)}...`);
  }

  for (const playbook of home.playbooks) {
    assert.ok(md.includes(playbook.id), `includes playbook id: ${playbook.id}`);
    assert.ok(md.includes(playbook.use_when), `includes playbook use_when: ${playbook.id}`);
  }

  for (const item of home.help) {
    assert.ok(md.includes(item), `includes help: ${item.slice(0, 32)}...`);
  }
});

test("createSkillMarkdown requires opening every matching playbook", () => {
  const md = createSkillMarkdown();
  const playbooksSection = md.slice(md.indexOf("## Playbooks"), md.indexOf("## Commands & rules"));

  assert.ok(playbooksSection.includes("combines several playbooks"), "explains artifacts span playbooks");
  assert.ok(playbooksSection.includes("MUST open each matching playbook"), "requires opening matching playbooks");
  assert.ok(playbooksSection.includes("do not hand-build boxes-and-arrows"), "names the diagram anti-pattern");
});

test("createSkillMarkdown does not leak live session state", () => {
  const md = createSkillMarkdown();
  assert.ok(!md.includes("pending_prompts"), "no session bookkeeping fields");
  assert.ok(!/\/session\/[0-9a-f]{8}/.test(md), "no live session URLs");
});

test("createSkillMarkdown omits setup hooks guidance", () => {
  const md = createSkillMarkdown();
  assert.doesNotMatch(md, /setup hooks/);
});

test("createSkillMarkdown teaches the three-grade annotation triage", () => {
  const md = createSkillMarkdown();
  assert.match(md, /Tweak/);
  assert.match(md, /Follow-up/);
  assert.match(md, /Directional/);
  assert.match(md, /reopening the product intent|reverse gate/i);
});

test("home help carries the annotation-triage protocol for the SessionStart hook", () => {
  const home = createHomeOutput({ bin: "loupe", sessions: [], includeSessions: false });
  const triage = home.help.find((item) => /Triage each annotation/.test(item));
  assert.ok(triage, "home help mentions annotation triage");
  assert.match(triage, /Tweak/);
  assert.match(triage, /Follow-up/);
  assert.match(triage, /Directional/);
});

test("createSkillMarkdown drives the loupe CLI directly, with an npx fallback", () => {
  const md = createSkillMarkdown();

  // Primary path: the `loupe` bin on PATH (global install or the session hook).
  assert.match(md, /`loupe new <html-file>`/);
  assert.match(md, /`loupe poll <html-file>`/);
  // Zero-install fallback so `npx skills add` works without a separate install.
  assert.match(md, /npx -y @marshalliqiu\/loupe/, "the skill offers an npx fallback when loupe is not on PATH");
});
