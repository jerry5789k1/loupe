import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getDefaultTelemetry, initDefaultTelemetry, resetDefaultTelemetryForTests } from "../src/telemetry.js";

// Telemetry is removed: the client must be an inert no-op that never sends.

test("telemetry client is a no-op with no network surface", () => {
  const client = initDefaultTelemetry({ app: "loupe", version: "0.0.0" });
  assert.equal(client.track("event", { a: 1 }), undefined);
  assert.equal(client.pageview("/x"), undefined);
  assert.equal("fire" in client, false, "no HTTP fire method");
  assert.equal("endpoint" in client, false, "no endpoint");
});

test("close resolves immediately", async () => {
  const client = initDefaultTelemetry({ app: "loupe", version: "0.0.0" });
  await client.close();
});

test("getDefaultTelemetry / reset return no-op clients", () => {
  resetDefaultTelemetryForTests();
  const client = getDefaultTelemetry();
  assert.equal(typeof client.track, "function");
  assert.equal("endpoint" in client, false);
});

test("no telemetry endpoint or Umami reference remains in the source", async () => {
  const src = await readFile(new URL("../src/telemetry.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /https?:\/\//, "telemetry.js ships no URL");
  assert.doesNotMatch(src, /umami/i);
});
