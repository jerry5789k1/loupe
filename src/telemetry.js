// Telemetry removed. Loupe collects and sends nothing.
//
// This module is intentionally a no-op. It keeps the small API the CLI calls
// (`initDefaultTelemetry` and the returned client's `pageview`/`track`/`close`)
// so call sites need not change, but there is no network client, no endpoint,
// and no event payload anywhere. The upstream analytics integration (hardcoded
// host, website-id env, build-time defines) was deleted.

class NoopTelemetryClient {
  /** @param {string} [_name] @param {Record<string, unknown>} [_fields] */
  track(_name, _fields) {}

  /** @param {string} [_path] @param {Record<string, unknown>} [_fields] */
  pageview(_path, _fields) {}

  /** @param {number} [_timeoutMs] */
  async close(_timeoutMs) {}
}

let defaultClient = new NoopTelemetryClient();

/** @param {Record<string, unknown>} [_init] */
export function initDefaultTelemetry(_init) {
  defaultClient = new NoopTelemetryClient();
  return defaultClient;
}

export function getDefaultTelemetry() {
  return defaultClient;
}

export function resetDefaultTelemetryForTests() {
  defaultClient = new NoopTelemetryClient();
}
